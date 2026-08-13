import { Injectable } from '@nestjs/common'
import type { ChatMessageReceived } from '@streamkit/contracts'

export type IntegrationEventHandler = (event: ChatMessageReceived) => Promise<void> | void

@Injectable()
export class IntegrationEventBus {
  private readonly handlers = new Set<IntegrationEventHandler>()

  public async publish(event: ChatMessageReceived): Promise<readonly Error[]> {
    const results = await Promise.allSettled(
      [...this.handlers].map(async (handler) => handler(event)),
    )
    return results.flatMap((result) =>
      result.status === 'rejected'
        ? [result.reason instanceof Error ? result.reason : new Error('Integration handler failed')]
        : [],
    )
  }

  public subscribe(handler: IntegrationEventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }
}
