import { z } from 'zod'

import { ErrorCodeSchema } from './error-code'

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    details: z.unknown().nullable(),
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
})

export type ApiError = z.infer<typeof ApiErrorSchema>
