import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import {
  type ChatMessageReceived,
  type GiveawayCaptureRule,
  GiveawayCaptureRuleListSchema,
  GiveawayCaptureRuleSchema,
  type SaveGiveawayCaptureRuleRequest,
} from '@streamkit/contracts'
import { and, eq, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import {
  giveawayCaptureRules,
  giveawayParticipants,
  giveaways,
  integrationConnections,
} from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'
import { normalizeCaptureText } from './domain/chat-capture-rule'

@Injectable()
export class GiveawayCaptureRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async capture(rule: GiveawayCaptureRule, event: ChatMessageReceived): Promise<boolean> {
    return this.database.transaction(() => {
      const identity = normalizeCaptureText(event.author.handle)
      const giveaway = this.database.orm
        .select({ maxParticipants: giveaways.maxParticipants, status: giveaways.status })
        .from(giveaways)
        .where(eq(giveaways.id, rule.giveawayId))
        .get()
      if (!giveaway || !['completed', 'draft', 'ready'].includes(giveaway.status)) return false
      const existing = this.database.orm
        .select()
        .from(giveawayParticipants)
        .where(
          and(
            eq(giveawayParticipants.giveawayId, rule.giveawayId),
            or(
              and(
                eq(giveawayParticipants.provider, event.provider),
                eq(giveawayParticipants.providerUserId, event.author.providerUserId),
              ),
              and(
                eq(giveawayParticipants.provider, event.provider),
                eq(giveawayParticipants.normalizedName, identity),
                isNull(giveawayParticipants.providerUserId),
              ),
              and(
                isNull(giveawayParticipants.provider),
                eq(giveawayParticipants.normalizedName, identity),
                isNull(giveawayParticipants.providerUserId),
              ),
            ),
          ),
        )
        .get()
      if (existing && existing.providerUserId !== event.author.providerUserId)
        this.database.orm
          .update(giveawayParticipants)
          .set({
            channelId: event.channelId,
            displayName: event.author.handle,
            provider: event.provider,
            providerUserId: event.author.providerUserId,
          })
          .where(eq(giveawayParticipants.id, existing.id))
          .run()
      const duplicate = Boolean(existing?.active) && rule.entryPolicy === 'unique'
      const now = new Date().toISOString()
      if (duplicate) {
        this.database.orm
          .update(giveawayCaptureRules)
          .set({ duplicateCount: sql`${giveawayCaptureRules.duplicateCount} + 1`, updatedAt: now })
          .where(eq(giveawayCaptureRules.id, rule.id))
          .run()
        return false
      }
      const limits = this.database.orm
        .select({
          participants: sql<number>`count(*)`,
          tickets: sql<number>`coalesce(sum(${giveawayParticipants.ticketCount}), 0)`,
        })
        .from(giveawayParticipants)
        .where(
          and(
            eq(giveawayParticipants.giveawayId, rule.giveawayId),
            eq(giveawayParticipants.active, true),
          ),
        )
        .get()
      const exceedsLimit =
        (!existing?.active && (limits?.participants ?? 0) >= giveaway.maxParticipants) ||
        (rule.entryPolicy === 'tickets' && (limits?.tickets ?? 0) >= 100_000)
      if (exceedsLimit) {
        this.database.orm
          .update(giveawayCaptureRules)
          .set({ rejectedCount: sql`${giveawayCaptureRules.rejectedCount} + 1`, updatedAt: now })
          .where(eq(giveawayCaptureRules.id, rule.id))
          .run()
        return false
      }
      if (existing) {
        this.database.orm
          .update(giveawayParticipants)
          .set({
            active: true,
            channelId: event.channelId,
            displayName: event.author.handle,
            normalizedName: identity,
            ticketCount:
              existing.active && rule.entryPolicy === 'tickets' ? existing.ticketCount + 1 : 1,
          })
          .where(eq(giveawayParticipants.id, existing.id))
          .run()
      } else {
        this.database.orm
          .insert(giveawayParticipants)
          .values({
            active: true,
            channelId: event.channelId,
            createdAt: now,
            displayName: event.author.handle,
            externalRef: `${event.provider}:${event.author.providerUserId}`,
            giveawayId: rule.giveawayId,
            id: randomUUID(),
            normalizedName: identity,
            provider: event.provider,
            providerUserId: event.author.providerUserId,
            source: 'chat',
            ticketCount: 1,
          })
          .run()
      }
      this.database.orm
        .update(giveawayCaptureRules)
        .set({ capturedCount: sql`${giveawayCaptureRules.capturedCount} + 1`, updatedAt: now })
        .where(eq(giveawayCaptureRules.id, rule.id))
        .run()
      this.database.orm
        .update(giveaways)
        .set({ status: 'ready', updatedAt: now })
        .where(eq(giveaways.id, rule.giveawayId))
        .run()
      return true
    })
  }

  public async delete(id: string): Promise<void> {
    await this.database.orm.delete(giveawayCaptureRules).where(eq(giveawayCaptureRules.id, id))
  }

  public async completeExpired(): Promise<void> {
    const now = new Date().toISOString()
    await this.database.orm
      .update(giveawayCaptureRules)
      .set({ status: 'completed', updatedAt: now })
      .where(
        and(
          eq(giveawayCaptureRules.status, 'active'),
          isNotNull(giveawayCaptureRules.endsAt),
          lte(giveawayCaptureRules.endsAt, now),
        ),
      )
  }

  public async findForEvent(event: ChatMessageReceived) {
    const rows = await this.database.orm
      .select({ rule: giveawayCaptureRules })
      .from(giveawayCaptureRules)
      .innerJoin(
        integrationConnections,
        eq(integrationConnections.id, giveawayCaptureRules.connectionId),
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
          eq(giveawayCaptureRules.status, 'active'),
        ),
      )
    return rows.map(({ rule }) => this.parseRule(rule))
  }

  public async list(giveawayId: string) {
    return GiveawayCaptureRuleListSchema.parse({
      items: (
        await this.database.orm
          .select()
          .from(giveawayCaptureRules)
          .where(eq(giveawayCaptureRules.giveawayId, giveawayId))
      ).map((row) => this.parseRule(row)),
    })
  }

  public async save(giveawayId: string, input: SaveGiveawayCaptureRuleRequest) {
    const now = new Date().toISOString()
    const { livepix, ...rest } = input
    const livepixColumns = {
      livepixAutoEntry: livepix?.autoEntry ?? false,
      livepixCurrency: livepix?.currency ?? null,
      livepixMinimumAmountInCents: livepix?.minimumAmountInCents ?? null,
    }
    await this.database.orm
      .insert(giveawayCaptureRules)
      .values({
        ...rest,
        ...livepixColumns,
        capturedCount: 0,
        createdAt: now,
        duplicateCount: 0,
        giveawayId,
        id: randomUUID(),
        rejectedCount: 0,
        status: 'active',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [giveawayCaptureRules.giveawayId, giveawayCaptureRules.connectionId],
        set: { ...rest, ...livepixColumns, status: 'active', updatedAt: now },
      })
    const [row] = await this.database.orm
      .select()
      .from(giveawayCaptureRules)
      .where(
        and(
          eq(giveawayCaptureRules.giveawayId, giveawayId),
          eq(giveawayCaptureRules.connectionId, input.connectionId),
        ),
      )
    return this.parseRule(row!)
  }

  public async updateStatus(id: string, status: GiveawayCaptureRule['status']) {
    await this.database.orm
      .update(giveawayCaptureRules)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(giveawayCaptureRules.id, id))
  }

  private parseRule(row: typeof giveawayCaptureRules.$inferSelect) {
    return GiveawayCaptureRuleSchema.parse({
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
