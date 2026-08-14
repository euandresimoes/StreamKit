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
  YouTubeVideoLiveDetailsResponseSchema,
} from './youtube-api.schemas'
import { YouTubeAuthService } from './youtube-auth.service'

@Injectable()
export class YouTubeBroadcastService {
  private static readonly BROADCASTS_CACHE_TTL_MS = 30_000
  private static readonly LIVE_DETAILS_CACHE_TTL_MS = 10_000
  private static readonly VIDEO_METADATA_CACHE_TTL_MS = 30_000
  private static readonly CATEGORY_CACHE_TTL_MS = 10 * 60_000

  private broadcastsCache: {
    expiresAt: number
    value: Awaited<ReturnType<YouTubeBroadcastService['listFromApi']>>
  } | null = null
  private broadcastsRequest: Promise<
    Awaited<ReturnType<YouTubeBroadcastService['listFromApi']>>
  > | null = null
  private readonly liveDetailsCache = new Map<
    string,
    { expiresAt: number; value: { startedAt: string | null; viewerCount: number | null } }
  >()
  private readonly videoMetadataCache = new Map<
    string,
    {
      expiresAt: number
      value: Awaited<ReturnType<YouTubeBroadcastService['videoMetadataFromApi']>>
    }
  >()
  private readonly categoryNameCache = new Map<string, { expiresAt: number; value: string }>()
  private categoryListCache: {
    expiresAt: number
    value: Array<{ id: string; title: string }>
  } | null = null

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
        'live.metadata.write',
        'live.read',
        'user.identity',
      ],
      channelDisplayName: input.title,
      channelId: input.liveChatId,
      provider: 'youtube',
    })
  }

  public async updateTitle(videoId: string, title: string): Promise<void> {
    const token = await this.auth.getAccessToken()
    const readUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    readUrl.search = new URLSearchParams({ id: videoId, part: 'snippet' }).toString()
    const readResponse = await fetch(readUrl, {
      headers: { authorization: `Bearer ${token.accessToken}` },
    })
    if (!readResponse.ok) throw await this.apiError(readResponse)
    const payload = z
      .object({ items: z.array(z.object({ snippet: z.record(z.string(), z.unknown()) })) })
      .parse(await readResponse.json())
    const snippet = payload.items[0]?.snippet
    if (!snippet)
      throw new ApiApplicationError(
        'INTEGRATION_PROVIDER_ERROR',
        'YouTube video metadata is unavailable',
        503,
      )
    const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
      body: JSON.stringify({ id: videoId, snippet: { ...snippet, title } }),
      headers: { authorization: `Bearer ${token.accessToken}`, 'content-type': 'application/json' },
      method: 'PUT',
    })
    if (!response.ok) throw await this.apiError(response)
    this.videoMetadataCache.delete(videoId)
  }

  public async updateMetadata(
    videoId: string,
    input: {
      category?: string | null | undefined
      description?: string | null | undefined
      language?: string | null | undefined
      title?: string | undefined
    },
  ): Promise<void> {
    const token = await this.auth.getAccessToken()
    const readUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    readUrl.search = new URLSearchParams({ id: videoId, part: 'snippet' }).toString()
    const readResponse = await fetch(readUrl, {
      headers: { authorization: `Bearer ${token.accessToken}` },
    })
    if (!readResponse.ok) throw await this.apiError(readResponse)
    const payload = z
      .object({ items: z.array(z.object({ snippet: z.record(z.string(), z.unknown()) })) })
      .parse(await readResponse.json())
    const snippet = payload.items[0]?.snippet
    if (!snippet)
      throw new ApiApplicationError(
        'INTEGRATION_PROVIDER_ERROR',
        'YouTube video metadata is unavailable',
        503,
      )
    const currentCategoryId = typeof snippet.categoryId === 'string' ? snippet.categoryId : null
    const categoryId =
      input.category && input.category !== currentCategoryId
        ? await this.resolveCategoryId(input.category, currentCategoryId)
        : currentCategoryId
    const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
      body: JSON.stringify({
        id: videoId,
        snippet: {
          ...snippet,
          categoryId,
          defaultLanguage:
            input.language === undefined ? snippet.defaultLanguage : input.language || undefined,
          description:
            input.description === undefined ? snippet.description : (input.description ?? ''),
          title: input.title ?? snippet.title,
        },
      }),
      headers: { authorization: `Bearer ${token.accessToken}`, 'content-type': 'application/json' },
      method: 'PUT',
    })
    if (!response.ok) throw await this.apiError(response)
    this.videoMetadataCache.delete(videoId)
  }

  public async videoMetadata(videoId: string) {
    const cached = this.videoMetadataCache.get(videoId)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const value = await this.videoMetadataFromApi(videoId)
    this.videoMetadataCache.set(videoId, {
      expiresAt: Date.now() + YouTubeBroadcastService.VIDEO_METADATA_CACHE_TTL_MS,
      value,
    })
    return value
  }

  private async videoMetadataFromApi(videoId: string) {
    const token = await this.auth.getAccessToken()
    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.search = new URLSearchParams({ id: videoId, part: 'snippet' }).toString()
    const response = await fetch(url, { headers: { authorization: `Bearer ${token.accessToken}` } })
    if (!response.ok) throw await this.apiError(response)
    const payload = z
      .object({
        items: z.array(
          z.object({
            snippet: z.object({
              categoryId: z.string().optional(),
              defaultLanguage: z.string().optional(),
              description: z.string().optional(),
              title: z.string(),
            }),
          }),
        ),
      })
      .parse(await response.json())
    const snippet = payload.items[0]?.snippet
    if (!snippet) return null
    let category = snippet.categoryId ?? null
    if (category) {
      try {
        category = await this.resolveCategoryName(category)
      } catch {
        // Category is optional; preserve the rest of the metadata if its lookup is unavailable.
      }
    }
    return {
      category,
      description: snippet.description ?? null,
      language: snippet.defaultLanguage ?? null,
      title: snippet.title,
    }
  }

  private async resolveCategoryId(value: string, fallback: string | null) {
    if (/^\d+$/.test(value)) return value
    const categories = await this.categoryList()
    return (
      categories.find((item) => item.title.toLowerCase() === value.toLowerCase())?.id ?? fallback
    )
  }

  private async categoryList() {
    if (this.categoryListCache && this.categoryListCache.expiresAt > Date.now())
      return this.categoryListCache.value
    const token = await this.auth.getAccessToken()
    const url = new URL('https://www.googleapis.com/youtube/v3/videoCategories')
    url.search = new URLSearchParams({
      maxResults: '50',
      part: 'snippet',
      regionCode: 'BR',
    }).toString()
    const response = await fetch(url, { headers: { authorization: `Bearer ${token.accessToken}` } })
    if (!response.ok) return []
    const payload = z
      .object({
        items: z.array(z.object({ id: z.string(), snippet: z.object({ title: z.string() }) })),
      })
      .parse(await response.json())
    const value = payload.items.map((item) => ({ id: item.id, title: item.snippet.title }))
    this.categoryListCache = {
      expiresAt: Date.now() + YouTubeBroadcastService.CATEGORY_CACHE_TTL_MS,
      value,
    }
    return value
  }

  private async resolveCategoryName(categoryId: string): Promise<string> {
    const cached = this.categoryNameCache.get(categoryId)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const token = await this.auth.getAccessToken()
    const url = new URL('https://www.googleapis.com/youtube/v3/videoCategories')
    url.search = new URLSearchParams({ id: categoryId, part: 'snippet' }).toString()
    const response = await fetch(url, { headers: { authorization: `Bearer ${token.accessToken}` } })
    if (!response.ok) return categoryId
    const payload = z
      .object({ items: z.array(z.object({ snippet: z.object({ title: z.string() }) })) })
      .parse(await response.json())
    const value = payload.items[0]?.snippet.title ?? categoryId
    this.categoryNameCache.set(categoryId, {
      expiresAt: Date.now() + YouTubeBroadcastService.CATEGORY_CACHE_TTL_MS,
      value,
    })
    return value
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

  public async liveDetails(videoId: string) {
    const cached = this.liveDetailsCache.get(videoId)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const token = await this.auth.getAccessToken()
    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.search = new URLSearchParams({ id: videoId, part: 'liveStreamingDetails' }).toString()
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token.accessToken}` },
    })
    if (!response.ok) throw await this.apiError(response)
    const payload = YouTubeVideoLiveDetailsResponseSchema.parse(await response.json())
    const details = payload.items[0]?.liveStreamingDetails
    const value = {
      startedAt: details?.actualStartTime ?? null,
      viewerCount: details?.concurrentViewers ? Number(details.concurrentViewers) : null,
    }
    this.liveDetailsCache.set(videoId, {
      expiresAt: Date.now() + YouTubeBroadcastService.LIVE_DETAILS_CACHE_TTL_MS,
      value,
    })
    return value
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
