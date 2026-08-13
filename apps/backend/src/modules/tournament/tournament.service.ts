import { Inject, Injectable } from '@nestjs/common'
import type {
  CompleteTournamentMatchRequest,
  CreateTournamentRequest,
  TournamentDetail,
  UpdateTournamentRequest,
} from '@streamkit/contracts'
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
  public update(id: string, input: UpdateTournamentRequest) {
    return this.repository.update(id, input).then((value) => {
      if (value === 'conflict')
        throw new ApiApplicationError(
          'TOURNAMENT_INVALID_STATE',
          'Type and participant count can only change before adding entrants',
          409,
        )
      return this.required(value, 'TOURNAMENT_NOT_FOUND', 'Tournament not found', 404)
    })
  }
  public async delete(id: string): Promise<void> {
    if (!(await this.repository.delete(id)))
      throw new ApiApplicationError('TOURNAMENT_NOT_FOUND', 'Tournament not found', 404)
  }
  public add(id: string, name: string) {
    return this.resolve(this.repository.addParticipant(id, name))
  }
  public addTeam(id: string, name: string, color: string, capacity?: number) {
    return this.resolve(
      this.repository.addTeam(id, name, color, capacity),
      undefined,
      'TOURNAMENT_TEAM_NOT_FOUND',
    )
  }
  public updateTeam(id: string, teamId: string, name: string, color: string, capacity?: number) {
    return this.resolve(
      this.repository.updateTeam(id, teamId, name, color, capacity),
      teamId,
      'TOURNAMENT_TEAM_NOT_FOUND',
    )
  }
  public removeTeam(id: string, teamId: string) {
    return this.resolve(this.repository.removeTeam(id, teamId), teamId, 'TOURNAMENT_TEAM_NOT_FOUND')
  }
  public addTeamMember(id: string, teamId: string, displayName: string, slotPosition: number) {
    return this.resolve(
      this.repository.addTeamMember(id, teamId, displayName, slotPosition),
      teamId,
      'TOURNAMENT_TEAM_NOT_FOUND',
    )
  }
  public assignParticipant(
    id: string,
    teamId: string,
    participantId: string,
    slotPosition: number,
  ) {
    return this.resolve(
      this.repository.assignParticipant(id, teamId, participantId, slotPosition),
      participantId,
    )
  }
  public moveTeamMember(
    id: string,
    memberId: string,
    targetTeamId: string,
    targetSlotPosition: number,
  ) {
    return this.resolve(
      this.repository.moveTeamMember(id, memberId, targetTeamId, targetSlotPosition),
      memberId,
      'TOURNAMENT_TEAM_NOT_FOUND',
    )
  }
  public removeTeamMember(id: string, memberId: string) {
    return this.resolve(this.repository.removeTeamMember(id, memberId), memberId)
  }
  public shuffleTeamMembers(id: string) {
    return this.resolve(this.repository.shuffleTeamMembers(id))
  }
  public reorderTeam(id: string, teamId: string, seed: number) {
    return this.resolve(
      this.repository.reorderTeam(id, teamId, seed),
      teamId,
      'TOURNAMENT_TEAM_NOT_FOUND',
    )
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
  public startMatch(id: string, matchId: string) {
    return this.resolve(
      this.repository.startMatch(id, matchId),
      matchId,
      'TOURNAMENT_MATCH_NOT_FOUND',
    )
  }
  public completeMatch(id: string, matchId: string, result: CompleteTournamentMatchRequest) {
    return this.resolve(
      this.repository.completeMatch(id, matchId, result),
      matchId,
      'TOURNAMENT_MATCH_NOT_FOUND',
    )
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
    promise: Promise<
      TournamentDetail | 'conflict' | 'duplicate' | 'full' | 'incomplete' | 'missing' | null
    >,
    entityId?: string,
    missingCode:
      | 'TOURNAMENT_MATCH_NOT_FOUND'
      | 'TOURNAMENT_PARTICIPANT_NOT_FOUND'
      | 'TOURNAMENT_TEAM_NOT_FOUND' = 'TOURNAMENT_PARTICIPANT_NOT_FOUND',
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
    if (value === 'conflict')
      throw new ApiApplicationError(
        'TOURNAMENT_SLOT_CONFLICT',
        'Target slot or capacity is not available',
        409,
      )
    if (value === 'duplicate')
      throw new ApiApplicationError(
        'TOURNAMENT_DUPLICATE_MEMBER',
        'A person can only occupy one slot in a tournament',
        409,
      )
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
