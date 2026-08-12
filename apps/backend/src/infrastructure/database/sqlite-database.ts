import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import Database from 'better-sqlite3'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema'

export class SqliteDatabase {
  private readonly client: Database.Database
  public readonly orm: BetterSQLite3Database<typeof schema>

  private constructor(databasePath: string) {
    this.client = new Database(databasePath)
    this.client.pragma('foreign_keys = ON')
    this.client.pragma('journal_mode = WAL')
    this.client.pragma('busy_timeout = 5000')
    this.orm = drizzle(this.client, { schema })
    this.createBootstrapSchema()
  }

  public static async open(databasePath: string): Promise<SqliteDatabase> {
    await mkdir(dirname(databasePath), { recursive: true })
    return new SqliteDatabase(databasePath)
  }

  public close(): void {
    this.client.close()
  }

  private createBootstrapSchema(): void {
    this.client.exec(`
      CREATE TABLE IF NOT EXISTS todo_workspaces (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS todo_workspaces_position_unique
        ON todo_workspaces(position);
    `)
  }
}
