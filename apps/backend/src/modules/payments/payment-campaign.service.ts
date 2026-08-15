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
import type { ContributionReceived, ResolvePaymentContributionRequest } from '@streamkit/contracts'
import { LivePixPaymentRepository } from './providers/livepix/livepix-payment.repository'
import { ApiApplicationError } from '../../application/api-error'

@Injectable()
export class PaymentCampaignService {
  public constructor(
    @Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase,
    @Inject(LivePixPaymentRepository) private readonly payments: LivePixPaymentRepository,
  ) {}

  public async resolve(
    contributionId: string,
    input: ResolvePaymentContributionRequest,
  ): Promise<void> {
    const contribution = await this.payments.getContribution(contributionId)
    if (!contribution || contribution.status === 'processed')
      throw new ApiApplicationError('VALIDATION_FAILED', 'Payment contribution is not pending', 409)
    const connection = this.database.orm
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, input.connectionId))
      .get()
    if (!connection || connection.status !== 'connected')
      throw new ApiApplicationError(
        'INTEGRATION_CONNECTION_NOT_FOUND',
        'Platform connection is not active',
        409,
      )
    if (connection.provider !== input.participantPlatform)
      throw new ApiApplicationError(
        'VALIDATION_FAILED',
        'Payment platform does not match connection',
        409,
      )
    const identity = this.normalize(input.handle)
    this.database.transaction(() => {
      if (input.campaignType === 'giveaway') {
        const rule = this.database.orm
          .select({ rule: giveawayCaptureRules, status: giveaways.status })
          .from(giveawayCaptureRules)
          .innerJoin(giveaways, eq(giveaways.id, giveawayCaptureRules.giveawayId))
          .where(
            and(
              eq(giveawayCaptureRules.giveawayId, input.campaignId),
              eq(giveawayCaptureRules.connectionId, input.connectionId),
              eq(giveaways.status, 'ready'),
            ),
          )
          .get()
        if (!rule)
          throw new ApiApplicationError(
            'GIVEAWAY_INVALID_STATE',
            'Giveaway is not ready for this connection',
            409,
          )
        this.database.orm
          .insert(giveawayParticipants)
          .values({
            active: true,
            channelId: connection.channelId,
            createdAt: new Date().toISOString(),
            displayName: input.handle,
            externalRef: `livepix:${contribution.providerResourceId}`,
            giveawayId: input.campaignId,
            id: randomUUID(),
            normalizedName: identity,
            provider: connection.provider,
            providerUserId: null,
            source: 'livepix',
            ticketCount: 1,
          })
          .onConflictDoNothing()
          .run()
      } else {
        const rule = this.database.orm
          .select({ rule: tournamentCaptureRules, status: tournaments.status })
          .from(tournamentCaptureRules)
          .innerJoin(tournaments, eq(tournaments.id, tournamentCaptureRules.tournamentId))
          .where(
            and(
              eq(tournamentCaptureRules.tournamentId, input.campaignId),
              eq(tournamentCaptureRules.connectionId, input.connectionId),
              eq(tournaments.status, 'ready'),
            ),
          )
          .get()
        if (!rule)
          throw new ApiApplicationError(
            'TOURNAMENT_INVALID_STATE',
            'Tournament is not ready for this connection',
            409,
          )
        this.database.orm
          .insert(tournamentParticipants)
          .values({
            avatarUrl: null,
            channelId: connection.channelId,
            createdAt: new Date().toISOString(),
            displayName: input.handle,
            externalRef: `livepix:${contribution.providerResourceId}`,
            id: randomUUID(),
            identityKey: identity,
            provider: connection.provider,
            providerUserId: null,
            source: 'livepix',
            tournamentId: input.campaignId,
          })
          .onConflictDoNothing()
          .run()
      }
    })
    await this.payments.markManuallyResolved(contributionId, input.campaignId)
  }

  public async apply(contribution: ContributionReceived): Promise<number> {
    const handle = contribution.participantHandle
    if (!handle) return 0
    const identity = this.normalize(handle)
    let applied = 0
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
        .where(
          and(
            eq(giveawayCaptureRules.status, 'active'),
            eq(giveaways.status, 'ready'),
            eq(integrationConnections.status, 'connected'),
          ),
        )
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
        applied += 1
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
        .where(
          and(
            eq(tournamentCaptureRules.status, 'active'),
            eq(tournaments.status, 'ready'),
            eq(integrationConnections.status, 'connected'),
          ),
        )
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
        applied += 1
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
    return applied
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
