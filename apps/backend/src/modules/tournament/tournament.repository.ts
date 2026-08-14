import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  type CompleteTournamentMatchRequest,
  type CreateTournamentRequest,
  type TournamentDetail,
  TournamentDetailSchema,
  TournamentListSchema,
  TournamentSchema,
  type UpdateTournamentRequest,
} from '@streamkit/contracts'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import {
  tournamentAuditLog,
  tournamentEntries,
  tournamentMatches,
  tournamentParticipants,
  tournaments,
  tournamentTeamMembers,
  tournamentTeams,
} from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'
import {
  advancingMatchStatus,
  generateSingleEliminationBracket,
  secureShuffle,
} from './domain/single-elimination'
import { canOccupySlot, normalizedPersonName, reorderSeededValues } from './domain/team-slots'

@Injectable()
export class TournamentRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async create(input: CreateTournamentRequest) {
    const now = new Date().toISOString()
    const row = {
      ...input,
      createdAt: now,
      currentMatchId: null,
      id: randomUUID(),
      status: 'draft' as const,
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
        .orderBy(desc(tournaments.createdAt)),
    })
  }
  public async update(id: string, input: UpdateTournamentRequest) {
    const [current] = await this.database.orm
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
    if (!current) return null
    const changesStructure =
      (input.mode !== undefined && input.mode !== current.mode) ||
      (input.bracketSize !== undefined && input.bracketSize !== current.bracketSize)
    if (changesStructure) {
      const detail = await this.detail(id)
      if (!detail || detail.matches.length) return 'conflict' as const
    }
    const mode = input.mode ?? current.mode
    const teamCapacity = mode === 'team' ? (input.teamCapacity ?? current.teamCapacity ?? 3) : null
    const updatedAt = new Date().toISOString()
    const next = { ...input, mode, teamCapacity, updatedAt }
    this.database.transaction(() => {
      if (input.mode !== undefined && input.mode !== current.mode)
        this.adaptTournamentMode(id, current.mode, input.mode, teamCapacity ?? 3)
      if (mode === 'individual' && input.bracketSize !== undefined)
        this.reconcileIndividualEntries(id, input.bracketSize)
      this.database.orm.update(tournaments).set(next).where(eq(tournaments.id, id)).run()
      this.audit(id, 'tournament.structure.updated', {
        bracketSize: input.bracketSize ?? current.bracketSize,
        mode,
      })
    })
    return TournamentSchema.parse({ ...current, ...next })
  }
  private adaptTournamentMode(
    id: string,
    from: string,
    to: 'individual' | 'team',
    teamCapacity: number,
  ): void {
    const now = new Date().toISOString()
    if (from === 'individual' && to === 'team') {
      const entrants = this.database.orm
        .select({ name: tournamentParticipants.displayName, seed: tournamentEntries.seed })
        .from(tournamentEntries)
        .innerJoin(
          tournamentParticipants,
          eq(tournamentEntries.participantId, tournamentParticipants.id),
        )
        .where(eq(tournamentEntries.tournamentId, id))
        .orderBy(asc(tournamentEntries.seed))
        .all()
      this.database.orm
        .delete(tournamentEntries)
        .where(eq(tournamentEntries.tournamentId, id))
        .run()
      this.database.orm
        .delete(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, id))
        .run()
      entrants.forEach((entrant) => {
        const teamId = randomUUID()
        this.database.orm
          .insert(tournamentTeams)
          .values({
            capacity: teamCapacity,
            color: '#3B82F6',
            createdAt: now,
            id: teamId,
            name: entrant.name,
            seed: entrant.seed,
            tournamentId: id,
            updatedAt: now,
          })
          .run()
        this.database.orm
          .insert(tournamentEntries)
          .values({
            createdAt: now,
            id: randomUUID(),
            participantId: null,
            seed: entrant.seed,
            teamId,
            tournamentId: id,
          })
          .run()
      })
      return
    }
    const entrants = this.database.orm
      .select({ name: tournamentTeams.name, seed: tournamentEntries.seed })
      .from(tournamentEntries)
      .innerJoin(tournamentTeams, eq(tournamentEntries.teamId, tournamentTeams.id))
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
      .all()
    this.database.orm.delete(tournamentEntries).where(eq(tournamentEntries.tournamentId, id)).run()
    this.database.orm.delete(tournamentTeams).where(eq(tournamentTeams.tournamentId, id)).run()
    this.database.orm
      .delete(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, id))
      .run()
    entrants.forEach((entrant) => {
      const participantId = randomUUID()
      this.database.orm
        .insert(tournamentParticipants)
        .values({
          createdAt: now,
          displayName: entrant.name,
          externalRef: null,
          id: participantId,
          identityKey: normalizedPersonName(entrant.name),
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
          seed: entrant.seed,
          teamId: null,
          tournamentId: id,
        })
        .run()
    })
  }
  public async delete(id: string): Promise<boolean> {
    return this.database.orm.delete(tournaments).where(eq(tournaments.id, id)).run().changes > 0
  }
  public async detail(id: string): Promise<TournamentDetail | null> {
    const [tournament] = await this.database.orm
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
    if (!tournament) return null
    const participantRows =
      tournament.mode === 'individual'
        ? await this.database.orm
            .select({
              channelId: tournamentParticipants.channelId,
              createdAt: tournamentParticipants.createdAt,
              displayName: tournamentParticipants.displayName,
              entryId: tournamentEntries.id,
              id: tournamentParticipants.id,
              provider: tournamentParticipants.provider,
              providerUserId: tournamentParticipants.providerUserId,
              seed: tournamentEntries.seed,
              source: tournamentParticipants.source,
              tournamentId: tournamentParticipants.tournamentId,
            })
            .from(tournamentParticipants)
            .leftJoin(
              tournamentEntries,
              eq(tournamentEntries.participantId, tournamentParticipants.id),
            )
            .where(eq(tournamentParticipants.tournamentId, id))
            .orderBy(asc(tournamentEntries.seed), asc(tournamentParticipants.createdAt))
        : (
            await this.database.orm
              .select()
              .from(tournamentParticipants)
              .where(eq(tournamentParticipants.tournamentId, id))
              .orderBy(asc(tournamentParticipants.createdAt))
          ).map((row) => ({
            channelId: row.channelId,
            createdAt: row.createdAt,
            displayName: row.displayName,
            entryId: null,
            id: row.id,
            provider: row.provider,
            providerUserId: row.providerUserId,
            seed: null,
            source: row.source,
            tournamentId: row.tournamentId,
          }))
    const teamRows = await this.database.orm
      .select({
        capacity: tournamentTeams.capacity,
        color: tournamentTeams.color,
        createdAt: tournamentTeams.createdAt,
        entryId: tournamentEntries.id,
        id: tournamentTeams.id,
        name: tournamentTeams.name,
        seed: tournamentEntries.seed,
        tournamentId: tournamentTeams.tournamentId,
        updatedAt: tournamentTeams.updatedAt,
      })
      .from(tournamentTeams)
      .innerJoin(tournamentEntries, eq(tournamentEntries.teamId, tournamentTeams.id))
      .where(eq(tournamentTeams.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
    const memberRows = await this.database.orm
      .select({
        createdAt: tournamentTeamMembers.createdAt,
        displayName: tournamentParticipants.displayName,
        id: tournamentTeamMembers.id,
        participantId: tournamentTeamMembers.participantId,
        slotPosition: tournamentTeamMembers.slotPosition,
        teamId: tournamentTeamMembers.teamId,
      })
      .from(tournamentTeamMembers)
      .innerJoin(
        tournamentParticipants,
        eq(tournamentParticipants.id, tournamentTeamMembers.participantId),
      )
      .where(eq(tournamentParticipants.tournamentId, id))
      .orderBy(asc(tournamentTeamMembers.slotPosition))
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
      teamMembers: memberRows,
      teams: teamRows,
      tournament,
    })
  }
  public async addTeam(id: string, name: string, color: string, capacity?: number) {
    const tournament = await this.mutableDraft(id)
    if (!tournament || tournament.mode !== 'team') return null
    const count = await this.database.orm.$count(
      tournamentEntries,
      eq(tournamentEntries.tournamentId, id),
    )
    if (count >= tournament.bracketSize) return 'full' as const
    const now = new Date().toISOString(),
      teamId = randomUUID(),
      resolvedCapacity = capacity ?? tournament.teamCapacity ?? 1
    this.database.transaction(() => {
      this.database.orm
        .insert(tournamentTeams)
        .values({
          capacity: resolvedCapacity,
          color,
          createdAt: now,
          id: teamId,
          name,
          seed: count + 1,
          tournamentId: id,
          updatedAt: now,
        })
        .run()
      this.database.orm
        .insert(tournamentEntries)
        .values({
          createdAt: now,
          id: randomUUID(),
          participantId: null,
          seed: count + 1,
          teamId,
          tournamentId: id,
        })
        .run()
      this.audit(id, 'team.added', { capacity: resolvedCapacity, seed: count + 1, teamId })
    })
    return this.detail(id)
  }
  public async updateTeam(
    id: string,
    teamId: string,
    name: string,
    color: string,
    capacity?: number,
  ) {
    const tournament = await this.mutableDraft(id)
    if (!tournament || tournament.mode !== 'team') return null
    const [team] = await this.database.orm
      .select()
      .from(tournamentTeams)
      .where(and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, id)))
    if (!team) return 'missing' as const
    const nextCapacity = capacity ?? team.capacity
    const members = await this.database.orm
      .select()
      .from(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.teamId, teamId))
    if (members.some((member) => member.slotPosition > nextCapacity)) return 'conflict' as const
    await this.database.orm
      .update(tournamentTeams)
      .set({ capacity: nextCapacity, color, name, updatedAt: new Date().toISOString() })
      .where(eq(tournamentTeams.id, teamId))
    this.audit(id, 'team.updated', { capacity: nextCapacity, teamId })
    return this.detail(id)
  }
  public async removeTeam(id: string, teamId: string) {
    if (!(await this.mutableDraft(id))) return null
    const [team] = await this.database.orm
      .select()
      .from(tournamentTeams)
      .where(and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, id)))
    if (!team) return 'missing' as const
    this.database.transaction(() => {
      this.database.orm.delete(tournamentEntries).where(eq(tournamentEntries.teamId, teamId)).run()
      this.database.orm.delete(tournamentTeams).where(eq(tournamentTeams.id, teamId)).run()
      this.reseed(id)
      this.audit(id, 'team.removed', { teamId })
    })
    return this.detail(id)
  }
  public async addTeamMember(
    id: string,
    teamId: string,
    displayName: string,
    slotPosition: number,
  ) {
    const tournament = await this.mutableDraft(id)
    if (!tournament || tournament.mode !== 'team') return null
    const [team] = await this.database.orm
      .select()
      .from(tournamentTeams)
      .where(and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, id)))
    if (!team) return 'missing' as const
    const occupied = (
      await this.database.orm
        .select()
        .from(tournamentTeamMembers)
        .where(eq(tournamentTeamMembers.teamId, teamId))
    ).map((member) => member.slotPosition)
    if (!canOccupySlot(team.capacity, slotPosition, occupied)) return 'conflict' as const
    const participants = await this.database.orm
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, id))
    if (
      participants.some(
        (participant) =>
          normalizedPersonName(participant.displayName) === normalizedPersonName(displayName),
      )
    )
      return 'duplicate' as const
    const now = new Date().toISOString(),
      participantId = randomUUID(),
      memberId = randomUUID()
    try {
      this.database.transaction(() => {
        this.database.orm
          .insert(tournamentParticipants)
          .values({
            createdAt: now,
            displayName,
            externalRef: null,
            id: participantId,
            identityKey: normalizedPersonName(displayName),
            source: 'manual',
            tournamentId: id,
          })
          .run()
        this.database.orm
          .insert(tournamentTeamMembers)
          .values({ createdAt: now, id: memberId, participantId, slotPosition, teamId })
          .run()
        this.audit(id, 'team_member.added', { memberId, slotPosition, teamId })
      })
    } catch {
      const duplicate = await this.database.orm.$count(
        tournamentParticipants,
        and(
          eq(tournamentParticipants.tournamentId, id),
          eq(tournamentParticipants.identityKey, normalizedPersonName(displayName)),
        ),
      )
      return duplicate ? ('duplicate' as const) : ('conflict' as const)
    }
    return this.detail(id)
  }
  public async assignParticipant(
    id: string,
    teamId: string,
    participantId: string,
    slotPosition: number,
  ) {
    const tournament = await this.mutableDraft(id)
    if (!tournament || tournament.mode !== 'team') return null
    const [team] = await this.database.orm
      .select()
      .from(tournamentTeams)
      .where(and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, id)))
    const [participant] = await this.database.orm
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.id, participantId),
          eq(tournamentParticipants.tournamentId, id),
        ),
      )
    if (!team || !participant) return 'missing' as const
    const occupied = (
      await this.database.orm
        .select()
        .from(tournamentTeamMembers)
        .where(eq(tournamentTeamMembers.teamId, teamId))
    ).map((member) => member.slotPosition)
    if (!canOccupySlot(team.capacity, slotPosition, occupied)) return 'conflict' as const
    const assigned = await this.database.orm.$count(
      tournamentTeamMembers,
      eq(tournamentTeamMembers.participantId, participantId),
    )
    if (assigned) return 'conflict' as const
    await this.database.orm.insert(tournamentTeamMembers).values({
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      participantId,
      slotPosition,
      teamId,
    })
    this.audit(id, 'team_member.assigned', { participantId, slotPosition, teamId })
    return this.detail(id)
  }
  public async moveTeamMember(
    id: string,
    memberId: string,
    targetTeamId: string,
    targetSlotPosition: number,
  ) {
    const tournament = await this.mutableDraft(id)
    if (!tournament || tournament.mode !== 'team') return null
    const [member] = await this.database.orm
      .select()
      .from(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.id, memberId))
    const [target] = await this.database.orm
      .select()
      .from(tournamentTeams)
      .where(and(eq(tournamentTeams.id, targetTeamId), eq(tournamentTeams.tournamentId, id)))
    if (!member || !target) return 'missing' as const
    const occupied = (
      await this.database.orm
        .select()
        .from(tournamentTeamMembers)
        .where(eq(tournamentTeamMembers.teamId, targetTeamId))
    )
      .filter((item) => item.id !== memberId)
      .map((item) => item.slotPosition)
    if (!canOccupySlot(target.capacity, targetSlotPosition, occupied)) return 'conflict' as const
    try {
      this.database.transaction(() => {
        this.database.orm
          .update(tournamentTeamMembers)
          .set({ slotPosition: targetSlotPosition, teamId: targetTeamId })
          .where(eq(tournamentTeamMembers.id, memberId))
          .run()
        this.audit(id, 'team_member.moved', { memberId, targetSlotPosition, targetTeamId })
      })
    } catch {
      return 'conflict' as const
    }
    return this.detail(id)
  }
  public async removeTeamMember(id: string, memberId: string) {
    if (!(await this.mutableDraft(id))) return null
    const [member] = await this.database.orm
      .select()
      .from(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.id, memberId))
    if (!member) return 'missing' as const
    this.database.transaction(() => {
      this.database.orm
        .delete(tournamentTeamMembers)
        .where(eq(tournamentTeamMembers.id, memberId))
        .run()
      this.audit(id, 'team_member.unassigned', { memberId, participantId: member.participantId })
    })
    return this.detail(id)
  }
  public async shuffleTeamMembers(id: string) {
    const tournament = await this.mutableDraft(id)
    if (!tournament || tournament.mode !== 'team') return null
    const teams = await this.database.orm
      .select()
      .from(tournamentTeams)
      .where(eq(tournamentTeams.tournamentId, id))
      .orderBy(asc(tournamentTeams.seed))
    const participants = await this.database.orm
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, id))
    if (!teams.length || participants.length > teams.reduce((sum, team) => sum + team.capacity, 0))
      return 'conflict' as const
    const shuffled = secureShuffle(participants)
    this.database.transaction(() => {
      this.database.orm
        .delete(tournamentTeamMembers)
        .where(
          sql`${tournamentTeamMembers.teamId} IN (${sql.join(
            teams.map((team) => sql`${team.id}`),
            sql`, `,
          )})`,
        )
        .run()
      let memberIndex = 0
      for (let slot = 1; memberIndex < shuffled.length; slot += 1) {
        for (const team of teams) {
          if (slot > team.capacity || memberIndex >= shuffled.length) continue
          const participant = shuffled[memberIndex++]!
          this.database.orm
            .insert(tournamentTeamMembers)
            .values({
              createdAt: new Date().toISOString(),
              id: randomUUID(),
              participantId: participant.id,
              slotPosition: slot,
              teamId: team.id,
            })
            .run()
        }
      }
      this.audit(id, 'team_members.shuffled', { memberCount: shuffled.length })
    })
    return this.detail(id)
  }
  public async reorderTeam(id: string, teamId: string, seed: number) {
    const tournament = await this.mutableDraft(id)
    if (!tournament || tournament.mode !== 'team') return null
    const entries = await this.database.orm
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
    const index = entries.findIndex((entry) => entry.teamId === teamId)
    if (index < 0) return 'missing' as const
    const reordered = reorderSeededValues(entries, index, seed)
    this.database.transaction(() => {
      this.applySeeds(reordered)
      reordered.forEach((item, position) => {
        if (item.teamId)
          this.database.orm
            .update(tournamentTeams)
            .set({ seed: position + 1 })
            .where(eq(tournamentTeams.id, item.teamId))
            .run()
      })
      this.audit(id, 'team_seeding.reordered', { seed, teamId })
    })
    return this.detail(id)
  }
  public async addParticipant(id: string, displayName: string) {
    const tournament = await this.mutableDraft(id)
    if (!tournament) return null
    if (tournament.mode === 'team') {
      const duplicate = await this.database.orm.$count(
        tournamentParticipants,
        and(
          eq(tournamentParticipants.tournamentId, id),
          eq(tournamentParticipants.identityKey, normalizedPersonName(displayName)),
        ),
      )
      if (duplicate) return 'duplicate' as const
      const now = new Date().toISOString(),
        participantId = randomUUID()
      await this.database.orm.insert(tournamentParticipants).values({
        createdAt: now,
        displayName,
        externalRef: null,
        id: participantId,
        identityKey: normalizedPersonName(displayName),
        source: 'manual',
        tournamentId: id,
      })
      this.audit(id, 'participant.queued', { participantId })
      return this.detail(id)
    }
    const count = await this.database.orm.$count(
      tournamentEntries,
      eq(tournamentEntries.tournamentId, id),
    )
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
          identityKey: null,
          source: 'manual',
          tournamentId: id,
        })
        .run()
      if (count < tournament.bracketSize)
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
      this.audit(id, count < tournament.bracketSize ? 'participant.added' : 'participant.queued', {
        participantId,
        seed: count < tournament.bracketSize ? count + 1 : null,
      })
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
    const tournament = await this.mutableDraft(id)
    if (!tournament) return null
    if (tournament.mode === 'team') {
      const [participant] = await this.database.orm
        .select()
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.id, participantId),
            eq(tournamentParticipants.tournamentId, id),
          ),
        )
      if (!participant) return 'missing' as const
      await this.database.orm
        .delete(tournamentParticipants)
        .where(eq(tournamentParticipants.id, participantId))
      this.audit(id, 'participant.removed', { participantId })
      return this.detail(id)
    }
    const [participant] = await this.database.orm
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.id, participantId),
          eq(tournamentParticipants.tournamentId, id),
        ),
      )
    if (!participant) return 'missing' as const
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
      this.promoteQueuedParticipant(id, tournament.bracketSize)
      this.audit(id, 'participant.removed', { participantId })
    })
    return this.detail(id)
  }
  private reconcileIndividualEntries(id: string, bracketSize: number): void {
    const entries = this.database.orm
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
      .all()
    for (const entry of entries.slice(bracketSize))
      this.database.orm.delete(tournamentEntries).where(eq(tournamentEntries.id, entry.id)).run()
    this.reseed(id)
    while (
      this.database.orm
        .select({ count: sql<number>`count(*)` })
        .from(tournamentEntries)
        .where(eq(tournamentEntries.tournamentId, id))
        .get()!.count < bracketSize
    ) {
      if (!this.promoteQueuedParticipant(id, bracketSize)) break
    }
  }
  private promoteQueuedParticipant(id: string, bracketSize: number): boolean {
    const entries = this.database.orm
      .select()
      .from(tournamentEntries)
      .where(eq(tournamentEntries.tournamentId, id))
      .orderBy(asc(tournamentEntries.seed))
      .all()
    if (entries.length >= bracketSize) return false
    const occupied = new Set(entries.map((entry) => entry.participantId).filter(Boolean))
    const participant = this.database.orm
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, id))
      .orderBy(asc(tournamentParticipants.createdAt))
      .all()
      .find((item) => !occupied.has(item.id))
    if (!participant) return false
    this.database.orm
      .insert(tournamentEntries)
      .values({
        createdAt: new Date().toISOString(),
        id: randomUUID(),
        participantId: participant.id,
        seed: entries.length + 1,
        teamId: null,
        tournamentId: id,
      })
      .run()
    return true
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
    const reordered = reorderSeededValues(entries, index, seed)
    this.database.transaction(() => {
      this.applySeeds(reordered)
      this.audit(id, 'seeding.reordered', { participantId, seed })
    })
    return this.detail(id)
  }
  public async queueParticipant(id: string, participantId: string) {
    const tournament = await this.mutableDraft(id)
    if (!tournament || tournament.mode !== 'individual') return null
    const [participant] = await this.database.orm
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.id, participantId),
          eq(tournamentParticipants.tournamentId, id),
        ),
      )
    if (!participant) return 'missing' as const
    const removed = await this.database.orm
      .delete(tournamentEntries)
      .where(
        and(
          eq(tournamentEntries.tournamentId, id),
          eq(tournamentEntries.participantId, participantId),
        ),
      )
      .returning()
    if (!removed.length) return this.detail(id)
    this.database.transaction(() => {
      this.reseed(id)
      this.audit(id, 'participant.queued', { participantId })
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
            finishedAt: null,
            leftEntryId: definition.leftSeed ? entries[definition.leftSeed - 1]!.id : null,
            leftResult: 'pending' as const,
            matchNumber: definition.matchNumber,
            nextMatchId: definition.nextMatchNumber ? ids.get(definition.nextMatchNumber)! : null,
            nextSlot: definition.nextSlot,
            rightEntryId: definition.rightSeed ? entries[definition.rightSeed - 1]!.id : null,
            rightResult: 'pending' as const,
            roundNumber: definition.roundNumber,
            status: definition.roundNumber === 1 ? 'ready' : 'pending',
            startedAt: null,
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
    return this.transition(id, 'ready', 'in_progress', 'tournament.started')
  }
  public async startMatch(id: string, matchId: string) {
    const [tournament] = await this.database.orm
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
    const [match] = await this.database.orm
      .select()
      .from(tournamentMatches)
      .where(and(eq(tournamentMatches.id, matchId), eq(tournamentMatches.tournamentId, id)))
    const [currentMatch] = tournament?.currentMatchId
      ? await this.database.orm
          .select()
          .from(tournamentMatches)
          .where(eq(tournamentMatches.id, tournament.currentMatchId))
      : [null]
    if (
      !tournament ||
      tournament.status !== 'in_progress' ||
      !match ||
      match.status !== 'ready' ||
      !match.leftEntryId ||
      !match.rightEntryId ||
      (tournament.currentMatchId !== matchId && currentMatch?.status === 'in_progress')
    )
      return null
    const now = new Date().toISOString()
    this.database.transaction(() => {
      this.database.orm
        .update(tournamentMatches)
        .set({
          leftResult: 'pending',
          rightResult: 'pending',
          startedAt: now,
          status: 'in_progress',
          updatedAt: now,
        })
        .where(eq(tournamentMatches.id, matchId))
        .run()
      this.database.orm
        .update(tournaments)
        .set({ currentMatchId: matchId, updatedAt: now })
        .where(eq(tournaments.id, id))
        .run()
      this.audit(id, 'match.started', { matchId })
    })
    return this.detail(id)
  }
  public async completeMatch(id: string, matchId: string, result: CompleteTournamentMatchRequest) {
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
      tournament.currentMatchId !== matchId ||
      !match ||
      match.status !== 'in_progress' ||
      !match.leftEntryId ||
      !match.rightEntryId
    )
      return null
    const now = new Date().toISOString()
    if (result.leftResult === 'draw') {
      this.database.transaction(() => {
        this.database.orm
          .update(tournamentMatches)
          .set({ ...result, updatedAt: now })
          .where(eq(tournamentMatches.id, matchId))
          .run()
        this.audit(id, 'match.draw_recorded', { matchId })
      })
      return this.detail(id)
    }
    const winnerEntryId = result.leftResult === 'won' ? match.leftEntryId : match.rightEntryId
    this.database.transaction(() => {
      this.database.orm
        .update(tournamentMatches)
        .set({
          ...result,
          finishedAt: now,
          status: 'finished',
          updatedAt: now,
          winnerEntryId,
        })
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
      this.audit(id, 'match.completed', { matchId, ...result, winnerEntryId })
      this.audit(id, 'match.winner_set', { matchId, winnerEntryId })
    })
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
      !['ready', 'in_progress'].includes(match.status) ||
      ![match.leftEntryId, match.rightEntryId].includes(winnerEntryId)
    )
      return null
    if (match.status === 'ready' && !(await this.startMatch(id, matchId))) return null
    return this.completeMatch(
      id,
      matchId,
      winnerEntryId === match.leftEntryId
        ? { leftResult: 'won', rightResult: 'lost' }
        : { leftResult: 'lost', rightResult: 'won' },
    )
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
        .set({
          finishedAt: null,
          leftResult: 'pending',
          rightResult: 'pending',
          startedAt: now,
          status: 'in_progress',
          updatedAt: now,
          winnerEntryId: null,
        })
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
          .set({
            ...slot,
            finishedAt: null,
            leftResult: 'pending',
            rightResult: 'pending',
            startedAt: null,
            status: 'cancelled',
            updatedAt: now,
            winnerEntryId: null,
          })
          .where(eq(tournamentMatches.id, next.id))
          .run()
        current = next
      }
      this.database.orm
        .update(tournaments)
        .set({ currentMatchId: matchId, status: 'in_progress', updatedAt: now })
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
