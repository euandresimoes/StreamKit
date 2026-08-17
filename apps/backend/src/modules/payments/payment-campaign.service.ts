import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray, or, sql } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../infrastructure/database/database.tokens'
import {
  giveawayCaptureRules,
  giveawayParticipants,
  giveaways,
  integrationConnections,
  tournamentCaptureRules,
  tournamentEntries,
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
    const hasGlobalSelection =
      (this.database.orm
        .select({ count: sql<number>`count(*)` })
        .from(integrationConnections)
        .where(eq(integrationConnections.isGlobalSelected, true))
        .get()?.count ?? 0) > 0
    if (
      !connection ||
      connection.status !== 'connected' ||
      (hasGlobalSelection && !connection.isGlobalSelected)
    )
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
              inArray(giveaways.status, ['draft', 'ready']),
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
            avatarUrl: null,
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
          .select({
            bracketSize: tournaments.bracketSize,
            mode: tournaments.mode,
            rule: tournamentCaptureRules,
            status: tournaments.status,
          })
          .from(tournamentCaptureRules)
          .innerJoin(tournaments, eq(tournaments.id, tournamentCaptureRules.tournamentId))
          .where(
            and(
              eq(tournamentCaptureRules.tournamentId, input.campaignId),
              eq(tournamentCaptureRules.connectionId, input.connectionId),
              inArray(tournaments.status, ['draft', 'ready']),
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
        if (rule.mode === 'individual')
          this.ensureIndividualEntry(
            input.campaignId,
            `livepix:${contribution.providerResourceId}`,
            rule.bracketSize,
          )
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
            inArray(giveaways.status, ['draft', 'ready']),
            inArray(integrationConnections.status, ['connected', 'connecting', 'reconnecting']),
            or(
              eq(integrationConnections.isGlobalSelected, true),
              sql`NOT EXISTS (SELECT 1 FROM integration_connections WHERE is_global_selected = 1)`,
            ),
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
              or(
                eq(giveawayParticipants.normalizedName, identity),
                eq(giveawayParticipants.externalRef, `livepix:${contribution.providerResourceId}`),
              ),
            ),
          )
          .get()
        if (existing) continue
        const giveaway = this.database.orm
          .select({ maxParticipants: giveaways.maxParticipants })
          .from(giveaways)
          .where(eq(giveaways.id, rule.giveawayId))
          .get()
        const participantCount =
          this.database.orm
            .select({ count: sql<number>`count(*)` })
            .from(giveawayParticipants)
            .where(
              and(
                eq(giveawayParticipants.giveawayId, rule.giveawayId),
                eq(giveawayParticipants.active, true),
              ),
            )
            .get()?.count ?? 0
        if (!giveaway || participantCount >= giveaway.maxParticipants) {
          this.incrementGiveawayRejected(rule.id)
          continue
        }
        const now = new Date().toISOString()
        this.database.orm
          .insert(giveawayParticipants)
          .values({
            active: true,
            avatarUrl: null,
            channelId: channelId!,
            createdAt: now,
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
            updatedAt: now,
          })
          .where(eq(giveawayCaptureRules.id, rule.id))
          .run()
        this.database.orm
          .update(giveaways)
          .set({ status: 'ready', updatedAt: now })
          .where(eq(giveaways.id, rule.giveawayId))
          .run()
      }
      const tournamentRules = this.database.orm
        .select({
          bracketSize: tournaments.bracketSize,
          mode: tournaments.mode,
          teamCapacity: tournaments.teamCapacity,
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
            inArray(tournaments.status, ['draft', 'ready']),
            inArray(integrationConnections.status, ['connected', 'connecting', 'reconnecting']),
            or(
              eq(integrationConnections.isGlobalSelected, true),
              sql`NOT EXISTS (SELECT 1 FROM integration_connections WHERE is_global_selected = 1)`,
            ),
          ),
        )
        .all()
      for (const {
        bracketSize,
        mode,
        rule,
        provider,
        channelId,
        teamCapacity,
      } of tournamentRules) {
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
              or(
                eq(tournamentParticipants.identityKey, identity),
                eq(
                  tournamentParticipants.externalRef,
                  `livepix:${contribution.providerResourceId}`,
                ),
              ),
            ),
          )
          .get()
        if (existing) continue
        const participantCount =
          this.database.orm
            .select({ count: sql<number>`count(*)` })
            .from(tournamentParticipants)
            .where(eq(tournamentParticipants.tournamentId, rule.tournamentId))
            .get()?.count ?? 0
        const participantLimit =
          mode === 'team' ? bracketSize * Math.max(1, teamCapacity ?? 1) : bracketSize
        if (participantCount >= participantLimit) {
          this.incrementTournamentRejected(rule.id)
          continue
        }
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
        if (mode === 'individual')
          this.ensureIndividualEntry(
            rule.tournamentId,
            `livepix:${contribution.providerResourceId}`,
            bracketSize,
          )
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

  private incrementGiveawayRejected(ruleId: string): void {
    this.database.orm
      .update(giveawayCaptureRules)
      .set({
        rejectedCount: sql`${giveawayCaptureRules.rejectedCount} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(giveawayCaptureRules.id, ruleId))
      .run()
  }

  private incrementTournamentRejected(ruleId: string): void {
    this.database.orm
      .update(tournamentCaptureRules)
      .set({
        rejectedCount: sql`${tournamentCaptureRules.rejectedCount} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tournamentCaptureRules.id, ruleId))
      .run()
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase()
  }

  private ensureIndividualEntry(
    tournamentId: string,
    externalRef: string,
    bracketSize: number,
  ): void {
    const participant = this.database.orm
      .select({ id: tournamentParticipants.id })
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.externalRef, externalRef),
        ),
      )
      .get()
    if (!participant) return
    const existingEntry = this.database.orm
      .select({ id: tournamentEntries.id })
      .from(tournamentEntries)
      .where(eq(tournamentEntries.participantId, participant.id))
      .get()
    if (existingEntry) return
    const entryCount =
      this.database.orm
        .select({ count: sql<number>`count(*)` })
        .from(tournamentEntries)
        .where(eq(tournamentEntries.tournamentId, tournamentId))
        .get()?.count ?? 0
    if (entryCount >= bracketSize) return
    this.database.orm
      .insert(tournamentEntries)
      .values({
        createdAt: new Date().toISOString(),
        id: randomUUID(),
        participantId: participant.id,
        seed: entryCount + 1,
        teamId: null,
        tournamentId,
      })
      .run()
  }
}
