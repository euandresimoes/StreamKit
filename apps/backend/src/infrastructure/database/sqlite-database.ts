import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import Database from 'better-sqlite3'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema'
import { createDatabaseBackup } from './database-backup'
import { DATABASE_MIGRATIONS, type DatabaseMigration } from './migrations'

export type OpenDatabaseOptions = {
  backupDirectory?: string
  migrations?: readonly DatabaseMigration[]
}

export class SqliteDatabase {
  private readonly client: Database.Database
  public readonly orm: BetterSQLite3Database<typeof schema>

  private constructor(databasePath: string) {
    this.client = new Database(databasePath)
    this.client.pragma('foreign_keys = ON')
    this.client.pragma('journal_mode = WAL')
    this.client.pragma('busy_timeout = 5000')
    this.orm = drizzle(this.client, { schema })
  }

  public static async open(
    databasePath: string,
    options: OpenDatabaseOptions = {},
  ): Promise<SqliteDatabase> {
    await mkdir(dirname(databasePath), { recursive: true })
    const database = new SqliteDatabase(databasePath)
    try {
      await database.migrate(databasePath, options)
      return database
    } catch (error) {
      database.close()
      throw error
    }
  }

  public close(): void {
    this.client.close()
  }

  public pragma(name: 'foreign_keys' | 'journal_mode' | 'busy_timeout'): unknown {
    return this.client.pragma(name, { simple: true })
  }

  public tableNames(): string[] {
    return this.client
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name)
  }

  public indexNames(): string[] {
    return this.client
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map((row) => (row as { name: string }).name)
  }

  public schemaVersion(): number {
    const row = this.client
      .prepare('SELECT MAX(version) AS version FROM schema_migrations')
      .get() as { version: number | null }
    return row.version ?? 0
  }

  public transaction<T>(operation: () => T): T {
    return this.client.transaction(operation)()
  }

  private async migrate(databasePath: string, options: OpenDatabaseOptions): Promise<void> {
    this.client.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `)
    const applied = new Set(
      this.client
        .prepare('SELECT version FROM schema_migrations')
        .all()
        .map((row) => (row as { version: number }).version),
    )
    for (const migration of options.migrations ?? DATABASE_MIGRATIONS) {
      if (applied.has(migration.version)) continue
      if (migration.destructive && options.backupDirectory) {
        this.client.pragma('wal_checkpoint(TRUNCATE)')
        await createDatabaseBackup(
          databasePath,
          options.backupDirectory,
          `before-v${migration.version}`,
        )
      }
      const apply = this.client.transaction(() => {
        this.client.exec(migration.sql)
        this.client
          .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
          .run(migration.version, migration.name, new Date().toISOString())
      })
      apply()
    }
  }
}
