import type { SystemStatusService } from '../services/system-status.service'

export class SystemController {
  public constructor(private readonly systemStatusService: SystemStatusService) {}

  public getStatus(): { status: 'ok' } {
    return this.systemStatusService.execute()
  }
}
