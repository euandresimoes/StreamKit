import { Inject, Injectable } from '@nestjs/common'
import { z } from 'zod'

import { ApiApplicationError } from '../../../application/api-error'
import {
  INTEGRATION_RUNTIME_CONFIG,
  type IntegrationRuntimeConfig,
} from '../integration-runtime.config'
import { TwitchAuthService } from './twitch-auth.service'

const TwitchStreamResponseSchema = z.object({
  data: z.array(
    z.object({
      game_name: z.string(),
      language: z.string(),
      started_at: z.iso.datetime(),
      title: z.string(),
      type: z.literal('live'),
      user_name: z.string(),
      viewer_count: z.number().int().nonnegative(),
    }),
  ),
})

@Injectable()
export class TwitchLiveControlAdapter {
  public constructor(
    @Inject(TwitchAuthService) private readonly auth: TwitchAuthService,
    @Inject(INTEGRATION_RUNTIME_CONFIG) private readonly config: IntegrationRuntimeConfig,
  ) {}

  public async getLive(channelId: string) {
    if (!this.config.twitchClientId) return null
    const token = await this.auth.getAccessToken()
    const url = new URL('https://api.twitch.tv/helix/streams')
    url.searchParams.set('user_id', channelId)
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        'client-id': this.config.twitchClientId,
      },
    })
    if (response.status === 401)
      throw new ApiApplicationError('INTEGRATION_AUTH_REVOKED', 'Twitch authorization expired', 401)
    if (!response.ok)
      throw new ApiApplicationError(
        'INTEGRATION_PROVIDER_ERROR',
        'Could not load Twitch live status',
        503,
      )
    return TwitchStreamResponseSchema.parse(await response.json()).data[0] ?? null
  }

  public async updateTitle(channelId: string, title: string): Promise<void> {
    if (!this.config.twitchClientId)
      throw new ApiApplicationError(
        'INTEGRATION_CLIENT_NOT_CONFIGURED',
        'Twitch client is not configured',
        503,
      )
    const token = await this.auth.getAccessToken()
    const response = await fetch('https://api.twitch.tv/helix/channels', {
      body: JSON.stringify({ broadcaster_id: channelId, title }),
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        'client-id': this.config.twitchClientId,
        'content-type': 'application/json',
      },
      method: 'PATCH',
    })
    if (!response.ok)
      throw new ApiApplicationError(
        'INTEGRATION_PROVIDER_ERROR',
        'Could not update Twitch live title',
        response.status === 401 ? 401 : 503,
      )
  }
}
