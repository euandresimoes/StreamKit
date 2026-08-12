import { z } from 'zod'

export const HealthResponseSchema = z.object({
  service: z.literal('streamkit-backend'),
  status: z.literal('ok'),
  version: z.string().min(1),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>
