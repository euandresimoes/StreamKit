import { z } from 'zod'

export const BackendConnectionSchema = z.object({
  baseUrl: z.url().refine((value) => value.startsWith('http://127.0.0.1:'), {
    message: 'Backend must use the IPv4 loopback address',
  }),
  token: z.string().regex(/^[a-f0-9]{64}$/),
})

export type BackendConnection = z.infer<typeof BackendConnectionSchema>
