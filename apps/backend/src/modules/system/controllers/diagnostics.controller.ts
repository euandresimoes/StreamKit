import { Controller, Get, Inject, Req } from '@nestjs/common'
import type { DiagnosticInfo } from '@streamlet/contracts'
import type { FastifyRequest } from 'fastify'
import { SQLITE_DATABASE } from '../../../infrastructure/database/database.tokens'
import type { SqliteDatabase } from '../../../infrastructure/database/sqlite-database'
import {
  STREAMLET_LOGGER,
  type StreamletLogger,
} from '../../../infrastructure/logging/streamlet-logger'

@Controller('api/v1/system/diagnostics')
export class DiagnosticsController {
  public constructor(
    @Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase,
    @Inject(STREAMLET_LOGGER) private readonly logger: StreamletLogger,
  ) {}
  @Get() public async get(@Req() request: FastifyRequest): Promise<DiagnosticInfo> {
    return {
      backendVersion: '0.0.0',
      databaseSchemaVersion: this.database.schemaVersion(),
      debugEnabled: process.env.STREAMLET_DEBUG === 'true',
      logLines: await this.logger.recent(),
      requestId: request.id,
    }
  }
}
