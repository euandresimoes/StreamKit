import type { GiveawayRound } from '@streamkit/contracts'

export function winnerIndex(round: GiveawayRound): number {
  return Math.max(
    0,
    round.entries.findIndex((entry) => entry.participantId === round.winnerParticipantId),
  )
}
export function wheelDestination(round: GiveawayRound): number {
  const slice = 360 / round.entries.length
  return 1440 + 360 - (winnerIndex(round) * slice + slice / 2)
}
export function caseDestination(round: GiveawayRound, itemWidth = 144): number {
  return -(20 * itemWidth + winnerIndex(round) * itemWidth)
}
export function visualCaseEntries(round: GiveawayRound) {
  return Array.from({ length: 45 }, (_, index) => round.entries[index % round.entries.length]!)
}
