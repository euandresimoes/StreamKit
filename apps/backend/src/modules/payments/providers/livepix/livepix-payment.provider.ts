import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'
import {
  ContributionReceivedSchema,
  LivePixPaymentDetailsSchema,
  LivePixWebhookEnvelopeSchema,
  PaymentConnectionStatusSchema,
} from '@streamlet/contracts'

import { ApiApplicationError } from '../../../../application/api-error'
import { ExternalEventBus } from '../../../integrations/external-events/external-event.bus'
import { ExternalTransportService } from '../../../integrations/external-events/external-transport.service'
import { LivePixApiClient } from './livepix-api.client'
import { LivePixAuthService } from './livepix-auth.service'
import { LivePixPaymentRepository } from './livepix-payment.repository'
import type { ContributionProvider } from '../../payment-provider.contract'
import { PaymentCampaignService } from '../../payment-campaign.service'

@Injectable()
export class LivePixPaymentProvider
  implements ContributionProvider, OnApplicationBootstrap, OnModuleDestroy
{
  private monitorTimer: NodeJS.Timeout | null = null
  private stopped = false
  private connectPromise: Promise<
    Awaited<ReturnType<LivePixPaymentProvider['connectInternal']>>
  > | null = null

  public constructor(
    @Inject(ExternalEventBus) private readonly events: ExternalEventBus,
    @Inject(ExternalTransportService) private readonly transport: ExternalTransportService,
    @Inject(LivePixApiClient) private readonly api: LivePixApiClient,
    @Inject(LivePixAuthService) private readonly auth: LivePixAuthService,
    @Inject(LivePixPaymentRepository) private readonly repository: LivePixPaymentRepository,
    @Inject(PaymentCampaignService) private readonly campaigns: PaymentCampaignService,
  ) {}

  public onApplicationBootstrap(): void {
    this.events.subscribe('livepix', async (event) => this.handleExternalEvent(event.payload))
    this.monitorTimer = setInterval(() => void this.monitor().catch(() => undefined), 5_000)
    void this.monitor().catch(() => undefined)
  }

  public async onModuleDestroy(): Promise<void> {
    this.stopped = true
    if (this.monitorTimer) clearInterval(this.monitorTimer)
  }

  public async status() {
    const row = await this.repository.connection()
    const credential = await this.auth.status()
    return PaymentConnectionStatusSchema.parse({
      ...credential,
      accountUsername: row?.accountUsername ?? null,
      configured: credential.configured,
      lastErrorCode: row?.lastErrorCode ?? null,
      state: row?.state ?? 'disconnected',
      webhookGeneration: row?.generation ?? 0,
      webhookUrl: row?.webhookUrl ?? null,
    })
  }

  public connect() {
    if (this.connectPromise) return this.connectPromise
    this.connectPromise = this.connectInternal().finally(() => {
      this.connectPromise = null
    })
    return this.connectPromise
  }

  private async connectInternal() {
    this.stopped = false
    const current = await this.repository.connection()
    if (
      current?.state === 'ready' &&
      current.webhookUrl &&
      this.transport.snapshot().state === 'ready'
    )
      return this.status()
    await this.repository.saveConnection({
      accountId: current?.accountId ?? null,
      accountUsername: null,
      generation: current?.generation ?? 0,
      lastErrorCode: null,
      remoteWebhookId: current?.remoteWebhookId ?? null,
      state: 'connecting',
      webhookUrl: current?.webhookUrl ?? null,
    })
    try {
      await this.auth.getAccessToken()
      const endpoint = await this.transport.register('livepix')
      if (!endpoint.callbackUrl) throw new Error('LIVEPIX_CALLBACK_URL_UNAVAILABLE')
      await this.repository.saveConnection({
        accountId: current?.accountId ?? null,
        accountUsername: current?.accountUsername ?? null,
        generation: (current?.generation ?? 0) + 1,
        lastErrorCode: null,
        remoteWebhookId: null,
        state: 'ready',
        webhookUrl: endpoint.callbackUrl,
      })
      return this.status()
    } catch (cause) {
      await this.repository.saveConnection({
        accountId: current?.accountId ?? null,
        accountUsername: null,
        generation: current?.generation ?? 0,
        lastErrorCode:
          cause instanceof ApiApplicationError ? cause.code : 'INTEGRATION_PROVIDER_ERROR',
        remoteWebhookId: current?.remoteWebhookId ?? null,
        state:
          cause instanceof ApiApplicationError && cause.code === 'INTEGRATION_AUTH_REVOKED'
            ? 'reauthorization_required'
            : 'degraded',
        webhookUrl: current?.webhookUrl ?? null,
      })
      throw cause
    }
  }

  public async disconnect() {
    this.stopped = true
    const existing = await this.repository.connection()
    await this.transport.unregister('livepix')
    await this.auth.disconnect().catch(() => undefined)
    await this.repository.saveConnection({
      accountId: null,
      accountUsername: null,
      generation: existing?.generation ?? 0,
      lastErrorCode: null,
      remoteWebhookId: null,
      state: 'stopped',
      webhookUrl: null,
    })
    return this.status()
  }

  private async monitor(): Promise<void> {
    if (this.stopped) return
    await this.reconcilePending()
    const current = await this.repository.connection()
    if (current?.state === 'ready' && this.transport.snapshot().state !== 'ready') {
      await this.repository.saveConnection({
        accountId: current.accountId,
        accountUsername: current.accountUsername,
        generation: current.generation,
        lastErrorCode: 'EXTERNAL_TUNNEL_UNAVAILABLE',
        remoteWebhookId: current.remoteWebhookId,
        state: 'degraded',
        webhookUrl: current.webhookUrl,
      })
    }
  }

  private async reconcilePending(): Promise<void> {
    const pending = await this.repository.listPending()
    for (const contribution of pending) {
      try {
        const applied = await this.campaigns.apply(contribution)
        if (applied > 0) await this.repository.markProcessed(contribution.providerResourceId)
      } catch {
        // Keep the contribution pending so the next reconciliation can retry it.
      }
    }
  }

  public async handleExternalEvent(payload: unknown): Promise<void> {
    const envelope = LivePixWebhookEnvelopeSchema.parse(payload)
    const connection = await this.repository.connection()
    const clientId = await this.auth.clientId()
    if (
      (connection?.accountId && connection.accountId !== envelope.userId) ||
      (clientId && clientId !== envelope.clientId)
    )
      throw new ApiApplicationError('UNAUTHORIZED', 'LivePix webhook account mismatch', 401)
    if (await this.repository.hasContribution(envelope.resource.id)) return
    const response =
      envelope.resource.type === 'message'
        ? await this.api.message(envelope.resource.id)
        : await this.api.payment(envelope.resource.id)
    const details = LivePixPaymentDetailsSchema.parse(response.data)
    const contribution = ContributionReceivedSchema.parse({
      amountInCents: details.amount,
      contributionType: 'payment',
      currency: details.currency,
      eventId: envelope.resource.id,
      message: details.message ?? null,
      occurredAt: new Date(details.createdAt).toISOString(),
      participantHandle: details.username?.trim() || null,
      participantPlatform: null,
      provider: 'livepix',
      providerReference: details.reference ?? envelope.resource.reference ?? null,
      providerResourceId: details.id,
    })
    const inserted = await this.repository.saveContribution({
      ...contribution,
      pendingReason: contribution.participantHandle ? 'manual_review' : 'identity_unmatched',
    })
    if (!inserted) return
    const applied = await this.campaigns.apply(contribution)
    if (applied > 0) await this.repository.markProcessed(contribution.providerResourceId)
  }
}
