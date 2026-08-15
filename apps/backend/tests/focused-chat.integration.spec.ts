import type { ChatMessageReceived, TournamentDetail } from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { SqliteDatabase } from '../src/infrastructure/database/sqlite-database'
import { chatMessageBuffer } from '../src/infrastructure/database/schema'
import { GiveawayCaptureRepository } from '../src/modules/giveaway/giveaway-capture.repository'
import { GiveawayRepository } from '../src/modules/giveaway/giveaway.repository'
import {
  CHAT_BUFFER_MAX_MESSAGES,
  CHAT_BUFFER_RETENTION_MS,
  FocusedChatRepository,
} from '../src/modules/integrations/focused-chat.repository'
import { FocusedChatService } from '../src/modules/integrations/focused-chat.service'
import { IntegrationEventBus } from '../src/modules/integrations/integration-event.bus'
import { IntegrationRepository } from '../src/modules/integrations/integration.repository'
import { IntegrationService } from '../src/modules/integrations/integration.service'
import { TournamentCaptureRepository } from '../src/modules/tournament/tournament-capture.repository'
import { TournamentRepository } from '../src/modules/tournament/tournament.repository'

describe('focused chat buffer', () => {
  it('isolates provider, channel and stable identity while preserving untrusted text after restart', async () => {
    const environment = await createIsolatedTestEnvironment()
    let database = await SqliteDatabase.open(environment.databasePath)
    const integrations = new IntegrationRepository(database)
    await integrations.saveConnection({
      capabilities: ['chat.read', 'chat.write', 'user.identity'],
      channelDisplayName: 'Canal principal',
      channelId: 'channel-a',
      provider: 'twitch',
    })
    let chat = new FocusedChatRepository(database)
    const events = new IntegrationEventBus()
    events.subscribe((event) => chat.append(event))
    const ingestion = new IntegrationService(integrations, events)
    await ingestion.ingest(message('one', 'channel-a', 'winner', '<img src=x onerror=alert(1)>'))
    await ingestion.ingest(message('two', 'channel-a', 'other', 'não deve aparecer'))
    await ingestion.ingest(message('three', 'channel-b', 'winner', 'canal diferente'))
    let thread = await chat.thread('Vencedor', [
      {
        channelId: 'channel-a',
        displayName: 'Winner',
        provider: 'twitch',
        providerUserId: 'winner',
      },
    ])
    expect(thread.messages.map((item) => item.message)).toEqual(['<img src=x onerror=alert(1)>'])
    expect(thread.connections).toHaveLength(1)
    await ingestion.ingest(message('four', 'channel-a', 'winner', 'segunda mensagem'))
    const persistedWinnerRows = await database.orm
      .select({
        avatarUrl: chatMessageBuffer.avatarUrl,
        channelId: chatMessageBuffer.channelId,
        providerUserId: chatMessageBuffer.providerUserId,
      })
      .from(chatMessageBuffer)
    expect(
      persistedWinnerRows.filter(
        (row) =>
          row.channelId === 'channel-a' &&
          row.providerUserId === 'winner' &&
          row.avatarUrl?.startsWith('data:image/'),
      ),
    ).toHaveLength(1)
    database.close()

    database = await SqliteDatabase.open(environment.databasePath)
    chat = new FocusedChatRepository(database)
    thread = await chat.thread('Vencedor', [
      {
        channelId: 'channel-a',
        displayName: 'Winner',
        provider: 'twitch',
        providerUserId: 'winner',
      },
    ])
    expect(thread.messages).toHaveLength(2)
    await chat.prune(new Date(Date.now() + CHAT_BUFFER_RETENTION_MS + 1))
    expect(await chat.count()).toBe(0)
    database.close()
    await environment.cleanup()
  })

  it('caps the persisted buffer at the documented global limit', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const total = CHAT_BUFFER_MAX_MESSAGES + 5
    for (let start = 0; start < total; start += 500) {
      const rows = Array.from({ length: Math.min(500, total - start) }, (_, offset) => {
        const index = start + offset
        const timestamp = new Date(Date.now() + index).toISOString()
        return {
          avatarUrl: null,
          badgesJson: '[]',
          channelId: 'limit-channel',
          displayName: 'User',
          externalEventId: `limit-event-${index}`,
          handle: '@user',
          id: `limit-id-${index}`,
          message: 'message',
          occurredAt: timestamp,
          provider: 'twitch',
          providerUserId: 'limit-user',
          receivedAt: timestamp,
        }
      })
      await database.orm.insert(chatMessageBuffer).values(rows)
    }
    const chat = new FocusedChatRepository(database)
    await chat.prune(new Date())
    expect(await chat.count()).toBe(CHAT_BUFFER_MAX_MESSAGES)
    database.close()
    await environment.cleanup()
  })

  it('resolves a pending manual participant by exact platform handle', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const chat = new FocusedChatRepository(database)
    const event = {
      ...message('pending-handle-message', 'pending-channel', 'official-user-id', 'cheguei'),
      author: {
        ...message('pending-handle-message', 'pending-channel', 'official-user-id', 'cheguei')
          .author,
        displayName: 'Manual user',
        handle: 'manual_user',
      },
    }
    await chat.append(event)
    const thread = await chat.thread('Manual user', [
      {
        channelId: 'pending-channel',
        displayName: 'manual_user',
        identityKey: 'manual_user',
        provider: 'twitch',
        providerUserId: null,
      },
    ])
    expect(thread.messages.map((item) => item.message)).toEqual(['cheguei'])
    expect(thread.identities[0]).toMatchObject({ providerUserId: 'official-user-id' })
    database.close()
    await environment.cleanup()
  })

  it('derives the focused identity from the persisted giveaway winner', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const integrations = new IntegrationRepository(database)
    const connection = await integrations.saveConnection({
      capabilities: ['chat.read', 'chat.write', 'user.identity'],
      channelDisplayName: 'Canal',
      channelId: 'winner-channel',
      provider: 'twitch',
    })
    const giveaways = new GiveawayRepository(database)
    const giveaway = await giveaways.create({
      duplicatePolicy: 'remove',
      mode: 'wheel',
      name: 'Focus winner',
    })
    const captures = new GiveawayCaptureRepository(database)
    const rule = await captures.save(giveaway.id, {
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
    const event = message('winner-event', 'winner-channel', 'winner-id', 'eu ganhei')
    const chat = new FocusedChatRepository(database)
    await Promise.all([captures.capture(rule, event), chat.append(event)])
    const round = await giveaways.draw(giveaway.id)
    expect(round).not.toBeNull()
    await giveaways.complete(giveaway.id, round!.id)
    const service = new FocusedChatService(
      chat,
      new IntegrationEventBus(),
      giveaways,
      new TournamentRepository(database),
    )
    const thread = await service.forGiveaway(giveaway.id)
    expect(thread.subject).toBe('winner-id')
    expect(thread.identities[0]).toMatchObject({
      channelId: 'winner-channel',
      providerUserId: 'winner-id',
    })
    expect(thread.messages.map((item) => item.message)).toEqual(['eu ganhei'])
    database.close()
    await environment.cleanup()
  })

  it('combines messages only from external members of the champion team', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const integrations = new IntegrationRepository(database)
    const connection = await integrations.saveConnection({
      capabilities: ['chat.read', 'chat.write', 'user.identity'],
      channelDisplayName: 'Arena',
      channelId: 'team-channel',
      provider: 'twitch',
    })
    const tournaments = new TournamentRepository(database)
    const tournament = await tournaments.create({
      bracketSize: 4,
      description: null,
      mode: 'team',
      name: 'Focused team cup',
      teamCapacity: 2,
    })
    let detail = tournamentDetail(await tournaments.detail(tournament.id))
    detail = tournamentDetail(
      await tournaments.updateTeam(tournament.id, detail.teams[0]!.id, 'Campeões', '#3B82F6', 2),
    )
    const championTeam = detail.teams.find((team) => team.name === 'Campeões')!
    const captures = new TournamentCaptureRepository(database)
    const rule = await captures.save(tournament.id, {
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
    const championMessage = message(
      'champion-message',
      'team-channel',
      'champion-user',
      'time campeão',
    )
    const otherMessage = message('other-team-message', 'team-channel', 'other-user', 'outro time')
    const chat = new FocusedChatRepository(database)
    await captures.capture(rule, championMessage)
    await captures.capture(rule, otherMessage)
    await chat.append(championMessage)
    await chat.append(otherMessage)
    detail = tournamentDetail(await tournaments.detail(tournament.id))
    const championParticipant = detail.participants.find(
      (participant) => participant.providerUserId === 'champion-user',
    )!
    await tournaments.assignParticipant(tournament.id, championTeam.id, championParticipant.id, 1)
    detail = tournamentDetail(await tournaments.generate(tournament.id))
    await tournaments.start(tournament.id)
    const championEntryId = championTeam.entryId
    for (const match of detail.matches.filter((item) => item.roundNumber === 1)) {
      const winnerEntryId = [match.leftEntryId, match.rightEntryId].includes(championEntryId)
        ? championEntryId
        : match.leftEntryId!
      detail = tournamentDetail(await tournaments.winner(tournament.id, match.id, winnerEntryId))
    }
    const final = detail.matches.find((match) => match.roundNumber === 2)!
    await tournaments.winner(tournament.id, final.id, championEntryId)
    const service = new FocusedChatService(
      chat,
      new IntegrationEventBus(),
      new GiveawayRepository(database),
      tournaments,
    )
    const thread = await service.forTournament(tournament.id)
    expect(thread.subject).toBe('Campeões')
    expect(thread.identities.map((identity) => identity.providerUserId)).toEqual(['champion-user'])
    expect(thread.messages.map((item) => item.message)).toEqual(['time campeão'])
    database.close()
    await environment.cleanup()
  })
})

function tournamentDetail(value: TournamentDetail | string | null): TournamentDetail {
  if (!value || typeof value === 'string')
    throw new Error(`Expected tournament detail, got ${value}`)
  return value
}

function message(
  externalEventId: string,
  channelId: string,
  providerUserId: string,
  text: string,
): ChatMessageReceived {
  return {
    author: {
      avatarUrl: 'data:image/png;base64,iVBORw==',
      displayName: providerUserId,
      handle: `@${providerUserId}`,
      provider: 'twitch',
      providerUserId,
    },
    badges: [],
    channelId,
    externalEventId,
    message: text,
    occurredAt: new Date().toISOString(),
    provider: 'twitch',
    roles: { isBot: false, isBroadcaster: false, isMember: false, isModerator: false },
    type: 'chat.message',
  }
}
