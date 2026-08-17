import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'
import {
  ErrorCodeSchema,
  ExternalEventIngressSchema,
  type ExternalEventProvider,
  type ExternalEventRecord,
} from '@streamkit/contracts'
import { ZodError } from 'zod'

import { ApiApplicationError } from '../../../application/api-error'
import { ExternalEventBus } from './external-event.bus'
import { ExternalEventQueueRepository } from './external-event-queue.repository'

const DISPATCH_INTERVAL_MS = 5_000
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]

@Injectable()
export class ExternalEventService implements OnApplicationBootstrap, OnModuleDestroy {
  private dispatchTimer: NodeJS.Timeout | null = null
  private dispatching = false

  public constructor(
    @Inject(ExternalEventBus) private readonly bus: ExternalEventBus,
    @Inject(ExternalEventQueueRepository) private readonly queue: ExternalEventQueueRepository,
  ) {}

  public onApplicationBootstrap(): void {
    this.dispatchTimer = setInterval(() => void this.dispatchReady(), DISPATCH_INTERVAL_MS)
    void this.dispatchReady()
  }

  public onModuleDestroy(): void {
    if (this.dispatchTimer) clearInterval(this.dispatchTimer)
    this.dispatchTimer = null
  }

  public async ingest(provider: ExternalEventProvider, input: unknown) {
    const envelope = ExternalEventIngressSchema.parse(input)
    const record = await this.queue.enqueue({ ...envelope, provider })
    if (!record) return { duplicate: true as const, accepted: false as const }
    void this.dispatchReady()
    return { duplicate: false as const, accepted: true as const }
  }

  private async dispatchReady(): Promise<void> {
    if (this.dispatching) return
    this.dispatching = true
    try {
      const records = await this.queue.claimReady(this.bus.providersWithHandlers())
      for (const record of records) {
        await this.dispatch(record)
      }
      await this.queue.prune()
    } finally {
      this.dispatching = false
    }
  }

  private async dispatch(record: ExternalEventRecord): Promise<void> {
    const failures = await this.bus.publish(record)
    if (!failures.length) {
      await this.queue.markProcessed(record.id)
      return
    }
    const nextDelay = RETRY_DELAYS_MS[Math.min(record.attemptCount - 1, RETRY_DELAYS_MS.length - 1)]
    await this.queue.markFailed(
      record.id,
      this.errorCode(failures[0]),
      record.attemptCount >= this.queue.maxAttempts()
        ? null
        : new Date(Date.now() + nextDelay!).toISOString(),
    )
  }

  private errorCode(cause: unknown): string {
    if (cause instanceof ApiApplicationError) return cause.code
    if (cause instanceof ZodError) return 'VALIDATION_FAILED'
    if (cause && typeof cause === 'object' && 'code' in cause) {
      const parsed = ErrorCodeSchema.safeParse(cause.code)
      if (parsed.success) return parsed.data
    }
    return 'EXTERNAL_EVENT_HANDLER_FAILED'
  }
}
