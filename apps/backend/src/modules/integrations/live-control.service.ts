import { Inject, Injectable } from '@nestjs/common'
import {
  LiveMetadataSchema,
  type LiveMetadataUpdate,
  LiveMetadataUpdateSchema,
  LiveStreamSchema,
} from '@streamkit/contracts'

import { ApiApplicationError } from '../../application/api-error'
import { FocusedChatRepository } from './focused-chat.repository'
import { IntegrationRepository } from './integration.repository'
import { TwitchLiveControlAdapter } from './twitch/twitch-live-control.adapter'
import { YouTubeBroadcastService } from './youtube/youtube-broadcast.service'

type ProviderLive = {
  channel?: string
  category?: string | null
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
    @Inject(YouTubeBroadcastService) private readonly youtube: YouTubeBroadcastService,
  ) {}

  public async list() {
    const connections = (await this.integrations.listConnections()).filter(
      (connection) => connection.status === 'connected',
    )
    return Promise.all(connections.map((connection) => this.snapshot(connection)))
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
        await this.youtube.updateTitle(broadcast.videoId, input.title)
      }
    }
    return this.snapshot(connection, input)
  }

  public async channelChat(id: string) {
    const connection = await this.integrations.getConnection(id)
    if (!connection)
      throw new ApiApplicationError('INTEGRATION_CONNECTION_NOT_FOUND', 'Connection not found', 404)
    return this.chat.forChannel(connection)
  }

  private async snapshot(
    connection: NonNullable<Awaited<ReturnType<IntegrationRepository['getConnection']>>>,
    update?: LiveMetadataUpdate,
  ) {
    const live = await this.providerLive(connection)
    const metadata = LiveMetadataSchema.parse({
      category: live.category ?? live.gameName ?? null,
      description: null,
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
        return broadcast
          ? {
              channel: broadcast.title,
              startedAt: broadcast.scheduledStartAt,
              state: 'online',
              title: broadcast.title,
              videoId: broadcast.videoId,
              viewerCount: null,
            }
          : { state: 'offline' }
      }
    } catch {
      return { state: 'error' }
    }
    return { state: 'unavailable' }
  }
}
