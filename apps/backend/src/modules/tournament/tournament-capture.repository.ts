import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import {
  type ChatMessageReceived,
  type SaveTournamentCaptureRuleRequest,
  type TournamentCaptureRule,
  TournamentCaptureRuleListSchema,
  TournamentCaptureRuleSchema,
} from '@streamkit/contracts'
import { and, eq, isNotNull, lte, sql } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import {
  integrationConnections,
  tournamentCaptureRules,
  tournamentEntries,
  tournamentParticipants,
  tournaments,
} from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'

@Injectable()
export class TournamentCaptureRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async capture(rule: TournamentCaptureRule, event: ChatMessageReceived): Promise<boolean> {
    return this.database.transaction(() => {
      const tournament = this.database.orm
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, rule.tournamentId))
        .get()
      const now = new Date().toISOString()
      if (!tournament || !['draft', 'ready'].includes(tournament.status)) {
        this.incrementRejected(rule.id, now)
        return false
      }
      const existing = this.database.orm
        .select({ id: tournamentParticipants.id })
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, rule.tournamentId),
            eq(tournamentParticipants.provider, event.provider),
            eq(tournamentParticipants.providerUserId, event.author.providerUserId),
          ),
        )
        .get()
      if (existing) {
        this.database.orm
          .update(tournamentCaptureRules)
          .set({
            duplicateCount: sql`${tournamentCaptureRules.duplicateCount} + 1`,
            updatedAt: now,
          })
          .where(eq(tournamentCaptureRules.id, rule.id))
          .run()
        return false
      }
      const [{ count = 0 } = {}] = this.database.orm
        .select({ count: sql<number>`count(*)` })
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, rule.tournamentId))
        .all()
      const capacity =
        tournament.mode === 'team'
          ? tournament.bracketSize * (tournament.teamCapacity ?? 1)
          : tournament.bracketSize
      if (count >= capacity) {
        this.incrementRejected(rule.id, now)
        return false
      }
      const participantId = randomUUID()
      this.database.orm
        .insert(tournamentParticipants)
        .values({
          createdAt: now,
          displayName: event.author.displayName,
          externalRef: `${event.provider}:${event.author.providerUserId}`,
          id: participantId,
          identityKey: `${event.provider}:${event.author.providerUserId}`,
          provider: event.provider,
          providerUserId: event.author.providerUserId,
          source: 'chat',
          tournamentId: rule.tournamentId,
        })
        .run()
      if (tournament.mode === 'individual')
        this.database.orm
          .insert(tournamentEntries)
          .values({
            createdAt: now,
            id: randomUUID(),
            participantId,
            seed: count + 1,
            teamId: null,
            tournamentId: rule.tournamentId,
          })
          .run()
      this.database.orm
        .update(tournamentCaptureRules)
        .set({ capturedCount: sql`${tournamentCaptureRules.capturedCount} + 1`, updatedAt: now })
        .where(eq(tournamentCaptureRules.id, rule.id))
        .run()
      this.database.orm
        .update(tournaments)
        .set({ updatedAt: now })
        .where(eq(tournaments.id, rule.tournamentId))
        .run()
      return true
    })
  }

  public async delete(id: string): Promise<void> {
    await this.database.orm.delete(tournamentCaptureRules).where(eq(tournamentCaptureRules.id, id))
  }

  public async completeExpired(): Promise<void> {
    const now = new Date().toISOString()
    await this.database.orm
      .update(tournamentCaptureRules)
      .set({ status: 'completed', updatedAt: now })
      .where(
        and(
          eq(tournamentCaptureRules.status, 'active'),
          isNotNull(tournamentCaptureRules.endsAt),
          lte(tournamentCaptureRules.endsAt, now),
        ),
      )
  }

  public async findForEvent(event: ChatMessageReceived) {
    const rows = await this.database.orm
      .select({ rule: tournamentCaptureRules })
      .from(tournamentCaptureRules)
      .innerJoin(
        integrationConnections,
        eq(integrationConnections.id, tournamentCaptureRules.connectionId),
      )
      .where(
        and(
          eq(integrationConnections.provider, event.provider),
          eq(integrationConnections.channelId, event.channelId),
          eq(tournamentCaptureRules.status, 'active'),
        ),
      )
    return rows.map(({ rule }) => TournamentCaptureRuleSchema.parse(rule))
  }

  public async list(tournamentId: string) {
    return TournamentCaptureRuleListSchema.parse({
      items: await this.database.orm
        .select()
        .from(tournamentCaptureRules)
        .where(eq(tournamentCaptureRules.tournamentId, tournamentId)),
    })
  }

  public async save(tournamentId: string, input: SaveTournamentCaptureRuleRequest) {
    const now = new Date().toISOString()
    await this.database.orm
      .insert(tournamentCaptureRules)
      .values({
        ...input,
        capturedCount: 0,
        createdAt: now,
        duplicateCount: 0,
        id: randomUUID(),
        rejectedCount: 0,
        status: 'active',
        tournamentId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [tournamentCaptureRules.tournamentId, tournamentCaptureRules.connectionId],
        set: { ...input, status: 'active', updatedAt: now },
      })
    const [row] = await this.database.orm
      .select()
      .from(tournamentCaptureRules)
      .where(
        and(
          eq(tournamentCaptureRules.tournamentId, tournamentId),
          eq(tournamentCaptureRules.connectionId, input.connectionId),
        ),
      )
    return TournamentCaptureRuleSchema.parse(row)
  }

  public async updateStatus(id: string, status: TournamentCaptureRule['status']): Promise<void> {
    await this.database.orm
      .update(tournamentCaptureRules)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(tournamentCaptureRules.id, id))
  }

  private incrementRejected(id: string, updatedAt: string): void {
    this.database.orm
      .update(tournamentCaptureRules)
      .set({ rejectedCount: sql`${tournamentCaptureRules.rejectedCount} + 1`, updatedAt })
      .where(eq(tournamentCaptureRules.id, id))
      .run()
  }
}
