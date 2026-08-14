import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put } from '@nestjs/common'
import {
  ChatModerationRequestSchema,
  LiveMetadataUpdateSchema,
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

  @Get('live-control') public liveControlList() {
    return this.liveControl.list()
  }

  @Get('live-control/:id/chat') public liveControlChat(@Param('id') id: string) {
    return this.liveControl.channelChat(id)
  }

  @Post('live-control/:id/chat/actions') public moderateLiveChat(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.liveControl.moderateChat(id, ChatModerationRequestSchema.parse(body))
  }

  @Put('live-control/:id/metadata') public updateLiveMetadata(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.liveControl.updateMetadata(id, LiveMetadataUpdateSchema.parse(body))
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
    return this.focusedChat.forGiveaway(id)
  }

  @Get('focused-chat/tournaments/:id') public tournamentChat(@Param('id') id: string) {
    return this.focusedChat.forTournament(id)
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
    return this.focusedChat.forTournamentMatch(id, matchId, side)
  }

  private requireDebug(): void {
    if (process.env.NODE_ENV === 'production' && process.env.STREAMKIT_DEBUG !== 'true')
      throw new ApiApplicationError('HTTP_404', 'Resource not found', 404)
  }

  @Put('connections/:id/start') public start(@Param('id') id: string) {
    return this.manager.start(id)
  }

  @Post('connections/:id/messages') public sendMessage(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.manager.sendMessage(id, SendChatMessageRequestSchema.parse(body).message)
  }

  @Put('connections/:id/stop') public stop(@Param('id') id: string) {
    return this.manager.stop(id)
  }

  @Delete('connections/:id') public async deleteConnection(@Param('id') id: string) {
    await this.manager.stop(id, false)
    return this.service.deleteConnection(id)
  }

  @Get('connections') public listConnections() {
    return this.service.listConnections()
  }

  @Put('connections') public saveConnection(@Body() body: unknown) {
    return this.service.saveConnection(SaveIntegrationConnectionRequestSchema.parse(body))
  }

  @Patch('connections/:id/state') public updateState(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = UpdateIntegrationConnectionStateRequestSchema.parse(body)
    return this.service.updateState(id, input.status, input.lastErrorCode ?? null)
  }
}
