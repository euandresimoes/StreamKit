import { Inject, Injectable } from '@nestjs/common'
import { unknown as unknownSchema } from 'zod'

import { ApiApplicationError } from '../../../../application/api-error'
import { LivePixAuthService } from './livepix-auth.service'
import {
  LivePixAccountResponseSchema,
  LivePixPaymentResponseSchema,
  LivePixWebhookCreatedSchema,
  LivePixWebhooksResponseSchema,
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

  public webhooks() {
    return this.request('/v2/webhooks', LivePixWebhooksResponseSchema)
  }

  public createWebhook(url: string) {
    return this.request('/v2/webhooks', LivePixWebhookCreatedSchema, {
      body: JSON.stringify({ url }),
      method: 'POST',
    })
  }

  public async deleteWebhook(id: string): Promise<void> {
    await this.request(`/v2/webhooks/${encodeURIComponent(id)}`, unknownSchema(), {
      method: 'DELETE',
    })
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
    if (response.status === 429)
      throw new ApiApplicationError('RATE_LIMITED', 'LivePix rate limit exceeded', 429)
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
