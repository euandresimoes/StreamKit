import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common'
import { ChatMessageReceivedSchema } from '@streamkit/contracts'
import { z } from 'zod'

import type {
  ChatProviderAdapter,
  ChatProviderConnectionContext,
  ChatProviderSession,
} from '../chat-provider.adapter'
import { downloadAvatarDataUrl } from '../avatar-data-url'
import { ChatProviderRegistry } from '../chat-provider.registry'
import {
  INTEGRATION_RUNTIME_CONFIG,
  type IntegrationRuntimeConfig,
} from '../integration-runtime.config'
import { TwitchAuthService } from './twitch-auth.service'

const TWITCH_EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws'
const EnvelopeSchema = z.object({
  metadata: z.object({
    message_id: z.string(),
    message_timestamp: z.iso.datetime(),
    message_type: z.string(),
  }),
  payload: z.record(z.string(), z.unknown()),
})
const WelcomeSchema = z.object({
  session: z.object({ id: z.string().min(1), keepalive_timeout_seconds: z.number().positive() }),
})
const NotificationSchema = z.object({
  event: z.object({
    badges: z.array(z.object({ set_id: z.string() })).default([]),
    broadcaster_user_id: z.string(),
    chatter_user_id: z.string(),
    chatter_user_login: z.string(),
    chatter_user_name: z.string(),
    message: z.object({ text: z.string() }),
    message_id: z.string(),
  }),
  subscription: z.object({ type: z.literal('channel.chat.message') }),
})
const TwitchUsersSchema = z.object({
  data: z.array(z.object({ id: z.string(), profile_image_url: z.url().nullable() })),
})

@Injectable()
export class TwitchChatAdapter implements ChatProviderAdapter, OnApplicationBootstrap {
  public readonly capabilities = [
    'chat.read',
    'chat.write',
    'chat.message.delete',
    'chat.message.pin',
    'chat.user.ban',
    'chat.user.unban',
    'chat.user.moderator.add',
    'chat.user.moderator.remove',
    'live.metadata.write',
    'live.read',
    'user.identity',
  ] as const
  public readonly provider = 'twitch' as const
  private readonly avatars = new Map<string, Promise<string | null>>()

  public constructor(
    @Inject(TwitchAuthService) private readonly auth: TwitchAuthService,
    @Inject(ChatProviderRegistry) private readonly registry: ChatProviderRegistry,
    @Inject(INTEGRATION_RUNTIME_CONFIG) private readonly config: IntegrationRuntimeConfig,
  ) {}

  public onApplicationBootstrap(): void {
    this.registry.register(this)
  }

