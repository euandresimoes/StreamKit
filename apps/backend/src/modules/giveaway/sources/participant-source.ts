import type {
  DuplicatePolicy,
  ParticipantPreview,
  ParticipantSource as ParticipantSourceName,
} from '@streamkit/contracts'
import { parseParticipants } from '../domain/participant-parser'

export interface ParticipantSource {
  readonly name: ParticipantSourceName
  preview(input: string, policy: DuplicatePolicy): ParticipantPreview
}

export class ManualParticipantSource implements ParticipantSource {
  public readonly name = 'manual' as const
  public preview(input: string, policy: DuplicatePolicy): ParticipantPreview {
    return parseParticipants(input, policy)
  }
}
