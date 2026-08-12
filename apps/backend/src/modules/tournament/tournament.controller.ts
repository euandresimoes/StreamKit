import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common'
import {
  AddTournamentParticipantRequestSchema,
  CreateTournamentRequestSchema,
  EntityIdSchema,
  RenameTournamentParticipantRequestSchema,
  ReorderTournamentParticipantRequestSchema,
  SetTournamentWinnerRequestSchema,
} from '@streamkit/contracts'
import { TournamentService } from './tournament.service'

@Controller('api/v1/tournaments')
export class TournamentController {
  public constructor(@Inject(TournamentService) private readonly service: TournamentService) {}
  @Get() public list() {
    return this.service.list()
  }
  @Post() @HttpCode(201) public create(@Body() body: unknown) {
    return this.service.create(CreateTournamentRequestSchema.parse(body))
  }
  @Get(':id') public detail(@Param('id') id: unknown) {
    return this.service.detail(EntityIdSchema.parse(id))
  }
  @Post(':id/participants') public add(@Param('id') id: unknown, @Body() body: unknown) {
    return this.service.add(
      EntityIdSchema.parse(id),
      AddTournamentParticipantRequestSchema.parse(body).displayName,
    )
  }
  @Patch(':id/participants/:participantId') public rename(
    @Param('id') id: unknown,
    @Param('participantId') participantId: unknown,
    @Body() body: unknown,
  ) {
    return this.service.rename(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(participantId),
      RenameTournamentParticipantRequestSchema.parse(body).displayName,
    )
  }
  @Delete(':id/participants/:participantId') public remove(
    @Param('id') id: unknown,
    @Param('participantId') participantId: unknown,
  ) {
    return this.service.remove(EntityIdSchema.parse(id), EntityIdSchema.parse(participantId))
  }
  @Post(':id/participants/:participantId/reorder') public reorder(
    @Param('id') id: unknown,
    @Param('participantId') participantId: unknown,
    @Body() body: unknown,
  ) {
    return this.service.reorder(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(participantId),
      ReorderTournamentParticipantRequestSchema.parse(body).seed,
    )
  }
  @Post(':id/shuffle') public shuffle(@Param('id') id: unknown) {
    return this.service.shuffle(EntityIdSchema.parse(id))
  }
  @Post(':id/bracket/generate') public generate(@Param('id') id: unknown) {
    return this.service.generate(EntityIdSchema.parse(id))
  }
  @Post(':id/start') public start(@Param('id') id: unknown) {
    return this.service.start(EntityIdSchema.parse(id))
  }
  @Post(':id/matches/:matchId/winner') public winner(
    @Param('id') id: unknown,
    @Param('matchId') matchId: unknown,
    @Body() body: unknown,
  ) {
    return this.service.winner(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(matchId),
      SetTournamentWinnerRequestSchema.parse(body).winnerEntryId,
    )
  }
  @Post(':id/matches/:matchId/undo') public undo(
    @Param('id') id: unknown,
    @Param('matchId') matchId: unknown,
  ) {
    return this.service.undo(EntityIdSchema.parse(id), EntityIdSchema.parse(matchId))
  }
  @Post(':id/archive') public archive(@Param('id') id: unknown) {
    return this.service.archive(EntityIdSchema.parse(id))
  }
}
