import { z } from 'zod'

import { IntegrationCapabilitySchema, IntegrationProviderSchema } from './integration'

export const LiveStreamStateSchema = z.enum(['online', 'offline', 'unavailable', 'error'])
export const LivePreviewStateSchema = z.enum(['ready', 'offline', 'blocked', 'unsupported'])
export const LiveMetadataSchema = z.object({
  category: z.string().max(100).nullable(),
  description: z.string().max(5_000).nullable(),
  emotesEnabled: z.boolean().nullable(),
  followersOnly: z.boolean().nullable(),
  language: z.string().max(20).nullable(),
  slowMode: z.boolean().nullable(),
  subscribersOnly: z.boolean().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20),
  title: z.string().max(200).nullable(),
  visibility: z.enum(['public', 'unlisted', 'private']).nullable(),
})
export const LiveStreamSchema = z.object({
  capabilities: z.array(IntegrationCapabilitySchema),
  channelDisplayName: z.string().min(1),
  channelId: z.string().min(1),
  connectionId: z.uuid(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  metadata: LiveMetadataSchema,
  preview: z.object({
    channel: z.string().min(1),
    state: LivePreviewStateSchema,
    videoId: z.string().min(1).nullable(),
  }),
  provider: IntegrationProviderSchema,
  startedAt: z.iso.datetime().nullable(),
  state: LiveStreamStateSchema,
  title: z.string().min(1).nullable(),
  viewerCount: z.number().int().nonnegative().nullable(),
})
export const LiveMetadataUpdateSchema = LiveMetadataSchema.partial().extend({
  title: z.string().trim().min(1).max(200).optional(),
})

export type LiveStream = z.infer<typeof LiveStreamSchema>
export type LiveMetadata = z.infer<typeof LiveMetadataSchema>
export type LiveMetadataUpdate = z.infer<typeof LiveMetadataUpdateSchema>
