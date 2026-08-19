import { Inject, Injectable } from '@nestjs/common'
import { PaymentConnectionStatusSchema } from '@streamlet/contracts'
import { z } from 'zod'

import { ApiApplicationError } from '../../../../application/api-error'
import {
  SECURE_CREDENTIAL_REPOSITORY,
  type SecureCredentialRepository,
} from '../../../settings/secure-credential.repository'
import { LivePixTokenResponseSchema } from './livepix.schemas'

const CREDENTIAL = 'livepix'
const LIVEPIX_REQUEST_TIMEOUT_MS = 15_000
const LIVEPIX_SCOPE = 'account:read messages:read payments:read webhooks'
const StoredCredentialSchema = z.object({
  accessToken: z.string().min(1).optional(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  expiresAt: z.iso.datetime().optional(),
  scope: z.string().optional(),
})

@Injectable()
export class LivePixAuthService {
  private refreshPromise: Promise<string> | null = null

  public constructor(
    @Inject(SECURE_CREDENTIAL_REPOSITORY) private readonly credentials: SecureCredentialRepository,
  ) {}

  public async status() {
    const status = await this.credentials.status(CREDENTIAL)
    return PaymentConnectionStatusSchema.parse({
      accountUsername: null,
      configured: status.configured,
      lastErrorCode: null,
      provider: 'livepix',
      state: status.configured ? 'disconnected' : 'disconnected',
      webhookGeneration: 0,
      webhookUrl: null,
    })
  }

  public async getAccessToken(): Promise<string> {
    const stored = await this.read()
    if (!stored)
      throw new ApiApplicationError('INTEGRATION_AUTH_REQUIRED', 'LivePix is not connected', 409)
    if (
      stored.accessToken &&
      stored.expiresAt &&
      this.hasRequiredScope(stored.scope) &&
      Date.parse(stored.expiresAt) > Date.now() + 60_000
    )
      return stored.accessToken
    if (this.refreshPromise) return this.refreshPromise
    this.refreshPromise = this.issueToken(stored).finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  public async clientId(): Promise<string | null> {
    return (await this.read())?.clientId ?? null
  }

  public async invalidateAccessToken(rejectedToken: string): Promise<void> {
    const stored = await this.read()
    if (!stored || stored.accessToken !== rejectedToken) return
    await this.credentials.save(
      CREDENTIAL,
      JSON.stringify({
        clientId: stored.clientId,
        clientSecret: stored.clientSecret,
        scope: stored.scope,
      }),
    )
  }

  public async disconnect(): Promise<void> {
    await this.credentials.remove(CREDENTIAL)
  }

  private async issueToken(stored: z.infer<typeof StoredCredentialSchema>): Promise<string> {
    const body = new URLSearchParams({
      client_id: stored.clientId,
      client_secret: stored.clientSecret,
      grant_type: 'client_credentials',
      scope: LIVEPIX_SCOPE,
    })
    const response = await fetch('https://oauth.livepix.gg/oauth2/token', {
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
      signal: AbortSignal.timeout(LIVEPIX_REQUEST_TIMEOUT_MS),
    })
    if (response.status === 429) {
      const reset = response.headers.get('x-ratelimit-reset')
      throw new ApiApplicationError(
        'RATE_LIMITED',
        `LivePix OAuth rate limit exceeded${reset ? ` (resets at ${reset})` : ''}`,
        429,
        { reset },
      )
    }
    if (!response.ok)
      throw new ApiApplicationError('INTEGRATION_AUTH_REVOKED', 'LivePix authorization failed', 401)
    const token = LivePixTokenResponseSchema.parse(await response.json())
    const next = {
      ...stored,
      accessToken: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1_000).toISOString(),
      scope: token.scope || LIVEPIX_SCOPE,
    }
    await this.credentials.save(CREDENTIAL, JSON.stringify(next))
    return token.access_token
  }

  private hasRequiredScope(scope: string | undefined): boolean {
    const granted = new Set(scope?.split(/\s+/).filter(Boolean) ?? [])
    return LIVEPIX_SCOPE.split(' ').every((required) => granted.has(required))
  }

  private async read(): Promise<z.infer<typeof StoredCredentialSchema> | null> {
    const value = await this.credentials.read(CREDENTIAL)
    if (!value) return null
    let decoded: unknown
    try {
      decoded = JSON.parse(value) as unknown
    } catch {
      return null
    }
    const parsed = StoredCredentialSchema.safeParse(decoded)
    return parsed.success ? parsed.data : null
  }
}
