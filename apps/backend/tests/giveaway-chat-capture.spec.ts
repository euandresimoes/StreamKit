import type { ChatMessageReceived, GiveawayCaptureRule } from '@streamkit/contracts'

import {
  matchesGiveawayCaptureRule,
  normalizeCaptureText,
} from '../src/modules/giveaway/domain/chat-capture-rule'

const rule: GiveawayCaptureRule = {
  capturedCount: 0,
  connectionId: '3c9645f7-0aa5-48cd-a58f-b68069cb2ea7',
  createdAt: '2026-08-13T10:00:00.000Z',
  duplicateCount: 0,
  endsAt: null,
  entryPolicy: 'unique',
  excludeBots: true,
  excludeBroadcaster: true,
  excludeModerators: false,
  giveawayId: '49d175fc-29a0-46e7-95d8-ca39a158d269',
  id: '48905873-05a0-48dc-bd1a-b46247700eb0',
  match: 'exact',
  matchValue: '!participar',
  membersOnly: false,
  startsAt: null,
  rejectedCount: 0,
  status: 'active',
  updatedAt: '2026-08-13T10:00:00.000Z',
}
const event: ChatMessageReceived = {
  author: {
    avatarUrl: null,
    displayName: 'André',
    handle: 'andre',
    provider: 'twitch',
    providerUserId: 'user-1',
  },
  badges: [],
  channelId: 'channel-1',
  externalEventId: 'event-1',
  message: '  !PARTICIPAR  ',
  occurredAt: '2026-08-13T12:00:00.000Z',
  provider: 'twitch',
  roles: { isBot: false, isBroadcaster: false, isMember: false, isModerator: false },
  type: 'chat.message',
}

describe('giveaway chat capture rule', () => {
  it('matches exact, prefix, contains and any text using NFKC case folding', () => {
    expect(matchesGiveawayCaptureRule(rule, event)).toBe(true)
    expect(
      matchesGiveawayCaptureRule({ ...rule, match: 'prefix', matchValue: '!part' }, event),
    ).toBe(true)
    expect(
      matchesGiveawayCaptureRule({ ...rule, match: 'contains', matchValue: 'ticip' }, event),
    ).toBe(true)
    expect(matchesGiveawayCaptureRule({ ...rule, match: 'any', matchValue: null }, event)).toBe(
      true,
    )
    expect(normalizeCaptureText('ＡＮＤＲＥ')).toBe('andre')
  })

  it('applies roles, membership and capture window filters', () => {
    expect(
      matchesGiveawayCaptureRule(rule, { ...event, roles: { ...event.roles, isBot: true } }),
    ).toBe(false)
    expect(matchesGiveawayCaptureRule({ ...rule, membersOnly: true }, event)).toBe(false)
    expect(
      matchesGiveawayCaptureRule(
        { ...rule, startsAt: '2026-08-13T13:00:00.000Z' },
        event,
        new Date(event.occurredAt),
      ),
    ).toBe(false)
  })
})
