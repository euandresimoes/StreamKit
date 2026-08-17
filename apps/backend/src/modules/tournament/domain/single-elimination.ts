import { randomInt } from 'node:crypto'

export type BracketMatch = {
  matchNumber: number
  nextMatchNumber: number | null
  nextSlot: 'left' | 'right' | null
  roundNumber: number
  leftSeed: number | null
  rightSeed: number | null
}

export function generateSingleEliminationBracket(size: number): BracketMatch[] {
  if (!Number.isInteger(size) || size < 2 || size > 10_000)
    throw new Error('Tournament bracket size must be an integer between 2 and 10000')
  const rounds = Math.ceil(Math.log2(size))
  const bracketSlots = 2 ** rounds
  const matches: BracketMatch[] = []
  let number = 1
  const roundStarts: number[] = []
  for (let round = 1; round <= rounds; round += 1) {
    roundStarts.push(number)
    number += bracketSlots / 2 ** round
  }
  for (let round = 1; round <= rounds; round += 1) {
    const count = bracketSlots / 2 ** round
    for (let index = 0; index < count; index += 1) {
      const final = round === rounds
      matches.push({
        leftSeed: round === 1 && index * 2 + 1 <= size ? index * 2 + 1 : null,
        matchNumber: roundStarts[round - 1]! + index,
        nextMatchNumber: final ? null : roundStarts[round]! + Math.floor(index / 2),
        nextSlot: final ? null : index % 2 === 0 ? 'left' : 'right',
        rightSeed: round === 1 && index * 2 + 2 <= size ? index * 2 + 2 : null,
        roundNumber: round,
      })
    }
  }
  return matches
}

export function secureShuffle<T>(values: readonly T[]): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1)
    ;[result[index], result[target]] = [result[target]!, result[index]!]
  }
  return result
}

export function advancingMatchStatus(hasLeft: boolean, hasRight: boolean): 'ready' | 'pending' {
  return hasLeft && hasRight ? 'ready' : 'pending'
}

export function descendantMatchIds(
  matchId: string,
  matches: ReadonlyArray<{ id: string; nextMatchId: string | null }>,
): string[] {
  const byId = new Map(matches.map((match) => [match.id, match]))
  const descendants: string[] = []
  let current = byId.get(matchId)
  while (current?.nextMatchId) {
    descendants.push(current.nextMatchId)
    current = byId.get(current.nextMatchId)
  }
  return descendants
}
