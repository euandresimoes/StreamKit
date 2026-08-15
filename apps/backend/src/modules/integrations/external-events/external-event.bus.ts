import type { ExternalEventProvider, ExternalEventRecord } from '@streamkit/contracts'

export type ExternalEventHandler = (event: ExternalEventRecord) => Promise<void> | void

export class ExternalEventBus {
  private readonly handlers = new Map<ExternalEventProvider, Set<ExternalEventHandler>>()

  public subscribe(provider: ExternalEventProvider, handler: ExternalEventHandler): () => void {
    const handlers = this.handlers.get(provider) ?? new Set<ExternalEventHandler>()
    handlers.add(handler)
    this.handlers.set(provider, handlers)
    return () => handlers.delete(handler)
  }

  public hasHandlers(provider: ExternalEventProvider): boolean {
    return Boolean(this.handlers.get(provider)?.size)
  }

  public providersWithHandlers(): ExternalEventProvider[] {
    return [...this.handlers.entries()]
      .filter(([, handlers]) => handlers.size > 0)
      .map(([provider]) => provider)
  }

  public async publish(event: ExternalEventRecord): Promise<number> {
    const handlers = [...(this.handlers.get(event.provider) ?? [])]
    const failures = await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event)
          return false
        } catch {
          return true
        }
      }),
    )
    return failures.filter(Boolean).length
  }
}
