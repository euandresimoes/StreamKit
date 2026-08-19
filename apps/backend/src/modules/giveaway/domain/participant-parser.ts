import type { DuplicatePolicy, ParsedParticipant, ParticipantPreview } from '@streamlet/contracts'

export function normalizeParticipantName(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function parseParticipants(input: string, policy: DuplicatePolicy): ParticipantPreview {
  const names = input
    .split(/[\r\n,]+/u)
    .map((value) => value.trim())
    .filter(Boolean)
  const grouped = new Map<string, ParsedParticipant>()
  for (const displayName of names) {
    const normalizedName = normalizeParticipantName(displayName)
    const existing = grouped.get(normalizedName)
    if (policy === 'keep') {
      grouped.set(`${normalizedName}\0${grouped.size}`, {
        displayName,
        normalizedName,
        ticketCount: 1,
      })
    } else if (!existing)
      grouped.set(normalizedName, { displayName, normalizedName, ticketCount: 1 })
    else if (policy === 'group-tickets') existing.ticketCount += 1
  }
  const entries = [...grouped.values()]
  return {
    entries,
    inputCount: names.length,
    ticketCount: entries.reduce((sum, item) => sum + item.ticketCount, 0),
    validCount: entries.length,
  }
}
