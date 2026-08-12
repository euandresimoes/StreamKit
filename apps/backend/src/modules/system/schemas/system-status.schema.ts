import { z } from 'zod'

export const SystemStatusSchema = z.object({
  status: z.literal('ok'),
})
