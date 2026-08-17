import { ExternalEventBus } from '../src/modules/integrations/external-events/external-event.bus'

const event = {
  attemptCount: 1,
  eventId: 'event-1',
  eventType: 'message',
  id: 'queue-1',
  lastErrorCode: null,
  nextAttemptAt: null,
  payload: {},
  processedAt: null,
  provider: 'livepix' as const,
  receivedAt: '2026-08-16T12:00:00.000Z',
  status: 'processing' as const,
}

describe('ExternalEventBus', () => {
  it('preserves handler failures so the queue can store the actionable error code', async () => {
    const bus = new ExternalEventBus()
    const failure = new Error('provider failed')
    bus.subscribe('livepix', () => {
      throw failure
    })

    await expect(bus.publish(event)).resolves.toEqual([failure])
  })

  it('returns no failures after every subscribed handler succeeds', async () => {
    const bus = new ExternalEventBus()
    bus.subscribe('livepix', () => undefined)

    await expect(bus.publish(event)).resolves.toEqual([])
  })
})
