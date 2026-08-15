import { Inject, Injectable } from '@nestjs/common'
import {
  ChatMessageReceivedSchema,
  type IntegrationConnectionStatus,
  type SaveIntegrationConnectionRequest,
} from '@streamkit/contracts'

import { IntegrationEventBus } from './integration-event.bus'
import { IntegrationRepository } from './integration.repository'
import { IntegrationRetryPolicy } from './integration-retry-policy'
import { ApiApplicationError } from '../../application/api-error'

@Injectable()
export class IntegrationService {
  private readonly retryPolicy = new IntegrationRetryPolicy()

  public constructor(
    @Inject(IntegrationRepository) private readonly repository: IntegrationRepository,
    @Inject(IntegrationEventBus) private readonly eventBus: IntegrationEventBus,
  ) {}

  public deleteConnection(id: string) {
    return this.repository.deleteConnection(id)
  }

  public listConnections() {
    return this.repository.listConnections()
  }

  public async selectGlobalLive(id: string): Promise<void> {
    const connection = await this.repository.getConnection(id)
    if (!connection)
      throw new ApiApplicationError(
        'INTEGRATION_CONNECTION_NOT_FOUND',
        'Integration connection not found',
        404,
      )
    await this.repository.selectGlobalLive(id)
  }

  public saveConnection(input: SaveIntegrationConnectionRequest) {
    return this.repository.saveConnection(input)
  }

  public async ingest(
    input: unknown,
    options: { retryOnHandlerFailure?: boolean } = {},
  ): Promise<{ duplicate: boolean; handlerFailures: number }> {
    const event = ChatMessageReceivedSchema.parse(input)
    const inserted = await this.repository.saveEvent(event)
    const stored = inserted
      ? null
      : await this.repository.getEvent(event.provider, event.externalEventId)
    if (!inserted && stored?.status === 'processed') return { duplicate: true, handlerFailures: 0 }
    const failures = await this.eventBus.publish(stored?.event ?? event)
    await this.repository.markEventProcessed(
      event.provider,
      event.externalEventId,
      failures.length ? 'handler_failed' : 'processed',
    )
    if (failures.length && options.retryOnHandlerFailure)
      throw new ApiApplicationError(
        'INTEGRATION_EVENT_HANDLER_FAILED',
        'Integration event processing failed and will be retried',
        503,
      )
    return { duplicate: false, handlerFailures: failures.length }
  }

  public async updateState(
    id: string,
    status: IntegrationConnectionStatus,
    lastErrorCode: string | null = null,
  ) {
    const connection = await this.repository.getConnection(id)
    if (!connection) return null
    const retrying = status === 'error' || status === 'reconnecting'
    const retryAttempt = retrying
      ? connection.retryAttempt + 1
      : status === 'connected' || status === 'disconnected' || status === 'revoked'
        ? 0
        : connection.retryAttempt
    const nextRetryAt = retrying
      ? new Date(Date.now() + this.retryPolicy.delayMs(retryAttempt)).toISOString()
      : null
    return this.repository.updateConnectionState(id, {
      lastErrorCode,
      nextRetryAt,
      retryAttempt,
      status,
    })
  }
}
