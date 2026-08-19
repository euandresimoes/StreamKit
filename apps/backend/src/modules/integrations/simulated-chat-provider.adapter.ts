import type { ChatMessageReceived, IntegrationProvider } from '@streamlet/contracts'

import type {
  ChatProviderAdapter,
  ChatProviderConnectionContext,
  ChatProviderSession,
} from './chat-provider.adapter'

export class SimulatedChatProviderAdapter implements ChatProviderAdapter {
  public readonly capabilities = ['chat.read', 'chat.write', 'user.identity'] as const
  private context: ChatProviderConnectionContext | null = null
  private rejectClosed: ((reason: Error) => void) | null = null
  private resolveClosed: (() => void) | null = null

  public constructor(public readonly provider: IntegrationProvider) {}

  public async connect(context: ChatProviderConnectionContext): Promise<ChatProviderSession> {
    this.context = context
    const closed = new Promise<void>((resolve, reject) => {
      this.resolveClosed = resolve
      this.rejectClosed = reject
    })
    return {
      closed,
      close: async () => {
        this.resolveClosed?.()
        this.clear()
      },
    }
  }

  public async emit(event: ChatMessageReceived): Promise<void> {
    if (!this.context) throw new Error('Simulated provider is not connected')
    await this.context.onEvent(event)
  }

  public fail(errorCode = 'SIMULATED_CONNECTION_FAILURE'): void {
    this.rejectClosed?.(new Error(errorCode))
    this.clear()
  }

  public async saveCursor(cursor: string): Promise<void> {
    if (!this.context) throw new Error('Simulated provider is not connected')
    await this.context.onCursor(cursor)
  }

  private clear(): void {
    this.context = null
    this.rejectClosed = null
    this.resolveClosed = null
  }
}
