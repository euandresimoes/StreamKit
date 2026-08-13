import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'

import { ApiApplicationError } from '../../application/api-error'
import type { ChatProviderSession } from './chat-provider.adapter'
import { ChatProviderRegistry } from './chat-provider.registry'
import { IntegrationRepository } from './integration.repository'
import { IntegrationService } from './integration.service'

type ActiveConnection = {
  abortController: AbortController
  session: ChatProviderSession | null
  timer: ReturnType<typeof setTimeout> | null
}

@Injectable()
export class IntegrationConnectionManager implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly active = new Map<string, ActiveConnection>()

  public constructor(
    @Inject(ChatProviderRegistry) private readonly registry: ChatProviderRegistry,
    @Inject(IntegrationRepository) private readonly repository: IntegrationRepository,
    @Inject(IntegrationService) private readonly service: IntegrationService,
  ) {}

  public async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.active.keys()].map((id) => this.stop(id, false)))
  }

  public async onApplicationBootstrap(): Promise<void> {
    await this.resume()
  }

  public async resume(): Promise<void> {
    const connections = await this.repository.listConnections()
    for (const connection of connections) {
      if (['connected', 'connecting', 'error', 'reconnecting'].includes(connection.status)) {
        this.schedule(
          connection.id,
          Math.max(0, Date.parse(connection.nextRetryAt ?? '') - Date.now()),
        )
      }
    }
  }

  public async resumeAfterWake(): Promise<void> {
    const connections = await this.repository.listConnections()
    await Promise.all(
      connections
        .filter((connection) =>
          ['connected', 'connecting', 'error', 'reconnecting'].includes(connection.status),
        )
        .map((connection) => this.start(connection.id)),
    )
  }

  public async start(id: string): Promise<void> {
    await this.stop(id, false)
    const connection = await this.repository.getConnection(id)
    if (!connection) return
    const adapter = this.registry.get(connection.provider)
    if (!adapter) {
      const failed = await this.service.updateState(id, 'error', 'INTEGRATION_PROVIDER_UNAVAILABLE')
      if (failed) {
        this.schedule(id, Math.max(0, Date.parse(failed.nextRetryAt ?? '') - Date.now()))
      }
      return
    }
    const active: ActiveConnection = {
      abortController: new AbortController(),
      session: null,
      timer: null,
    }
    this.active.set(id, active)
    await this.service.updateState(id, 'connecting')
    try {
      const session = await adapter.connect({
        channelId: connection.channelId,
        cursor: await this.repository.getOffset(id),
        onCursor: (cursor) => this.repository.saveOffset(id, cursor),
        onEvent: async (event) => {
          await this.service.ingest(event)
        },
        signal: active.abortController.signal,
      })
      if (active.abortController.signal.aborted) {
        await session.close()
        return
      }
      active.session = session
      await this.service.updateState(id, 'connected')
      void session.closed
        .then(
          () => this.handleUnexpectedClose(id, null),
          (cause: unknown) => this.handleUnexpectedClose(id, this.errorCode(cause)),
        )
        .catch(() => undefined)
    } catch (cause) {
      await this.handleUnexpectedClose(id, this.errorCode(cause))
    }
  }

  public async sendMessage(id: string, message: string): Promise<void> {
    const connection = await this.repository.getConnection(id)
    if (!connection)
      throw new ApiApplicationError(
        'INTEGRATION_CONNECTION_NOT_FOUND',
        'Integration connection not found',
        404,
      )
    if (connection.status !== 'connected')
      throw new ApiApplicationError(
        'INTEGRATION_CONNECTION_UNAVAILABLE',
        'The chat connection is not currently available',
        409,
      )
    const adapter = this.registry.get(connection.provider)
    if (!connection.capabilities.includes('chat.write') || !adapter?.sendMessage)
      throw new ApiApplicationError(
        'INTEGRATION_CAPABILITY_UNAVAILABLE',
        'This provider connection cannot send chat messages',
        409,
      )
    await adapter.sendMessage(connection.channelId, message)
  }

  public async stop(id: string, persist = true): Promise<void> {
    const active = this.active.get(id)
    if (active) {
      active.abortController.abort()
      if (active.timer) clearTimeout(active.timer)
      await active.session?.close()
      this.active.delete(id)
    }
    if (persist) await this.service.updateState(id, 'disconnected')
  }

  private async handleUnexpectedClose(id: string, errorCode: string | null): Promise<void> {
    const active = this.active.get(id)
    if (!active || active.abortController.signal.aborted) return
    if (
      errorCode?.includes('REVOKED') ||
      errorCode === 'INTEGRATION_AUTH_REQUIRED' ||
      errorCode === 'INTEGRATION_AUTH_REVOKED'
    ) {
      await this.service.updateState(id, 'revoked', errorCode)
      this.active.delete(id)
      return
    }
    if (errorCode === 'YOUTUBE_CHAT_ENDED') {
      await this.service.updateState(id, 'disconnected', errorCode)
      this.active.delete(id)
      return
    }
    const connection = await this.service.updateState(id, 'reconnecting', errorCode)
    if (!connection) return
    const delay = Math.max(0, Date.parse(connection.nextRetryAt ?? '') - Date.now())
    this.schedule(id, delay)
  }

  private schedule(id: string, delay: number): void {
    const existing = this.active.get(id)
    if (existing?.timer) clearTimeout(existing.timer)
    const active =
      existing ??
      ({
        abortController: new AbortController(),
        session: null,
        timer: null,
      } satisfies ActiveConnection)
    active.timer = setTimeout(() => void this.start(id), Number.isFinite(delay) ? delay : 0)
    this.active.set(id, active)
  }

  private errorCode(cause: unknown): string {
    const candidate =
      cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string'
        ? cause.code
        : cause instanceof Error
          ? cause.message
          : null
    return candidate && /^[A-Z][A-Z0-9_]{0,99}$/.test(candidate)
      ? candidate
      : 'INTEGRATION_CONNECTION_FAILED'
  }
}
