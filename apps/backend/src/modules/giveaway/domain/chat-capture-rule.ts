import type { ChatMessageReceived, GiveawayCaptureRule } from '@streamlet/contracts'

import {
  matchesParticipantCaptureRule,
  normalizeCaptureText,
} from '../../integrations/domain/participant-capture-rule'

export { normalizeCaptureText }

export function matchesGiveawayCaptureRule(
  rule: GiveawayCaptureRule,
  event: ChatMessageReceived,
  now = new Date(),
): boolean {
  return matchesParticipantCaptureRule(rule, event, now)
}
