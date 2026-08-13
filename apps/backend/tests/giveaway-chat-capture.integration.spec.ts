import type { ChatMessageReceived } from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { SqliteDatabase } from '../src/infrastructure/database/sqlite-database'
import { GiveawayCaptureRepository } from '../src/modules/giveaway/giveaway-capture.repository'
import { GiveawayChatCaptureService } from '../src/modules/giveaway/giveaway-chat-capture.service'
import { GiveawayRepository } from '../src/modules/giveaway/giveaway.repository'
import { IntegrationEventBus } from '../src/modules/integrations/integration-event.bus'
import { IntegrationRepository } from '../src/modules/integrations/integration.repository'
import { IntegrationService } from '../src/modules/integrations/integration.service'

describe('giveaway chat capture persistence', () => {
  it('captures stable identities, applies duplicate policy and restores rules', async () => {
    const environment = await createIsolatedTestEnvironment()
    let database = await SqliteDatabase.open(environment.databasePath)
    const integrations = new IntegrationRepository(database)
    const connection = await integrations.saveConnection({
      capabilities: ['chat.read', 'user.identity'],
      channelDisplayName: 'Canal',
      channelId: 'channel-1',
      provider: 'twitch',
    })
    const giveaways = new GiveawayRepository(database)
    const giveaway = await giveaways.create({
      duplicatePolicy: 'remove',
      mode: 'wheel',
      name: 'Chat giveaway',
    })
    let captures = new GiveawayCaptureRepository(database)
    const events = new IntegrationEventBus()
    const captureService = new GiveawayChatCaptureService(captures, giveaways, events, integrations)
    captureService.onApplicationBootstrap()
    const input = {
      connectionId: connection.id,
      endsAt: null,
      entryPolicy: 'unique' as const,
      excludeBots: true,
      excludeBroadcaster: true,
      excludeModerators: false,
      match: 'prefix' as const,
      matchValue: '!join',
      membersOnly: false,
      startsAt: null,
    }
    await captureService.save(giveaway.id, input)
    const integrationService = new IntegrationService(integrations, events)
    const message: ChatMessageReceived = {
      author: {
        avatarUrl: null,
        displayName: 'Nome original',
        handle: 'same_user',
        provider: 'twitch',
        providerUserId: 'stable-user-id',
      },
      badges: [],
      channelId: 'channel-1',
      externalEventId: 'message-1',
      message: '!join agora',
      occurredAt: '2026-08-13T12:00:00.000Z',
      provider: 'twitch',
      roles: { isBot: false, isBroadcaster: false, isMember: false, isModerator: false },
      type: 'chat.message',
    }
    await integrationService.ingest(message)
    await integrationService.ingest({
      ...message,
      author: { ...message.author, displayName: 'Novo nome', handle: 'new_handle' },
      externalEventId: 'message-2',
    })
    expect((await giveaways.detail(giveaway.id))?.participants).toEqual([
      expect.objectContaining({
        displayName: 'Nome original',
        providerUserId: 'stable-user-id',
        source: 'chat',
        ticketCount: 1,
      }),
    ])
    expect((await captures.list(giveaway.id)).items[0]).toMatchObject({
      capturedCount: 1,
      duplicateCount: 1,
    })

    const round = await giveaways.draw(giveaway.id)
    expect(round).not.toBeNull()
    const pausedRule = (await captures.list(giveaway.id)).items[0]
    expect(pausedRule?.status).toBe('paused')
    await integrationService.ingest({
      ...message,
      author: {
        ...message.author,
        displayName: 'Durante o giro',
        providerUserId: 'drawing-user',
      },
      externalEventId: 'message-drawing',
    })
    expect((await giveaways.detail(giveaway.id))?.participants).toHaveLength(1)
    await giveaways.complete(giveaway.id, round!.id)
    await integrationService.ingest({
      ...message,
      author: {
        ...message.author,
        displayName: 'Entre rodadas',
        providerUserId: 'between-rounds-user',
      },
      externalEventId: 'message-between-rounds',
    })
    expect(await giveaways.detail(giveaway.id)).toMatchObject({
      giveaway: { status: 'completed' },
      participants: [expect.objectContaining({ providerUserId: 'stable-user-id' })],
    })

    await captureService.save(giveaway.id, { ...input, entryPolicy: 'tickets' })
    await integrationService.ingest({
      ...message,
      author: {
        ...message.author,
        displayName: 'Entre rodadas',
        providerUserId: 'between-rounds-user',
      },
      externalEventId: 'message-after-restart',
    })
    await integrationService.ingest({ ...message, externalEventId: 'message-3' })
    expect(await giveaways.detail(giveaway.id)).toMatchObject({
      giveaway: { status: 'ready' },
      participants: [
        expect.objectContaining({ providerUserId: 'stable-user-id', ticketCount: 2 }),
        expect.objectContaining({ providerUserId: 'between-rounds-user' }),
      ],
    })
    captureService.onModuleDestroy()
    database.close()

    database = await SqliteDatabase.open(environment.databasePath)
    captures = new GiveawayCaptureRepository(database)
    expect((await captures.list(giveaway.id)).items).toHaveLength(1)
    database.close()
    await environment.cleanup()
  })
})
