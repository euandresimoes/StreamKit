import { Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common'
import {
  ExternalEventIngressSchema,
  ExternalEventProviderSchema,
  LivePixWebhookEnvelopeSchema,
} from '@streamkit/contracts'

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
    const parsedProvider = ExternalEventProviderSchema.parse(provider)
    const ingress =
      parsedProvider === 'livepix'
        ? (() => {
            const webhook = LivePixWebhookEnvelopeSchema.parse(body)
            return ExternalEventIngressSchema.parse({
              eventId: webhook.resource.id,
              eventType: 'payment',
              payload: webhook,
              timestamp: new Date().toISOString(),
            })
          })()
        : body
    return this.transport.receive(parsedProvider, endpointId, secret ?? '', ingress)
  }
}
