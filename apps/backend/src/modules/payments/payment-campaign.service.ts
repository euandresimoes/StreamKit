import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import {
  giveawayCaptureRules,
  giveawayParticipants,
  giveaways,
  integrationConnections,
  tournamentCaptureRules,
  tournamentParticipants,
  tournaments,
} from '../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../infrastructure/database/sqlite-database'
import type { ContributionReceived } from '@streamkit/contracts'

@Injectable()
export class PaymentCampaignService {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  public async apply(contribution: ContributionReceived): Promise<void> {
    const handle = contribution.participantHandle
    if (!handle) return
    const identity = this.normalize(handle)
    this.database.transaction(() => {
      const giveawayRules = this.database.orm
        .select({
          rule: giveawayCaptureRules,
          provider: integrationConnections.provider,
          channelId: integrationConnections.channelId,
        })
        .from(giveawayCaptureRules)
        .innerJoin(
          integrationConnections,
          eq(integrationConnections.id, giveawayCaptureRules.connectionId),
        )
        .innerJoin(giveaways, eq(giveaways.id, giveawayCaptureRules.giveawayId))
        .where(and(eq(giveawayCaptureRules.status, 'active'), eq(giveaways.status, 'ready')))
        .all()
      for (const { rule, provider, channelId } of giveawayRules) {
        if (
          !provider ||
          !channelId ||
          !rule.livepixAutoEntry ||
          !this.accepts(rule.livepixMinimumAmountInCents, rule.livepixCurrency, contribution)
        )
          continue
        const existing = this.database.orm
          .select()
          .from(giveawayParticipants)
          .where(
            and(
              eq(giveawayParticipants.giveawayId, rule.giveawayId),
              eq(giveawayParticipants.normalizedName, identity),
              eq(giveawayParticipants.externalRef, `livepix:${contribution.providerResourceId}`),
            ),
          )
          .get()
        if (existing) continue
        this.database.orm
          .insert(giveawayParticipants)
          .values({
            active: true,
            channelId: channelId!,
            createdAt: new Date().toISOString(),
            displayName: handle,
            externalRef: `livepix:${contribution.providerResourceId}`,
            giveawayId: rule.giveawayId,
            id: randomUUID(),
            normalizedName: identity,
            provider: provider!,
            providerUserId: null,
            source: 'livepix',
            ticketCount: 1,
          })
          .run()
        this.database.orm
          .update(giveawayCaptureRules)
          .set({
            capturedCount: sql`${giveawayCaptureRules.capturedCount} + 1`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(giveawayCaptureRules.id, rule.id))
          .run()
      }
      const tournamentRules = this.database.orm
        .select({
          rule: tournamentCaptureRules,
          provider: integrationConnections.provider,
          channelId: integrationConnections.channelId,
        })
        .from(tournamentCaptureRules)
        .innerJoin(
          integrationConnections,
          eq(integrationConnections.id, tournamentCaptureRules.connectionId),
        )
        .innerJoin(tournaments, eq(tournaments.id, tournamentCaptureRules.tournamentId))
        .where(and(eq(tournamentCaptureRules.status, 'active'), eq(tournaments.status, 'ready')))
        .all()
      for (const { rule, provider, channelId } of tournamentRules) {
        if (
          !provider ||
          !channelId ||
          !rule.livepixAutoEntry ||
          !this.accepts(rule.livepixMinimumAmountInCents, rule.livepixCurrency, contribution)
        )
          continue
        const existing = this.database.orm
          .select()
          .from(tournamentParticipants)
          .where(
            and(
              eq(tournamentParticipants.tournamentId, rule.tournamentId),
              eq(tournamentParticipants.identityKey, identity),
              eq(tournamentParticipants.externalRef, `livepix:${contribution.providerResourceId}`),
            ),
          )
          .get()
        if (existing) continue
        this.database.orm
          .insert(tournamentParticipants)
          .values({
            avatarUrl: null,
            channelId: channelId!,
            createdAt: new Date().toISOString(),
            displayName: handle,
            externalRef: `livepix:${contribution.providerResourceId}`,
            id: randomUUID(),
            identityKey: identity,
            provider: provider!,
            providerUserId: null,
            source: 'livepix',
            tournamentId: rule.tournamentId,
          })
          .run()
        this.database.orm
          .update(tournamentCaptureRules)
          .set({
            capturedCount: sql`${tournamentCaptureRules.capturedCount} + 1`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(tournamentCaptureRules.id, rule.id))
          .run()
      }
    })
  }

  private accepts(
    minimum: number | null,
    currency: string | null,
    contribution: ContributionReceived,
  ): boolean {
    return Boolean(
      minimum &&
      currency &&
      contribution.amountInCents >= minimum &&
      contribution.currency === currency,
    )
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase()
  }
}
