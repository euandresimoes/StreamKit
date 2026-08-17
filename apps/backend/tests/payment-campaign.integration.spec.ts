import type { ChatMessageReceived } from '@streamkit/contracts'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import { SqliteDatabase } from '../src/infrastructure/database/sqlite-database'
import {
  giveawayCaptureRules,
  giveawayParticipants,
  giveaways,
  integrationConnections,
  paymentContributions,
} from '../src/infrastructure/database/schema'
import { GiveawayCaptureRepository } from '../src/modules/giveaway/giveaway-capture.repository'
import { GiveawayRepository } from '../src/modules/giveaway/giveaway.repository'
import { PaymentCampaignService } from '../src/modules/payments/payment-campaign.service'

describe('payment campaign capture', () => {
  it('captures a pending named payment into a draft giveaway and makes it ready', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    const now = new Date().toISOString()
    const connectionId = '983abd47-e67e-407c-aaa0-8c66d3f694c1'
    const giveawayId = '1dacfa0b-4f54-49fc-913a-9fab87485957'
    const ruleId = 'f18ccf1f-7074-4e4c-9277-f4b2ce778510'
    await database.orm.insert(integrationConnections).values({
      capabilitiesJson: JSON.stringify(['chat.read']),
      channelDisplayName: 'Vaurvik',
      channelId: 'vaurvik',
      createdAt: now,
      id: connectionId,
      isGlobalSelected: false,
      lastErrorCode: null,
      liveSessionKey: null,
      nextRetryAt: null,
      provider: 'kick',
      retryAttempt: 0,
      status: 'connected',
      updatedAt: now,
    })
    await database.orm.insert(giveaways).values({
      createdAt: now,
      duplicatePolicy: 'remove',
      id: giveawayId,
      maxParticipants: 10,
      mode: 'wheel',
      name: 'LivePix test',
      source: 'manual',
      status: 'draft',
      updatedAt: now,
    })
    await database.orm.insert(giveawayCaptureRules).values({
      capturedCount: 0,
      connectionId,
      createdAt: now,
      duplicateCount: 0,
      endsAt: null,
      entryPolicy: 'unique',
      excludeBots: true,
      excludeBroadcaster: true,
      excludeModerators: false,
      giveawayId,
      id: ruleId,
      livepixAutoEntry: true,
      livepixCurrency: 'BRL',
      livepixMinimumAmountInCents: 200,
      match: 'any',
      matchValue: null,
      membersOnly: false,
      rejectedCount: 0,
      startsAt: null,
      status: 'active',
      updatedAt: now,
    })
    await database.orm.insert(paymentContributions).values({
      amountInCents: 200,
      campaignId: null,
      contributionType: 'payment',
      currency: 'BRL',
      eventId: 'message-1',
      id: '5ae446d7-a948-446c-91b3-8afe45e27679',
      message: 'FIFA registration',
      occurredAt: now,
      participantHandle: 'vaurvik',
      participantPlatform: null,
      pendingReason: 'manual_review',
      processedAt: null,
      provider: 'livepix',
      providerReference: 'reference-1',
      providerResourceId: 'message-1',
      receivedAt: now,
      status: 'pending',
    })
    const service = new PaymentCampaignService(database, {} as never)

    await expect(
      service.apply({
        amountInCents: 200,
        contributionType: 'payment',
        currency: 'BRL',
        eventId: 'message-1',
        message: 'FIFA registration',
        occurredAt: now,
        participantHandle: 'vaurvik',
        participantPlatform: null,
        provider: 'livepix',
        providerReference: 'reference-1',
        providerResourceId: 'message-1',
      }),
    ).resolves.toBe(1)

    expect(await database.orm.query.giveawayParticipants.findFirst()).toEqual(
      expect.objectContaining({ displayName: 'vaurvik', source: 'livepix' }),
    )
    expect(await database.orm.query.giveaways.findFirst()).toEqual(
      expect.objectContaining({ status: 'ready' }),
    )
    expect(await database.orm.query.giveawayCaptureRules.findFirst()).toEqual(
      expect.objectContaining({ capturedCount: 1 }),
    )
    const giveawaysRepository = new GiveawayRepository(database)
    expect((await giveawaysRepository.detail(giveawayId))?.participants[0]).toEqual(
      expect.objectContaining({
        avatarUrl: null,
        livepixAmountInCents: 200,
        livepixCurrency: 'BRL',
        provider: 'kick',
        source: 'livepix',
      }),
    )
    const message: ChatMessageReceived = {
      author: {
        avatarUrl: 'https://example.com/avatar.png',
        displayName: 'Vaurvik',
        handle: 'vaurvik',
        provider: 'kick',
        providerUserId: 'kick-user-1',
      },
      badges: [],
      channelId: 'vaurvik',
      externalEventId: 'chat-message-1',
      message: 'hello',
      occurredAt: now,
      provider: 'kick',
      roles: { isBot: false, isBroadcaster: false, isMember: false, isModerator: false },
      type: 'chat.message',
    }
    await new GiveawayCaptureRepository(database).linkIdentity(message)
    expect((await giveawaysRepository.detail(giveawayId))?.participants[0]).toEqual(
      expect.objectContaining({
        avatarUrl: 'https://example.com/avatar.png',
        providerUserId: 'kick-user-1',
      }),
    )

    await expect(
      service.apply({
        amountInCents: 300,
        contributionType: 'payment',
        currency: 'BRL',
        eventId: 'message-2',
        message: null,
        occurredAt: now,
        participantHandle: 'VAURVIK',
        participantPlatform: null,
        provider: 'livepix',
        providerReference: 'reference-2',
        providerResourceId: 'message-2',
      }),
    ).resolves.toBe(0)
    expect(await database.orm.$count(giveawayParticipants)).toBe(1)

    await database.orm.delete(giveawayParticipants)
    database.close()
    await environment.cleanup()
  })
})
