import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import {
  type ChatMessageReceived,
  type SaveTournamentCaptureRuleRequest,
  type TournamentCaptureRule,
  TournamentCaptureRuleListSchema,
  TournamentCaptureRuleSchema,
} from '@streamkit/contracts'
import { and, eq, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'

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
      const identity = event.author.handle.normalize('NFKC').trim().toLocaleLowerCase('pt-BR')
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
            or(
              and(
                eq(tournamentParticipants.provider, event.provider),
                eq(tournamentParticipants.providerUserId, event.author.providerUserId),
              ),
              and(
                eq(tournamentParticipants.identityKey, identity),
                isNull(tournamentParticipants.providerUserId),
              ),
            ),
          ),
        )
        .get()
      if (existing) {
        this.database.orm
          .update(tournamentParticipants)
          .set({
            avatarUrl: event.author.avatarUrl,
            channelId: event.channelId,
            externalRef: `${event.provider}:${event.author.providerUserId}`,
            identityKey: `${event.provider}:${event.author.providerUserId}`,
            provider: event.provider,
            providerUserId: event.author.providerUserId,
          })
          .where(eq(tournamentParticipants.id, existing.id))
          .run()
      }
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
      const participantId = randomUUID()
      this.database.orm
        .insert(tournamentParticipants)
        .values({
          avatarUrl: event.author.avatarUrl,
          channelId: event.channelId,
          createdAt: now,
          displayName: event.author.handle,
          externalRef: `${event.provider}:${event.author.providerUserId}`,
          id: participantId,
          identityKey: `${event.provider}:${event.author.providerUserId}`,
          provider: event.provider,
          providerUserId: event.author.providerUserId,
          source: 'chat',
          tournamentId: rule.tournamentId,
        })
        .run()
      const entryCount =
        this.database.orm
          .select({ count: sql<number>`count(*)` })
          .from(tournamentEntries)
          .where(eq(tournamentEntries.tournamentId, rule.tournamentId))
          .get()?.count ?? 0
      if (tournament.mode === 'individual' && entryCount < tournament.bracketSize)
        this.database.orm
          .insert(tournamentEntries)
          .values({
            createdAt: now,
            id: randomUUID(),
            participantId,
            seed: entryCount + 1,
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
          event.liveSessionKey
            ? eq(integrationConnections.liveSessionKey, event.liveSessionKey)
            : undefined,
          or(
            eq(integrationConnections.isGlobalSelected, true),
            sql`NOT EXISTS (SELECT 1 FROM integration_connections WHERE is_global_selected = 1)`,
          ),
          eq(tournamentCaptureRules.status, 'active'),
        ),
      )
    return rows.map(({ rule }) => this.parseRule(rule))
  }

  public async list(tournamentId: string) {
    return TournamentCaptureRuleListSchema.parse({
      items: (
        await this.database.orm
          .select()
          .from(tournamentCaptureRules)
          .where(eq(tournamentCaptureRules.tournamentId, tournamentId))
      ).map((row) => this.parseRule(row)),
    })
  }

  public async save(tournamentId: string, input: SaveTournamentCaptureRuleRequest) {
    const now = new Date().toISOString()
    const { livepix, ...rest } = input
    const livepixColumns = {
      livepixAutoEntry: livepix?.autoEntry ?? false,
      livepixCurrency: livepix?.currency ?? null,
      livepixMinimumAmountInCents: livepix?.minimumAmountInCents ?? null,
    }
    await this.database.orm
      .insert(tournamentCaptureRules)
      .values({
        ...rest,
        ...livepixColumns,
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
        set: { ...rest, ...livepixColumns, status: 'active', updatedAt: now },
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
    return this.parseRule(row!)
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

  private parseRule(row: typeof tournamentCaptureRules.$inferSelect) {
    return TournamentCaptureRuleSchema.parse({
      ...row,
      livepix:
        row.livepixMinimumAmountInCents && row.livepixCurrency
          ? {
              autoEntry: row.livepixAutoEntry,
              currency: row.livepixCurrency,
              minimumAmountInCents: row.livepixMinimumAmountInCents,
            }
          : null,
    })
  }
}
