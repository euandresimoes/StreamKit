import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'

import type { ChatMessageReceived } from '@streamkit/contracts'

import type {
  ChatProviderAdapter,
  ChatProviderConnectionContext,
  ChatProviderSession,
} from '../chat-provider.adapter'
import { ChatProviderRegistry } from '../chat-provider.registry'
import { YouTubeLiveChatResponseSchema } from './youtube-api.schemas'
import { YouTubeAuthService } from './youtube-auth.service'

@Injectable()
export class YouTubeChatAdapter
  implements ChatProviderAdapter, OnApplicationBootstrap, OnModuleDestroy
{
  public readonly capabilities = ['chat.read', 'chat.write', 'user.identity'] as const
  public readonly provider = 'youtube' as const
  private unregister: (() => void) | null = null

  public constructor(
    @Inject(YouTubeAuthService) private readonly auth: YouTubeAuthService,
    @Inject(ChatProviderRegistry) private readonly registry: ChatProviderRegistry,
  ) {}

  public async connect(context: ChatProviderConnectionContext): Promise<ChatProviderSession> {
    let stopped = false
    let resolveClosed: () => void = () => undefined
    let rejectClosed: (cause: Error) => void = () => undefined
    const closed = new Promise<void>((resolve, reject) => {
      resolveClosed = resolve
      rejectClosed = reject
    })
    const run = async () => {
      let cursor = context.cursor
      while (!stopped && !context.signal.aborted) {
        try {
          const token = await this.auth.getAccessToken()
          const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages')
          url.search = new URLSearchParams({
            liveChatId: context.channelId,
            maxResults: '200',
            part: 'id,snippet,authorDetails',
            ...(cursor ? { pageToken: cursor } : {}),
          }).toString()
          const response = await fetch(url, {
            headers: { authorization: `Bearer ${token.accessToken}` },
          })
          if (!response.ok) throw new Error(this.errorCode(response.status))
          const payload = YouTubeLiveChatResponseSchema.parse(await response.json())
          for (const item of payload.items) {
            const event = normalizeYouTubeChatMessage(context.channelId, item)
            if (event) await context.onEvent(event)
          }
          cursor = payload.nextPageToken ?? cursor
          if (cursor) await context.onCursor(cursor)
          await this.delay(payload.pollingIntervalMillis, context.signal)
        } catch (cause) {
          if (stopped || context.signal.aborted) break
          rejectClosed(cause instanceof Error ? cause : new Error('YOUTUBE_CHAT_FAILED'))
          return
        }
      }
      resolveClosed()
    }
    void run()
    return {
      closed,
      close: async () => {
        stopped = true
        resolveClosed()
      },
    }
  }

  public onApplicationBootstrap(): void {
    this.unregister = this.registry.register(this)
  }

  public onModuleDestroy(): void {
    this.unregister?.()
  }

  public async sendMessage(channelId: string, message: string): Promise<void> {
    const token = await this.auth.getAccessToken()
    const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages')
    url.searchParams.set('part', 'snippet')
    const response = await fetch(url, {
      body: JSON.stringify({
        snippet: {
          liveChatId: channelId,
          textMessageDetails: { messageText: message },
          type: 'textMessageEvent',
        },
      }),
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    if (!response.ok) throw new Error(this.errorCode(response.status))
  }

  private delay(milliseconds: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, milliseconds)
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
    })
  }

  private errorCode(status: number): string {
    if (status === 401) return 'INTEGRATION_AUTH_REVOKED'
    if (status === 403) return 'YOUTUBE_QUOTA_OR_PERMISSION_ERROR'
    if (status === 404) return 'YOUTUBE_CHAT_ENDED'
    return 'YOUTUBE_PROVIDER_ERROR'
  }
}

export function normalizeYouTubeChatMessage(
  channelId: string,
  item: {
    authorDetails: {
      channelId: string
      displayName: string
      isChatModerator: boolean
      isChatOwner: boolean
      isChatSponsor: boolean
      profileImageUrl: string | null
    }
    id: string
    snippet: { displayMessage: string; publishedAt: string; type: string }
  },
): ChatMessageReceived | null {
  if (!['textMessageEvent', 'superChatEvent', 'superStickerEvent'].includes(item.snippet.type))
    return null
  return {
    author: {
      avatarUrl: item.authorDetails.profileImageUrl,
      displayName: item.authorDetails.displayName,
      handle: item.authorDetails.displayName,
      provider: 'youtube',
      providerUserId: item.authorDetails.channelId,
    },
    badges: [
      ...(item.authorDetails.isChatOwner ? ['broadcaster'] : []),
      ...(item.authorDetails.isChatModerator ? ['moderator'] : []),
      ...(item.authorDetails.isChatSponsor ? ['member'] : []),
    ],
    channelId,
    externalEventId: item.id,
    message: item.snippet.displayMessage,
    occurredAt: item.snippet.publishedAt,
    provider: 'youtube',
    roles: {
      isBot: false,
      isBroadcaster: item.authorDetails.isChatOwner,
      isMember: item.authorDetails.isChatSponsor,
      isModerator: item.authorDetails.isChatModerator,
    },
    type: 'chat.message',
  }
}
