import { Inject, Injectable } from '@nestjs/common'
import {
  type SelectYouTubeBroadcastRequestSchema,
  YouTubeLiveBroadcastSchema,
} from '@streamkit/contracts'
import type { z } from 'zod'

import { ApiApplicationError } from '../../../application/api-error'
import { IntegrationRepository } from '../integration.repository'
import {
  YouTubeApiErrorResponseSchema,
  YouTubeBroadcastListResponseSchema,
} from './youtube-api.schemas'
import { YouTubeAuthService } from './youtube-auth.service'

@Injectable()
export class YouTubeBroadcastService {
  public constructor(
    @Inject(YouTubeAuthService) private readonly auth: YouTubeAuthService,
    @Inject(IntegrationRepository) private readonly integrations: IntegrationRepository,
  ) {}

  public async list() {
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
      capabilities: ['chat.read', 'chat.write', 'user.identity'],
      channelDisplayName: input.title,
      channelId: input.liveChatId,
      provider: 'youtube',
    })
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
