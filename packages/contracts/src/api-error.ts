import { z } from 'zod'

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    details: z.unknown().nullable(),
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
})

export type ApiError = z.infer<typeof ApiErrorSchema>
