import { z } from 'zod'

export const IntegrationProviderSchema = z.enum(['kick', 'twitch', 'youtube'])
export const IntegrationCapabilitySchema = z.enum(['chat.read', 'chat.write', 'user.identity'])
export const IntegrationConnectionStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'error',
  'reconnecting',
  'revoked',
])

export const ExternalUserIdentitySchema = z.object({
  avatarUrl: z.url().nullable().default(null),
  displayName: z.string().trim().min(1).max(100),
  handle: z.string().trim().min(1).max(100),
  provider: IntegrationProviderSchema,
  providerUserId: z.string().trim().min(1).max(200),
})

export const ChatMessageReceivedSchema = z.object({
  author: ExternalUserIdentitySchema,
  badges: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  channelId: z.string().trim().min(1).max(200),
  externalEventId: z.string().trim().min(1).max(300),
  message: z.string().max(5_000),
  occurredAt: z.iso.datetime(),
  provider: IntegrationProviderSchema,
  type: z.literal('chat.message'),
})

export const IntegrationConnectionSchema = z.object({
  capabilities: z.array(IntegrationCapabilitySchema).max(10),
  channelDisplayName: z.string().trim().min(1).max(100),
  channelId: z.string().trim().min(1).max(200),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
  lastErrorCode: z.string().trim().min(1).max(100).nullable(),
  nextRetryAt: z.iso.datetime().nullable(),
  provider: IntegrationProviderSchema,
  retryAttempt: z.number().int().min(0),
  status: IntegrationConnectionStatusSchema,
  updatedAt: z.iso.datetime(),
})

export const SaveIntegrationConnectionRequestSchema = z.object({
  capabilities: z.array(IntegrationCapabilitySchema).max(10).default([]),
  channelDisplayName: z.string().trim().min(1).max(100),
  channelId: z.string().trim().min(1).max(200),
  provider: IntegrationProviderSchema,
})

export const UpdateIntegrationConnectionStateRequestSchema = z.object({
  lastErrorCode: z.string().trim().min(1).max(100).nullable().optional(),
  status: IntegrationConnectionStatusSchema,
})

export type ChatMessageReceived = z.infer<typeof ChatMessageReceivedSchema>
export type IntegrationCapability = z.infer<typeof IntegrationCapabilitySchema>
export type IntegrationConnection = z.infer<typeof IntegrationConnectionSchema>
export type IntegrationConnectionStatus = z.infer<typeof IntegrationConnectionStatusSchema>
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>
export type SaveIntegrationConnectionRequest = z.infer<
  typeof SaveIntegrationConnectionRequestSchema
>
