import type { GiveawayRound } from '@streamkit/contracts'
import {
  caseDestination,
  visualCaseEntries,
  wheelDestination,
  winnerIndex,
} from '../src/components/giveaway/giveaway-animation'
const round: GiveawayRound = {
  completedAt: null,
  entries: [
    { displayName: 'Ana', participantId: '1ac2fd48-df97-49b2-9272-abed6a28c14e', ticketCount: 1 },
    { displayName: 'Bia', participantId: 'b096fda9-eb87-4e70-8d0a-f74288915a76', ticketCount: 1 },
  ],
  giveawayId: 'c11f00b2-20de-4ead-9a28-67202281c0c5',
  id: '4cd956ee-e926-4668-925a-5bacd25d389f',
  mode: 'wheel',
  randomProof: 'a'.repeat(64),
  snapshotHash: 'b'.repeat(64),
  startedAt: '2026-08-12T00:00:00.000Z',
  status: 'drawing',
  ticketCount: 2,
  winnerParticipantId: 'b096fda9-eb87-4e70-8d0a-f74288915a76',
}
describe('giveaway deterministic animation', () => {
  it('derives both destinations only from persisted result', () => {
    expect(winnerIndex(round)).toBe(1)
    expect(wheelDestination(round)).toBe(wheelDestination(round))
    expect(caseDestination(round)).toBe(caseDestination(round))
  })
  it('limits the visual strip independently of participant volume', () =>
    expect(visualCaseEntries(round)).toHaveLength(45))
})
