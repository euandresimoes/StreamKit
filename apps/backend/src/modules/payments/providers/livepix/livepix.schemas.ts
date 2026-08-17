import { z } from 'zod'

export const LivePixAccountResponseSchema = z.object({
  data: z.object({ id: z.string().min(1).optional(), username: z.string().nullable().optional() }),
})
export const LivePixPaymentResponseSchema = z.object({
  data: z.object({
    amount: z.number().int().positive(),
    currency: z.string().min(1),
    createdAt: z.iso.datetime(),
    flagged: z.boolean().optional(),
    id: z.string().min(1),
    message: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
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
