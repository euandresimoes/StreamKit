import type { ChatMessageReceived, IntegrationProvider } from '@streamlet/contracts'
import { createIsolatedTestEnvironment } from '@streamlet/test-utils'

import { SqliteDatabase } from '../src/infrastructure/database/sqlite-database'
import { integrationEvents } from '../src/infrastructure/database/schema'
import { ChatProviderRegistry } from '../src/modules/integrations/chat-provider.registry'
import { IntegrationConnectionManager } from '../src/modules/integrations/integration-connection.manager'
import { IntegrationEventBus } from '../src/modules/integrations/integration-event.bus'
import { IntegrationRepository } from '../src/modules/integrations/integration.repository'
import { IntegrationService } from '../src/modules/integrations/integration.service'
import { SimulatedChatProviderAdapter } from '../src/modules/integrations/simulated-chat-provider.adapter'

describe('chat integration controlled soak', () => {
  it('handles simultaneous providers, backpressure, duplicates, network loss and wake resume', async () => {
    jest.useFakeTimers()
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const repository = new IntegrationRepository(database)
    const bus = new IntegrationEventBus()
    const service = new IntegrationService(repository, bus)
    const registry = new ChatProviderRegistry()
    const adapters = new Map<IntegrationProvider, SimulatedChatProviderAdapter>()
    const connections = new Map<IntegrationProvider, string>()
    let deliveries = 0
    bus.subscribe(async () => {
      await Promise.resolve()
      deliveries += 1
    })
    for (const provider of ['twitch', 'youtube', 'kick'] as const) {
      const adapter = new SimulatedChatProviderAdapter(provider)
      adapters.set(provider, adapter)
      registry.register(adapter)
      const connection = await repository.saveConnection({
        capabilities: provider === 'kick' ? [] : ['chat.read', 'user.identity'],
        channelDisplayName: `Soak ${provider}`,
        channelId: `channel-${provider}`,
        provider,
      })
      connections.set(provider, connection.id)
    }
    const manager = new IntegrationConnectionManager(registry, repository, service)
    await Promise.all([...connections.values()].map((id) => manager.start(id)))

    const events = (['twitch', 'youtube', 'kick'] as const).flatMap((provider) =>
      Array.from({ length: 250 }, (_, index) => event(provider, index)),
    )
    await Promise.all(events.map((item) => adapters.get(item.provider)!.emit(item)))
    await Promise.all(events.slice(0, 50).map((item) => service.ingest(item)))
    expect(deliveries).toBe(750)
    expect(await database.orm.$count(integrationEvents)).toBe(750)

    adapters.get('youtube')!.fail('provider response '.repeat(20))
    await waitForStatus(repository, connections.get('youtube')!, 'reconnecting')
    expect((await repository.getConnection(connections.get('youtube')!))?.lastErrorCode).toBe(
      'INTEGRATION_CONNECTION_FAILED',
    )
    await jest.runOnlyPendingTimersAsync()
    expect((await repository.getConnection(connections.get('youtube')!))?.status).toBe('connected')

    adapters.get('youtube')!.fail('NETWORK_LOST')
    await waitForStatus(repository, connections.get('youtube')!, 'reconnecting')
    expect((await repository.getConnection(connections.get('youtube')!))?.status).toBe(
      'reconnecting',
    )
    await jest.runOnlyPendingTimersAsync()
    expect((await repository.getConnection(connections.get('youtube')!))?.status).toBe('connected')

    await manager.resumeAfterWake()
    expect(
      await Promise.all(
        [...connections.values()].map(async (id) => (await repository.getConnection(id))?.status),
      ),
    ).toEqual(['connected', 'connected', 'connected'])
    adapters.get('youtube')!.fail('YOUTUBE_CHAT_ENDED')
    await waitForStatus(repository, connections.get('youtube')!, 'disconnected')
    await jest.runOnlyPendingTimersAsync()
    expect((await repository.getConnection(connections.get('youtube')!))?.status).toBe(
      'disconnected',
    )
    await manager.onModuleDestroy()
    jest.useRealTimers()
    database.close()
    await environment.cleanup()
  }, 30_000)
})

async function waitForStatus(
  repository: IntegrationRepository,
  connectionId: string,
  expected: 'disconnected' | 'reconnecting',
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if ((await repository.getConnection(connectionId))?.status === expected) return
    await Promise.resolve()
  }
  throw new Error(`Connection ${connectionId} did not reach ${expected}`)
}

function event(provider: IntegrationProvider, index: number): ChatMessageReceived {
  return {
    author: {
      avatarUrl: null,
      displayName: `Viewer ${index}`,
      handle: `viewer_${index}`,
      provider,
      providerUserId: `${provider}-viewer-${index}`,
    },
    badges: [],
    channelId: `channel-${provider}`,
    externalEventId: `${provider}-soak-${index}`,
    message: index % 2 ? '!join' : '<untrusted>message</untrusted>',
    occurredAt: new Date(1_786_636_800_000 + index).toISOString(),
    provider,
    roles: { isBot: false, isBroadcaster: false, isMember: false, isModerator: false },
    type: 'chat.message',
  }
}
