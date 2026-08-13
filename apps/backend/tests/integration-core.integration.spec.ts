import { type ChatMessageReceived, IntegrationConnectionSchema } from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { SqliteDatabase } from '../src/infrastructure/database/sqlite-database'
import { integrationEvents } from '../src/infrastructure/database/schema'
import { IntegrationEventBus } from '../src/modules/integrations/integration-event.bus'
import { ChatProviderRegistry } from '../src/modules/integrations/chat-provider.registry'
import { IntegrationConnectionManager } from '../src/modules/integrations/integration-connection.manager'
import { IntegrationRepository } from '../src/modules/integrations/integration.repository'
import { IntegrationService } from '../src/modules/integrations/integration.service'
import { SimulatedChatProviderAdapter } from '../src/modules/integrations/simulated-chat-provider.adapter'
import { type LocalBackendHandle, startLocalBackend } from '../src/main'

describe('integration core persistence', () => {
  let backend: LocalBackendHandle | undefined
  afterEach(async () => {
    await backend?.close()
    backend = undefined
  })

  it('persists connection metadata without credentials and restores it', async () => {
    const environment = await createIsolatedTestEnvironment()
    const token = 'i'.repeat(64)
    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const response = await fetch(`${backend.baseUrl}/api/v1/integrations/connections`, {
      body: JSON.stringify({
        capabilities: ['chat.read', 'user.identity'],
        channelDisplayName: 'Canal André',
        channelId: 'channel-1',
        provider: 'twitch',
      }),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      method: 'PUT',
    })
    expect(response.status).toBe(200)
    const connection = IntegrationConnectionSchema.parse(await response.json())
    expect(connection.status).toBe('disconnected')
    expect(JSON.stringify(connection)).not.toContain('token')
    await backend.close()
    backend = undefined

    backend = await startLocalBackend({
      authenticationToken: token,
      databasePath: environment.databasePath,
    })
    const list = await (
      await fetch(`${backend.baseUrl}/api/v1/integrations/connections`, {
        headers: { authorization: `Bearer ${token}` },
      })
    ).json()
    expect(IntegrationConnectionSchema.array().parse(list)).toEqual([connection])
    await backend.close()
    backend = undefined
    await environment.cleanup()
  })

  it('deduplicates normalized events before publishing them', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const repository = new IntegrationRepository(database)
    const bus = new IntegrationEventBus()
    const service = new IntegrationService(repository, bus)
    let deliveries = 0
    bus.subscribe(() => {
      deliveries += 1
    })
    const event: ChatMessageReceived = {
      author: {
        avatarUrl: null,
        displayName: 'André',
        handle: '@andre',
        provider: 'youtube',
        providerUserId: 'author-channel-1',
      },
      badges: [],
      channelId: 'live-chat-1',
      externalEventId: 'youtube-message-1',
      message: '!participar',
      occurredAt: '2026-08-13T10:00:00.000Z',
      provider: 'youtube',
      type: 'chat.message',
    }

    expect(await service.ingest(event)).toEqual({ duplicate: false, handlerFailures: 0 })
    expect(await service.ingest(event)).toEqual({ duplicate: true, handlerFailures: 0 })
    expect(deliveries).toBe(1)
    expect((await database.orm.select().from(integrationEvents))[0]?.status).toBe('processed')

    database.close()
    await environment.cleanup()
  })

  it('runs a provider through the registry, saves its cursor and disconnects cleanly', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const repository = new IntegrationRepository(database)
    const bus = new IntegrationEventBus()
    const service = new IntegrationService(repository, bus)
    const registry = new ChatProviderRegistry()
    const adapter = new SimulatedChatProviderAdapter('twitch')
    registry.register(adapter)
    const manager = new IntegrationConnectionManager(registry, repository, service)
    const connection = await repository.saveConnection({
      capabilities: ['chat.read'],
      channelDisplayName: 'Canal de teste',
      channelId: 'channel-simulated',
      provider: 'twitch',
    })

    await manager.start(connection.id)
    expect((await repository.getConnection(connection.id))?.status).toBe('connected')
    await adapter.saveCursor('cursor-42')
    expect(await repository.getOffset(connection.id)).toBe('cursor-42')
    await manager.stop(connection.id)
    expect((await repository.getConnection(connection.id))?.status).toBe('disconnected')

    database.close()
    await environment.cleanup()
  })

  it('resumes a persisted reconnecting connection after restart', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const repository = new IntegrationRepository(database)
    const bus = new IntegrationEventBus()
    const service = new IntegrationService(repository, bus)
    const registry = new ChatProviderRegistry()
    registry.register(new SimulatedChatProviderAdapter('youtube'))
    const connection = await repository.saveConnection({
      capabilities: ['chat.read'],
      channelDisplayName: 'Live restaurada',
      channelId: 'restored-live',
      provider: 'youtube',
    })
    await repository.updateConnectionState(connection.id, {
      lastErrorCode: 'NETWORK_LOST',
      nextRetryAt: new Date(Date.now() - 1_000).toISOString(),
      retryAttempt: 2,
      status: 'reconnecting',
    })
    const manager = new IntegrationConnectionManager(registry, repository, service)

    await manager.resume()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect((await repository.getConnection(connection.id))?.status).toBe('connected')
    await manager.stop(connection.id)

    database.close()
    await environment.cleanup()
  })
})
