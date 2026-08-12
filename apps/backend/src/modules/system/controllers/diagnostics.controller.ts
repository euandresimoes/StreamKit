import { Controller, Get, Inject, Req } from '@nestjs/common'
import type { DiagnosticInfo } from '@streamkit/contracts'
import type { FastifyRequest } from 'fastify'
import { SQLITE_DATABASE } from '../../../infrastructure/database/database.tokens'
import type { SqliteDatabase } from '../../../infrastructure/database/sqlite-database'
import {
  STREAMKIT_LOGGER,
  type StreamKitLogger,
} from '../../../infrastructure/logging/streamkit-logger'

@Controller('api/v1/system/diagnostics')
export class DiagnosticsController {
  public constructor(
    @Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase,
    @Inject(STREAMKIT_LOGGER) private readonly logger: StreamKitLogger,
  ) {}
  @Get() public async get(@Req() request: FastifyRequest): Promise<DiagnosticInfo> {
    return {
      backendVersion: '0.0.0',
      databaseSchemaVersion: this.database.schemaVersion(),
      debugEnabled: process.env.STREAMKIT_DEBUG === 'true',
      logLines: await this.logger.recent(),
      requestId: request.id,
    }
  }
}
