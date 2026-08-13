export type DatabaseMigration = {
  destructive: boolean
  name: string
  sql: string
  version: number
}

export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = [
  {
    destructive: false,
    name: 'initial_streamkit_schema',
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS todo_workspaces (
        id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT,
        position INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS todo_workspaces_position_unique ON todo_workspaces(position);
      CREATE TABLE IF NOT EXISTS todo_columns (
        id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES todo_workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL, color TEXT, position INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(workspace_id, position)
      );
      CREATE TABLE IF NOT EXISTS todo_cards (
        id TEXT PRIMARY KEY NOT NULL, column_id TEXT NOT NULL REFERENCES todo_columns(id) ON DELETE CASCADE,
        title TEXT NOT NULL, description TEXT, notes TEXT, position INTEGER NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(column_id, position)
      );
      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, mode TEXT NOT NULL,
        status TEXT NOT NULL, bracket_size INTEGER NOT NULL, team_capacity INTEGER,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL, source TEXT NOT NULL, external_ref TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tournament_teams (
        id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        name TEXT NOT NULL, color TEXT, seed INTEGER, capacity INTEGER NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tournament_team_members (
        id TEXT PRIMARY KEY NOT NULL, team_id TEXT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
        slot_position INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE(team_id, slot_position), UNIQUE(participant_id)
      );
      CREATE TABLE IF NOT EXISTS tournament_entries (
        id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        participant_id TEXT REFERENCES tournament_participants(id), team_id TEXT REFERENCES tournament_teams(id),
        seed INTEGER NOT NULL, created_at TEXT NOT NULL,
        CHECK ((participant_id IS NOT NULL) != (team_id IS NOT NULL)), UNIQUE(tournament_id, seed)
      );
      CREATE TABLE IF NOT EXISTS tournament_matches (
        id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL, match_number INTEGER NOT NULL,
        left_entry_id TEXT REFERENCES tournament_entries(id), right_entry_id TEXT REFERENCES tournament_entries(id),
        winner_entry_id TEXT REFERENCES tournament_entries(id), next_match_id TEXT REFERENCES tournament_matches(id),
        next_slot TEXT, status TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(tournament_id, round_number, match_number)
      );
      CREATE TABLE IF NOT EXISTS tournament_audit_log (
        id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        action TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS giveaways (
        id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, mode TEXT NOT NULL, source TEXT NOT NULL,
        status TEXT NOT NULL, duplicate_policy TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS giveaway_participants (
        id TEXT PRIMARY KEY NOT NULL, giveaway_id TEXT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL, normalized_name TEXT NOT NULL, ticket_count INTEGER NOT NULL,
        external_ref TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS giveaway_rounds (
        id TEXT PRIMARY KEY NOT NULL, giveaway_id TEXT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
        status TEXT NOT NULL, winner_participant_id TEXT REFERENCES giveaway_participants(id), random_proof TEXT,
        started_at TEXT NOT NULL, completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS giveaway_round_entries (
        id TEXT PRIMARY KEY NOT NULL, round_id TEXT NOT NULL REFERENCES giveaway_rounds(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES giveaway_participants(id), ticket_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL, value_json TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS integration_events (
        id TEXT PRIMARY KEY NOT NULL, provider TEXT NOT NULL, external_event_id TEXT NOT NULL,
        event_type TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT NOT NULL,
        received_at TEXT NOT NULL, processed_at TEXT, UNIQUE(provider, external_event_id)
      );
    `,
  },
  {
    destructive: false,
    name: 'giveaway_round_audit_fields',
    version: 2,
    sql: `
      ALTER TABLE giveaway_rounds ADD COLUMN snapshot_hash TEXT;
      ALTER TABLE giveaway_rounds ADD COLUMN mode TEXT;
      ALTER TABLE giveaway_rounds ADD COLUMN ticket_count INTEGER;
      ALTER TABLE giveaway_round_entries ADD COLUMN position INTEGER;
    `,
  },
  {
    destructive: false,
    name: 'giveaway_participant_eligibility',
    version: 3,
    sql: `ALTER TABLE giveaway_participants ADD COLUMN active INTEGER NOT NULL DEFAULT 1;`,
  },
  {
    destructive: false,
    name: 'team_member_identity',
    version: 4,
    sql: `
      ALTER TABLE tournament_participants ADD COLUMN identity_key TEXT;
      CREATE UNIQUE INDEX tournament_participants_identity_unique
        ON tournament_participants(tournament_id, identity_key)
        WHERE identity_key IS NOT NULL;
    `,
  },
  {
    destructive: false,
    name: 'todo_workspace_icon',
    version: 5,
    sql: `ALTER TABLE todo_workspaces ADD COLUMN icon TEXT NOT NULL DEFAULT '📋';`,
  },
  {
    destructive: false,
    name: 'tournament_team_default_color',
    version: 6,
    sql: `UPDATE tournament_teams SET color = '#3B82F6' WHERE color IS NULL;`,
  },
  {
    destructive: false,
    name: 'chat_integration_core',
    version: 7,
    sql: `
      CREATE TABLE integration_connections (
        id TEXT PRIMARY KEY NOT NULL,
        provider TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        channel_display_name TEXT NOT NULL,
        capabilities_json TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_attempt INTEGER NOT NULL DEFAULT 0,
        next_retry_at TEXT,
        last_error_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(provider, channel_id)
      );
      CREATE TABLE integration_offsets (
        connection_id TEXT PRIMARY KEY NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        cursor TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      ALTER TABLE integration_events ADD COLUMN channel_id TEXT;
      ALTER TABLE integration_events ADD COLUMN provider_user_id TEXT;
      ALTER TABLE integration_events ADD COLUMN occurred_at TEXT;
      CREATE INDEX integration_events_identity_index
        ON integration_events(provider, channel_id, provider_user_id, occurred_at);
    `,
  },
]
