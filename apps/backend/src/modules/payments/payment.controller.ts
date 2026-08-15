import { Controller, Delete, Get, Inject, Post } from '@nestjs/common'

import { LivePixPaymentProvider } from './providers/livepix/livepix-payment.provider'

@Controller('api/v1/payments/livepix')
export class PaymentController {
  public constructor(
    @Inject(LivePixPaymentProvider) private readonly livepix: LivePixPaymentProvider,
  ) {}

  @Get('status') public status() {
    return this.livepix.status()
  }

  @Post('connect') public connect() {
    return this.livepix.connect()
  }

  @Delete('connect') public disconnect() {
    return this.livepix.disconnect()
  }
}
