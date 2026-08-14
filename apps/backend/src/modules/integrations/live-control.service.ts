import { Inject, Injectable } from '@nestjs/common'
import {
  type ChatModerationRequest,
  ChatModerationRequestSchema,
  LiveMetadataSchema,
  type LiveMetadataUpdate,
  LiveMetadataUpdateSchema,
  LiveStreamSchema,
} from '@streamkit/contracts'

import { ApiApplicationError } from '../../application/api-error'
import { FocusedChatRepository } from './focused-chat.repository'
import { IntegrationRepository } from './integration.repository'
import { TwitchLiveControlAdapter } from './twitch/twitch-live-control.adapter'
import { TwitchChatAdapter } from './twitch/twitch-chat.adapter'
import { YouTubeBroadcastService } from './youtube/youtube-broadcast.service'

type ProviderLive = {
  channel?: string
  category?: string | null
  description?: string | null
  gameName?: string | null
  language?: string | null
  startedAt?: string | null
  state: 'online' | 'offline' | 'unavailable' | 'error'
  title?: string | null
  videoId?: string | null
  viewerCount?: number | null
}

@Injectable()
export class LiveControlService {
  public constructor(
    @Inject(IntegrationRepository) private readonly integrations: IntegrationRepository,
    @Inject(FocusedChatRepository) private readonly chat: FocusedChatRepository,
    @Inject(TwitchLiveControlAdapter) private readonly twitch: TwitchLiveControlAdapter,
    @Inject(TwitchChatAdapter) private readonly twitchChat: TwitchChatAdapter,
    @Inject(YouTubeBroadcastService) private readonly youtube: YouTubeBroadcastService,
  ) {}

  public async list() {
    await this.syncYouTubeBroadcasts()
    const connections = await this.integrations.listConnections()
    const streams = await Promise.all(connections.map((connection) => this.snapshot(connection)))
    return streams.filter((stream) => stream.state === 'online')
  }

  private async syncYouTubeBroadcasts(): Promise<void> {
    try {
      const broadcasts = await this.youtube.list()
      await Promise.all(
        broadcasts.map((broadcast) =>
          this.integrations.saveConnection({
            capabilities: [
              'chat.read',
              'chat.write',
              'chat.message.delete',
              'chat.user.ban',
              'chat.user.unban',
              'chat.user.moderator.add',
              'chat.user.moderator.remove',
              'live.metadata.write',
              'live.read',
              'user.identity',
            ],
            channelDisplayName: broadcast.title,
            channelId: broadcast.liveChatId,
            provider: 'youtube',
          }),
        ),
      )
    } catch {
      // YouTube may be disconnected or have no active broadcast.
    }
  }

  public async updateMetadata(id: string, input: LiveMetadataUpdate) {
    const connection = await this.integrations.getConnection(id)
    if (!connection)
      throw new ApiApplicationError('INTEGRATION_CONNECTION_NOT_FOUND', 'Connection not found', 404)
    if (connection.status !== 'connected')
      throw new ApiApplicationError(
        'INTEGRATION_CONNECTION_UNAVAILABLE',
        'Live metadata requires an active connection',
        409,
      )
    if (!connection.capabilities.includes('live.metadata.write'))
      throw new ApiApplicationError(
        'INTEGRATION_CAPABILITY_UNAVAILABLE',
        'This provider cannot edit live metadata',
        409,
      )
    LiveMetadataUpdateSchema.parse(input)
    if (input.title) {
      if (connection.provider === 'twitch')
        await this.twitch.updateTitle(connection.channelId, input.title)
      if (connection.provider === 'youtube') {
        const broadcast = (await this.youtube.list()).find(
          (item) => item.liveChatId === connection.channelId,
        )
        if (!broadcast)
          throw new ApiApplicationError(
            'INTEGRATION_CONNECTION_UNAVAILABLE',
            'YouTube live broadcast is no longer active',
            409,
          )
        await this.youtube.updateMetadata(broadcast.videoId, input)
      }
    }
    return this.snapshot(connection)
  }

  public async channelChat(id: string) {
    const connection = await this.integrations.getConnection(id)
    if (!connection)
      throw new ApiApplicationError('INTEGRATION_CONNECTION_NOT_FOUND', 'Connection not found', 404)
    return this.chat.forChannel(connection)
  }

