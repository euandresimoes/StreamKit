import type { ChatMessageReceived } from '@streamkit/contracts'

import { IntegrationEventBus } from '../src/modules/integrations/integration-event.bus'
import { IntegrationRetryPolicy } from '../src/modules/integrations/integration-retry-policy'

const event: ChatMessageReceived = {
  author: {
    avatarUrl: null,
    displayName: 'André',
    handle: '@andre',
    provider: 'twitch',
    providerUserId: 'user-1',
  },
  badges: [],
  channelId: 'channel-1',
  externalEventId: 'message-1',
  message: '!participar',
  occurredAt: '2026-08-13T10:00:00.000Z',
  provider: 'twitch',
  roles: { isBot: false, isBroadcaster: false, isMember: false, isModerator: false },
  type: 'chat.message',
}

describe('integration core', () => {
  it('isolates a failing consumer and continues delivering the event', async () => {
    const bus = new IntegrationEventBus()
    const received: string[] = []
    bus.subscribe(() => {
      throw new Error('consumer failed')
    })
    const unsubscribe = bus.subscribe((message) => {
      received.push(message.externalEventId)
    })

    const failures = await bus.publish(event)

    expect(failures).toHaveLength(1)
    expect(received).toEqual(['message-1'])
    unsubscribe()
    await bus.publish({ ...event, externalEventId: 'message-2' })
    expect(received).toEqual(['message-1'])
  })

  it('caps exponential retry and applies bounded jitter', () => {
    expect(new IntegrationRetryPolicy(() => 0).delayMs(1)).toBe(800)
    expect(new IntegrationRetryPolicy(() => 1).delayMs(1)).toBe(1200)
    expect(new IntegrationRetryPolicy(() => 0.5).delayMs(99)).toBe(60_000)
  })
})
