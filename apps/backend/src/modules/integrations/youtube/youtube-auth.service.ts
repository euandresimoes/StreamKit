import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createServer, type Server, type ServerResponse } from 'node:http'

import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common'
import {
  YouTubeAuthorizationPollSchema,
  YouTubeAuthorizationStartSchema,
  YouTubeAuthorizationStatusSchema,
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

const CREDENTIAL_NAME = 'youtube.oauth'
const CLIENT_ID_CREDENTIAL_NAME = 'youtube.client-id'
const CLIENT_SECRET_CREDENTIAL_NAME = 'youtube.client-secret'
const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl'
const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().default(YOUTUBE_SCOPE),
})
const OAuthErrorResponseSchema = z.object({
  error: z.string().min(1),
  error_description: z.string().optional(),
})
const StoredTokenSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.iso.datetime(),
  refreshToken: z.string().min(1),
  scopes: z.array(z.string()),
})
type PendingFlow = {
  codeVerifier: string
  error: string | null
  expiresAt: number
  redirectUri: string
  server: Server
  state: string
  token: z.infer<typeof StoredTokenSchema> | null
}

@Injectable()
export class YouTubeAuthService implements OnModuleDestroy {
  private readonly pending = new Map<string, PendingFlow>()

  public constructor(
    @Inject(INTEGRATION_RUNTIME_CONFIG) private readonly config: IntegrationRuntimeConfig,
    @Inject(SECURE_CREDENTIAL_REPOSITORY) private readonly credentials: SecureCredentialRepository,
    @Inject(IntegrationRepository) private readonly integrations: IntegrationRepository,
  ) {}

  public async begin() {
    const clientId = await this.requireClientId()
    const flowId = randomUUID()
    const state = randomBytes(32).toString('base64url')
    const codeVerifier = randomBytes(64).toString('base64url')
    const challenge = createHash('sha256').update(codeVerifier).digest('base64url')
    const expiresAt = Date.now() + 10 * 60_000
    const server = createServer()
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('YOUTUBE_LOOPBACK_FAILED')
    const redirectUri = `http://127.0.0.1:${address.port}/oauth/youtube/callback`
    const flow: PendingFlow = {
      codeVerifier,
      error: null,
      expiresAt,
      redirectUri,
      server,
      state,
      token: null,
    }
    this.pending.set(flowId, flow)
    server.on(
      'request',
      (request, response) => void this.handleCallback(flow, request.url ?? '/', response),
    )
    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authorizationUrl.search = new URLSearchParams({
      access_type: 'offline',
      client_id: clientId,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'consent',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: YOUTUBE_SCOPE,
      state,
    }).toString()
    return YouTubeAuthorizationStartSchema.parse({
      authorizationUrl: authorizationUrl.toString(),
      expiresAt: new Date(expiresAt).toISOString(),
      flowId,
    })
  }