  public async sendMessage(channelId: string, message: string): Promise<void> {
    const clientId = this.config.twitchClientId
    if (!clientId) throw new Error('INTEGRATION_CLIENT_NOT_CONFIGURED')
    const token = await this.auth.getAccessToken()
    const response = await fetch('https://api.twitch.tv/helix/chat/messages', {
      body: JSON.stringify({
        broadcaster_id: channelId,
        message,
        sender_id: token.userId,
      }),
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        'client-id': clientId,
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    if (!response.ok) throw new Error(`TWITCH_CHAT_SEND_${response.status}`)
  }

  public async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await this.moderationRequest(
      'https://api.twitch.tv/helix/moderation/chat',
      'DELETE',
      channelId,
      {
        message_id: messageId,
      },
    )
  }

  public async pinMessage(channelId: string, messageId: string): Promise<void> {
    await this.moderationRequest('https://api.twitch.tv/helix/chat/pins', 'PUT', channelId, {
      message_id: messageId,
    })
  }

  public async banUser(channelId: string, userId: string): Promise<void> {
    await this.moderationRequest('https://api.twitch.tv/helix/moderation/bans', 'POST', channelId, {
      data: { user_id: userId },
    })
  }

  public async unbanUser(channelId: string, userId: string): Promise<void> {
    await this.queryRequest('https://api.twitch.tv/helix/moderation/bans', 'DELETE', channelId, {
      user_id: userId,
    })
  }

  public async addModerator(channelId: string, userId: string): Promise<void> {
    await this.queryRequest(
      'https://api.twitch.tv/helix/moderation/moderators',
      'POST',
      channelId,
      {
        user_id: userId,
      },
    )
  }

  public async removeModerator(channelId: string, userId: string): Promise<void> {
    await this.queryRequest(
      'https://api.twitch.tv/helix/moderation/moderators',
      'DELETE',
      channelId,
      {
        user_id: userId,
      },
    )
  }

  private async queryRequest(
    endpoint: string,
    method: 'DELETE' | 'POST',
    channelId: string,
    params: Record<string, string>,
  ): Promise<void> {
    const clientId = this.config.twitchClientId
    if (!clientId) throw new Error('INTEGRATION_CLIENT_NOT_CONFIGURED')
    const token = await this.auth.getAccessToken()
    const url = new URL(endpoint)
    url.searchParams.set('broadcaster_id', channelId)
    if (endpoint.endsWith('/bans')) url.searchParams.set('moderator_id', token.userId)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token.accessToken}`, 'client-id': clientId },
      method,
    })
    if (!response.ok) throw new Error(`TWITCH_CHAT_MODERATION_${response.status}`)
  }

  private async moderationRequest(
    endpoint: string,
    method: 'DELETE' | 'POST' | 'PUT',
    channelId: string,
    body: unknown,
  ): Promise<void> {
    const clientId = this.config.twitchClientId
    if (!clientId) throw new Error('INTEGRATION_CLIENT_NOT_CONFIGURED')
    const token = await this.auth.getAccessToken()
    const url = new URL(endpoint)
    url.searchParams.set('broadcaster_id', channelId)
    url.searchParams.set('moderator_id', token.userId)
    if (endpoint.endsWith('/pins') || method === 'DELETE')
      url.searchParams.set('message_id', String((body as { message_id: string }).message_id))
    const requestBody = endpoint.endsWith('/bans') ? body : undefined
    const response = await fetch(url, {
      ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        'client-id': clientId,
        'content-type': 'application/json',
      },
      method,
    })
    if (!response.ok) throw new Error(`TWITCH_CHAT_MODERATION_${response.status}`)
  }

  public async connect(context: ChatProviderConnectionContext): Promise<ChatProviderSession> {
    const clientId = this.config.twitchClientId
    if (!clientId) throw new Error('INTEGRATION_CLIENT_NOT_CONFIGURED')
    const token = await this.auth.getAccessToken()
    const socket = new WebSocket(TWITCH_EVENTSUB_URL)
    let resolveClosed!: () => void
    let rejectClosed!: (error: Error) => void
    let keepaliveTimeoutMs = 0
    let keepaliveTimer: ReturnType<typeof setTimeout> | null = null
    const armKeepalive = () => {
      if (!keepaliveTimeoutMs) return
      if (keepaliveTimer) clearTimeout(keepaliveTimer)
      keepaliveTimer = setTimeout(
        () => socket.close(4000, 'Twitch EventSub keepalive timed out'),
        keepaliveTimeoutMs,
      )
    }
    const closed = new Promise<void>((resolve, reject) => {
      resolveClosed = resolve
      rejectClosed = reject
    })
    const connected = new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        socket.close(1000, 'StreamKit connection stopped')
        reject(new Error('INTEGRATION_CONNECTION_ABORTED'))
      }
      context.signal.addEventListener('abort', onAbort, { once: true })
      socket.addEventListener('message', (message) => {
        armKeepalive()
        void this.handleMessage(message.data, context, token.accessToken, token.userId, clientId)
          .then((keepaliveSeconds) => {
            if (keepaliveSeconds !== null) {
              keepaliveTimeoutMs = (keepaliveSeconds + 5) * 1_000
              armKeepalive()
              resolve()
            }
          })
          .catch((cause: unknown) => {
            const error =
              cause instanceof Error ? cause : new Error('TWITCH_EVENTSUB_MESSAGE_ERROR')
            reject(error)
            rejectClosed(error)
            socket.close(1011, 'Twitch EventSub message failed')
          })
      })
      socket.addEventListener('error', () => reject(new Error('TWITCH_EVENTSUB_SOCKET_ERROR')))
      socket.addEventListener('close', () => reject(new Error('TWITCH_EVENTSUB_CLOSED')))
    })
    socket.addEventListener('close', (event) => {
      if (keepaliveTimer) clearTimeout(keepaliveTimer)
      if (context.signal.aborted || event.code === 1000) resolveClosed()
      else rejectClosed(new Error(`TWITCH_EVENTSUB_CLOSED_${event.code}`))
    })
    await connected
    return {
      closed,
      close: async () => {
        if (socket.readyState < WebSocket.CLOSING)
          socket.close(1000, 'StreamKit connection stopped')
      },
    }
  }

  private async handleMessage(
    data: unknown,
    context: ChatProviderConnectionContext,
    accessToken: string,
    userId: string,
    clientId: string,
  ): Promise<number | null> {
    const text = typeof data === 'string' ? data : await new Response(data as Blob).text()
    const envelope = EnvelopeSchema.parse(JSON.parse(text) as unknown)
    if (envelope.metadata.message_type === 'session_welcome') {
      const welcome = WelcomeSchema.parse(envelope.payload)
      await this.subscribe(context.channelId, userId, welcome.session.id, accessToken, clientId)
      return welcome.session.keepalive_timeout_seconds
    }
    if (envelope.metadata.message_type === 'notification') {
      const event = normalizeTwitchChatNotification(envelope)
      if (event) {
        const avatarUrl = await this.twitchAvatar(
          event.author.providerUserId,
          accessToken,
          clientId,
        )
        await context.onEvent({ ...event, author: { ...event.author, avatarUrl } })
      }
    }
    if (envelope.metadata.message_type === 'revocation') throw new Error('TWITCH_EVENTSUB_REVOKED')
    if (envelope.metadata.message_type === 'session_reconnect')
      throw new Error('TWITCH_EVENTSUB_RECONNECT_REQUESTED')
    return null
  }

  private twitchAvatar(userId: string, accessToken: string, clientId: string) {
    const cached = this.avatars.get(userId)
    if (cached) return cached
    const pending = this.fetchTwitchAvatar(userId, accessToken, clientId)
    this.avatars.set(userId, pending)
    return pending
  }

  private async fetchTwitchAvatar(userId: string, accessToken: string, clientId: string) {
    try {
      const url = new URL('https://api.twitch.tv/helix/users')
      url.searchParams.set('id', userId)
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${accessToken}`, 'client-id': clientId },
      })
      if (!response.ok) return null
      const users = TwitchUsersSchema.parse(await response.json())
      return downloadAvatarDataUrl(users.data[0]?.profile_image_url ?? null)
    } catch {
      return null
    }
  }

  private async subscribe(
    broadcasterUserId: string,
    userId: string,
    sessionId: string,
    accessToken: string,
    clientId: string,
  ): Promise<void> {
    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      body: JSON.stringify({
        condition: { broadcaster_user_id: broadcasterUserId, user_id: userId },
        transport: { method: 'websocket', session_id: sessionId },
        type: 'channel.chat.message',
        version: '1',
      }),
      headers: {
        authorization: `Bearer ${accessToken}`,
        'client-id': clientId,
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    if (!response.ok) throw new Error(`TWITCH_EVENTSUB_SUBSCRIPTION_${response.status}`)
  }
}

export function normalizeTwitchChatNotification(input: z.infer<typeof EnvelopeSchema>) {
  const parsed = NotificationSchema.safeParse(input.payload)
  if (!parsed.success) return null
  const event = parsed.data.event
  return ChatMessageReceivedSchema.parse({
    author: {
      avatarUrl: null,
      displayName: event.chatter_user_name,
      handle: event.chatter_user_login,
      provider: 'twitch',
      providerUserId: event.chatter_user_id,
    },
    badges: event.badges.map((badge) => badge.set_id),
    channelId: event.broadcaster_user_id,
    externalEventId: input.metadata.message_id,
    message: event.message.text,
    occurredAt: input.metadata.message_timestamp,
    provider: 'twitch',
    roles: {
      isBot: false,
      isBroadcaster: event.badges.some((badge) => badge.set_id === 'broadcaster'),
      isMember: event.badges.some((badge) => badge.set_id === 'subscriber'),
      isModerator: event.badges.some((badge) => badge.set_id === 'moderator'),
    },
    type: 'chat.message',
  })
}
