import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common'
import {
  AddTournamentParticipantRequestSchema,
  AddTournamentTeamMemberRequestSchema,
  AssignTournamentParticipantRequestSchema,
  CreateTournamentRequestSchema,
  CreateTournamentTeamRequestSchema,
  EntityIdSchema,
  MoveTournamentTeamMemberRequestSchema,
  RenameTournamentParticipantRequestSchema,
  RenameTournamentTeamRequestSchema,
  ReorderTournamentParticipantRequestSchema,
  ReorderTournamentTeamRequestSchema,
  SaveTournamentCaptureRuleRequestSchema,
  SetTournamentWinnerRequestSchema,
  UpdateTournamentCaptureStatusRequestSchema,
  UpdateTournamentRequestSchema,
} from '@streamkit/contracts'
import { TournamentChatCaptureService } from './tournament-chat-capture.service'
import { TournamentService } from './tournament.service'

@Controller('api/v1/tournaments')
export class TournamentController {
  public constructor(
    @Inject(TournamentService) private readonly service: TournamentService,
    @Inject(TournamentChatCaptureService) private readonly capture: TournamentChatCaptureService,
  ) {}
  @Get() public list() {
    return this.service.list()
  }
  @Post() @HttpCode(201) public create(@Body() body: unknown) {
    return this.service.create(CreateTournamentRequestSchema.parse(body))
  }
  @Get(':id') public detail(@Param('id') id: unknown) {
    return this.service.detail(EntityIdSchema.parse(id))
  }
  @Patch(':id') public update(@Param('id') id: unknown, @Body() body: unknown) {
    return this.service.update(EntityIdSchema.parse(id), UpdateTournamentRequestSchema.parse(body))
  }
  @Delete(':id') @HttpCode(204) public delete(@Param('id') id: unknown): Promise<void> {
    return this.service.delete(EntityIdSchema.parse(id))
  }
  @Get(':id/capture-rules') public captureRules(@Param('id') id: unknown) {
    return this.capture.list(EntityIdSchema.parse(id))
  }
  @Post(':id/capture-rules') public saveCaptureRule(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ) {
    return this.capture.save(
      EntityIdSchema.parse(id),
      SaveTournamentCaptureRuleRequestSchema.parse(body),
    )
  }
  @Patch(':id/capture-rules/:ruleId') public updateCaptureRule(
    @Param('ruleId') ruleId: unknown,
    @Body() body: unknown,
  ) {
    return this.capture.updateStatus(
      EntityIdSchema.parse(ruleId),
      UpdateTournamentCaptureStatusRequestSchema.parse(body).status,
    )
  }
  @Delete(':id/capture-rules/:ruleId') @HttpCode(204) public deleteCaptureRule(
    @Param('ruleId') ruleId: unknown,
  ) {
    return this.capture.delete(EntityIdSchema.parse(ruleId))
  }
  @Post(':id/participants') public add(@Param('id') id: unknown, @Body() body: unknown) {
    return this.service.add(
      EntityIdSchema.parse(id),
      AddTournamentParticipantRequestSchema.parse(body).displayName,
    )
  }
  @Post(':id/teams') public addTeam(@Param('id') id: unknown, @Body() body: unknown) {
    const input = CreateTournamentTeamRequestSchema.parse(body)
    return this.service.addTeam(EntityIdSchema.parse(id), input.name, input.color, input.capacity)
  }
  @Patch(':id/teams/:teamId') public updateTeam(
    @Param('id') id: unknown,
    @Param('teamId') teamId: unknown,
    @Body() body: unknown,
  ) {
    const input = RenameTournamentTeamRequestSchema.parse(body)
    return this.service.updateTeam(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(teamId),
      input.name,
      input.color,
      input.capacity,
    )
  }
  @Delete(':id/teams/:teamId') public removeTeam(
    @Param('id') id: unknown,
    @Param('teamId') teamId: unknown,
  ) {
    return this.service.removeTeam(EntityIdSchema.parse(id), EntityIdSchema.parse(teamId))
  }
  @Post(':id/teams/:teamId/members') public addTeamMember(
    @Param('id') id: unknown,
    @Param('teamId') teamId: unknown,
    @Body() body: unknown,
  ) {
    const input = AddTournamentTeamMemberRequestSchema.parse(body)
    return this.service.addTeamMember(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(teamId),
      input.displayName,
      input.slotPosition,
    )
  }
  @Post(':id/teams/:teamId/members/assign') public assignParticipant(
    @Param('id') id: unknown,
    @Param('teamId') teamId: unknown,
    @Body() body: unknown,
  ) {
    const input = AssignTournamentParticipantRequestSchema.parse(body)
    return this.service.assignParticipant(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(teamId),
      input.participantId,
      input.slotPosition,
    )
  }
  @Post(':id/team-members/move') public moveTeamMember(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ) {
    const input = MoveTournamentTeamMemberRequestSchema.parse(body)
    return this.service.moveTeamMember(
      EntityIdSchema.parse(id),
      input.memberId,
      input.targetTeamId,
      input.targetSlotPosition,
    )
  }
  @Delete(':id/team-members/:memberId') public removeTeamMember(
    @Param('id') id: unknown,
    @Param('memberId') memberId: unknown,
  ) {
    return this.service.removeTeamMember(EntityIdSchema.parse(id), EntityIdSchema.parse(memberId))
  }
  @Post(':id/team-members/shuffle') public shuffleTeamMembers(@Param('id') id: unknown) {
    return this.service.shuffleTeamMembers(EntityIdSchema.parse(id))
  }
  @Post(':id/teams/:teamId/reorder') public reorderTeam(
    @Param('id') id: unknown,
    @Param('teamId') teamId: unknown,
    @Body() body: unknown,
  ) {
    return this.service.reorderTeam(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(teamId),
      ReorderTournamentTeamRequestSchema.parse(body).seed,
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
