import { createHash, randomBytes, randomInt } from 'node:crypto'
import type { GiveawayRoundEntry } from '@streamlet/contracts'

export type DrawSelection = {
  randomProof: string
  snapshotHash: string
  ticketCount: number
  winnerParticipantId: string
}
export function selectWinner(entries: GiveawayRoundEntry[]): DrawSelection {
  const snapshot = JSON.stringify(entries)
  const ticketCount = entries.reduce((sum, entry) => sum + entry.ticketCount, 0)
  if (ticketCount === 0) throw new Error('Cannot draw from an empty snapshot')
  let ticket = randomInt(ticketCount)
  let winner = entries[0]!
  for (const entry of entries) {
    if (ticket < entry.ticketCount) {
      winner = entry
      break
    }
    ticket -= entry.ticketCount
  }
  return {
    randomProof: createHash('sha256').update(randomBytes(32)).digest('hex'),
    snapshotHash: createHash('sha256').update(snapshot).digest('hex'),
    ticketCount,
    winnerParticipantId: winner.participantId,
  }
}
