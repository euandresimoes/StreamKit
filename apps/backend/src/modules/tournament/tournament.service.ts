import { Inject, Injectable } from '@nestjs/common'
import type { CreateTournamentRequest, TournamentDetail } from '@streamkit/contracts'
import { ApiApplicationError } from '../../application/api-error'
import { TournamentRepository } from './tournament.repository'

@Injectable()
export class TournamentService {
  public constructor(
    @Inject(TournamentRepository) private readonly repository: TournamentRepository,
  ) {}
  public create(input: CreateTournamentRequest) {
    return this.repository.create(input)
  }
  public list() {
    return this.repository.list()
  }
  public detail(id: string) {
    return this.repository
      .detail(id)
      .then((value) => this.required(value, 'TOURNAMENT_NOT_FOUND', 'Tournament not found', 404))
  }
  public add(id: string, name: string) {
    return this.resolve(this.repository.addParticipant(id, name))
  }
  public rename(id: string, participantId: string, name: string) {
    return this.resolve(this.repository.renameParticipant(id, participantId, name), participantId)
  }
  public remove(id: string, participantId: string) {
    return this.resolve(this.repository.removeParticipant(id, participantId), participantId)
  }
  public reorder(id: string, participantId: string, seed: number) {
    return this.resolve(this.repository.reorder(id, participantId, seed), participantId)
  }
  public shuffle(id: string) {
    return this.resolve(this.repository.shuffle(id))
  }
  public generate(id: string) {
    return this.resolve(this.repository.generate(id))
  }
  public start(id: string) {
    return this.resolve(this.repository.start(id))
  }
  public archive(id: string) {
    return this.resolve(this.repository.archive(id))
  }
  public winner(id: string, matchId: string, winnerEntryId: string) {
    return this.resolve(
      this.repository.winner(id, matchId, winnerEntryId),
      matchId,
      'TOURNAMENT_MATCH_NOT_FOUND',
    )
  }
  public undo(id: string, matchId: string) {
    return this.resolve(this.repository.undo(id, matchId), matchId, 'TOURNAMENT_MATCH_NOT_FOUND')
  }
  private async resolve(
    promise: Promise<TournamentDetail | 'full' | 'incomplete' | 'missing' | null>,
    entityId?: string,
    missingCode:
      | 'TOURNAMENT_MATCH_NOT_FOUND'
      | 'TOURNAMENT_PARTICIPANT_NOT_FOUND' = 'TOURNAMENT_PARTICIPANT_NOT_FOUND',
  ) {
    const value = await promise
    if (value === 'full')
      throw new ApiApplicationError(
        'TOURNAMENT_FULL',
        'Tournament has reached its configured size',
        409,
      )
    if (value === 'incomplete')
      throw new ApiApplicationError(
        'TOURNAMENT_INVALID_STATE',
        'All bracket slots must be filled',
        409,
      )
    if (value === 'missing')
      throw new ApiApplicationError(missingCode, `Entity ${entityId ?? ''} not found`, 404)
    return this.required(
      value,
      'TOURNAMENT_INVALID_STATE',
      'Tournament operation is not valid in its current state',
      409,
    )
  }
  private required<T>(
    value: T | null,
    code: 'TOURNAMENT_INVALID_STATE' | 'TOURNAMENT_NOT_FOUND',
    message: string,
    status: number,
  ): T {
    if (!value) throw new ApiApplicationError(code, message, status)
    return value
  }
}
