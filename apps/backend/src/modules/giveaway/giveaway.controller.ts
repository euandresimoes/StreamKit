import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common'
import {
  CreateGiveawayRequestSchema,
  EntityIdSchema,
  ImportParticipantsRequestSchema,
  NextGiveawayRoundRequestSchema,
  ParseParticipantsRequestSchema,
  UpdateGiveawayRequestSchema,
} from '@streamkit/contracts'
import { GiveawayService } from './giveaway.service'

@Controller('api/v1/giveaways')
export class GiveawayController {
  public constructor(@Inject(GiveawayService) private readonly service: GiveawayService) {}
  @Get() public list() {
    return this.service.list()
  }
  @Post() @HttpCode(201) public create(@Body() body: unknown) {
    return this.service.create(CreateGiveawayRequestSchema.parse(body))
  }
  @Post('parse-participants') public parse(@Body() body: unknown) {
    const input = ParseParticipantsRequestSchema.parse(body)
    return this.service.parse(input.input, input.policy)
  }
  @Get(':id') public detail(@Param('id') id: unknown) {
    return this.service.detail(EntityIdSchema.parse(id))
  }
  @Patch(':id') public update(@Param('id') id: unknown, @Body() body: unknown) {
    return this.service.update(EntityIdSchema.parse(id), UpdateGiveawayRequestSchema.parse(body))
  }
  @Delete(':id') @HttpCode(204) public delete(@Param('id') id: unknown): Promise<void> {
    return this.service.delete(EntityIdSchema.parse(id))
  }
  @Post(':id/participants/import') public import(@Param('id') id: unknown, @Body() body: unknown) {
    const input = ImportParticipantsRequestSchema.parse(body)
    return this.service.import(EntityIdSchema.parse(id), input.input, input.policy)
  }
  @Delete(':id/participants/:participantId') @HttpCode(204) public removeParticipant(
    @Param('id') id: unknown,
    @Param('participantId') participantId: unknown,
  ): Promise<void> {
    return this.service.removeParticipant(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(participantId),
    )
  }
  @Post(':id/prepare') public prepare(@Param('id') id: unknown) {
    return this.service.prepare(EntityIdSchema.parse(id))
  }
  @Post(':id/draw') public draw(@Param('id') id: unknown) {
    return this.service.draw(EntityIdSchema.parse(id))
  }
  @Post(':id/rounds/:roundId/complete') public complete(
    @Param('id') id: unknown,
    @Param('roundId') roundId: unknown,
  ) {
    return this.service.complete(EntityIdSchema.parse(id), EntityIdSchema.parse(roundId))
  }
  @Post(':id/cancel') public cancel(@Param('id') id: unknown) {
    return this.service.cancel(EntityIdSchema.parse(id))
  }
  @Post(':id/archive') public archive(@Param('id') id: unknown) {
    return this.service.archive(EntityIdSchema.parse(id))
  }
  @Get(':id/history') public history(@Param('id') id: unknown) {
    return this.service.history(EntityIdSchema.parse(id))
  }
  @Post(':id/next-round') public nextRound(@Param('id') id: unknown, @Body() body: unknown) {
    return this.service.nextRound(
      EntityIdSchema.parse(id),
      NextGiveawayRoundRequestSchema.parse(body).removeWinner,
    )
  }
}
