import { z } from 'zod'

import { IntegrationCapabilitySchema, IntegrationProviderSchema } from './integration'

export const LiveStreamStateSchema = z.enum(['online', 'offline', 'unavailable', 'error'])
export const LivePreviewStateSchema = z.enum(['ready', 'offline', 'blocked', 'unsupported'])
export const LiveStreamSchema = z.object({
  capabilities: z.array(IntegrationCapabilitySchema),
  channelDisplayName: z.string().min(1),
  channelId: z.string().min(1),
  connectionId: z.uuid(),
  preview: z.object({
    channel: z.string().min(1),
    state: LivePreviewStateSchema,
    videoId: z.string().min(1).nullable(),
  }),
  sessionKey: z.string().trim().min(1).max(300).nullable().default(null),
  provider: IntegrationProviderSchema,
  state: LiveStreamStateSchema,
})

export type LiveStream = z.infer<typeof LiveStreamSchema>
