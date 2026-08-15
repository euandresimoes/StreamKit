import { Inject, Injectable } from '@nestjs/common'

import type { ContributionProvider } from './payment-provider.contract'
import { LivePixPaymentProvider } from './providers/livepix/livepix-payment.provider'

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: ReadonlyMap<string, ContributionProvider>

  public constructor(@Inject(LivePixPaymentProvider) livepix: LivePixPaymentProvider) {
    this.providers = new Map([['livepix', livepix]])
  }

  public get(provider: string): ContributionProvider | undefined {
    return this.providers.get(provider)
  }
}
