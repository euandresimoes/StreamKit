import { Controller, Get } from '@nestjs/common'
import type { HealthResponse } from '@streamkit/contracts'

@Controller('api/v1/health')
export class HealthController {
  @Get()
  public getHealth(): HealthResponse {
    return {
      service: 'streamkit-backend',
      status: 'ok',
      version: '0.0.0',
    }
  }
}
