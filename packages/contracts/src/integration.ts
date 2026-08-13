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
  roles: z
    .object({
      isBot: z.boolean(),
      isBroadcaster: z.boolean(),
      isMember: z.boolean(),
      isModerator: z.boolean(),
    })
    .default({ isBot: false, isBroadcaster: false, isMember: false, isModerator: false }),
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
export const SendChatMessageRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
})
export const FocusedChatMessageSchema = z.object({
  avatarUrl: z.url().nullable(),
  badges: z.array(z.string()),
  channelId: z.string().min(1),
  connectionId: z.uuid().nullable(),
  displayName: z.string().min(1),
  handle: z.string().min(1),
  id: z.uuid(),
  message: z.string().max(5_000),
  occurredAt: z.iso.datetime(),
  provider: IntegrationProviderSchema,
  providerUserId: z.string().min(1),
})
export const FocusedChatIdentitySchema = ExternalUserIdentitySchema.extend({
  channelId: z.string().min(1),
})
export const FocusedChatThreadSchema = z.object({
  connections: z.array(IntegrationConnectionSchema),
  identities: z.array(FocusedChatIdentitySchema),
  messages: z.array(FocusedChatMessageSchema).max(200),
  subject: z.string().min(1).max(200),
})

export const UpdateIntegrationConnectionStateRequestSchema = z.object({
  lastErrorCode: z.string().trim().min(1).max(100).nullable().optional(),
  status: IntegrationConnectionStatusSchema,
})

export const TwitchAuthorizationStatusSchema = z.object({
  available: z.boolean(),
  configured: z.boolean(),
  expiresAt: z.iso.datetime().nullable(),
  login: z.string().nullable(),
  scopes: z.array(z.string()),
})

export const TwitchDeviceAuthorizationSchema = z.object({
  expiresAt: z.iso.datetime(),
  flowId: z.uuid(),
  intervalSeconds: z.number().int().positive(),
  userCode: z.string().min(1),
  verificationUri: z.url(),
})

export const TwitchDeviceAuthorizationPollSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('authorized'), authorization: TwitchAuthorizationStatusSchema }),
  z.object({ status: z.literal('expired') }),
])
export const YouTubeAuthorizationStatusSchema = z.object({
  available: z.boolean(),
  configured: z.boolean(),
  expiresAt: z.iso.datetime().nullable(),
  scopes: z.array(z.string()),
})
export const YouTubeAuthorizationStartSchema = z.object({
  authorizationUrl: z.url(),
  expiresAt: z.iso.datetime(),
  flowId: z.uuid(),
})
export const YouTubeAuthorizationPollSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('authorized'), authorization: YouTubeAuthorizationStatusSchema }),
  z.object({ status: z.literal('expired') }),
  z.object({ status: z.literal('failed'), error: z.string() }),
])
export const YouTubeLiveBroadcastSchema = z.object({
  channelId: z.string().min(1),
  liveChatId: z.string().min(1),
  scheduledStartAt: z.iso.datetime().nullable(),
  title: z.string().min(1),
  videoId: z.string().min(1),
})
export const SelectYouTubeBroadcastRequestSchema = z.object({
  liveChatId: z.string().min(1),
  title: z.string().min(1),
  videoId: z.string().min(1),
})

export type ChatMessageReceived = z.infer<typeof ChatMessageReceivedSchema>
export type IntegrationCapability = z.infer<typeof IntegrationCapabilitySchema>
export type IntegrationConnection = z.infer<typeof IntegrationConnectionSchema>
export type IntegrationConnectionStatus = z.infer<typeof IntegrationConnectionStatusSchema>
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>
export type FocusedChatMessage = z.infer<typeof FocusedChatMessageSchema>
export type FocusedChatThread = z.infer<typeof FocusedChatThreadSchema>
export type SaveIntegrationConnectionRequest = z.infer<
  typeof SaveIntegrationConnectionRequestSchema
>
export type TwitchAuthorizationStatus = z.infer<typeof TwitchAuthorizationStatusSchema>
export type TwitchDeviceAuthorization = z.infer<typeof TwitchDeviceAuthorizationSchema>
export type YouTubeAuthorizationStatus = z.infer<typeof YouTubeAuthorizationStatusSchema>
export type YouTubeLiveBroadcast = z.infer<typeof YouTubeLiveBroadcastSchema>
