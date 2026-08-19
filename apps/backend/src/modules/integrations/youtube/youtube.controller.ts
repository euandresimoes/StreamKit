import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common'
import { SelectYouTubeBroadcastRequestSchema } from '@streamlet/contracts'

import { YouTubeAuthService } from './youtube-auth.service'
import { YouTubeBroadcastService } from './youtube-broadcast.service'

@Controller('api/v1/integrations/youtube')
export class YouTubeController {
  public constructor(
    @Inject(YouTubeAuthService) private readonly auth: YouTubeAuthService,
    @Inject(YouTubeBroadcastService) private readonly broadcasts: YouTubeBroadcastService,
  ) {}

  @Post('auth') public begin() {
    return this.auth.begin()
  }

  @Delete('auth') public disconnect() {
    return this.auth.disconnect()
  }

  @Post('auth/:flowId/poll') public poll(@Param('flowId') flowId: string) {
    return this.auth.poll(flowId)
  }

  @Get('auth/status') public status() {
    return this.auth.status()
  }

  @Get('broadcasts') public listBroadcasts() {
    return this.broadcasts.list()
  }

  @Post('broadcasts/select') public selectBroadcast(@Body() body: unknown) {
    return this.broadcasts.select(SelectYouTubeBroadcastRequestSchema.parse(body))
  }
}
