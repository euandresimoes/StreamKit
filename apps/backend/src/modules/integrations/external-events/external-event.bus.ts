import type { ExternalEventProvider, ExternalEventRecord } from '@streamlet/contracts'

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

  public async publish(event: ExternalEventRecord): Promise<unknown[]> {
    const handlers = [...(this.handlers.get(event.provider) ?? [])]
    const failures = await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event)
          return null
        } catch (cause) {
          return cause
        }
      }),
    )
    return failures.filter((failure): failure is unknown => failure !== null)
  }
}
