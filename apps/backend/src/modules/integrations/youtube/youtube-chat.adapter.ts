import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const protoSource = `syntax = "proto2";
package youtube.api.v3;
service V3DataLiveChatMessageService { rpc StreamList(LiveChatMessageListRequest) returns (stream LiveChatMessageListResponse) {} }
message LiveChatMessageListRequest { optional string live_chat_id = 1; optional string page_token = 99; repeated string part = 100; optional uint32 profile_image_size = 3; }
message LiveChatMessageListResponse { optional string next_page_token = 100602; repeated LiveChatMessage items = 1007; }
message LiveChatMessage { optional string id = 101; optional LiveChatMessageSnippet snippet = 2; optional LiveChatMessageAuthorDetails author_details = 3; }
message LiveChatMessageSnippet { optional string type = 1; optional string published_at = 4; optional string display_message = 16; }
message LiveChatMessageAuthorDetails { optional string channel_id = 10101; optional string display_name = 103; optional string profile_image_url = 104; optional bool is_chat_owner = 5; optional bool is_chat_sponsor = 6; optional bool is_chat_moderator = 7; }`

import type { ChatMessageReceived } from '@streamkit/contracts'
import type { z } from 'zod'

import {
  SilentStreamKitLogger,
  STREAMKIT_LOGGER,
  type StreamKitLogger,
} from '../../../infrastructure/logging/streamkit-logger'
import type {
  ChatProviderAdapter,
  ChatProviderConnectionContext,
  ChatProviderSession,
} from '../chat-provider.adapter'
import { downloadAvatarDataUrl } from '../avatar-data-url'
import { ChatProviderRegistry } from '../chat-provider.registry'
import {
  YouTubeApiErrorResponseSchema,
  YouTubeLiveChatItemSchema,
  YouTubeLiveChatResponseSchema,
} from './youtube-api.schemas'
import { YouTubeAuthService } from './youtube-auth.service'

