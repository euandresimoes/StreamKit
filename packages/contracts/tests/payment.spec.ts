import {
  LivePixWebhookEnvelopeSchema,
  PaymentCampaignConfigSchema,
  PaymentPendingContributionSchema,
} from '../src'

describe('LivePix payment contracts', () => {
  it('requires a positive campaign minimum amount', () => {
    expect(
      PaymentCampaignConfigSchema.safeParse({
        autoEntry: true,
        currency: 'BRL',
        minimumAmountInCents: 0,
      }).success,
    ).toBe(false)
    expect(
      PaymentCampaignConfigSchema.parse({
        autoEntry: false,
        currency: 'BRL',
        minimumAmountInCents: 100,
      }).minimumAmountInCents,
    ).toBe(100)
  })

  it('preserves the provider identity and supports manual pending resolution', () => {
    const webhook = LivePixWebhookEnvelopeSchema.parse({
      clientId: 'client-1',
      event: 'new',
      resource: { id: 'payment-1', type: 'payment' },
      userId: 'account-1',
    })
    const pending = PaymentPendingContributionSchema.parse({
      amountInCents: 100,
      contributionType: 'payment',
      currency: 'BRL',
      eventId: webhook.resource.id,
      message: null,
      occurredAt: '2026-08-14T12:00:00.000Z',
      participantHandle: 'viewer_handle',
      participantPlatform: null,
      pendingReason: 'manual_review',
      provider: 'livepix',
      providerReference: null,
      providerResourceId: webhook.resource.id,
    })
    expect(pending.participantHandle).toBe('viewer_handle')
  })

  it('accepts named LivePix donations delivered as message resources', () => {
    const webhook = LivePixWebhookEnvelopeSchema.parse({
      clientId: 'client-1',
      event: 'new',
      resource: { id: 'message-1', type: 'message' },
      userId: 'account-1',
    })

    expect(webhook.resource.type).toBe('message')
  })
})
