import { access, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import Database from 'better-sqlite3'
import { createIsolatedTestEnvironment } from '@streamkit/test-utils'

import {
  AUTOMATIC_BACKUP_RETENTION,
  createDatabaseBackup,
  restoreDatabaseBackup,
} from '../src/infrastructure/database/database-backup'
import { SqliteDatabase } from '../src/infrastructure/database/sqlite-database'
import { todoWorkspaces } from '../src/infrastructure/database/schema'

const expectedTables = [
  'app_settings',
  'chat_message_buffer',
  'giveaway_capture_rules',
  'giveaway_participants',
  'giveaway_round_entries',
  'giveaway_rounds',
  'giveaways',
  'integration_connections',
  'integration_events',
  'integration_offsets',
  'schema_migrations',
  'todo_cards',
  'todo_columns',
  'todo_templates',
  'todo_workspaces',
  'tournament_audit_log',
  'tournament_capture_rules',
  'tournament_entries',
  'tournament_matches',
  'tournament_participants',
  'tournament_team_members',
  'tournament_teams',
  'tournaments',
]

describe('SQLite infrastructure', () => {
  it('migrates a clean database and applies the required safety pragmas', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)

    expect(database.tableNames()).toEqual(expectedTables)
    expect(database.indexNames()).toEqual(
      expect.arrayContaining([
        'chat_message_buffer_identity_index',
        'chat_message_buffer_retention_index',
        'giveaway_capture_rules_active_index',
        'integration_events_identity_index',
        'tournament_capture_rules_active_index',
      ]),
    )
    expect(database.pragma('foreign_keys')).toBe(1)
    expect(database.pragma('journal_mode')).toBe('wal')
    expect(database.pragma('busy_timeout')).toBe(5000)

    database.close()
    await environment.cleanup()
  })

  it('upgrades the Batch 2 database without losing persistent workspaces', async () => {
    const environment = await createIsolatedTestEnvironment()
    await mkdir(join(environment.userDataPath, 'data'), { recursive: true })
    const legacy = new Database(environment.databasePath)
    legacy.exec(`CREATE TABLE todo_workspaces (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, position INTEGER NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`)
    legacy
      .prepare('INSERT INTO todo_workspaces VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        'bd215412-8339-4d05-9b19-bc678f39a912',
        'Persistente',
        null,
        0,
        '2026-08-12T20:00:00.000Z',
        '2026-08-12T20:00:00.000Z',
      )
    legacy.close()

    const database = await SqliteDatabase.open(environment.databasePath)
    const rows = database.orm.query.todoWorkspaces.findMany()
    expect(await rows).toHaveLength(1)
    database.close()
    await environment.cleanup()
  })

  it('rolls back a failed migration without recording or partially applying it', async () => {
    const environment = await createIsolatedTestEnvironment()
    await expect(
      SqliteDatabase.open(environment.databasePath, {
        migrations: [
          {
            destructive: false,
            name: 'broken',
            sql: 'THIS IS INVALID SQL;',
            version: 99,
          },
        ],
      }),
    ).rejects.toThrow()
    const raw = new Database(environment.databasePath, { readonly: true })
    expect(
      raw.prepare("SELECT name FROM sqlite_master WHERE name = 'partial_write'").get(),
    ).toBeUndefined()
    expect(raw.prepare('SELECT * FROM schema_migrations').all()).toEqual([])
    raw.close()
    await environment.cleanup()
  })

  it('provides atomic multi-write transactions', async () => {
    const environment = await createIsolatedTestEnvironment()
    const database = await SqliteDatabase.open(environment.databasePath)
    expect(() =>
      database.transaction(() => {
        database.orm
          .insert(todoWorkspaces)
          .values({
            createdAt: new Date().toISOString(),
            description: null,
            id: '852c169e-9335-4a2d-ab61-64bcfdfe3935',
            name: 'Rolled back',
            position: 0,
            updatedAt: new Date().toISOString(),
          })
          .run()
        throw new Error('stop')
      }),
    ).toThrow('stop')
    expect(await database.orm.select().from(todoWorkspaces)).toEqual([])
    database.close()
    await environment.cleanup()
  })

  it('allows two WAL connections to observe committed persistent writes', async () => {
    const environment = await createIsolatedTestEnvironment()
    const first = await SqliteDatabase.open(environment.databasePath)
    const second = await SqliteDatabase.open(environment.databasePath)
    first.orm
      .insert(todoWorkspaces)
      .values({
        createdAt: '2026-08-12T20:00:00.000Z',
        description: null,
        id: '4637fe22-fda8-40be-98f4-73d83459eae3',
        name: 'Visible',
        position: 0,
        updatedAt: '2026-08-12T20:00:00.000Z',
      })
      .run()
    expect(await second.orm.select().from(todoWorkspaces)).toHaveLength(1)
    second.close()
    first.close()
    await environment.cleanup()
  })

  it('creates a safety copy before a destructive migration', async () => {
    const environment = await createIsolatedTestEnvironment()
    const backups = join(environment.userDataPath, 'backups')
    const initial = await SqliteDatabase.open(environment.databasePath)
    initial.close()

    const upgraded = await SqliteDatabase.open(environment.databasePath, {
      backupDirectory: backups,
      migrations: [
        {
          destructive: true,
          name: 'destructive_test',
          sql: 'CREATE TABLE destructive_test (id TEXT);',
          version: 99,
        },
      ],
    })
    upgraded.close()
    expect(await readdir(backups)).toHaveLength(1)
    await environment.cleanup()
  })

  it('backs up with retention and restores only to a new validated destination', async () => {
    const environment = await createIsolatedTestEnvironment()
    const backups = join(environment.userDataPath, 'backups')
    const database = await SqliteDatabase.open(environment.databasePath)
    database.close()
    for (let index = 0; index < AUTOMATIC_BACKUP_RETENTION + 2; index += 1) {
      await createDatabaseBackup(environment.databasePath, backups, `test-${index}`)
    }
    expect(await readdir(backups)).toHaveLength(AUTOMATIC_BACKUP_RETENTION)

    const [backupName] = await readdir(backups)
    const restoredPath = join(environment.userDataPath, 'restored', 'streamkit.db')
    await restoreDatabaseBackup(join(backups, backupName!), restoredPath)
    await expect(access(restoredPath)).resolves.toBeUndefined()
    await expect(restoreDatabaseBackup(join(backups, backupName!), restoredPath)).rejects.toThrow()

    const restored = await SqliteDatabase.open(restoredPath)
    expect(restored.tableNames()).toEqual(expectedTables)
    restored.close()
    await environment.cleanup()
  })
})
