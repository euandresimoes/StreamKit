import { Body, Controller, Delete, Get, Inject, Param, Patch, Put } from '@nestjs/common'
import {
  SaveIntegrationConnectionRequestSchema,
  UpdateIntegrationConnectionStateRequestSchema,
} from '@streamkit/contracts'

import { IntegrationService } from './integration.service'
import { IntegrationConnectionManager } from './integration-connection.manager'

@Controller('api/v1/integrations')
export class IntegrationController {
  public constructor(
    @Inject(IntegrationService) private readonly service: IntegrationService,
    @Inject(IntegrationConnectionManager) private readonly manager: IntegrationConnectionManager,
  ) {}

  @Put('connections/:id/start') public start(@Param('id') id: string) {
    return this.manager.start(id)
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
