import { Injectable } from '@nestjs/common'
import type { IntegrationProvider } from '@streamkit/contracts'

import type { ChatProviderAdapter } from './chat-provider.adapter'

@Injectable()
export class ChatProviderRegistry {
  private readonly adapters = new Map<IntegrationProvider, ChatProviderAdapter>()

  public get(provider: IntegrationProvider): ChatProviderAdapter | null {
    return this.adapters.get(provider) ?? null
  }

  public register(adapter: ChatProviderAdapter): () => void {
    this.adapters.set(adapter.provider, adapter)
    return () => {
      if (this.adapters.get(adapter.provider) === adapter) this.adapters.delete(adapter.provider)
    }
  }
}
