import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  type CreateGiveawayRequest,
  type Giveaway,
  type GiveawayDetail,
  GiveawayDetailSchema,
  type GiveawayHistory,
  GiveawayHistorySchema,
  GiveawayListSchema,
  type GiveawayRound,
  GiveawayRoundSchema,
  GiveawaySchema,
  type IntegrationProvider,
  type ParsedParticipant,
  type UpdateGiveawayRequest,
} from '@streamkit/contracts'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import {
  giveawayCaptureRules,
  giveawayParticipants,
  giveawayRoundEntries,
  giveawayRounds,
  giveaways,
  paymentContributions,
} from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'
import { selectWinner } from './domain/draw-winner'

@Injectable()
export class GiveawayRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}
  public async create(input: CreateGiveawayRequest): Promise<Giveaway> {
    const now = new Date().toISOString()
    const row = {
      ...input,
      maxParticipants: input.maxParticipants ?? 10_000,
      createdAt: now,
      id: randomUUID(),
      source: 'manual' as const,
      status: 'draft' as const,
      updatedAt: now,
    }
    await this.database.orm.insert(giveaways).values(row)
    return GiveawaySchema.parse(row)
  }
  public async list() {
    return GiveawayListSchema.parse({
      items: await this.database.orm.select().from(giveaways).orderBy(desc(giveaways.createdAt)),
    })
  }
  public async detail(id: string): Promise<GiveawayDetail | null> {
    const [giveaway] = await this.database.orm.select().from(giveaways).where(eq(giveaways.id, id))
    if (!giveaway) return null
    const participants = await this.database.orm
      .select()
      .from(giveawayParticipants)
      .where(and(eq(giveawayParticipants.giveawayId, id), eq(giveawayParticipants.active, true)))
      .orderBy(asc(giveawayParticipants.createdAt))
    const contributionMetadata = await this.livepixContributionMetadata(
      participants.map((participant) => participant.externalRef),
    )
    const activeRound = await this.activeRound(id)
    return GiveawayDetailSchema.parse({
      giveaway,
      participants: participants.map((participant) => ({
        ...participant,
        ...(participant.externalRef
          ? (contributionMetadata.get(participant.externalRef) ?? {
              livepixAmountInCents: null,
              livepixCurrency: null,
            })
          : { livepixAmountInCents: null, livepixCurrency: null }),
      })),
      activeRound,
    })
  }

  private async livepixContributionMetadata(externalRefs: Array<string | null>) {
    const resourceIds = externalRefs
      .filter((value): value is string => Boolean(value?.startsWith('livepix:')))
      .map((value) => value.slice('livepix:'.length))
    if (!resourceIds.length)
      return new Map<string, { livepixAmountInCents: number; livepixCurrency: string }>()
    const rows = await this.database.orm
      .select({
        amountInCents: paymentContributions.amountInCents,
        currency: paymentContributions.currency,
        providerResourceId: paymentContributions.providerResourceId,
      })
      .from(paymentContributions)
      .where(inArray(paymentContributions.providerResourceId, resourceIds))
    return new Map(
      rows.map((row) => [
        `livepix:${row.providerResourceId}`,
        { livepixAmountInCents: row.amountInCents, livepixCurrency: row.currency },
      ]),
    )
  }
  public async replaceParticipants(
    id: string,
    entries: ParsedParticipant[],
    provider: IntegrationProvider | null,
    channelId: string | null,
  ): Promise<GiveawayDetail | null> {
    const [giveaway] = await this.database.orm.select().from(giveaways).where(eq(giveaways.id, id))
    if (!giveaway || !['draft', 'ready'].includes(giveaway.status)) return null
    const persisted = await this.database.orm
      .select()
      .from(giveawayParticipants)
      .where(
        and(eq(giveawayParticipants.giveawayId, id), eq(giveawayParticipants.source, 'manual')),
      )
    this.database.transaction(() => {
      const createdAt = new Date().toISOString()
      const pending = new Map(entries.map((entry) => [entry.normalizedName, entry]))
      for (const participant of persisted) {
        const entry = pending.get(participant.normalizedName)
        this.database.orm
          .update(giveawayParticipants)
          .set(
            entry
              ? {
                  active: true,
                  channelId,
                  displayName: entry.displayName,
                  provider,
                  ticketCount: entry.ticketCount,
                }
              : { active: false },
          )
          .where(eq(giveawayParticipants.id, participant.id))
          .run()
        if (entry) pending.delete(participant.normalizedName)
      }
      if (pending.size)
        this.database.orm
          .insert(giveawayParticipants)
          .values(
            [...pending.values()].map((entry) => ({
              ...entry,
              active: true,
              channelId,
              createdAt,
              externalRef: null,
              giveawayId: id,
              id: randomUUID(),
              provider,
              providerUserId: null,
              source: 'manual',
            })),
          )
          .run()
      this.database.orm
        .update(giveaways)
        .set({ updatedAt: createdAt })
        .where(eq(giveaways.id, id))
        .run()
    })
    return this.detail(id)
  }
  public async transition(id: string, from: string[], status: string): Promise<Giveaway | null> {
    const [current] = await this.database.orm.select().from(giveaways).where(eq(giveaways.id, id))
    if (!current || !from.includes(current.status)) return null
    const updatedAt = new Date().toISOString()
    await this.database.orm.update(giveaways).set({ status, updatedAt }).where(eq(giveaways.id, id))
    return GiveawaySchema.parse({ ...current, status, updatedAt })
  }
  public async update(id: string, input: UpdateGiveawayRequest): Promise<Giveaway | null> {
    const detail = await this.detail(id)
    if (!detail || !['draft', 'ready'].includes(detail.giveaway.status)) return null
    const updatedAt = new Date().toISOString()
    await this.database.orm
      .update(giveaways)
      .set({ ...input, updatedAt })
      .where(eq(giveaways.id, id))
    return GiveawaySchema.parse({ ...detail.giveaway, ...input, updatedAt })
  }
  public async delete(id: string): Promise<boolean> {
    return this.database.orm.delete(giveaways).where(eq(giveaways.id, id)).run().changes > 0
  }
  public async removeParticipant(id: string, participantId: string): Promise<boolean> {
    const result = await this.database.orm
      .update(giveawayParticipants)
      .set({ active: false })
      .where(
        and(
          eq(giveawayParticipants.id, participantId),
          eq(giveawayParticipants.giveawayId, id),
          eq(giveawayParticipants.active, true),
        ),
      )
    return result.changes > 0
  }
  public async draw(id: string): Promise<GiveawayRound | null> {
    return this.database.transaction(() => {
      const [giveaway] = this.database.orm
        .select()
        .from(giveaways)
        .where(eq(giveaways.id, id))
        .all()
      if (!giveaway || giveaway.status !== 'ready') return null
      const participants = this.database.orm
        .select()
        .from(giveawayParticipants)
        .where(and(eq(giveawayParticipants.giveawayId, id), eq(giveawayParticipants.active, true)))
        .orderBy(asc(giveawayParticipants.createdAt))
        .all()
      if (!participants.length) return null
      const entries = participants.map((participant) => ({
        displayName: participant.displayName,
        participantId: participant.id,
        ticketCount: participant.ticketCount,
      }))
      const selection = selectWinner(entries)
      const roundId = randomUUID()
      const startedAt = new Date().toISOString()
      const changed = this.database.orm
        .update(giveaways)
        .set({ status: 'drawing', updatedAt: startedAt })
        .where(and(eq(giveaways.id, id), eq(giveaways.status, 'ready')))
        .returning({ id: giveaways.id })
        .all()
      if (!changed.length) return null
      this.database.orm
        .insert(giveawayRounds)
        .values({
          completedAt: null,
          giveawayId: id,
          id: roundId,
          mode: giveaway.mode,
          randomProof: selection.randomProof,
          snapshotHash: selection.snapshotHash,
          startedAt,
          status: 'drawing',
          ticketCount: selection.ticketCount,
          winnerParticipantId: selection.winnerParticipantId,
        })
        .run()
      this.database.orm
        .insert(giveawayRoundEntries)
        .values(
          entries.map((entry, position) => ({
            id: randomUUID(),
            participantId: entry.participantId,
            position,
            roundId,
            ticketCount: entry.ticketCount,
          })),
        )
        .run()
      this.database.orm
        .update(giveawayCaptureRules)
        .set({ status: 'paused', updatedAt: startedAt })
        .where(
          and(eq(giveawayCaptureRules.giveawayId, id), eq(giveawayCaptureRules.status, 'active')),
        )
        .run()
      return GiveawayRoundSchema.parse({
        ...selection,
        completedAt: null,
        entries,
        giveawayId: id,
        id: roundId,
        mode: giveaway.mode,
        startedAt,
        status: 'drawing',
      })
    })
  }
  public async complete(id: string, roundId: string): Promise<GiveawayRound | null> {
    const active = await this.activeRound(id)
    if (!active || active.id !== roundId) return null
    const completedAt = new Date().toISOString()
    const completed = this.database.transaction(() => {
      const changed = this.database.orm
        .update(giveawayRounds)
        .set({ completedAt, status: 'completed' })
        .where(and(eq(giveawayRounds.id, roundId), eq(giveawayRounds.status, 'drawing')))
        .returning({ id: giveawayRounds.id })
        .all()
      if (!changed.length) return false
      this.database.orm
        .update(giveaways)
        .set({ status: 'completed', updatedAt: completedAt })
        .where(eq(giveaways.id, id))
        .run()
      return true
    })
    if (!completed) return null
    return GiveawayRoundSchema.parse({ ...active, completedAt, status: 'completed' })
  }
  public async history(id: string): Promise<GiveawayHistory> {
    const rounds = await this.database.orm
      .select()
      .from(giveawayRounds)
      .where(eq(giveawayRounds.giveawayId, id))
      .orderBy(desc(giveawayRounds.startedAt))
    return GiveawayHistorySchema.parse({
      items: await Promise.all(rounds.map((round) => this.hydrateRound(round))),
    })
  }
  public async nextRound(id: string, removeWinner: boolean): Promise<GiveawayDetail | null> {
    const detail = await this.detail(id)
    if (!detail || detail.giveaway.status !== 'completed' || !detail.activeRound) return null
    this.database.transaction(() => {
      if (removeWinner)
        this.database.orm
          .update(giveawayParticipants)
          .set({ active: false })
          .where(eq(giveawayParticipants.id, detail.activeRound!.winnerParticipantId))
          .run()
      this.database.orm
        .update(giveaways)
        .set({ status: 'ready', updatedAt: new Date().toISOString() })
        .where(eq(giveaways.id, id))
        .run()
    })
    return this.detail(id)
  }
  private async activeRound(id: string): Promise<GiveawayRound | null> {
    const [round] = await this.database.orm
      .select()
      .from(giveawayRounds)
      .where(eq(giveawayRounds.giveawayId, id))
      .orderBy(desc(giveawayRounds.startedAt))
      .limit(1)
    return round ? this.hydrateRound(round) : null
  }
  private async hydrateRound(round: typeof giveawayRounds.$inferSelect): Promise<GiveawayRound> {
    const rows = await this.database.orm
      .select({
        displayName: giveawayParticipants.displayName,
        participantId: giveawayRoundEntries.participantId,
        ticketCount: giveawayRoundEntries.ticketCount,
      })
      .from(giveawayRoundEntries)
      .innerJoin(
        giveawayParticipants,
        eq(giveawayParticipants.id, giveawayRoundEntries.participantId),
      )
      .where(eq(giveawayRoundEntries.roundId, round.id))
      .orderBy(asc(giveawayRoundEntries.position))
    return GiveawayRoundSchema.parse({ ...round, entries: rows })
  }
}
