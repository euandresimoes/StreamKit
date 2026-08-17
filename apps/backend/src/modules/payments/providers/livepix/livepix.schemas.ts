import { z } from 'zod'

export const LivePixAccountResponseSchema = z.object({
  data: z.object({ id: z.string().min(1).optional(), username: z.string().nullable().optional() }),
})
const LivePixContributionDetailsSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  id: z.string().min(1),
  reference: z.string().nullable().optional(),
})
export const LivePixPaymentResponseSchema = z.object({
  data: LivePixContributionDetailsSchema,
})
export const LivePixMessageResponseSchema = z.object({
  data: LivePixContributionDetailsSchema.extend({
    flagged: z.boolean().optional(),
    message: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
  }),
})
export const LivePixTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional().default(''),
  token_type: z.literal('bearer'),
})
