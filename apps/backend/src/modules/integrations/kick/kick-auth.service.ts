import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createServer, type Server, type ServerResponse } from 'node:http'

import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common'
import {
  KickAuthorizationPollSchema,
  KickAuthorizationStartSchema,
  KickAuthorizationStatusSchema,
} from '@streamkit/contracts'
import { z } from 'zod'

import { ApiApplicationError } from '../../../application/api-error'
import {
  SECURE_CREDENTIAL_REPOSITORY,
  type SecureCredentialRepository,
} from '../../settings/secure-credential.repository'
import { ExternalTransportService } from '../external-events/external-transport.service'

const CLIENT_ID = 'kick.client-id'
const CLIENT_SECRET = 'kick.client-secret'
const TOKEN = 'kick.oauth'
const SCOPES = 'user:read channel:read chat:write events:subscribe moderation:ban'
const TokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1),
  scope: z.string().optional().default(SCOPES),
  token_type: z.string().min(1),
})
const StoredSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.iso.datetime(),
  refreshToken: z.string().min(1),
  scopes: z.array(z.string()),
})
type Pending = {
  codeVerifier: string
  expiresAt: number
  redirectUri: string
  server: Server
  state: string
  error: string | null
  token: z.infer<typeof StoredSchema> | null
}

@Injectable()
export class KickAuthService implements OnModuleDestroy {
  private readonly pending = new Map<string, Pending>()
  private refreshPromise: Promise<z.infer<typeof StoredSchema>> | null = null

  public constructor(
    @Inject(SECURE_CREDENTIAL_REPOSITORY) private readonly credentials: SecureCredentialRepository,
    @Inject(ExternalTransportService) private readonly transport: ExternalTransportService,
  ) {}

  public async begin() {
    const clientId = await this.requireClientId()
    const endpoint = await this.transport.register('kick')
    if (!endpoint.callbackUrl) throw new Error('KICK_WEBHOOK_URL_UNAVAILABLE')
    const flowId = randomUUID()
    const state = randomBytes(32).toString('base64url')
    const codeVerifier = randomBytes(64).toString('base64url')
    const challenge = createHash('sha256').update(codeVerifier).digest('base64url')
    const expiresAt = Date.now() + 10 * 60_000
    const server = createServer()
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('KICK_LOOPBACK_FAILED')
    const redirectUri = `http://127.0.0.1:${address.port}/oauth/kick/callback`
    const flow: Pending = {
      codeVerifier,
      expiresAt,
      redirectUri,
      server,
      state,
      error: null,
      token: null,
    }
    this.pending.set(flowId, flow)
    server.on(
      'request',
      (request, response) => void this.handleCallback(flow, request.url ?? '/', response),
    )
    const url = new URL('https://id.kick.com/oauth/authorize')
    url.search = new URLSearchParams({
      client_id: clientId,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
    }).toString()
    return KickAuthorizationStartSchema.parse({
      authorizationUrl: url.toString(),
      expiresAt: new Date(expiresAt).toISOString(),
      flowId,
      redirectUrl: redirectUri,
      webhookUrl: endpoint.callbackUrl,
    })
  }

  public async poll(flowId: string) {
    const flow = this.pending.get(flowId)
    if (!flow || flow.expiresAt <= Date.now()) {
      this.finish(flowId)
      await this.transport.unregister('kick')
      return KickAuthorizationPollSchema.parse({ status: 'expired' })
    }
    if (flow.error) {
      const error = flow.error
      this.finish(flowId)
      await this.transport.unregister('kick')
      return KickAuthorizationPollSchema.parse({ error, status: 'failed' })
    }
    if (!flow.token) return KickAuthorizationPollSchema.parse({ status: 'pending' })
    await this.credentials.save(TOKEN, JSON.stringify(flow.token))
    this.finish(flowId)
    return KickAuthorizationPollSchema.parse({
      authorization: await this.status(),
      status: 'authorized',
    })
  }

