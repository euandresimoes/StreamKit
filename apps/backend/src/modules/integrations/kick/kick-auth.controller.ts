import { Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common'

import { IntegrationConnectionManager } from '../integration-connection.manager'
import { IntegrationService } from '../integration.service'
import { KickAuthService } from './kick-auth.service'

@Controller('api/v1/integrations/kick/auth')
export class KickAuthController {
  public constructor(
    @Inject(KickAuthService) private readonly auth: KickAuthService,
    @Inject(IntegrationService) private readonly integrations: IntegrationService,
    @Inject(IntegrationConnectionManager) private readonly connections: IntegrationConnectionManager,
  ) {}
  @Post() public begin() {
    return this.auth.begin()
  }
  @Post('setup') public setup() {
    return this.auth.prepare()
  }
  @Delete() public disconnect() {
    return this.auth.disconnect()
  }
  @Post(':flowId/poll') public async poll(@Param('flowId') flowId: string) {
    const result = await this.auth.poll(flowId)
    if (result.status === 'authorized') {
      const kickConnections = (await this.integrations.listConnections()).filter(
        (connection) => connection.provider === 'kick',
      )
      await Promise.all(
        kickConnections.map((connection) => this.connections.ensureStarted(connection.id)),
      )
    }
    return result
  }
  @Get('status') public status() {
    return this.auth.status()
  }
}
