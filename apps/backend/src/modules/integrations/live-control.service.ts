import { Inject, Injectable } from '@nestjs/common'
import {
  type ChatModerationRequest,
  ChatModerationRequestSchema,
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
  state: 'online' | 'offline' | 'unavailable' | 'error'
  videoId?: string | null
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
  ) {
    const live = await this.providerLive(connection)
    return LiveStreamSchema.parse({
      capabilities: connection.capabilities,
      channelDisplayName: connection.channelDisplayName,
      channelId: connection.channelId,
      connectionId: connection.id,
      preview: {
        channel: live.channel ?? connection.channelDisplayName,
        state:
          live.state === 'online' ? 'ready' : live.state === 'offline' ? 'offline' : 'unsupported',
        videoId: live.videoId ?? null,
      },
      provider: connection.provider,
      state: live.state,
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
              state: 'online',
            }
          : { state: 'offline' }
      }
      if (connection.provider === 'youtube') {
        const broadcast = (await this.youtube.list()).find(
          (item) => item.liveChatId === connection.channelId,
        )
        if (!broadcast) return { state: 'offline' }
        return {
          channel: broadcast.title,
          state: 'online',
          videoId: broadcast.videoId,
        }
      }
    } catch {
      return { state: 'error' }
    }
    return { state: 'unavailable' }
  }
}
