import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  type CreateTournamentRequest,
  type TournamentDetail,
  TournamentDetailSchema,
  TournamentListSchema,
  TournamentSchema,
} from '@streamkit/contracts'
import { and, asc, desc, eq } from 'drizzle-orm'
import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import {
  tournamentAuditLog,
  tournamentEntries,
  tournamentMatches,
  tournamentParticipants,
  tournaments,
} from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'
import {
  advancingMatchStatus,
  generateSingleEliminationBracket,
  secureShuffle,
} from './domain/single-elimination'

@Injectable()
export class TournamentRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async create(input: CreateTournamentRequest) {
    const now = new Date().toISOString()
    const row = {
      ...input,
      createdAt: now,
      id: randomUUID(),
      status: 'draft' as const,
      teamCapacity: null,
      updatedAt: now,
    }
    await this.database.orm.insert(tournaments).values(row)
    this.audit(row.id, 'tournament.created', { bracketSize: row.bracketSize, mode: row.mode })
    return TournamentSchema.parse(row)
  }
  public async list() {
    return TournamentListSchema.parse({
      items: await this.database.orm
        .select()
        .from(tournaments)
        .where(eq(tournaments.mode, 'individual'))
        .orderBy(desc(tournaments.createdAt)),
    })
  }
  public async detail(id: string): Promise<TournamentDetail | null> {
    const [tournament] = await this.database.orm
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
    if (!tournament) return null
    const participantRows = await this.database.orm
      .select({
        createdAt: tournamentParticipants.createdAt,
        displayName: tournamentParticipants.displayName,
        entryId: tournamentEntries.id,
        id: tournamentParticipants.id,
        seed: tournamentEntries.seed,
        tournamentId: tournamentParticipants.tournamentId,
      })
      .from(tournamentParticipants)
      .innerJoin(tournamentEntries, eq(tournamentEntries.participantId, tournamentParticipants.id))
      .where(eq(tournamentParticipants.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
    const matches = await this.database.orm
      .select()
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, id))
      .orderBy(asc(tournamentMatches.roundNumber), asc(tournamentMatches.matchNumber))
    const auditRows = await this.database.orm
      .select()
      .from(tournamentAuditLog)
      .where(eq(tournamentAuditLog.tournamentId, id))
      .orderBy(desc(tournamentAuditLog.createdAt))
    const final = matches.at(-1)
    return TournamentDetailSchema.parse({
      auditLog: auditRows.map(({ payloadJson, ...row }) => ({
        ...row,
        payload: JSON.parse(payloadJson) as unknown,
      })),
      championEntryId: tournament.status === 'finished' ? (final?.winnerEntryId ?? null) : null,
      matches,
      participants: participantRows,
      tournament,
    })
  }
  public async addParticipant(id: string, displayName: string) {
    const tournament = await this.mutableDraft(id)
    if (!tournament) return null
    const count = await this.database.orm.$count(
      tournamentEntries,
      eq(tournamentEntries.tournamentId, id),
    )
    if (count >= tournament.bracketSize) return 'full' as const
    const now = new Date().toISOString(),
      participantId = randomUUID()
    this.database.transaction(() => {
      this.database.orm
        .insert(tournamentParticipants)
        .values({
          createdAt: now,
          displayName,
          externalRef: null,
          id: participantId,
          source: 'manual',
          tournamentId: id,
        })
        .run()
      this.database.orm
        .insert(tournamentEntries)
        .values({
          createdAt: now,
          id: randomUUID(),
          participantId,
          seed: count + 1,
          teamId: null,
          tournamentId: id,
        })
        .run()
      this.audit(id, 'participant.added', { participantId, seed: count + 1 })
    })
    return this.detail(id)
  }
  public async renameParticipant(id: string, participantId: string, displayName: string) {
    if (!(await this.mutableDraft(id))) return null
    const changed = await this.database.orm
      .update(tournamentParticipants)
      .set({ displayName })
      .where(
        and(
          eq(tournamentParticipants.id, participantId),
          eq(tournamentParticipants.tournamentId, id),
        ),
      )
      .returning()
    if (!changed.length) return 'missing' as const
    this.audit(id, 'participant.renamed', { participantId })
    return this.detail(id)
  }
  public async removeParticipant(id: string, participantId: string) {
    if (!(await this.mutableDraft(id))) return null
    const entries = await this.database.orm
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
    if (!entries.some((entry) => entry.participantId === participantId)) return 'missing' as const
    this.database.transaction(() => {
      this.database.orm
        .delete(tournamentEntries)
        .where(eq(tournamentEntries.participantId, participantId))
        .run()
      this.database.orm
        .delete(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.id, participantId),
            eq(tournamentParticipants.tournamentId, id),
          ),
        )
        .run()
      this.reseed(id)
      this.audit(id, 'participant.removed', { participantId })
    })
    return this.detail(id)
  }
  public async reorder(id: string, participantId: string, seed: number) {
    const tournament = await this.mutableDraft(id)
    if (!tournament) return null
    const entries = await this.database.orm
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
    const index = entries.findIndex((entry) => entry.participantId === participantId)
    if (index < 0) return 'missing' as const
    const [entry] = entries.splice(index, 1)
    entries.splice(Math.max(0, Math.min(seed - 1, entries.length)), 0, entry!)
    this.database.transaction(() => {
      this.applySeeds(entries)
      this.audit(id, 'seeding.reordered', { participantId, seed })
    })
    return this.detail(id)
  }
  public async shuffle(id: string) {
    if (!(await this.mutableDraft(id))) return null
    const entries = secureShuffle(
      await this.database.orm
        .select()
        .from(tournamentEntries)
        .where(eq(tournamentEntries.tournamentId, id)),
    )
    this.database.transaction(() => {
      this.applySeeds(entries)
      this.audit(id, 'seeding.shuffled', {})
    })
    return this.detail(id)
  }
  public async generate(id: string) {
    const tournament = await this.mutableDraft(id)
    if (!tournament) return null
    const entries = await this.database.orm
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
    if (entries.length !== tournament.bracketSize) return 'incomplete' as const
    const definitions = generateSingleEliminationBracket(tournament.bracketSize as 4 | 8 | 16 | 32)
    const ids = new Map(definitions.map((definition) => [definition.matchNumber, randomUUID()]))
    const now = new Date().toISOString()
    this.database.transaction(() => {
      for (const definition of [...definitions].reverse())
        this.database.orm
          .insert(tournamentMatches)
          .values({
            id: ids.get(definition.matchNumber)!,
            leftEntryId: definition.leftSeed ? entries[definition.leftSeed - 1]!.id : null,
            matchNumber: definition.matchNumber,
            nextMatchId: definition.nextMatchNumber ? ids.get(definition.nextMatchNumber)! : null,
            nextSlot: definition.nextSlot,
            rightEntryId: definition.rightSeed ? entries[definition.rightSeed - 1]!.id : null,
            roundNumber: definition.roundNumber,
            status: definition.roundNumber === 1 ? 'ready' : 'pending',
            tournamentId: id,
            updatedAt: now,
            winnerEntryId: null,
          })
          .run()
      this.database.orm
        .update(tournaments)
        .set({ status: 'ready', updatedAt: now })
        .where(eq(tournaments.id, id))
        .run()
      this.audit(id, 'bracket.generated', { size: tournament.bracketSize })
    })
    return this.detail(id)
  }
  public async start(id: string) {
    const detail = await this.transition(id, 'ready', 'in_progress', 'tournament.started')
    if (!detail) return null
    const now = new Date().toISOString()
    await this.database.orm
      .update(tournamentMatches)
      .set({ status: 'in_progress', updatedAt: now })
      .where(and(eq(tournamentMatches.tournamentId, id), eq(tournamentMatches.status, 'ready')))
    return this.detail(id)
  }
  public async archive(id: string) {
    const [row] = await this.database.orm.select().from(tournaments).where(eq(tournaments.id, id))
    if (!row || row.status !== 'finished') return null
    return this.transition(id, 'finished', 'archived', 'tournament.archived')
  }
  public async winner(id: string, matchId: string, winnerEntryId: string) {
    const [tournament] = await this.database.orm
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
    const [match] = await this.database.orm
      .select()
      .from(tournamentMatches)
      .where(and(eq(tournamentMatches.id, matchId), eq(tournamentMatches.tournamentId, id)))
    if (
      !tournament ||
      tournament.status !== 'in_progress' ||
      !match ||
      match.status !== 'in_progress' ||
      ![match.leftEntryId, match.rightEntryId].includes(winnerEntryId)
    )
      return null
    const now = new Date().toISOString()
    this.database.transaction(() => {
      this.database.orm
        .update(tournamentMatches)
        .set({ status: 'finished', updatedAt: now, winnerEntryId })
        .where(eq(tournamentMatches.id, matchId))
        .run()
      if (match.nextMatchId && match.nextSlot) {
        const [next] = this.database.orm
          .select()
          .from(tournamentMatches)
          .where(eq(tournamentMatches.id, match.nextMatchId))
          .all()
        const slot =
          match.nextSlot === 'left'
            ? { leftEntryId: winnerEntryId }
            : { rightEntryId: winnerEntryId }
        this.database.orm
          .update(tournamentMatches)
          .set({
            ...slot,
            status: advancingMatchStatus(
              match.nextSlot === 'left' || Boolean(next?.leftEntryId),
              match.nextSlot === 'right' || Boolean(next?.rightEntryId),
            ),
            updatedAt: now,
          })
          .where(eq(tournamentMatches.id, match.nextMatchId))
          .run()
      } else
        this.database.orm
          .update(tournaments)
          .set({ status: 'finished', updatedAt: now })
          .where(eq(tournaments.id, id))
          .run()
      this.audit(id, 'match.winner_set', { matchId, winnerEntryId })
    })
    return this.detail(id)
  }
  public async undo(id: string, matchId: string) {
    const [tournament] = await this.database.orm
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
    const [match] = await this.database.orm
      .select()
      .from(tournamentMatches)
      .where(and(eq(tournamentMatches.id, matchId), eq(tournamentMatches.tournamentId, id)))
    if (
      !tournament ||
      !['in_progress', 'finished'].includes(tournament.status) ||
      !match?.winnerEntryId
    )
      return null
    const now = new Date().toISOString()
    this.database.transaction(() => {
      let current = match
      this.database.orm
        .update(tournamentMatches)
        .set({ status: 'in_progress', updatedAt: now, winnerEntryId: null })
        .where(eq(tournamentMatches.id, matchId))
        .run()
      while (current.nextMatchId) {
        const [next] = this.database.orm
          .select()
          .from(tournamentMatches)
          .where(eq(tournamentMatches.id, current.nextMatchId))
          .all()
        if (!next) break
        const slot = current.nextSlot === 'left' ? { leftEntryId: null } : { rightEntryId: null }
        this.database.orm
          .update(tournamentMatches)
          .set({ ...slot, status: 'cancelled', updatedAt: now, winnerEntryId: null })
          .where(eq(tournamentMatches.id, next.id))
          .run()
        current = next
      }
      this.database.orm
        .update(tournaments)
        .set({ status: 'in_progress', updatedAt: now })
        .where(eq(tournaments.id, id))
        .run()
      this.audit(id, 'match.result_undone', { matchId })
    })
    return this.detail(id)
  }
  private async mutableDraft(id: string) {
    const [row] = await this.database.orm.select().from(tournaments).where(eq(tournaments.id, id))
    return row?.status === 'draft' ? row : null
  }
  private applySeeds(entries: Array<typeof tournamentEntries.$inferSelect>) {
    entries.forEach((entry, index) =>
      this.database.orm
        .update(tournamentEntries)
        .set({ seed: -(index + 1) })
        .where(eq(tournamentEntries.id, entry.id))
        .run(),
    )
    entries.forEach((entry, index) =>
      this.database.orm
        .update(tournamentEntries)
        .set({ seed: index + 1 })
        .where(eq(tournamentEntries.id, entry.id))
        .run(),
    )
  }
  private reseed(id: string) {
    const entries = this.database.orm
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
      .all()
    this.applySeeds(entries)
  }
  private audit(tournamentId: string, action: string, payload: Record<string, unknown>) {
    this.database.orm
      .insert(tournamentAuditLog)
      .values({
        action,
        createdAt: new Date().toISOString(),
        id: randomUUID(),
        payloadJson: JSON.stringify(payload),
        tournamentId,
      })
      .run()
  }
  private async transition(id: string, from: string, to: string, action: string) {
    const now = new Date().toISOString()
    const rows = await this.database.orm
      .update(tournaments)
      .set({ status: to, updatedAt: now })
      .where(and(eq(tournaments.id, id), eq(tournaments.status, from)))
      .returning()
    if (!rows.length) return null
    this.audit(id, action, {})
    return this.detail(id)
  }
}
