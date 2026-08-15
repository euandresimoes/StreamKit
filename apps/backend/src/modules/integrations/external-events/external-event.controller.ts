import { Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common'
import { ExternalEventProviderSchema } from '@streamkit/contracts'

import { LocalPublic } from '../../../application/local-public.decorator'
import { ExternalTransportService } from './external-transport.service'

@Controller('api/v1/external-events')
export class ExternalEventController {
  public constructor(
    @Inject(ExternalTransportService) private readonly transport: ExternalTransportService,
  ) {}

  @Get('transport') public status() {
    return this.transport.snapshot()
  }

  @Post(':provider/:endpointId')
  @LocalPublic()
  public receive(
    @Param('provider') provider: unknown,
    @Param('endpointId') endpointId: string,
    @Headers('x-streamkit-ingress-key') secret: string | undefined,
    @Body() body: unknown,
  ) {
    return this.transport.receive(
      ExternalEventProviderSchema.parse(provider),
      endpointId,
      secret ?? '',
      body,
    )
  }
}
