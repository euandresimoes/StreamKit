import {
  advancingMatchStatus,
  descendantMatchIds,
  generateSingleEliminationBracket,
} from '../src/modules/tournament/domain/single-elimination'

describe('single-elimination bracket', () => {
  it.each([4, 8, 16, 32] as const)('generates a complete bracket for %i entries', (size) => {
    const matches = generateSingleEliminationBracket(size)
    expect(matches).toHaveLength(size - 1)
    expect(matches.filter((match) => match.roundNumber === 1)).toHaveLength(size / 2)
    expect(matches.at(-1)).toMatchObject({ nextMatchNumber: null, nextSlot: null })
    expect(new Set(matches.map((match) => match.matchNumber)).size).toBe(size - 1)
  })

  it('only advances a match when both entries are known', () => {
    expect(advancingMatchStatus(true, false)).toBe('pending')
    expect(advancingMatchStatus(true, true)).toBe('in_progress')
  })

  it('finds every descendant that must be invalidated', () => {
    expect(
      descendantMatchIds('semi', [
        { id: 'semi', nextMatchId: 'final' },
        { id: 'final', nextMatchId: 'super-final' },
        { id: 'super-final', nextMatchId: null },
      ]),
    ).toEqual(['final', 'super-final'])
  })
})
