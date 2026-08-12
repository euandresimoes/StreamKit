import { parseParticipants } from '../src/modules/giveaway/domain/participant-parser'
import { selectWinner } from '../src/modules/giveaway/domain/draw-winner'

describe('giveaway participant parser', () => {
  it('splits commas/newlines, trims blanks and preserves Unicode display', () => {
    expect(parseParticipants(' Ana,\n\nJosé 🍀\r\n ana ', 'remove')).toEqual({
      entries: [
        { displayName: 'Ana', normalizedName: 'ana', ticketCount: 1 },
        { displayName: 'José 🍀', normalizedName: 'josé 🍀', ticketCount: 1 },
      ],
      inputCount: 3,
      ticketCount: 2,
      validCount: 2,
    })
  })
  it('keeps occurrences as independent tickets', () => {
    expect(parseParticipants('Ana, ana', 'keep').entries).toHaveLength(2)
  })
  it('groups occurrences into ticket counts', () => {
    expect(parseParticipants('Ana, ana, ANA', 'group-tickets').entries[0]?.ticketCount).toBe(3)
  })
})
describe('secure winner selection', () => {
  const entries = [
    { displayName: 'Ana', participantId: 'ad5530b9-1315-43f4-9730-587619a85698', ticketCount: 1 },
  ]
  it('freezes a hash and always selects from the supplied snapshot', () => {
    const result = selectWinner(entries)
    expect(result.winnerParticipantId).toBe(entries[0]!.participantId)
    expect(result.snapshotHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.randomProof).toMatch(/^[a-f0-9]{64}$/)
    expect(
      selectWinner([
        ...entries,
        {
          displayName: 'Bia',
          participantId: '20afcefe-1090-4091-a1d7-7641e7ff0c2e',
          ticketCount: 1,
        },
      ]).snapshotHash,
    ).not.toBe(result.snapshotHash)
  })
  it('rejects an empty draw', () => expect(() => selectWinner([])).toThrow())
  it('shows basic distribution sanity without claiming cryptographic proof', () => {
    const balanced = [
      { displayName: 'Ana', participantId: 'ad5530b9-1315-43f4-9730-587619a85698', ticketCount: 1 },
      { displayName: 'Bia', participantId: '20afcefe-1090-4091-a1d7-7641e7ff0c2e', ticketCount: 1 },
    ]
    const counts = new Map<string, number>()
    for (let index = 0; index < 2000; index += 1) {
      const id = selectWinner(balanced).winnerParticipantId
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    expect(counts.get(balanced[0]!.participantId)).toBeGreaterThan(750)
    expect(counts.get(balanced[1]!.participantId)).toBeGreaterThan(750)
  })
})
