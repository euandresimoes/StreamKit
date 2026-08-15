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
} from '@streamkit/contracts'

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
  private retryTimer: NodeJS.Timeout | null = null
  private monitorTimer: NodeJS.Timeout | null = null
  private stopped = false
  private retryAttempt = 0

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
    this.monitorTimer = setInterval(() => void this.monitor(), 5_000)
    void this.restoreIfNeeded()
  }

  public async onModuleDestroy(): Promise<void> {
    this.stopped = true
    if (this.retryTimer) clearTimeout(this.retryTimer)
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

  public async connect() {
    this.stopped = false
    const current = await this.repository.connection()
    await this.repository.saveConnection({
      accountId: current?.accountId ?? null,
      accountUsername: null,
      generation: current?.generation ?? 0,
      lastErrorCode: null,
      remoteWebhookId: current?.remoteWebhookId ?? null,
      state: 'connecting',
      webhookUrl: null,
    })
    try {
      const account = await this.api.account()
      const endpoint = await this.transport.register('livepix')
      if (!endpoint.callbackUrl) throw new Error('LIVEPIX_CALLBACK_URL_UNAVAILABLE')
      const previous = await this.repository.connection()
      const remote = await this.api.webhooks()
      const existing = remote.data.find((webhook) => webhook.url === endpoint.callbackUrl)
      const remoteWebhookId =
        existing?.id ?? (await this.api.createWebhook(endpoint.callbackUrl)).data.id
      if (previous?.remoteWebhookId && previous.remoteWebhookId !== remoteWebhookId)
        await this.api.deleteWebhook(previous.remoteWebhookId).catch(() => undefined)
      await this.repository.saveConnection({
        accountId: account.data.id ?? null,
        accountUsername: account.data.username ?? null,
        generation: (previous?.generation ?? 0) + 1,
        lastErrorCode: null,
        remoteWebhookId,
        state: 'ready',
        webhookUrl: endpoint.callbackUrl,
      })
      this.retryAttempt = 0
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
      this.scheduleRetry()
      throw cause
    }
  }

  public async disconnect() {
    this.stopped = true
    if (this.retryTimer) clearTimeout(this.retryTimer)
    const existing = await this.repository.connection()
    if (existing?.remoteWebhookId)
      await this.api.deleteWebhook(existing.remoteWebhookId).catch(() => undefined)
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

  public async handleExternalEvent(payload: unknown): Promise<void> {
    const envelope = LivePixWebhookEnvelopeSchema.parse(payload)
    const connection = await this.repository.connection()
    const clientId = await this.auth.clientId()
    if (
      (connection?.accountId && connection.accountId !== envelope.userId) ||
      (clientId && clientId !== envelope.clientId)
    )
      throw new ApiApplicationError('UNAUTHORIZED', 'LivePix webhook account mismatch', 401)
    const details = LivePixPaymentDetailsSchema.parse(
      (await this.api.payment(envelope.resource.id)).data,
    )
    const contribution = ContributionReceivedSchema.parse({
      amountInCents: details.amount,
      contributionType: 'payment',
      currency: details.currency,
      eventId: envelope.resource.id,
      message: details.message ?? null,
      occurredAt: details.createdAt,
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
    await this.campaigns.apply(contribution)
  }

  private async monitor(): Promise<void> {
    if (this.stopped) return
    const current = await this.repository.connection()
    if (current?.state === 'ready' && this.transport.snapshot().state === 'error')
      this.scheduleRetry()
  }

  private async restoreIfNeeded(): Promise<void> {
    const current = await this.repository.connection()
    if (current?.state === 'ready' || current?.state === 'degraded') this.scheduleRetry(0)
  }

  private scheduleRetry(delay = 5_000): void {
    if (this.stopped || this.retryTimer) return
    const backoff = delay === 0 ? 0 : Math.min(300_000, 5_000 * 2 ** this.retryAttempt++)
    const jitter = backoff === 0 ? 0 : Math.floor(Math.random() * Math.max(1_000, backoff * 0.2))
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      void this.connect().catch(() => undefined)
    }, backoff + jitter)
  }
}
