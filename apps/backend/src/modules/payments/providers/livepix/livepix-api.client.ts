import { Inject, Injectable } from '@nestjs/common'

import { ApiApplicationError } from '../../../../application/api-error'
import { LivePixAuthService } from './livepix-auth.service'
import {
  LivePixAccountResponseSchema,
  LivePixPaymentResponseSchema,
} from './livepix.schemas'

const LIVEPIX_REQUEST_TIMEOUT_MS = 15_000

@Injectable()
export class LivePixApiClient {
  public constructor(@Inject(LivePixAuthService) private readonly auth: LivePixAuthService) {}

  public account() {
    return this.request('/v2/account', LivePixAccountResponseSchema)
  }

  public payment(id: string) {
    return this.request(`/v2/payments/${encodeURIComponent(id)}`, LivePixPaymentResponseSchema)
  }

  private async request<T extends { parse(value: unknown): unknown }>(
    path: string,
    schema: T,
    init: RequestInit = {},
  ): Promise<ReturnType<T['parse']>> {
    const response = await fetch(`https://api.livepix.gg${path}`, {
      ...init,
      headers: { authorization: `Bearer ${await this.auth.getAccessToken()}`, ...init.headers },
      signal: AbortSignal.timeout(LIVEPIX_REQUEST_TIMEOUT_MS),
    })
    if (response.status === 401)
      throw new ApiApplicationError(
        'INTEGRATION_AUTH_REVOKED',
        'LivePix authorization expired',
        401,
      )
    if (response.status === 429) {
      const reset = response.headers.get('x-ratelimit-reset')
      const remaining = response.headers.get('x-ratelimit-remaining')
      const limit = response.headers.get('x-ratelimit-limit')
      throw new ApiApplicationError(
        'RATE_LIMITED',
        `LivePix rate limit exceeded for ${init.method ?? 'GET'} ${path}${reset ? ` (resets at ${reset})` : ''}`,
        429,
        { limit, remaining, reset },
      )
    }
    if (!response.ok)
      throw new ApiApplicationError(
        'INTEGRATION_PROVIDER_ERROR',
        `LivePix API failed (HTTP ${response.status})`,
        502,
      )
    return schema.parse(response.status === 204 ? null : await response.json()) as ReturnType<
      T['parse']
    >
  }
}
