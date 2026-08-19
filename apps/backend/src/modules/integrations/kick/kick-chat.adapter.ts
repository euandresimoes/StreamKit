import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'
import { ChatMessageReceivedSchema } from '@streamlet/contracts'
import { z } from 'zod'

import { ExternalEventBus } from '../external-events/external-event.bus'
import { ExternalTransportService } from '../external-events/external-transport.service'
import type {
  ChatProviderAdapter,
  ChatProviderConnectionContext,
  ChatProviderSession,
} from '../chat-provider.adapter'
import { ChatProviderRegistry } from '../chat-provider.registry'
import { KickAuthService } from './kick-auth.service'

const EventSchema = z.object({
  message_id: z.string().min(1),
  broadcaster: z.object({
    user_id: z.union([z.string(), z.number()]),
    username: z.string(),
    profile_picture: z.string().nullable().optional(),
  }),
  sender: z.object({
    user_id: z.union([z.string(), z.number()]),
    username: z.string(),
    profile_picture: z.string().nullable().optional(),
    identity: z
      .object({ badges: z.array(z.object({ text: z.string(), type: z.string() })).default([]) })
      .nullable()
      .optional(),
  }),
  content: z.string(),
  created_at: z.iso.datetime(),
})

@Injectable()
export class KickChatAdapter
  implements ChatProviderAdapter, OnApplicationBootstrap, OnModuleDestroy
{
  public readonly provider = 'kick' as const
  public readonly capabilities = [
    'chat.read',
    'chat.write',
    'chat.message.delete',
    'chat.user.ban',
    'chat.user.unban',
    'live.read',
    'user.identity',
  ] as const
  private readonly contexts = new Map<string, ChatProviderConnectionContext>()
  private readonly subscriptions = new Map<string, string>()
  private unsubscribe: (() => void) | null = null

  public constructor(
    @Inject(KickAuthService) private readonly auth: KickAuthService,
    @Inject(ChatProviderRegistry) private readonly registry: ChatProviderRegistry,
    @Inject(ExternalTransportService) private readonly transport: ExternalTransportService,
    @Inject(ExternalEventBus) private readonly events: ExternalEventBus,
  ) {}

  public onApplicationBootstrap(): void {
    this.registry.register(this)
    this.unsubscribe = this.events.subscribe('kick', (event) => this.handleEvent(event.payload))
  }

  public onModuleDestroy(): void {
    this.unsubscribe?.()
  }

  public async connect(context: ChatProviderConnectionContext): Promise<ChatProviderSession> {
    const endpoint = await this.transport.register('kick')
    if (!endpoint.callbackUrl) throw new Error('KICK_CALLBACK_URL_UNAVAILABLE')
    const token = await this.auth.getAccessToken()
    const response = await fetch('https://api.kick.com/public/v1/events/subscriptions', {
      body: JSON.stringify({
        broadcaster_user_id: Number(context.channelId),
        events: [{ name: 'chat.message.sent', version: 1 }],
        method: 'webhook',
      }),
      headers: { authorization: `Bearer ${token.accessToken}`, 'content-type': 'application/json' },
      method: 'POST',
    })
    if (!response.ok) throw new Error(`KICK_SUBSCRIPTION_${response.status}`)
    const subscriptionId = z
      .string()
      .optional()
      .parse(((await response.json().catch(() => ({}))) as { data?: { id?: string } }).data?.id)
    this.contexts.set(context.channelId, context)
    if (subscriptionId) this.subscriptions.set(context.channelId, subscriptionId)
    let closedResolve!: () => void
    const closed = new Promise<void>((resolve) => {
      closedResolve = resolve
    })
    return {
      closed,
      close: async () => {
        this.contexts.delete(context.channelId)
        const id = this.subscriptions.get(context.channelId)
        this.subscriptions.delete(context.channelId)
        if (id) await this.deleteSubscription(id).catch(() => undefined)
        closedResolve()
        if (!this.contexts.size) await this.transport.unregister('kick')
      },
    }
  }

  public async sendMessage(channelId: string, message: string): Promise<void> {
    const token = await this.auth.getAccessToken()
    const response = await fetch('https://api.kick.com/public/v1/chat', {
      body: JSON.stringify({
        broadcaster_user_id: Number(channelId),
        content: message,
        type: 'user',
      }),
      headers: { authorization: `Bearer ${token.accessToken}`, 'content-type': 'application/json' },
      method: 'POST',
    })
    if (!response.ok) throw new Error(`KICK_CHAT_SEND_${response.status}`)
  }

  public async deleteMessage(_channelId: string, messageId: string): Promise<void> {
    await this.request('DELETE', `/public/v1/chat/${encodeURIComponent(messageId)}`)
  }
  public async banUser(channelId: string, userId: string): Promise<void> {
    await this.request('POST', '/public/v1/moderation/bans', {
      broadcaster_user_id: Number(channelId),
      user_id: Number(userId),
    })
  }
  public async unbanUser(channelId: string, userId: string): Promise<void> {
    await this.request('DELETE', '/public/v1/moderation/bans', {
      broadcaster_user_id: Number(channelId),
      user_id: Number(userId),
    })
  }

  private async request(method: 'POST' | 'DELETE', path: string, body?: unknown) {
    const token = await this.auth.getAccessToken()
    const response = await fetch(`https://api.kick.com${path}`, {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      method,
    })
    if (!response.ok) throw new Error(`KICK_API_${response.status}`)
  }
  private async deleteSubscription(id: string) {
    await this.request('DELETE', `/public/v1/events/subscriptions?id=${encodeURIComponent(id)}`)
  }
  private async handleEvent(payload: unknown): Promise<void> {
    const event = EventSchema.parse(payload)
    const context = this.contexts.get(String(event.broadcaster.user_id))
    if (!context) return
    const message = ChatMessageReceivedSchema.parse({
      author: {
        avatarUrl: event.sender.profile_picture ?? null,
        displayName: event.sender.username,
        handle: event.sender.username,
        provider: 'kick',
        providerUserId: String(event.sender.user_id),
      },
      badges: event.sender.identity?.badges.map((badge) => badge.type) ?? [],
      channelId: String(event.broadcaster.user_id),
      externalEventId: event.message_id,
      message: event.content,
      occurredAt: event.created_at,
      provider: 'kick',
      roles: {
        isBot: false,
        isBroadcaster: String(event.sender.user_id) === String(event.broadcaster.user_id),
        isMember: false,
        isModerator: (event.sender.identity?.badges ?? []).some(
          (badge) => badge.type === 'moderator',
        ),
      },
      type: 'chat.message',
    })
    await context.onEvent(message)
  }
}
