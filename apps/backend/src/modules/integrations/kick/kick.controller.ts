import { Controller, Get, Inject } from '@nestjs/common'

import { KickSupportService } from './kick-support.service'

@Controller('api/v1/integrations/kick')
export class KickController {
  public constructor(@Inject(KickSupportService) private readonly support: KickSupportService) {}

  @Get('support') public status() {
    return this.support.status()
  }
}
