import { Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common'

import { KickAuthService } from './kick-auth.service'

@Controller('api/v1/integrations/kick/auth')
export class KickAuthController {
  public constructor(@Inject(KickAuthService) private readonly auth: KickAuthService) {}
  @Post() public begin() {
    return this.auth.begin()
  }
  @Post('setup') public setup() {
    return this.auth.prepare()
  }
  @Delete() public disconnect() {
    return this.auth.disconnect()
  }
  @Post(':flowId/poll') public poll(@Param('flowId') flowId: string) {
    return this.auth.poll(flowId)
  }
  @Get('status') public status() {
    return this.auth.status()
  }
}
