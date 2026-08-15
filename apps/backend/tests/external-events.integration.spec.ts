import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { SqliteDatabase } from '../src/infrastructure/database/sqlite-database'
import { ExternalEventBus } from '../src/modules/integrations/external-events/external-event.bus'
import { ExternalEventQueueRepository } from '../src/modules/integrations/external-events/external-event-queue.repository'
import { ExternalEventService } from '../src/modules/integrations/external-events/external-event.service'
import { ExternalTransportService } from '../src/modules/integrations/external-events/external-transport.service'
import type {
  ExternalTunnelAdapter,
  ExternalTunnelHandle,
} from '../src/modules/integrations/external-events/external-tunnel.adapter'

const envelope = {
  eventId: 'evt-1',
  eventType: 'donation.created',
  payload: { username: 'viewer' },
  timestamp: '2026-08-14T12:00:00.000Z',
}

describe('optional external event infrastructure', () => {
  it('persists, deduplicates and processes events through the local queue', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const queue = new ExternalEventQueueRepository(database)
    const bus = new ExternalEventBus()
    const service = new ExternalEventService(bus, queue)
    const received: string[] = []
    bus.subscribe('livepix', (event) => {
      received.push(event.eventId)
    })

    await expect(service.ingest('livepix', envelope)).resolves.toEqual({
      accepted: true,
      duplicate: false,
    })
    await expect(service.ingest('livepix', envelope)).resolves.toEqual({
      accepted: false,
      duplicate: true,
    })
    await new Promise((resolve) => setTimeout(resolve, 25))

    expect(received).toEqual(['evt-1'])
    const processed = await database.orm.query.externalEventQueue.findFirst()
    expect(processed?.status).toBe('processed')

    service.onModuleDestroy()
    database.close()
    await environment.cleanup()
  })

  it('keeps events queued when no provider handler is registered', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const queue = new ExternalEventQueueRepository(database)
    const bus = new ExternalEventBus()
    const service = new ExternalEventService(bus, queue)

    await service.ingest('livepix', envelope)
    await new Promise((resolve) => setTimeout(resolve, 25))

    const queued = await database.orm.query.externalEventQueue.findFirst()
    expect(queued?.status).toBe('received')

    service.onModuleDestroy()
    database.close()
    await environment.cleanup()
  })

  it('protects transport ingress with endpoint credentials and deduplicates delivery', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const queue = new ExternalEventQueueRepository(database)
    const bus = new ExternalEventBus()
    const events = new ExternalEventService(bus, queue)
    const handle: ExternalTunnelHandle = {
      publicUrl: 'https://example.trycloudflare.com',
      stop: async () => undefined,
    }
    const adapter: ExternalTunnelAdapter = { start: async () => handle }
    const transport = new ExternalTransportService(events, adapter)
    transport.setLocalBaseUrl('http://127.0.0.1:43123')

    const endpoint = await transport.register('livepix')
    expect(endpoint.callbackUrl).toContain('https://example.trycloudflare.com')
    await expect(
      transport.receive('livepix', 'unknown', endpoint.secret, envelope),
    ).rejects.toThrow('Invalid external event credentials')
    // LivePix does not send the local ingress secret. The endpoint id plus the
    // provider account identity validation form the authentication boundary.
    await expect(
      transport.receive(
        'livepix',
        endpoint.callbackPath.split('/').at(-1)!,
        endpoint.secret,
        envelope,
      ),
    ).resolves.toEqual({ accepted: true, duplicate: false })

    await transport.unregister('livepix')
    events.onModuleDestroy()
    database.close()
    await environment.cleanup()
  })

  it('does not hide tunnel startup failures from the provider adapter', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const queue = new ExternalEventQueueRepository(database)
    const events = new ExternalEventService(new ExternalEventBus(), queue)
    const adapter: ExternalTunnelAdapter = {
      start: async () => {
        throw new Error('offline')
      },
    }
    const transport = new ExternalTransportService(events, adapter)
    transport.setLocalBaseUrl('http://127.0.0.1:43123')

    await expect(transport.register('livepix')).rejects.toMatchObject({
      code: 'EXTERNAL_TUNNEL_UNAVAILABLE',
      statusCode: 503,
    })
    expect(transport.snapshot().state).toBe('error')

    await transport.unregister('livepix')
    await events.onModuleDestroy()
    database.close()
    await environment.cleanup()
  })
})
