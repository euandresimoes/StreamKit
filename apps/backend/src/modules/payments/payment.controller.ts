import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common'
import { ResolvePaymentContributionRequestSchema } from '@streamlet/contracts'
import { z } from 'zod'

import { LivePixPaymentProvider } from './providers/livepix/livepix-payment.provider'
import { LivePixPaymentRepository } from './providers/livepix/livepix-payment.repository'
import { PaymentCampaignService } from './payment-campaign.service'

@Controller('api/v1/payments/livepix')
export class PaymentController {
  public constructor(
    @Inject(LivePixPaymentProvider) private readonly livepix: LivePixPaymentProvider,
    @Inject(LivePixPaymentRepository) private readonly payments: LivePixPaymentRepository,
    @Inject(PaymentCampaignService) private readonly campaigns: PaymentCampaignService,
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

  @Get('contributions/pending') public pending() {
    return this.payments.listPending()
  }

  @Post('contributions/:id/resolve') public async resolve(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.campaigns.resolve(
      z.uuid().parse(id),
      ResolvePaymentContributionRequestSchema.parse(body),
    )
    return { resolved: true }
  }
}
