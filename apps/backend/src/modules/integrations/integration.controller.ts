import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put } from '@nestjs/common'
import {
  ChatModerationRequestSchema,
  EntityIdSchema,
  SaveIntegrationConnectionRequestSchema,
  SendChatMessageRequestSchema,
  StartChatSimulationRequestSchema,
  UpdateIntegrationConnectionStateRequestSchema,
} from '@streamkit/contracts'

import { IntegrationService } from './integration.service'
import { IntegrationConnectionManager } from './integration-connection.manager'
import { FocusedChatService } from './focused-chat.service'
import { ChatSimulationService } from './chat-simulation.service'
import { ApiApplicationError } from '../../application/api-error'
import { LiveControlService } from './live-control.service'

@Controller('api/v1/integrations')
export class IntegrationController {
  public constructor(
    @Inject(IntegrationService) private readonly service: IntegrationService,
    @Inject(IntegrationConnectionManager) private readonly manager: IntegrationConnectionManager,
    @Inject(FocusedChatService) private readonly focusedChat: FocusedChatService,
    @Inject(ChatSimulationService) private readonly simulation: ChatSimulationService,
    @Inject(LiveControlService) private readonly liveControl: LiveControlService,
  ) {}

  @Get('live-control') public async liveControlList() {
    const initial = await this.liveControl.list()
    await Promise.all(
      initial
        .filter((stream) => stream.state === 'online')
        .map((stream) => this.manager.ensureStarted(stream.connectionId)),
    )
    return this.liveControl.list()
  }

  @Get('live-control/:id/chat') public liveControlChat(@Param('id') id: string) {
    return this.liveControl.channelChat(EntityIdSchema.parse(id))
  }

  @Post('live-control/:id/chat/actions') public moderateLiveChat(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.liveControl.moderateChat(
      EntityIdSchema.parse(id),
      ChatModerationRequestSchema.parse(body),
    )
  }

  @Get('debug/simulation') public simulationStatus() {
    this.requireDebug()
    return this.simulation.status()
  }
  @Post('debug/simulation') public startSimulation(@Body() body: unknown) {
    this.requireDebug()
    return this.simulation.start(StartChatSimulationRequestSchema.parse(body))
  }
  @Delete('debug/simulation') public stopSimulation() {
    this.requireDebug()
    return this.simulation.stop()
  }

  @Post('runtime/resume') public resumeRuntime() {
    return this.manager.resumeAfterWake()
  }

  @Get('focused-chat/giveaways/:id') public giveawayChat(@Param('id') id: string) {
    return this.focusedChat.forGiveaway(EntityIdSchema.parse(id))
  }

  @Get('focused-chat/tournaments/:id') public tournamentChat(@Param('id') id: string) {
    return this.focusedChat.forTournament(EntityIdSchema.parse(id))
  }

  @Get('focused-chat/tournaments/:id/matches/:matchId/:side') public tournamentMatchChat(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Param('side') side: string,
  ) {
    if (side !== 'left' && side !== 'right')
      throw new ApiApplicationError(
        'VALIDATION_FAILED',
        'Tournament match side must be left or right',
        400,
      )
    return this.focusedChat.forTournamentMatch(
      EntityIdSchema.parse(id),
      EntityIdSchema.parse(matchId),
      side,
    )
  }

  private requireDebug(): void {
    if (process.env.NODE_ENV === 'production' && process.env.STREAMKIT_DEBUG !== 'true')
      throw new ApiApplicationError('HTTP_404', 'Resource not found', 404)
  }

  @Put('connections/:id/start') public start(@Param('id') id: string) {
    return this.manager.start(EntityIdSchema.parse(id))
  }

  @Post('connections/:id/messages') public sendMessage(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.manager.sendMessage(
      EntityIdSchema.parse(id),
      SendChatMessageRequestSchema.parse(body).message,
    )
  }

  @Put('connections/:id/stop') public stop(@Param('id') id: string) {
    return this.manager.stop(EntityIdSchema.parse(id))
  }

  @Delete('connections/:id') public async deleteConnection(@Param('id') id: string) {
    const connectionId = EntityIdSchema.parse(id)
    await this.manager.stop(connectionId, false)
    return this.service.deleteConnection(connectionId)
  }

  @Get('connections') public listConnections() {
    return this.service.listConnections()
  }

  @Put('live-control/selection/:id') public selectGlobalLive(@Param('id') id: string) {
    return this.service.selectGlobalLive(EntityIdSchema.parse(id))
  }

  @Put('connections') public saveConnection(@Body() body: unknown) {
    return this.service.saveConnection(SaveIntegrationConnectionRequestSchema.parse(body))
  }

  @Patch('connections/:id/state') public updateState(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = UpdateIntegrationConnectionStateRequestSchema.parse(body)
    return this.service.updateState(
      EntityIdSchema.parse(id),
      input.status,
      input.lastErrorCode ?? null,
    )
  }
}
