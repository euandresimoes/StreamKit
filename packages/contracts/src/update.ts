import { z } from 'zod'

export const ReleaseChannelSchema = z.enum(['stable', 'beta'])
export const UpdateInfoSchema = z.object({
  changelog: z.string(),
  title: z.string(),
  version: z.string(),
})
export const UpdateStateSchema = z.object({
  available: UpdateInfoSchema.nullable(),
  channel: ReleaseChannelSchema,
  error: z.string().nullable(),
  progress: z.number().min(0).max(100).nullable(),
  status: z.enum([
    'idle',
    'checking',
    'available',
    'downloading',
    'downloaded',
    'error',
    'up-to-date',
  ]),
})
export const UpdateCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('check'), manual: z.boolean() }),
  z.object({ action: z.literal('download') }),
  z.object({ action: z.literal('install') }),
  z.object({ action: z.literal('skip'), version: z.string() }),
])
export type UpdateState = z.infer<typeof UpdateStateSchema>
export type UpdateCommand = z.infer<typeof UpdateCommandSchema>
