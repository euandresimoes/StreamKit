export class IntegrationRetryPolicy {
  public constructor(private readonly random: () => number = Math.random) {}

  public delayMs(attempt: number): number {
    const exponential = Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt - 1))
    return Math.round(exponential * (0.8 + this.random() * 0.4))
  }
}
