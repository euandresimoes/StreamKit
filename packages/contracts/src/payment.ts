import { z } from 'zod'

export const PaymentProviderSchema = z.literal('livepix')
export const PaymentConnectionStateSchema = z.enum([
  'disconnected',
  'authenticating',
  'connecting',
  'ready',
  'degraded',
  'reconciling',
  'reauthorization_required',
  'stopped',
])
export const ContributionTypeSchema = z.literal('payment')
export const PaymentParticipantPlatformSchema = z.enum(['kick', 'twitch', 'youtube'])
export const ContributionPendingReasonSchema = z.enum([
  'below_minimum',
  'currency_mismatch',
  'identity_unmatched',
  'manual_review',
  'provider_details_unavailable',
])
export const PaymentContributionStatusSchema = z.enum([
  'manual_review',
  'pending',
  'processed',
  'rejected',
])
export const ContributionReceivedSchema = z.object({
  amountInCents: z.number().int().positive(),
  contributionType: ContributionTypeSchema,
  currency: z.string().trim().min(1).max(12),
  eventId: z.string().trim().min(1).max(300),
  message: z.string().max(10_000).nullable(),
  occurredAt: z.iso.datetime(),
  participantHandle: z.string().trim().min(1).max(200).nullable(),
  participantPlatform: PaymentParticipantPlatformSchema.nullable(),
  provider: PaymentProviderSchema,
  providerReference: z.string().trim().max(300).nullable(),
  providerResourceId: z.string().trim().min(1).max(300),
})
export const PaymentPendingContributionSchema = ContributionReceivedSchema.extend({
  pendingReason: ContributionPendingReasonSchema,
})
export const PaymentContributionSchema = PaymentPendingContributionSchema.extend({
  pendingReason: ContributionPendingReasonSchema.nullable(),
  campaignId: z.string().uuid().nullable(),
  id: z.string().uuid(),
  processedAt: z.iso.datetime().nullable(),
  receivedAt: z.iso.datetime(),
  status: PaymentContributionStatusSchema,
})
export const LivePixWebhookEnvelopeSchema = z.object({
  clientId: z.string().trim().min(1).max(300),
  event: z.literal('new'),
  resource: z.object({
    id: z.string().trim().min(1).max(300),
    reference: z.string().trim().max(300).nullable().optional(),
    type: z.enum(['message', 'payment']),
  }),
  userId: z.string().trim().min(1).max(300),
})
export const LivePixPaymentDetailsSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().trim().min(1).max(12),
  createdAt: z.iso.datetime({ offset: true }),
  flagged: z.boolean().optional(),
  id: z.string().trim().min(1).max(300),
  message: z.string().max(10_000).nullable().optional(),
  reference: z.string().trim().max(300).nullable().optional(),
  username: z.string().trim().max(200).nullable().optional(),
})
export const PaymentCampaignConfigSchema = z
  .object({
    autoEntry: z.boolean(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3,12}$/),
    minimumAmountInCents: z.number().int().positive(),
  })
  .strict()
export const ResolvePaymentContributionRequestSchema = z.object({
  campaignId: z.uuid(),
  campaignType: z.enum(['giveaway', 'tournament']),
  connectionId: z.uuid(),
  handle: z.string().trim().min(1).max(200),
  participantPlatform: PaymentParticipantPlatformSchema,
})
export const PaymentConnectionStatusSchema = z.object({
  accountUsername: z.string().nullable(),
  configured: z.boolean(),
  lastErrorCode: z.string().nullable(),
  provider: PaymentProviderSchema,
  state: PaymentConnectionStateSchema,
  webhookGeneration: z.number().int().nonnegative(),
  webhookUrl: z.url().nullable(),
})
export type ContributionReceived = z.infer<typeof ContributionReceivedSchema>
export type PaymentPendingContribution = z.infer<typeof PaymentPendingContributionSchema>
export type PaymentContribution = z.infer<typeof PaymentContributionSchema>
export type LivePixWebhookEnvelope = z.infer<typeof LivePixWebhookEnvelopeSchema>
export type LivePixPaymentDetails = z.infer<typeof LivePixPaymentDetailsSchema>
export type PaymentCampaignConfig = z.infer<typeof PaymentCampaignConfigSchema>
export type PaymentConnectionStatus = z.infer<typeof PaymentConnectionStatusSchema>
export type ResolvePaymentContributionRequest = z.infer<
  typeof ResolvePaymentContributionRequestSchema
>
