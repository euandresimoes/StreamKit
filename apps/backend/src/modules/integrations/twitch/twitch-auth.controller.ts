import { Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common'

import { TwitchAuthService } from './twitch-auth.service'

@Controller('api/v1/integrations/twitch/auth')
export class TwitchAuthController {
  public constructor(@Inject(TwitchAuthService) private readonly auth: TwitchAuthService) {}

  @Post('device') public begin() {
    return this.auth.begin()
  }

  @Delete() public disconnect() {
    return this.auth.disconnect()
  }

  @Post('device/:flowId/poll') public poll(@Param('flowId') flowId: string) {
    return this.auth.poll(flowId)
  }

  @Get('status') public status() {
    return this.auth.status()
  }
}
