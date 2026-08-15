import type { ContributionReceived, PaymentConnectionStatus } from '@streamkit/contracts'

export interface ContributionProvider {
  connect(): Promise<PaymentConnectionStatus>
  disconnect(): Promise<PaymentConnectionStatus>
  status(): Promise<PaymentConnectionStatus>
  handleExternalEvent(payload: unknown): Promise<void>
}

export type ContributionHandler = (event: ContributionReceived) => Promise<void> | void
