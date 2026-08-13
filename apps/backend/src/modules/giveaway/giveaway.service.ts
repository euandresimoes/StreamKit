import { Inject, Injectable } from '@nestjs/common'
import type {
  CreateGiveawayRequest,
  DuplicatePolicy,
  Giveaway,
  GiveawayDetail,
  GiveawayHistory,
  GiveawayRound,
  ParticipantPreview,
  UpdateGiveawayRequest,
} from '@streamkit/contracts'
import { ApiApplicationError } from '../../application/api-error'
import { GiveawayRepository } from './giveaway.repository'
import { ManualParticipantSource } from './sources/participant-source'

@Injectable()
export class GiveawayService {
  private readonly participantSource = new ManualParticipantSource()
  public constructor(@Inject(GiveawayRepository) private readonly repository: GiveawayRepository) {}
  public parse(input: string, policy: DuplicatePolicy): ParticipantPreview {
    return this.participantSource.preview(input, policy)
  }
  public create(input: CreateGiveawayRequest): Promise<Giveaway> {
    return this.repository.create(input)
  }
  public list() {
    return this.repository.list()
  }
  public detail(id: string): Promise<GiveawayDetail> {
    return this.repository
      .detail(id)
      .then((value) => this.required(value, 'GIVEAWAY_NOT_FOUND', 'Giveaway not found'))
  }
  public async import(id: string, input: string, policy: DuplicatePolicy): Promise<GiveawayDetail> {
    const current = await this.detail(id)
    if (current.giveaway.duplicatePolicy !== policy)
      throw new ApiApplicationError(
        'GIVEAWAY_INVALID_STATE',
        'Import policy must match giveaway policy',
        409,
      )
    const existingInput = current.participants
      .flatMap((participant) => Array(participant.ticketCount).fill(participant.displayName))
      .join('\n')
    const preview = this.parse([existingInput, input].filter(Boolean).join('\n'), policy)
    return this.repository
      .replaceParticipants(id, preview.entries)
      .then((value) =>
        this.required(
          value,
          'GIVEAWAY_INVALID_STATE',
          'Participants can only change before or between rounds',
        ),
      )
  }
  public update(id: string, input: UpdateGiveawayRequest): Promise<Giveaway> {
    return this.repository
      .update(id, input)
      .then((value) =>
        this.required(value, 'GIVEAWAY_INVALID_STATE', 'Mode can only change before a draw'),
      )
  }
  public async delete(id: string): Promise<void> {
    if (!(await this.repository.delete(id)))
      throw new ApiApplicationError('GIVEAWAY_NOT_FOUND', 'Giveaway not found', 404)
  }
  public async prepare(id: string): Promise<Giveaway> {
    const detail = await this.detail(id)
    if (!detail.participants.length)
      throw new ApiApplicationError('GIVEAWAY_EMPTY', 'Giveaway has no participants', 409)
    return this.required(
      await this.repository.transition(id, ['draft'], 'ready'),
      'GIVEAWAY_INVALID_STATE',
      'Giveaway cannot be prepared',
    )
  }
  public async removeParticipant(id: string, participantId: string): Promise<void> {
    const detail = await this.detail(id)
    if (!['draft', 'ready'].includes(detail.giveaway.status))
      throw new ApiApplicationError(
        'GIVEAWAY_INVALID_STATE',
        'Participants can only change before or between rounds',
        409,
      )
    if (!(await this.repository.removeParticipant(id, participantId)))
      throw new ApiApplicationError('GIVEAWAY_NOT_FOUND', 'Participant not found', 404)
  }
  public draw(id: string): Promise<GiveawayRound> {
    return this.repository
      .draw(id)
      .then((value) =>
        this.required(value, 'GIVEAWAY_INVALID_STATE', 'Giveaway must be ready and non-empty'),
      )
  }
  public complete(id: string, roundId: string): Promise<GiveawayRound> {
    return this.repository
      .complete(id, roundId)
      .then((value) => this.required(value, 'GIVEAWAY_ROUND_NOT_FOUND', 'Active round not found'))
  }
  public cancel(id: string): Promise<Giveaway> {
    return this.repository
      .transition(id, ['draft', 'ready'], 'cancelled')
      .then((value) =>
        this.required(value, 'GIVEAWAY_INVALID_STATE', 'Selected giveaway cannot be cancelled'),
      )
  }
  public archive(id: string): Promise<Giveaway> {
    return this.repository
      .transition(id, ['completed', 'cancelled'], 'archived')
      .then((value) =>
        this.required(value, 'GIVEAWAY_INVALID_STATE', 'Giveaway cannot be archived'),
      )
  }
  public async history(id: string): Promise<GiveawayHistory> {
    await this.detail(id)
    return this.repository.history(id)
  }
  public nextRound(id: string, removeWinner: boolean): Promise<GiveawayDetail> {
    return this.repository
      .nextRound(id, removeWinner)
      .then((value) =>
        this.required(value, 'GIVEAWAY_INVALID_STATE', 'A completed giveaway is required'),
      )
  }
  private required<T>(
    value: T | null,
    code: 'GIVEAWAY_INVALID_STATE' | 'GIVEAWAY_NOT_FOUND' | 'GIVEAWAY_ROUND_NOT_FOUND',
    message: string,
  ): T {
    if (!value)
      throw new ApiApplicationError(
        code,
        message,
        code === 'GIVEAWAY_NOT_FOUND' || code === 'GIVEAWAY_ROUND_NOT_FOUND' ? 404 : 409,
      )
    return value
  }
}
