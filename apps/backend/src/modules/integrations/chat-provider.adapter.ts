import type {
  ChatMessageReceived,
  IntegrationCapability,
  IntegrationProvider,
} from '@streamkit/contracts'

export type ChatProviderSession = {
  closed: Promise<void>
  close(): Promise<void>
}

export type ChatProviderConnectionContext = {
  channelId: string
  cursor: string | null
  onCursor(cursor: string): Promise<void>
  onEvent(event: ChatMessageReceived): Promise<void>
  signal: AbortSignal
}

export interface ChatProviderAdapter {
  readonly capabilities: readonly IntegrationCapability[]
  readonly provider: IntegrationProvider
  connect(context: ChatProviderConnectionContext): Promise<ChatProviderSession>
  sendMessage?(channelId: string, message: string): Promise<void>
}