  public async disconnect() {
    const stored = await this.readStoredToken()
    if (stored)
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(stored.accessToken)}`,
        {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          method: 'POST',
        },
      ).catch(() => undefined)
    await this.credentials.remove(CREDENTIAL_NAME)
    await this.integrations.updateProviderState('youtube', 'revoked', 'INTEGRATION_AUTH_REVOKED')
    return this.status()
  }

  public async getAccessToken() {
    let stored = await this.readStoredToken()
    if (!stored)
      throw new ApiApplicationError('INTEGRATION_AUTH_REQUIRED', 'YouTube is not connected', 409)
    if (Date.parse(stored.expiresAt) <= Date.now() + 60_000) stored = await this.refresh(stored)
    return stored
  }

  public onModuleDestroy(): void {
    for (const flow of this.pending.values()) flow.server.close()
    this.pending.clear()
  }

  public async poll(flowId: string) {
    const flow = this.pending.get(flowId)
    if (!flow || flow.expiresAt <= Date.now()) {
      this.finish(flowId)
      return YouTubeAuthorizationPollSchema.parse({ status: 'expired' })
    }
    if (flow.error) {
      const error = flow.error
      this.finish(flowId)
      return YouTubeAuthorizationPollSchema.parse({ error, status: 'failed' })
    }
    if (!flow.token) return YouTubeAuthorizationPollSchema.parse({ status: 'pending' })
    await this.credentials.save(CREDENTIAL_NAME, JSON.stringify(flow.token))
    this.finish(flowId)
    return YouTubeAuthorizationPollSchema.parse({
      authorization: await this.status(),
      status: 'authorized',
    })
  }

  public async status() {
    const vault = await this.credentials.status(CREDENTIAL_NAME)
    const token = vault.configured ? await this.readStoredToken() : null
    return YouTubeAuthorizationStatusSchema.parse({
      available: vault.available && Boolean(await this.clientId()),
      configured: Boolean(token),
      expiresAt: token?.expiresAt ?? null,
      scopes: token?.scopes ?? [],
    })
  }

  private finish(flowId: string): void {
    const flow = this.pending.get(flowId)
    flow?.server.close()
    this.pending.delete(flowId)
  }

  private async handleCallback(
    flow: PendingFlow,
    requestUrl: string,
    response: ServerResponse,
  ): Promise<void> {
    const url = new URL(requestUrl, flow.redirectUri)
    const responseText = 'Autorização recebida. Você pode fechar esta janela e voltar ao StreamKit.'
    const state = url.searchParams.get('state')
    const code = url.searchParams.get('code')
    const providerError = url.searchParams.get('error')
    if (
      url.pathname !== '/oauth/youtube/callback' ||
      state !== flow.state ||
      !code ||
      providerError
    )
      flow.error = providerError ?? 'Invalid OAuth callback or state'
    else {
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          body: await this.tokenRequest({
            client_id: await this.requireClientId(),
            code,
            code_verifier: flow.codeVerifier,
            grant_type: 'authorization_code',
            redirect_uri: flow.redirectUri,
          }),
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          method: 'POST',
        })
        if (!response.ok) throw new Error(await this.oauthError(response))
        const token = TokenResponseSchema.parse(await response.json())
        if (!token.refresh_token) throw new Error('YouTube did not return an offline refresh token')
        flow.token = StoredTokenSchema.parse({
          accessToken: token.access_token,
          expiresAt: new Date(Date.now() + token.expires_in * 1_000).toISOString(),
          refreshToken: token.refresh_token,
          scopes: token.scope.split(' '),
        })
      } catch (cause) {
        flow.error = cause instanceof Error ? cause.message : 'YouTube authorization failed'
      }
    }
    response.writeHead(flow.error ? 400 : 200, {
      'content-type': 'text/plain; charset=utf-8',
      'x-content-type-options': 'nosniff',
    })
    response.end(flow.error ?? responseText)
    flow.server.close()
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

  private async refresh(stored: z.infer<typeof StoredTokenSchema>) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      body: await this.tokenRequest({
        client_id: await this.requireClientId(),
        grant_type: 'refresh_token',
        refresh_token: stored.refreshToken,
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    })
    if (!response.ok) {
      await this.credentials.remove(CREDENTIAL_NAME)
      await this.integrations.updateProviderState('youtube', 'revoked', 'INTEGRATION_AUTH_REVOKED')
      throw new ApiApplicationError('INTEGRATION_AUTH_REVOKED', 'YouTube authorization failed', 401)
    }
    const token = TokenResponseSchema.parse(await response.json())
    const refreshed = StoredTokenSchema.parse({
      accessToken: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1_000).toISOString(),
      refreshToken: token.refresh_token ?? stored.refreshToken,
      scopes: token.scope.split(' '),
    })
    await this.credentials.save(CREDENTIAL_NAME, JSON.stringify(refreshed))
    return refreshed
  }

  private async clientId(): Promise<string | null> {
    try {
      return (
        (await this.credentials.read(CLIENT_ID_CREDENTIAL_NAME))?.trim() ||
        this.config.youtubeClientId
      )
    } catch {
      return this.config.youtubeClientId
    }
  }

  public getClientId(): Promise<string | null> {
    return this.clientId()
  }

  private async requireClientId(): Promise<string> {
    const clientId = await this.clientId()
    if (!clientId)
      throw new ApiApplicationError(
        'INTEGRATION_CLIENT_NOT_CONFIGURED',
        'The StreamKit YouTube Client ID is not configured',
        503,
      )
    return clientId
  }

  private async tokenRequest(parameters: Record<string, string>): Promise<URLSearchParams> {
    const clientSecret = await this.clientSecret()
    return new URLSearchParams({
      ...parameters,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    })
  }

  private async clientSecret(): Promise<string | null> {
    try {
      return (
        (await this.credentials.read(CLIENT_SECRET_CREDENTIAL_NAME))?.trim() ||
        this.config.youtubeClientSecret
      )
    } catch {
      return this.config.youtubeClientSecret
    }
  }

  private async oauthError(response: Response): Promise<string> {
    try {
      const parsed = OAuthErrorResponseSchema.safeParse(await response.json())
      if (parsed.success)
        return `YouTube OAuth: ${parsed.data.error}${parsed.data.error_description ? ` · ${parsed.data.error_description}` : ''}`
    } catch {
      // The provider may return an empty or non-JSON response.
    }
    return `YouTube OAuth rejected the request (HTTP ${response.status})`
  }
}
