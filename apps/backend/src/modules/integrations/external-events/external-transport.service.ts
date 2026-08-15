import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common'
import {
  ExternalEventIngressSchema,
  type ExternalEventProvider,
  ExternalEventProviderSchema,
  type ExternalTransportSnapshot,
  ExternalTransportSnapshotSchema,
} from '@streamkit/contracts'

import { ApiApplicationError } from '../../../application/api-error'
import { ExternalEventService } from './external-event.service'
import type { ExternalTunnelAdapter, ExternalTunnelHandle } from './external-tunnel.adapter'

type Endpoint = {
  id: string
  provider: ExternalEventProvider
  secret: string
}

const MAX_BODY_BYTES = 256_000
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 120

@Injectable()
export class ExternalTransportService implements OnModuleDestroy {
  private readonly endpoints = new Map<string, Endpoint>()
  private readonly requestWindows = new Map<string, { count: number; startedAt: number }>()
  private state: ExternalTransportSnapshot = ExternalTransportSnapshotSchema.parse({
    endpointCount: 0,
    lastErrorCode: null,
    mode: null,
    publicUrl: null,
    startedAt: null,
    state: 'disabled',
  })
  private tunnel: ExternalTunnelHandle | null = null
  private startPromise: Promise<void> | null = null
  private localBaseUrl: string | null = null

  public constructor(
    @Inject(ExternalEventService) private readonly events: ExternalEventService,
    @Inject('EXTERNAL_TUNNEL_ADAPTER') private readonly tunnelAdapter: ExternalTunnelAdapter,
  ) {}

  public async onModuleDestroy(): Promise<void> {
    await this.stop()
  }

  public snapshot(): ExternalTransportSnapshot {
    return ExternalTransportSnapshotSchema.parse({
      ...this.state,
      endpointCount: this.endpoints.size,
    })
  }

  public setLocalBaseUrl(baseUrl: string): void {
    this.localBaseUrl = baseUrl
  }

  public async register(providerInput: unknown): Promise<{
    callbackPath: string
    callbackUrl: string | null
    secret: string
  }> {
    const provider = ExternalEventProviderSchema.parse(providerInput)
    const existing = [...this.endpoints.values()].find((endpoint) => endpoint.provider === provider)
    const endpoint = existing ?? {
      id: randomUUID(),
      provider,
      secret: randomBytes(32).toString('hex'),
    }
    this.endpoints.set(endpoint.id, endpoint)
    await this.ensureStarted()
    return {
      callbackPath: `/api/v1/external-events/${provider}/${endpoint.id}`,
      callbackUrl: this.state.publicUrl
        ? `${this.state.publicUrl}/api/v1/external-events/${provider}/${endpoint.id}`
        : null,
      secret: endpoint.secret,
    }
  }

  public async unregister(providerInput: unknown): Promise<void> {
    const provider = ExternalEventProviderSchema.parse(providerInput)
    for (const [id, endpoint] of this.endpoints) {
      if (endpoint.provider === provider) this.endpoints.delete(id)
    }
    if (!this.endpoints.size) await this.stop()
  }

  public async receive(
    providerInput: unknown,
    endpointId: string,
    secret: string,
    body: unknown,
  ): Promise<{ accepted: boolean; duplicate: boolean }> {
    const provider = ExternalEventProviderSchema.parse(providerInput)
    const endpoint = this.endpoints.get(endpointId)
    if (
      !endpoint ||
      endpoint.provider !== provider ||
      (provider !== 'livepix' && !this.matches(secret, endpoint.secret))
    )
      throw new ApiApplicationError('UNAUTHORIZED', 'Invalid external event credentials', 401)
    if (!this.allow(endpointId))
      throw new ApiApplicationError('RATE_LIMITED', 'External event rate limit exceeded', 429)
    const serialized = JSON.stringify(body)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES)
      throw new ApiApplicationError('VALIDATION_FAILED', 'External event payload is too large', 413)
    const input = ExternalEventIngressSchema.parse(body)
    return this.events.ingest(provider, input)
  }

  private async ensureStarted(): Promise<void> {
    if (this.tunnel) return
    if (this.startPromise) return this.startPromise
    this.startPromise = this.startTunnel().finally(() => {
      this.startPromise = null
    })
    return this.startPromise
  }

  private async startTunnel(): Promise<void> {
    this.state = { ...this.state, mode: 'tunnel', state: 'starting', lastErrorCode: null }
    try {
      if (!this.localBaseUrl) throw new Error('EXTERNAL_TUNNEL_LOCAL_URL_UNAVAILABLE')
      const tunnel = await this.tunnelAdapter.start(this.localBaseUrl)
      this.tunnel = tunnel
      tunnel.onFailure?.(() => {
        if (this.tunnel !== tunnel) return
        this.tunnel = null
        this.state = {
          ...this.state,
          lastErrorCode: 'EXTERNAL_TUNNEL_UNAVAILABLE',
          publicUrl: null,
          state: 'error',
        }
      })
      this.state = {
        ...this.state,
        publicUrl: tunnel.publicUrl,
        startedAt: new Date().toISOString(),
        state: 'ready',
      }
    } catch {
      this.state = {
        ...this.state,
        lastErrorCode: 'EXTERNAL_TUNNEL_UNAVAILABLE',
        mode: 'tunnel',
        state: 'error',
      }
      throw new ApiApplicationError(
        'EXTERNAL_TUNNEL_UNAVAILABLE',
        'External event transport is unavailable',
        503,
      )
    }
  }

  private async stop(): Promise<void> {
    await this.startPromise?.catch(() => undefined)
    const tunnel = this.tunnel
    this.tunnel = null
    if (tunnel) await tunnel.stop()
    this.state = {
      ...this.state,
      mode: null,
      publicUrl: null,
      startedAt: null,
      state: this.endpoints.size ? 'error' : 'disabled',
    }
  }

  private allow(endpointId: string): boolean {
    const now = Date.now()
    const current = this.requestWindows.get(endpointId)
    if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
      this.requestWindows.set(endpointId, { count: 1, startedAt: now })
      return true
    }
    if (current.count >= RATE_LIMIT) return false
    current.count += 1
    return true
  }

  private matches(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(expected)
    return (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    )
  }
}
