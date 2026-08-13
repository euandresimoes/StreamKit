import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put } from '@nestjs/common'
import {
  SaveIntegrationConnectionRequestSchema,
  SendChatMessageRequestSchema,
  UpdateIntegrationConnectionStateRequestSchema,
} from '@streamkit/contracts'

import { IntegrationService } from './integration.service'
import { IntegrationConnectionManager } from './integration-connection.manager'
import { FocusedChatService } from './focused-chat.service'

@Controller('api/v1/integrations')
export class IntegrationController {
  public constructor(
    @Inject(IntegrationService) private readonly service: IntegrationService,
    @Inject(IntegrationConnectionManager) private readonly manager: IntegrationConnectionManager,
    @Inject(FocusedChatService) private readonly focusedChat: FocusedChatService,
  ) {}

  @Get('focused-chat/giveaways/:id') public giveawayChat(@Param('id') id: string) {
    return this.focusedChat.forGiveaway(id)
  }

  @Get('focused-chat/tournaments/:id') public tournamentChat(@Param('id') id: string) {
    return this.focusedChat.forTournament(id)
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
