import { randomUUID } from 'node:crypto'

import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'
import {
  TwitchAuthorizationStatusSchema,
  TwitchDeviceAuthorizationPollSchema,
  TwitchDeviceAuthorizationSchema,
} from '@streamkit/contracts'
import { z } from 'zod'

import { ApiApplicationError } from '../../../application/api-error'
import {
  SECURE_CREDENTIAL_REPOSITORY,
  type SecureCredentialRepository,
} from '../../settings/secure-credential.repository'
import {
  INTEGRATION_RUNTIME_CONFIG,
  type IntegrationRuntimeConfig,
} from '../integration-runtime.config'
import { IntegrationRepository } from '../integration.repository'

const CREDENTIAL_NAME = 'twitch.oauth'
const TWITCH_SCOPES = ['channel:manage:broadcast', 'user:read:chat', 'user:write:chat'] as const
const DeviceResponseSchema = z.object({
  device_code: z.string().min(1),
  expires_in: z.number().int().positive(),
  interval: z.number().int().positive(),
  user_code: z.string().min(1),
  verification_uri: z.url(),
})
const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1),
  scope: z.array(z.string()),
})
const TokenErrorSchema = z.object({ message: z.string() })
const ValidateResponseSchema = z.object({
  client_id: z.string(),
  expires_in: z.number().int().nonnegative(),
  login: z.string(),
  scopes: z.array(z.string()),
  user_id: z.string(),
})
const StoredTokenSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.iso.datetime(),
  login: z.string().min(1),
  refreshToken: z.string().min(1),
  scopes: z.array(z.string()),
  userId: z.string().min(1),
})

type PendingAuthorization = z.infer<typeof DeviceResponseSchema> & { expiresAt: number }

