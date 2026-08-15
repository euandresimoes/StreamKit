import { Inject, Injectable } from '@nestjs/common'
import { z } from 'zod'
import {
  type SelectYouTubeBroadcastRequestSchema,
  YouTubeLiveBroadcastSchema,
} from '@streamkit/contracts'

import { ApiApplicationError } from '../../../application/api-error'
import { IntegrationRepository } from '../integration.repository'
import {
  YouTubeApiErrorResponseSchema,
  YouTubeBroadcastListResponseSchema,
} from './youtube-api.schemas'
import { YouTubeAuthService } from './youtube-auth.service'

@Injectable()
export class YouTubeBroadcastService {
  private static readonly BROADCASTS_CACHE_TTL_MS = 30_000
  private broadcastsCache: {
    expiresAt: number
    value: Awaited<ReturnType<YouTubeBroadcastService['listFromApi']>>
  } | null = null
  private broadcastsRequest: Promise<
    Awaited<ReturnType<YouTubeBroadcastService['listFromApi']>>
  > | null = null
  public constructor(
    @Inject(YouTubeAuthService) private readonly auth: YouTubeAuthService,
    @Inject(IntegrationRepository) private readonly integrations: IntegrationRepository,
  ) {}

  public async list() {
    if (this.broadcastsCache && this.broadcastsCache.expiresAt > Date.now())
      return this.broadcastsCache.value
    if (!this.broadcastsRequest) {
      this.broadcastsRequest = this.listFromApi().finally(() => {
        this.broadcastsRequest = null
      })
    }
    const value = await this.broadcastsRequest
    this.broadcastsCache = {
      expiresAt: Date.now() + YouTubeBroadcastService.BROADCASTS_CACHE_TTL_MS,
      value,
    }
    return value
  }