@Injectable()
export class YouTubeChatAdapter
  implements ChatProviderAdapter, OnApplicationBootstrap, OnModuleDestroy
{
  public readonly capabilities = [
    'chat.read',
    'chat.write',
    'chat.message.delete',
    'chat.user.ban',
    'chat.user.unban',
    'chat.user.moderator.add',
    'chat.user.moderator.remove',
    'live.read',
    'user.identity',
  ] as const
  public readonly provider = 'youtube' as const
  private unregister: (() => void) | null = null
  private readonly avatars = new Map<string, Promise<string | null>>()

  public constructor(
    @Inject(YouTubeAuthService) private readonly auth: YouTubeAuthService,
    @Inject(ChatProviderRegistry) private readonly registry: ChatProviderRegistry,
    @Inject(STREAMKIT_LOGGER)
    private readonly logger: StreamKitLogger = new SilentStreamKitLogger(),
  ) {}

  public async connect(context: ChatProviderConnectionContext): Promise<ChatProviderSession> {
    if (process.env.NODE_ENV !== 'test') return this.connectStream(context)
    return this.connectPolling(context)
  }

  private async connectPolling(
    context: ChatProviderConnectionContext,
  ): Promise<ChatProviderSession> {
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
          if (!response.ok) throw new Error(await this.errorCode(response))
          const payload = YouTubeLiveChatResponseSchema.parse(await response.json())
          for (const rawItem of payload.items) {
            const parsedItem = YouTubeLiveChatItemSchema.safeParse(rawItem)
            if (!parsedItem.success) {
              await this.logger.log('warn', 'youtube.chat.item_ignored', {
                issues: parsedItem.error.issues.map((issue) => ({
                  code: issue.code,
                  path: issue.path.join('.'),
                })),
              })
              continue
            }
            const event = normalizeYouTubeChatMessage(context.channelId, parsedItem.data)
            if (event) {
              const avatarUrl = await this.avatar(
                event.author.providerUserId,
                event.author.avatarUrl,
              )
              await context.onEvent({ ...event, author: { ...event.author, avatarUrl } })
            }
          }
          cursor = payload.nextPageToken ?? cursor
          if (cursor) await context.onCursor(cursor)
          await this.delay(Math.max(1_000, payload.pollingIntervalMillis), context.signal)
        } catch (cause) {
          if (stopped || context.signal.aborted) break
          await this.logger.log('error', 'youtube.chat.connection_failed', {
            errorCode:
              cause instanceof Error && /^[A-Z][A-Z0-9_]{0,99}$/.test(cause.message)
                ? cause.message
                : 'YOUTUBE_CONNECTION_FAILURE',
            errorName: cause instanceof Error ? cause.name : 'UnknownError',
            issues:
              cause && typeof cause === 'object' && 'issues' in cause && Array.isArray(cause.issues)
                ? cause.issues.map((issue: { code?: unknown; path?: unknown }) => ({
                    code: issue.code,
                    path: Array.isArray(issue.path) ? issue.path.join('.') : '',
                  }))
                : [],
          })
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

  private async connectStream(
    context: ChatProviderConnectionContext,
  ): Promise<ChatProviderSession> {
    let stopped = false
    let stream: grpc.ClientReadableStream<unknown> | null = null
    let resolveClosed: () => void = () => undefined
    let rejectClosed: (cause: Error) => void = () => undefined
    const closed = new Promise<void>((resolve, reject) => {
      resolveClosed = resolve
      rejectClosed = reject
    })
    const run = async () => {
      const directory = mkdtempSync(join(tmpdir(), 'streamkit-youtube-'))
      const protoPath = join(directory, 'stream_list.proto')
      writeFileSync(protoPath, protoSource, 'utf8')
      try {
        const definition = protoLoader.loadSync(protoPath, { keepCase: false, longs: String })
        const loaded = grpc.loadPackageDefinition(definition) as unknown as {
          youtube: {
            api: {
              v3: {
                V3DataLiveChatMessageService: new (
                  address: string,
                  credentials: grpc.ChannelCredentials,
                ) => {
                  StreamList: (
                    request: unknown,
                    metadata: grpc.Metadata,
                  ) => grpc.ClientReadableStream<unknown>
                }
              }
            }
          }
        }
        const client = new loaded.youtube.api.v3.V3DataLiveChatMessageService(
          'youtube.googleapis.com:443',
          grpc.credentials.createSsl(),
        )
        const token = await this.auth.getAccessToken()
        const metadata = new grpc.Metadata()
        metadata.set('authorization', `Bearer ${token.accessToken}`)
        stream = client.StreamList(
          {
            liveChatId: context.channelId,
            pageToken: context.cursor ?? undefined,
            part: ['id', 'snippet', 'authorDetails'],
            profileImageSize: 64,
          },
          metadata,
        )
        let queue = Promise.resolve()
        stream.on('data', (response: unknown) => {
          queue = queue.then(() => this.processStreamResponse(context, response))
        })
        await new Promise<void>((resolve, reject) => {
          stream?.once('end', resolve)
          stream?.once('error', reject)
          context.signal.addEventListener(
            'abort',
            () => {
              stream?.cancel()
              resolve()
            },
            { once: true },
          )
        })
        await queue
        if (!stopped && !context.signal.aborted)
          rejectClosed(new Error('YOUTUBE_CHAT_STREAM_CLOSED'))
        else resolveClosed()
      } catch (cause) {
        if (stopped || context.signal.aborted) resolveClosed()
        else rejectClosed(cause instanceof Error ? cause : new Error('YOUTUBE_CHAT_FAILED'))
      } finally {
        rmSync(directory, { force: true, recursive: true })
      }
    }
    void run()
    return {
      closed,
      close: async () => {
        stopped = true
        stream?.cancel()
        resolveClosed()
      },
    }
  }

  private async processStreamResponse(context: ChatProviderConnectionContext, response: unknown) {
    const parsed = response as {
      items?: Array<z.infer<typeof YouTubeLiveChatItemSchema>>
      nextPageToken?: string
    }
    for (const rawItem of parsed.items ?? []) {
      const parsedItem = YouTubeLiveChatItemSchema.safeParse(rawItem)
      if (!parsedItem.success) continue
      const event = normalizeYouTubeChatMessage(context.channelId, parsedItem.data)
      if (!event) continue
      const avatarUrl = await this.avatar(event.author.providerUserId, event.author.avatarUrl)
      await context.onEvent({ ...event, author: { ...event.author, avatarUrl } })
    }
    if (parsed.nextPageToken) await context.onCursor(parsed.nextPageToken)
  }

  private avatar(userId: string, url: string | null) {
    const cached = this.avatars.get(userId)
    if (cached) return cached
    const pending = downloadAvatarDataUrl(url)
    this.avatars.set(userId, pending)
    return pending
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
    if (!response.ok) throw new Error(await this.errorCode(response))
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

  private async errorCode(response: Response): Promise<string> {
    const status = response.status
    let reason: string | null = null
    try {
      const parsed = YouTubeApiErrorResponseSchema.safeParse(await response.json())
      if (parsed.success) reason = parsed.data.error.errors[0]?.reason ?? null
    } catch {
      // The provider may return an empty or non-JSON response.
    }
    if (status === 401) return 'INTEGRATION_AUTH_REVOKED'
    if (status === 404 || reason === 'liveChatEnded' || reason === 'liveChatNotFound')
      return 'YOUTUBE_CHAT_ENDED'
    if (status === 403) return 'YOUTUBE_QUOTA_OR_PERMISSION_ERROR'
    return 'YOUTUBE_PROVIDER_ERROR'
  }
}

export function normalizeYouTubeChatMessage(
  channelId: string,
  item: z.infer<typeof YouTubeLiveChatItemSchema>,
): ChatMessageReceived | null {
  if (
    !item.authorDetails ||
    !item.snippet.publishedAt ||
    !['textMessageEvent', 'superChatEvent', 'superStickerEvent'].includes(item.snippet.type)
  )
    return null
  const occurredAt = new Date(item.snippet.publishedAt)
  if (Number.isNaN(occurredAt.getTime())) return null
  return {
    author: {
      avatarUrl: item.authorDetails.profileImageUrl,
      displayName: item.authorDetails.channelId,
      handle: item.authorDetails.channelId,
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
    message: item.snippet.displayMessage ?? '',
    occurredAt: occurredAt.toISOString(),
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