@Injectable()
export class TwitchAuthService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly pending = new Map<string, PendingAuthorization>()
  private validationTimer: ReturnType<typeof setInterval> | null = null

  public constructor(
    @Inject(INTEGRATION_RUNTIME_CONFIG) private readonly config: IntegrationRuntimeConfig,
    @Inject(SECURE_CREDENTIAL_REPOSITORY) private readonly credentials: SecureCredentialRepository,
    @Inject(IntegrationRepository) private readonly integrations: IntegrationRepository,
  ) {}

  public onApplicationBootstrap(): void {
    if (!this.config.twitchClientId) return
    void this.validateStoredAuthorization()
    this.validationTimer = setInterval(
      () => void this.validateStoredAuthorization(),
      60 * 60 * 1_000,
    )
    this.validationTimer.unref?.()
  }

  public onModuleDestroy(): void {
    if (this.validationTimer) clearInterval(this.validationTimer)
  }

  public async begin() {
    const clientId = this.requireClientId()
    const response = await fetch('https://id.twitch.tv/oauth2/device', {
      body: new URLSearchParams({ client_id: clientId, scopes: TWITCH_SCOPES.join(' ') }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    })
    if (!response.ok) throw this.providerError('Twitch rejected the device authorization request')
    const device = DeviceResponseSchema.parse(await response.json())
    const flowId = randomUUID()
    const expiresAt = Date.now() + device.expires_in * 1_000
    this.pending.set(flowId, { ...device, expiresAt })
    return TwitchDeviceAuthorizationSchema.parse({
      expiresAt: new Date(expiresAt).toISOString(),
      flowId,
      intervalSeconds: device.interval,
      userCode: device.user_code,
      verificationUri: device.verification_uri,
    })
  }

  public async disconnect() {
    await this.credentials.remove(CREDENTIAL_NAME)
    return this.status()
  }

  public async getAccessToken(): Promise<z.infer<typeof StoredTokenSchema>> {
    let stored = await this.readStoredToken()
    if (!stored)
      throw new ApiApplicationError('INTEGRATION_AUTH_REQUIRED', 'Twitch is not connected', 409)
    if (Date.parse(stored.expiresAt) <= Date.now() + 60_000) stored = await this.refresh(stored)
    let validation = await this.validate(stored.accessToken)
    if (!validation) {
      try {
        stored = await this.refresh(stored)
        validation = await this.validate(stored.accessToken)
      } catch {
        validation = null
      }
      if (!validation) {
        await this.credentials.remove(CREDENTIAL_NAME)
        throw new ApiApplicationError(
          'INTEGRATION_AUTH_REVOKED',
          'Twitch authorization was revoked',
          401,
        )
      }
    }
    return {
      ...stored,
      expiresAt: new Date(Date.now() + validation.expires_in * 1_000).toISOString(),
    }
  }

  public async poll(flowId: string) {
    const pending = this.pending.get(flowId)
    if (!pending || pending.expiresAt <= Date.now()) {
      this.pending.delete(flowId)
      return TwitchDeviceAuthorizationPollSchema.parse({ status: 'expired' })
    }
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      body: new URLSearchParams({
        client_id: this.requireClientId(),
        device_code: pending.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        scope: TWITCH_SCOPES.join(' '),
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    })
    const payload: unknown = await response.json()
    if (!response.ok) {
      const message = TokenErrorSchema.safeParse(payload).success
        ? TokenErrorSchema.parse(payload).message
        : 'authorization_pending'
      if (message.includes('pending') || message.includes('slow')) {
        return TwitchDeviceAuthorizationPollSchema.parse({ status: 'pending' })
      }
      if (message.includes('expired')) {
        this.pending.delete(flowId)
        return TwitchDeviceAuthorizationPollSchema.parse({ status: 'expired' })
      }
      throw this.providerError('Twitch authorization failed')
    }
    const token = TokenResponseSchema.parse(payload)
    const validation = await this.validate(token.access_token)
    if (!validation) throw this.providerError('Twitch returned an invalid access token')
    const stored = StoredTokenSchema.parse({
      accessToken: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1_000).toISOString(),
      login: validation.login,
      refreshToken: token.refresh_token,
      scopes: token.scope,
      userId: validation.user_id,
    })
    await this.credentials.save(CREDENTIAL_NAME, JSON.stringify(stored))
    await this.integrations.saveConnection({
      capabilities: [
        'chat.read',
        'chat.write',
        'live.metadata.write',
        'live.read',
        'user.identity',
      ],
      channelDisplayName: validation.login,
      channelId: validation.user_id,
      provider: 'twitch',
    })
    this.pending.delete(flowId)
    return TwitchDeviceAuthorizationPollSchema.parse({
      authorization: await this.status(),
      status: 'authorized',
    })
  }

  public async status() {
    const vault = await this.credentials.status(CREDENTIAL_NAME)
    const token = vault.configured ? await this.readStoredToken() : null
    return TwitchAuthorizationStatusSchema.parse({
      available: vault.available && Boolean(this.config.twitchClientId),
      configured: Boolean(token),
      expiresAt: token?.expiresAt ?? null,
      login: token?.login ?? null,
      scopes: token?.scopes ?? [],
    })
  }

  private async readStoredToken() {
    const value = await this.credentials.read(CREDENTIAL_NAME)
    if (!value) return null
    try {
      const parsed = StoredTokenSchema.safeParse(JSON.parse(value) as unknown)
      return parsed.success ? parsed.data : null
    } catch {
      return null
    }
  }

  private requireClientId(): string {
    if (!this.config.twitchClientId)
      throw new ApiApplicationError(
        'INTEGRATION_CLIENT_NOT_CONFIGURED',
        'The StreamKit Twitch Client ID is not configured',
        503,
      )
    return this.config.twitchClientId
  }

  private async validate(accessToken: string) {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { authorization: `OAuth ${accessToken}` },
    })
    if (response.status === 401) return null
    if (!response.ok) throw this.providerError('Could not validate Twitch authorization')
    return ValidateResponseSchema.parse(await response.json())
  }

  private async refresh(stored: z.infer<typeof StoredTokenSchema>) {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      body: new URLSearchParams({
        client_id: this.requireClientId(),
        grant_type: 'refresh_token',
        refresh_token: stored.refreshToken,
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    })
    if (!response.ok) throw new Error('TWITCH_TOKEN_REFRESH_FAILED')
    const token = TokenResponseSchema.parse(await response.json())
    const refreshed = StoredTokenSchema.parse({
      ...stored,
      accessToken: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1_000).toISOString(),
      refreshToken: token.refresh_token,
      scopes: token.scope,
    })
    await this.credentials.save(CREDENTIAL_NAME, JSON.stringify(refreshed))
    return refreshed
  }

  private async validateStoredAuthorization(): Promise<void> {
    if (!(await this.credentials.status(CREDENTIAL_NAME)).configured) return
    try {
      await this.getAccessToken()
    } catch (error) {
      if (error instanceof ApiApplicationError && error.code === 'INTEGRATION_AUTH_REVOKED') return
    }
  }

  private providerError(message: string) {
    return new ApiApplicationError('INTEGRATION_PROVIDER_ERROR', message, 502)
  }
}
