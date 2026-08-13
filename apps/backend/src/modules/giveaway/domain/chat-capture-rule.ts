import type { ChatMessageReceived, GiveawayCaptureRule } from '@streamkit/contracts'

export function matchesGiveawayCaptureRule(
  rule: GiveawayCaptureRule,
  event: ChatMessageReceived,
  now = new Date(),
): boolean {
  if (rule.status !== 'active') return false
  const timestamp = now.toISOString()
  if (rule.startsAt && timestamp < rule.startsAt) return false
  if (rule.endsAt && timestamp >= rule.endsAt) return false
  if (rule.excludeBots && event.roles.isBot) return false
  if (rule.excludeBroadcaster && event.roles.isBroadcaster) return false
  if (rule.excludeModerators && event.roles.isModerator) return false
  if (rule.membersOnly && !event.roles.isMember) return false
  if (rule.match === 'any') return true
  const message = normalizeCaptureText(event.message)
  const expected = normalizeCaptureText(rule.matchValue ?? '')
  if (rule.match === 'exact') return message === expected
  if (rule.match === 'prefix') return message.startsWith(expected)
  return message.includes(expected)
}

export function normalizeCaptureText(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('pt-BR')
}