  public async moderateChat(id: string, input: ChatModerationRequest) {
    const connection = await this.integrations.getConnection(id)
    if (!connection)
      throw new ApiApplicationError('INTEGRATION_CONNECTION_NOT_FOUND', 'Connection not found', 404)
    if (connection.status !== 'connected')
      throw new ApiApplicationError(
        'INTEGRATION_CONNECTION_UNAVAILABLE',
        'Chat connection is not active',
        409,
      )
    const request = ChatModerationRequestSchema.parse(input)
    const capability =
      request.action === 'delete_message'
        ? 'chat.message.delete'
        : request.action === 'pin_message'
          ? 'chat.message.pin'
          : request.action === 'ban_user'
            ? 'chat.user.ban'
            : request.action === 'unban_user'
              ? 'chat.user.unban'
              : request.action === 'add_moderator'
                ? 'chat.user.moderator.add'
                : 'chat.user.moderator.remove'
    if (!connection.capabilities.includes(capability))
      throw new ApiApplicationError(
        'INTEGRATION_CAPABILITY_UNAVAILABLE',
        'This action is not available for the connected platform',
        409,
      )
    if (connection.provider === 'twitch') {
      if (request.action === 'delete_message')
        await this.twitchChat.deleteMessage(connection.channelId, request.externalMessageId)
      if (request.action === 'pin_message')
        await this.twitchChat.pinMessage(connection.channelId, request.externalMessageId)
      if (request.action === 'ban_user')
        await this.twitchChat.banUser(connection.channelId, request.providerUserId)
      if (request.action === 'unban_user')
        await this.twitchChat.unbanUser(connection.channelId, request.providerUserId)
      if (request.action === 'add_moderator')
        await this.twitchChat.addModerator(connection.channelId, request.providerUserId)
      if (request.action === 'remove_moderator')
        await this.twitchChat.removeModerator(connection.channelId, request.providerUserId)
    } else if (connection.provider === 'youtube') {
      if (request.action === 'delete_message')
        await this.youtube.deleteMessage(request.externalMessageId)
      if (request.action === 'ban_user')
        await this.youtube.banUser(connection.channelId, request.providerUserId)
      if (request.action === 'unban_user')
        await this.youtube.unbanUser(connection.channelId, request.providerUserId)
      if (request.action === 'add_moderator')
        await this.youtube.addModerator(connection.channelId, request.providerUserId)
      if (request.action === 'remove_moderator')
        await this.youtube.removeModerator(connection.channelId, request.providerUserId)
    } else {
      throw new ApiApplicationError(
        'INTEGRATION_CAPABILITY_UNAVAILABLE',
        'Kick moderation actions are not available in the current integration',
        409,
      )
    }
    return { action: request.action, externalMessageId: request.externalMessageId }
  }

  private async snapshot(
    connection: NonNullable<Awaited<ReturnType<IntegrationRepository['getConnection']>>>,
    update?: LiveMetadataUpdate,
  ) {
    const live = await this.providerLive(connection)
    const metadata = LiveMetadataSchema.parse({
      category: live.category ?? live.gameName ?? null,
      description: live.description ?? null,
      emotesEnabled: null,
      followersOnly: null,
      language: live.language ?? null,
      slowMode: null,
      subscribersOnly: null,
      tags: [],
      title: update?.title ?? live.title ?? null,
      visibility: null,
      ...update,
    })
    return LiveStreamSchema.parse({
      capabilities: connection.capabilities,
      channelDisplayName: connection.channelDisplayName,
      channelId: connection.channelId,
      connectionId: connection.id,
      durationSeconds: live.startedAt
        ? Math.max(0, Math.floor((Date.now() - Date.parse(live.startedAt)) / 1_000))
        : null,
      metadata,
      metadataControls: this.metadataControls(connection.provider),
      preview: {
        channel: live.channel ?? connection.channelDisplayName,
        state:
          live.state === 'online' ? 'ready' : live.state === 'offline' ? 'offline' : 'unsupported',
        videoId: live.videoId ?? null,
      },
      provider: connection.provider,
      startedAt: live.startedAt ?? null,
      state: live.state,
      title: metadata.title,
      viewerCount: live.viewerCount ?? null,
    })
  }

  private metadataControls(provider: 'kick' | 'twitch' | 'youtube') {
    const controls = {
      twitch: [
        { editable: false, id: 'slowMode', label: 'Modo lento' },
        { editable: false, id: 'followersOnly', label: 'Somente seguidores' },
        { editable: false, id: 'subscribersOnly', label: 'Somente inscritos' },
      ],
      youtube: [{ editable: false, id: 'slowMode', label: 'Modo lento' }],
      kick: [],
    } as const
    return controls[provider]
  }

  private async providerLive(
    connection: NonNullable<Awaited<ReturnType<IntegrationRepository['getConnection']>>>,
  ): Promise<ProviderLive> {
    try {
      if (connection.provider === 'twitch') {
        const stream = await this.twitch.getLive(connection.channelId)
        return stream
          ? {
              channel: stream.user_name,
              gameName: stream.game_name,
              language: stream.language,
              startedAt: stream.started_at,
              state: 'online',
              title: stream.title,
              viewerCount: stream.viewer_count,
            }
          : { state: 'offline' }
      }
      if (connection.provider === 'youtube') {
        const broadcast = (await this.youtube.list()).find(
          (item) => item.liveChatId === connection.channelId,
        )
        if (!broadcast) return { state: 'offline' }
        let details = { startedAt: null as string | null, viewerCount: null as number | null }
        try {
          details = await this.youtube.liveDetails(broadcast.videoId)
        } catch {
          // Live status remains useful when the optional analytics fields are unavailable.
        }
        let metadata: Awaited<ReturnType<YouTubeBroadcastService['videoMetadata']>> = null
        try {
          metadata = await this.youtube.videoMetadata(broadcast.videoId)
        } catch {
          // Metadata remains available with the broadcast title when details are unavailable.
        }
        return {
          category: metadata?.category ?? null,
          channel: broadcast.title,
          description: metadata?.description ?? null,
          language: metadata?.language ?? null,
          startedAt: details.startedAt ?? broadcast.scheduledStartAt,
          state: 'online',
          title: metadata?.title ?? broadcast.title,
          videoId: broadcast.videoId,
          viewerCount: details.viewerCount,
        }
      }
    } catch {
      return { state: 'error' }
    }
    return { state: 'unavailable' }
  }
}
