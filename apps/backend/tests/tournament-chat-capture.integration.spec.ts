import type { ChatMessageReceived } from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { SqliteDatabase } from '../src/infrastructure/database/sqlite-database'
import { IntegrationEventBus } from '../src/modules/integrations/integration-event.bus'
import { IntegrationRepository } from '../src/modules/integrations/integration.repository'
import { IntegrationService } from '../src/modules/integrations/integration.service'
import { TournamentCaptureRepository } from '../src/modules/tournament/tournament-capture.repository'
import { TournamentChatCaptureService } from '../src/modules/tournament/tournament-chat-capture.service'
import { TournamentRepository } from '../src/modules/tournament/tournament.repository'

describe('tournament chat capture persistence', () => {
  it('queues stable chat identities and preserves manual team workflows across restart', async () => {
    const environment = await createIsolatedTestEnvironment()
    let database = await SqliteDatabase.open(environment.databasePath)
    const integrations = new IntegrationRepository(database)
    const connection = await integrations.saveConnection({
      capabilities: ['chat.read', 'user.identity'],
      channelDisplayName: 'Canal',
      channelId: 'channel-1',
      provider: 'twitch',
    })
    const tournaments = new TournamentRepository(database)
    const tournament = await tournaments.create({
      bracketSize: 4,
      description: null,
      mode: 'team',
      name: 'Chat teams',
      teamCapacity: 2,
    })
    const team = await tournaments.addTeam(tournament.id, 'Azul', '#3B82F6', 2)
    expect(team).not.toBeNull()
    const captures = new TournamentCaptureRepository(database)
    const events = new IntegrationEventBus()
    const captureService = new TournamentChatCaptureService(
      captures,
      tournaments,
      events,
      integrations,
    )
    captureService.onApplicationBootstrap()
    await captureService.save(tournament.id, {
      connectionId: connection.id,
      endsAt: null,
      entryPolicy: 'unique',
      excludeBots: true,
      excludeBroadcaster: true,
      excludeModerators: false,
      match: 'prefix',
      matchValue: '!play',
      membersOnly: false,
      startsAt: null,
    })
    const message: ChatMessageReceived = {
      author: {
        avatarUrl: null,
        displayName: 'Jogador',
        handle: 'jogador',
        provider: 'twitch',
        providerUserId: 'stable-player',
      },
      badges: [],
      channelId: 'channel-1',
      externalEventId: 'team-message-1',
      message: '!play',
      occurredAt: '2026-08-13T12:00:00.000Z',
      provider: 'twitch',
      roles: { isBot: false, isBroadcaster: false, isMember: true, isModerator: false },
      type: 'chat.message',
    }
    const ingestion = new IntegrationService(integrations, events)
    await ingestion.ingest(message)
    await ingestion.ingest({
      ...message,
      author: { ...message.author, displayName: 'Nome alterado', handle: 'novo_handle' },
      externalEventId: 'team-message-2',
    })
    let detail = await tournaments.detail(tournament.id)
    expect(detail?.participants).toEqual([
      expect.objectContaining({
        displayName: 'Jogador',
        provider: 'twitch',
        providerUserId: 'stable-player',
        source: 'chat',
      }),
    ])
    expect(detail?.teamMembers).toHaveLength(0)
    expect((await captures.list(tournament.id)).items[0]).toMatchObject({
      capturedCount: 1,
      duplicateCount: 1,
    })
    const participant = detail!.participants[0]!
    const assigned = await tournaments.assignParticipant(
      tournament.id,
      detail!.teams[0]!.id,
      participant.id,
      1,
    )
    expect(assigned).not.toBe('conflict')
    await tournaments.addParticipant(tournament.id, 'Manual offline')
    captureService.onModuleDestroy()
    database.close()

    database = await SqliteDatabase.open(environment.databasePath)
    detail = await new TournamentRepository(database).detail(tournament.id)
    expect(detail?.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'chat', providerUserId: 'stable-player' }),
        expect.objectContaining({ displayName: 'Manual offline', source: 'manual' }),
      ]),
    )
    expect(detail?.teamMembers).toHaveLength(1)
    database.close()
    await environment.cleanup()
  })

  it('rejects entries beyond individual capacity and after the tournament starts', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const integrations = new IntegrationRepository(database)
    const connection = await integrations.saveConnection({
      capabilities: ['chat.read', 'user.identity'],
      channelDisplayName: 'Canal',
      channelId: 'channel-capacity',
      provider: 'twitch',
    })
    const tournaments = new TournamentRepository(database)
    const tournament = await tournaments.create({
      bracketSize: 4,
      description: null,
      mode: 'individual',
      name: 'Capacity',
      teamCapacity: null,
    })
    const captures = new TournamentCaptureRepository(database)
    const events = new IntegrationEventBus()
    const captureService = new TournamentChatCaptureService(
      captures,
      tournaments,
      events,
      integrations,
    )
    captureService.onApplicationBootstrap()
    await captureService.save(tournament.id, {
      connectionId: connection.id,
      endsAt: null,
      entryPolicy: 'unique',
      excludeBots: true,
      excludeBroadcaster: true,
      excludeModerators: false,
      match: 'any',
      matchValue: null,
      membersOnly: false,
      startsAt: null,
    })
    const ingestion = new IntegrationService(integrations, events)
    for (let index = 0; index < 5; index += 1)
      await ingestion.ingest(chatMessage(index, 'channel-capacity'))
    expect((await tournaments.detail(tournament.id))?.participants).toHaveLength(5)
    expect((await captures.list(tournament.id)).items[0]?.rejectedCount).toBe(0)
    await tournaments.generate(tournament.id)
    await tournaments.start(tournament.id)
    await ingestion.ingest(chatMessage(6, 'channel-capacity'))
    expect((await captures.list(tournament.id)).items[0]?.rejectedCount).toBe(1)
    captureService.onModuleDestroy()
    database.close()
    await environment.cleanup()
  })
})

function chatMessage(index: number, channelId: string): ChatMessageReceived {
  return {
    author: {
      avatarUrl: null,
      displayName: `Jogador ${index}`,
      handle: `jogador_${index}`,
      provider: 'twitch',
      providerUserId: `player-${index}`,
    },
    badges: [],
    channelId,
    externalEventId: `capacity-message-${index}`,
    message: '!play',
    occurredAt: '2026-08-13T12:00:00.000Z',
    provider: 'twitch',
    roles: { isBot: false, isBroadcaster: false, isMember: false, isModerator: false },
    type: 'chat.message',
  }
}
