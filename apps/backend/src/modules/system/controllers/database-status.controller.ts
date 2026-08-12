import { Controller, Get, Inject } from '@nestjs/common'
import type { DatabaseStatus } from '@streamkit/contracts'

import { SQLITE_DATABASE } from '../../../infrastructure/database/database.tokens'
import type { SqliteDatabase } from '../../../infrastructure/database/sqlite-database'

@Controller('api/v1/system/database')
export class DatabaseStatusController {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {}

  @Get()
  public getStatus(): DatabaseStatus {
    if (this.database.pragma('foreign_keys') !== 1) {
      throw new Error('SQLite foreign keys are unexpectedly disabled')
    }
    return {
      foreignKeys: true,
      journalMode: 'wal',
      schemaVersion: this.database.schemaVersion(),
    }
  }
}
