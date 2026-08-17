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
  {
    destructive: false,
    name: 'giveaway_chat_capture_rules',
    version: 8,
    sql: `
      CREATE TABLE giveaway_capture_rules (
        id TEXT PRIMARY KEY NOT NULL,
        giveaway_id TEXT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
        connection_id TEXT NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        match_type TEXT NOT NULL,
        match_value TEXT,
        entry_policy TEXT NOT NULL,
        exclude_bots INTEGER NOT NULL,
        exclude_broadcaster INTEGER NOT NULL,
        exclude_moderators INTEGER NOT NULL,
        members_only INTEGER NOT NULL,
        starts_at TEXT,
        ends_at TEXT,
        status TEXT NOT NULL,
        captured_count INTEGER NOT NULL DEFAULT 0,
        duplicate_count INTEGER NOT NULL DEFAULT 0,
        rejected_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(giveaway_id, connection_id)
      );
      CREATE INDEX giveaway_capture_rules_active_index
        ON giveaway_capture_rules(connection_id, status, starts_at, ends_at);
      ALTER TABLE giveaway_participants ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
      ALTER TABLE giveaway_participants ADD COLUMN provider TEXT;
      ALTER TABLE giveaway_participants ADD COLUMN provider_user_id TEXT;
      CREATE UNIQUE INDEX giveaway_participants_external_identity_unique
        ON giveaway_participants(giveaway_id, provider, provider_user_id)
        WHERE provider IS NOT NULL AND provider_user_id IS NOT NULL;
    `,
  },
  {
    destructive: false,
    name: 'tournament_chat_capture_rules',
    version: 9,
    sql: `
      CREATE TABLE tournament_capture_rules (
        id TEXT PRIMARY KEY NOT NULL,
        tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        connection_id TEXT NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        match_type TEXT NOT NULL,
        match_value TEXT,
        entry_policy TEXT NOT NULL,
        exclude_bots INTEGER NOT NULL,
        exclude_broadcaster INTEGER NOT NULL,
        exclude_moderators INTEGER NOT NULL,
        members_only INTEGER NOT NULL,
        starts_at TEXT,
        ends_at TEXT,
        status TEXT NOT NULL,
        captured_count INTEGER NOT NULL DEFAULT 0,
        duplicate_count INTEGER NOT NULL DEFAULT 0,
        rejected_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(tournament_id, connection_id)
      );
      CREATE INDEX tournament_capture_rules_active_index
        ON tournament_capture_rules(connection_id, status, starts_at, ends_at);
      ALTER TABLE tournament_participants ADD COLUMN provider TEXT;
      ALTER TABLE tournament_participants ADD COLUMN provider_user_id TEXT;
      CREATE UNIQUE INDEX tournament_participants_external_identity_unique
        ON tournament_participants(tournament_id, provider, provider_user_id)
        WHERE provider IS NOT NULL AND provider_user_id IS NOT NULL;
    `,
  },
  {
    destructive: false,
    name: 'focused_chat_buffer',
    version: 10,
    sql: `
      ALTER TABLE giveaway_participants ADD COLUMN channel_id TEXT;
      ALTER TABLE tournament_participants ADD COLUMN channel_id TEXT;
      CREATE TABLE chat_message_buffer (
        id TEXT PRIMARY KEY NOT NULL,
        provider TEXT NOT NULL,
        external_event_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        handle TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        badges_json TEXT NOT NULL,
        message TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        received_at TEXT NOT NULL,
        UNIQUE(provider, external_event_id)
      );
      CREATE INDEX chat_message_buffer_identity_index
        ON chat_message_buffer(provider, channel_id, provider_user_id, occurred_at);
      CREATE INDEX chat_message_buffer_retention_index
        ON chat_message_buffer(received_at);
    `,
  },
  {
    destructive: false,
    name: 'giveaway_participant_limit',
    version: 11,
    sql: `ALTER TABLE giveaways ADD COLUMN max_participants INTEGER NOT NULL DEFAULT 10000;`,
  },
  {
    destructive: false,
    name: 'operational_tournament_matches',
    version: 12,
    sql: `
      ALTER TABLE tournaments ADD COLUMN current_match_id TEXT;
      ALTER TABLE tournament_matches ADD COLUMN left_result TEXT NOT NULL DEFAULT 'pending';
      ALTER TABLE tournament_matches ADD COLUMN right_result TEXT NOT NULL DEFAULT 'pending';
      ALTER TABLE tournament_matches ADD COLUMN started_at TEXT;
      ALTER TABLE tournament_matches ADD COLUMN finished_at TEXT;
    `,
  },
  {
    destructive: false,
    name: 'tournament_participant_avatars',
    version: 13,
    sql: `ALTER TABLE tournament_participants ADD COLUMN avatar_url TEXT;`,
  },
  {
    destructive: false,
    name: 'todo_richer_cards_columns_and_templates',
    version: 14,
    sql: `
      ALTER TABLE todo_columns ADD COLUMN icon TEXT;
      ALTER TABLE todo_columns ADD COLUMN wip_limit INTEGER;
      ALTER TABLE todo_columns ADD COLUMN is_collapsed INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE todo_columns ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE todo_cards ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal';
      ALTER TABLE todo_cards ADD COLUMN accent_color TEXT;
      ALTER TABLE todo_cards ADD COLUMN labels_json TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE todo_cards ADD COLUMN checklist_json TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE todo_cards ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE todo_templates (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES todo_workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        structure_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX todo_templates_workspace_index ON todo_templates(workspace_id, updated_at);
    `,
  },
  {
    destructive: false,
    name: 'todo_workspace_pins_colors_and_global_templates',
    version: 15,
    sql: `
      ALTER TABLE todo_workspaces ADD COLUMN accent_color TEXT;
      ALTER TABLE todo_workspaces ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE todo_templates ADD COLUMN global_scope INTEGER NOT NULL DEFAULT 1;
    `,
  },
  {
    destructive: false,
    name: 'todo_templates_global_scope',
    version: 16,
    sql: `
      ALTER TABLE todo_templates RENAME TO todo_templates_legacy;
      CREATE TABLE todo_templates (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT REFERENCES todo_workspaces(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT,
        structure_json TEXT NOT NULL,
        global_scope INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO todo_templates (id, workspace_id, name, description, structure_json, global_scope, created_at, updated_at)
        SELECT id, workspace_id, name, description, structure_json, global_scope, created_at, updated_at FROM todo_templates_legacy;
      DROP TABLE todo_templates_legacy;
      CREATE INDEX todo_templates_workspace_index ON todo_templates(workspace_id, updated_at);
    `,
  },
  {
    destructive: false,
    name: 'optional_external_event_queue',
    version: 17,
    sql: `
      CREATE TABLE external_event_queue (
        id TEXT PRIMARY KEY NOT NULL,
        provider TEXT NOT NULL,
        event_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        received_at TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT,
        processed_at TEXT,
        last_error_code TEXT,
        UNIQUE(provider, event_id)
      );
      CREATE INDEX external_event_queue_ready_index
        ON external_event_queue(status, next_attempt_at, received_at);
    `,
  },
  {
    destructive: false,
    name: 'livepix_payment_provider',
    version: 18,
    sql: `
      CREATE TABLE payment_provider_connections (
        provider TEXT PRIMARY KEY NOT NULL,
        account_username TEXT,
        state TEXT NOT NULL,
        generation INTEGER NOT NULL DEFAULT 0,
        remote_webhook_id TEXT,
        webhook_url TEXT,
        last_error_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE payment_contributions (
        id TEXT PRIMARY KEY NOT NULL,
        provider TEXT NOT NULL,
        provider_resource_id TEXT NOT NULL,
        provider_reference TEXT,
        event_id TEXT NOT NULL,
        contribution_type TEXT NOT NULL,
        amount_in_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        participant_handle TEXT,
        participant_platform TEXT,
        message TEXT,
        occurred_at TEXT NOT NULL,
        received_at TEXT NOT NULL,
        status TEXT NOT NULL,
        pending_reason TEXT,
        campaign_id TEXT,
        processed_at TEXT,
        UNIQUE(provider, provider_resource_id)
      );
      ALTER TABLE giveaway_capture_rules ADD COLUMN livepix_auto_entry INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE giveaway_capture_rules ADD COLUMN livepix_currency TEXT;
      ALTER TABLE giveaway_capture_rules ADD COLUMN livepix_minimum_amount_in_cents INTEGER;
      ALTER TABLE tournament_capture_rules ADD COLUMN livepix_auto_entry INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE tournament_capture_rules ADD COLUMN livepix_currency TEXT;
      ALTER TABLE tournament_capture_rules ADD COLUMN livepix_minimum_amount_in_cents INTEGER;
      CREATE INDEX payment_contributions_status_index
        ON payment_contributions(status, occurred_at);
    `,
  },
  {
    destructive: false,
    name: 'livepix_payment_account_identity',
    version: 19,
    sql: `
      ALTER TABLE payment_provider_connections ADD COLUMN account_id TEXT;
    `,
  },
  {
    destructive: false,
    name: 'live_session_isolation',
    version: 20,
    sql: `
      ALTER TABLE integration_connections ADD COLUMN live_session_key TEXT;
      ALTER TABLE integration_events ADD COLUMN live_session_key TEXT;
      ALTER TABLE chat_message_buffer ADD COLUMN live_session_key TEXT;
      CREATE INDEX integration_events_session_index
        ON integration_events(provider, channel_id, live_session_key, received_at);
      CREATE INDEX chat_message_buffer_session_index
        ON chat_message_buffer(provider, channel_id, live_session_key, received_at);
    `,
  },
  {
    destructive: false,
    name: 'global_live_selection',
    version: 21,
    sql: `
      ALTER TABLE integration_connections ADD COLUMN is_global_selected INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    destructive: false,
    name: 'giveaway_participant_avatar',
    version: 22,
    sql: `ALTER TABLE giveaway_participants ADD COLUMN avatar_url TEXT;`,
  },
]