  private async listFromApi() {
    const token = await this.auth.getAccessToken()
    const url = new URL('https://www.googleapis.com/youtube/v3/liveBroadcasts')
    url.search = new URLSearchParams({
      broadcastStatus: 'active',
      broadcastType: 'all',
      maxResults: '25',
      part: 'id,snippet',
    }).toString()
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token.accessToken}` },
    })
    if (!response.ok) throw await this.apiError(response)
    const payload = YouTubeBroadcastListResponseSchema.parse(await response.json())
    return payload.items.flatMap((item) =>
      item.snippet.liveChatId
        ? [
            YouTubeLiveBroadcastSchema.parse({
              channelId: item.snippet.channelId,
              liveChatId: item.snippet.liveChatId,
              scheduledStartAt: item.snippet.scheduledStartTime ?? null,
              title: item.snippet.title,
              videoId: item.id,
            }),
          ]
        : [],
    )
  }

  public select(input: z.infer<typeof SelectYouTubeBroadcastRequestSchema>) {
    return this.integrations.saveConnection({
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
      channelDisplayName: input.title,
      channelId: input.liveChatId,
      provider: 'youtube',
    })
  }

  public async deleteMessage(messageId: string): Promise<void> {
    const token = await this.auth.getAccessToken()
    const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages')
    url.searchParams.set('id', messageId)
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token.accessToken}` },
      method: 'DELETE',
    })
    if (!response.ok) throw await this.apiError(response)
  }

  public async banUser(liveChatId: string, userId: string): Promise<void> {
    const token = await this.auth.getAccessToken()
    const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/bans')
    url.searchParams.set('part', 'snippet')
    const response = await fetch(url, {
      body: JSON.stringify({
        snippet: { bannedUserDetails: { channelId: userId }, liveChatId, type: 'permanent' },
      }),
      headers: { authorization: `Bearer ${token.accessToken}`, 'content-type': 'application/json' },
      method: 'POST',
    })
    if (!response.ok) throw await this.apiError(response)
  }

  public async unbanUser(liveChatId: string, userId: string): Promise<void> {
    const token = await this.auth.getAccessToken()
    const listUrl = new URL('https://www.googleapis.com/youtube/v3/liveChat/bans')
    listUrl.search = new URLSearchParams({
      liveChatId,
      maxResults: '50',
      part: 'snippet',
    }).toString()
    const listResponse = await fetch(listUrl, {
      headers: { authorization: `Bearer ${token.accessToken}` },
    })
    if (!listResponse.ok) throw await this.apiError(listResponse)
    const payload = z
      .object({
        items: z.array(
          z.object({
            id: z.string(),
            snippet: z.object({ bannedUserDetails: z.object({ channelId: z.string() }) }),
          }),
        ),
      })
      .parse(await listResponse.json())
    const ban = payload.items.find((item) => item.snippet.bannedUserDetails.channelId === userId)
    if (!ban) return
    const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/bans')
    url.searchParams.set('id', ban.id)
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token.accessToken}` },
      method: 'DELETE',
    })
    if (!response.ok) throw await this.apiError(response)
  }

  public async addModerator(liveChatId: string, userId: string): Promise<void> {
    const token = await this.auth.getAccessToken()
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/liveChat/moderators?part=snippet',
      {
        body: JSON.stringify({ snippet: { liveChatId, moderatorDetails: { channelId: userId } } }),
        headers: {
          authorization: `Bearer ${token.accessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    )
    if (!response.ok) throw await this.apiError(response)
  }

  public async removeModerator(liveChatId: string, userId: string): Promise<void> {
    const token = await this.auth.getAccessToken()
    const listUrl = new URL('https://www.googleapis.com/youtube/v3/liveChat/moderators')
    listUrl.search = new URLSearchParams({
      liveChatId,
      maxResults: '50',
      part: 'snippet',
    }).toString()
    const listResponse = await fetch(listUrl, {
      headers: { authorization: `Bearer ${token.accessToken}` },
    })
    if (!listResponse.ok) throw await this.apiError(listResponse)
    const payload = z
      .object({
        items: z.array(
          z.object({
            id: z.string(),
            snippet: z.object({ moderatorDetails: z.object({ channelId: z.string() }) }),
          }),
        ),
      })
      .parse(await listResponse.json())
    const moderator = payload.items.find(
      (item) => item.snippet.moderatorDetails.channelId === userId,
    )
    if (!moderator) return
    const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/moderators')
    url.searchParams.set('id', moderator.id)
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token.accessToken}` },
      method: 'DELETE',
    })
    if (!response.ok) throw await this.apiError(response)
  }

  private async apiError(response: Response): Promise<ApiApplicationError> {
    const status = response.status
    let providerReason: string | null = null
    try {
      const parsed = YouTubeApiErrorResponseSchema.safeParse(await response.json())
      if (parsed.success) {
        const reason = parsed.data.error.errors[0]?.reason
        providerReason = [reason, parsed.data.error.message].filter(Boolean).join(' · ')
      }
    } catch {
      // The provider may return an empty or non-JSON response.
    }
    if (status === 401)
      return new ApiApplicationError(
        'INTEGRATION_AUTH_REVOKED',
        providerReason ?? 'YouTube authorization expired',
        401,
      )
    if (providerReason?.toLowerCase().includes('quota'))
      return new ApiApplicationError(
        'INTEGRATION_PROVIDER_ERROR',
        'YouTube API quota exceeded. Wait for the project quota to reset or increase the quota in Google Cloud.',
        429,
        { providerReason, reason: 'quotaExceeded' },
      )
    if (status === 403)
      return new ApiApplicationError(
        'INTEGRATION_PROVIDER_ERROR',
        providerReason ?? 'YouTube quota or API access does not allow listing live broadcasts',
        503,
      )
    return new ApiApplicationError(
      'INTEGRATION_PROVIDER_ERROR',
      providerReason ?? 'Could not list active YouTube broadcasts',
      503,
    )
  }
}