  public async status() {
    const id = await this.credentials.status(CLIENT_ID)
    const vault = await this.credentials.status(TOKEN)
    const token = vault.configured ? await this.readToken() : null
    return KickAuthorizationStatusSchema.parse({
      available: id.available && id.configured,
      configured: Boolean(token),
      expiresAt: token?.expiresAt ?? null,
      scopes: token?.scopes ?? [],
    })
  }

  public async getAccessToken() {
    let token = await this.readToken()
    if (!token)
      throw new ApiApplicationError('INTEGRATION_AUTH_REQUIRED', 'Kick is not connected', 409)
    if (Date.parse(token.expiresAt) <= Date.now() + 60_000) token = await this.refresh(token)
    return token
  }

  public async disconnect() {
    await this.credentials.remove(TOKEN)
    await this.transport.unregister('kick')
    return this.status()
  }

  public onModuleDestroy(): void {
    for (const flow of this.pending.values()) flow.server.close()
    this.pending.clear()
  }

  private async handleCallback(flow: Pending, requestUrl: string, response: ServerResponse) {
    const url = new URL(requestUrl, flow.redirectUri)
    const code = url.searchParams.get('code')
    if (
      url.pathname !== '/oauth/kick/callback' ||
      url.searchParams.get('state') !== flow.state ||
      !code
    ) {
      flow.error = url.searchParams.get('error') ?? 'Invalid Kick OAuth callback or state'
    } else {
      try {
        const response = await fetch('https://id.kick.com/oauth/token', {
          body: new URLSearchParams({
            client_id: await this.requireClientId(),
            client_secret: await this.requireClientSecret(),
            code,
            code_verifier: flow.codeVerifier,
            grant_type: 'authorization_code',
            redirect_uri: flow.redirectUri,
          }),
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          method: 'POST',
        })
        if (!response.ok) throw new Error(`KICK_OAUTH_${response.status}`)
        flow.token = this.toStored(TokenSchema.parse(await response.json()))
      } catch (cause) {
        flow.error = cause instanceof Error ? cause.message : 'Kick authorization failed'
      }
    }
    response.writeHead(flow.error ? 400 : 200, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(flow.error ?? 'Authorization received. Return to StreamKit.')
  }

  private async refresh(current: z.infer<typeof StoredSchema>) {
    if (this.refreshPromise) return this.refreshPromise
    this.refreshPromise = (async () => {
      const response = await fetch('https://id.kick.com/oauth/token', {
        body: new URLSearchParams({
          client_id: await this.requireClientId(),
          client_secret: await this.requireClientSecret(),
          grant_type: 'refresh_token',
          refresh_token: current.refreshToken,
        }),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      })
      if (!response.ok)
        throw new ApiApplicationError('INTEGRATION_AUTH_REVOKED', 'Kick authorization expired', 401)
      const next = this.toStored(TokenSchema.parse(await response.json()))
      await this.credentials.save(TOKEN, JSON.stringify(next))
      return next
    })().finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private toStored(token: z.infer<typeof TokenSchema>) {
    return StoredSchema.parse({
      accessToken: token.access_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1_000).toISOString(),
      refreshToken: token.refresh_token,
      scopes: token.scope.split(' '),
    })
  }
  private async requireClientId() {
    const value = await this.credentials.read(CLIENT_ID)
    if (!value)
      throw new ApiApplicationError(
        'INTEGRATION_CLIENT_NOT_CONFIGURED',
        'Kick Client ID is not configured',
        409,
      )
    return value
  }
  private async requireClientSecret() {
    const value = await this.credentials.read(CLIENT_SECRET)
    if (!value)
      throw new ApiApplicationError(
        'INTEGRATION_CLIENT_NOT_CONFIGURED',
        'Kick Client Secret is not configured',
        409,
      )
    return value
  }
  private async readToken() {
    const value = await this.credentials.read(TOKEN)
    if (!value) return null
    try {
      return StoredSchema.parse(JSON.parse(value) as unknown)
    } catch {
      return null
    }
  }
  private finish(flowId: string) {
    this.pending.get(flowId)?.server.close()
    this.pending.delete(flowId)
  }
}
