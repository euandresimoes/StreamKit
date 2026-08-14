import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const todoWorkspaces = sqliteTable('todo_workspaces', {
  accentColor: text('accent_color'),
  createdAt: text('created_at').notNull(),
  description: text('description'),
  id: text('id').primaryKey(),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  icon: text('icon').notNull().default('📋'),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const todoColumns = sqliteTable(
  'todo_columns',
  {
    color: text('color'),
    createdAt: text('created_at').notNull(),
    id: text('id').primaryKey(),
    icon: text('icon'),
    isCollapsed: integer('is_collapsed', { mode: 'boolean' }).notNull().default(false),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    updatedAt: text('updated_at').notNull(),
    wipLimit: integer('wip_limit'),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => todoWorkspaces.id, { onDelete: 'cascade' }),
  },
  (table) => [unique().on(table.workspaceId, table.position)],
)

export const todoCards = sqliteTable(
  'todo_cards',
  {
    accentColor: text('accent_color'),
    columnId: text('column_id')
      .notNull()
      .references(() => todoColumns.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    description: text('description'),
    id: text('id').primaryKey(),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    labelsJson: text('labels_json').notNull().default('[]'),
    checklistJson: text('checklist_json').notNull().default('[]'),
    notes: text('notes'),
    priority: text('priority').notNull().default('normal'),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [unique().on(table.columnId, table.position)],
)

export const todoTemplates = sqliteTable('todo_templates', {
  createdAt: text('created_at').notNull(),
  description: text('description'),
  id: text('id').primaryKey(),
  globalScope: integer('global_scope', { mode: 'boolean' }).notNull().default(true),
  name: text('name').notNull(),
  structureJson: text('structure_json').notNull(),
  updatedAt: text('updated_at').notNull(),
  workspaceId: text('workspace_id').references(() => todoWorkspaces.id, { onDelete: 'set null' }),
})

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  updatedAt: text('updated_at').notNull(),
  valueJson: text('value_json').notNull(),
})

export const integrationConnections = sqliteTable(
  'integration_connections',
  {
    capabilitiesJson: text('capabilities_json').notNull(),
    channelDisplayName: text('channel_display_name').notNull(),
    channelId: text('channel_id').notNull(),
    createdAt: text('created_at').notNull(),
    id: text('id').primaryKey(),
    lastErrorCode: text('last_error_code'),
    nextRetryAt: text('next_retry_at'),
    provider: text('provider').notNull(),
    retryAttempt: integer('retry_attempt').notNull().default(0),
    status: text('status').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [unique().on(table.provider, table.channelId)],
)

export const integrationOffsets = sqliteTable('integration_offsets', {
  connectionId: text('connection_id')
    .primaryKey()
    .references(() => integrationConnections.id, { onDelete: 'cascade' }),
  cursor: text('cursor').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const integrationEvents = sqliteTable(
  'integration_events',
  {
    channelId: text('channel_id'),
    eventType: text('event_type').notNull(),
    externalEventId: text('external_event_id').notNull(),
    id: text('id').primaryKey(),
    occurredAt: text('occurred_at'),
    payloadJson: text('payload_json').notNull(),
    processedAt: text('processed_at'),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id'),
    receivedAt: text('received_at').notNull(),
    status: text('status').notNull(),
  },
  (table) => [unique().on(table.provider, table.externalEventId)],
)

export const tournaments = sqliteTable('tournaments', {
  bracketSize: integer('bracket_size').notNull(),
  createdAt: text('created_at').notNull(),
  currentMatchId: text('current_match_id'),
  description: text('description'),
  id: text('id').primaryKey(),
  mode: text('mode').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  teamCapacity: integer('team_capacity'),
  updatedAt: text('updated_at').notNull(),
})
export const tournamentParticipants = sqliteTable('tournament_participants', {
  avatarUrl: text('avatar_url'),
  channelId: text('channel_id'),
  createdAt: text('created_at').notNull(),
  displayName: text('display_name').notNull(),
  externalRef: text('external_ref'),
  id: text('id').primaryKey(),
  identityKey: text('identity_key'),
  provider: text('provider'),
  providerUserId: text('provider_user_id'),
  source: text('source').notNull(),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
})
export const tournamentCaptureRules = sqliteTable(
  'tournament_capture_rules',
  {
    capturedCount: integer('captured_count').notNull().default(0),
    connectionId: text('connection_id')
      .notNull()
      .references(() => integrationConnections.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    duplicateCount: integer('duplicate_count').notNull().default(0),
    endsAt: text('ends_at'),
    entryPolicy: text('entry_policy').notNull(),
    excludeBots: integer('exclude_bots', { mode: 'boolean' }).notNull(),
    excludeBroadcaster: integer('exclude_broadcaster', { mode: 'boolean' }).notNull(),
    excludeModerators: integer('exclude_moderators', { mode: 'boolean' }).notNull(),
    id: text('id').primaryKey(),
    match: text('match_type').notNull(),
    matchValue: text('match_value'),
    membersOnly: integer('members_only', { mode: 'boolean' }).notNull(),
    rejectedCount: integer('rejected_count').notNull().default(0),
    startsAt: text('starts_at'),
    status: text('status').notNull(),
    tournamentId: text('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [unique().on(table.tournamentId, table.connectionId)],
)
export const tournamentEntries = sqliteTable('tournament_entries', {
  createdAt: text('created_at').notNull(),
  id: text('id').primaryKey(),
  participantId: text('participant_id').references(() => tournamentParticipants.id),
  seed: integer('seed').notNull(),
  teamId: text('team_id'),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
})
export const tournamentTeams = sqliteTable('tournament_teams', {
  capacity: integer('capacity').notNull(),
  color: text('color').notNull().default('#3B82F6'),
  createdAt: text('created_at').notNull(),
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  seed: integer('seed'),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
  updatedAt: text('updated_at').notNull(),
})
export const tournamentTeamMembers = sqliteTable('tournament_team_members', {
  createdAt: text('created_at').notNull(),
  id: text('id').primaryKey(),
  participantId: text('participant_id')
    .notNull()
    .references(() => tournamentParticipants.id, { onDelete: 'cascade' }),
  slotPosition: integer('slot_position').notNull(),
  teamId: text('team_id')
    .notNull()
    .references(() => tournamentTeams.id, { onDelete: 'cascade' }),
})
export const tournamentMatches = sqliteTable('tournament_matches', {
  finishedAt: text('finished_at'),
  id: text('id').primaryKey(),
  leftEntryId: text('left_entry_id').references(() => tournamentEntries.id),
  leftResult: text('left_result').notNull().default('pending'),
  matchNumber: integer('match_number').notNull(),
  nextMatchId: text('next_match_id'),
  nextSlot: text('next_slot'),
  rightEntryId: text('right_entry_id').references(() => tournamentEntries.id),
  rightResult: text('right_result').notNull().default('pending'),
  roundNumber: integer('round_number').notNull(),
  status: text('status').notNull(),
  startedAt: text('started_at'),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
  updatedAt: text('updated_at').notNull(),
  winnerEntryId: text('winner_entry_id').references(() => tournamentEntries.id),
})
export const tournamentAuditLog = sqliteTable('tournament_audit_log', {
  action: text('action').notNull(),
  createdAt: text('created_at').notNull(),
  id: text('id').primaryKey(),
  payloadJson: text('payload_json').notNull(),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
})

export const giveaways = sqliteTable('giveaways', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mode: text('mode').notNull(),
  maxParticipants: integer('max_participants').notNull().default(10_000),
  source: text('source').notNull(),
  status: text('status').notNull(),
  duplicatePolicy: text('duplicate_policy').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
export const giveawayParticipants = sqliteTable('giveaway_participants', {
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  channelId: text('channel_id'),
  id: text('id').primaryKey(),
  giveawayId: text('giveaway_id')
    .notNull()
    .references(() => giveaways.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  provider: text('provider'),
  providerUserId: text('provider_user_id'),
  source: text('source').notNull().default('manual'),
  ticketCount: integer('ticket_count').notNull(),
  externalRef: text('external_ref'),
  createdAt: text('created_at').notNull(),
})
export const chatMessageBuffer = sqliteTable(
  'chat_message_buffer',
  {
    avatarUrl: text('avatar_url'),
    badgesJson: text('badges_json').notNull(),
    channelId: text('channel_id').notNull(),
    displayName: text('display_name').notNull(),
    externalEventId: text('external_event_id').notNull(),
    handle: text('handle').notNull(),
    id: text('id').primaryKey(),
    message: text('message').notNull(),
    occurredAt: text('occurred_at').notNull(),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    receivedAt: text('received_at').notNull(),
  },
  (table) => [unique().on(table.provider, table.externalEventId)],
)
export const giveawayCaptureRules = sqliteTable(
  'giveaway_capture_rules',
  {
    capturedCount: integer('captured_count').notNull().default(0),
    connectionId: text('connection_id')
      .notNull()
      .references(() => integrationConnections.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    duplicateCount: integer('duplicate_count').notNull().default(0),
    endsAt: text('ends_at'),
    entryPolicy: text('entry_policy').notNull(),
    excludeBots: integer('exclude_bots', { mode: 'boolean' }).notNull(),
    excludeBroadcaster: integer('exclude_broadcaster', { mode: 'boolean' }).notNull(),
    excludeModerators: integer('exclude_moderators', { mode: 'boolean' }).notNull(),
    giveawayId: text('giveaway_id')
      .notNull()
      .references(() => giveaways.id, { onDelete: 'cascade' }),
    id: text('id').primaryKey(),
    match: text('match_type').notNull(),
    matchValue: text('match_value'),
    membersOnly: integer('members_only', { mode: 'boolean' }).notNull(),
    rejectedCount: integer('rejected_count').notNull().default(0),
    startsAt: text('starts_at'),
    status: text('status').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [unique().on(table.giveawayId, table.connectionId)],
)
export const giveawayRounds = sqliteTable('giveaway_rounds', {
  id: text('id').primaryKey(),
  giveawayId: text('giveaway_id')
    .notNull()
    .references(() => giveaways.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  winnerParticipantId: text('winner_participant_id').references(() => giveawayParticipants.id),
  randomProof: text('random_proof'),
  snapshotHash: text('snapshot_hash'),
  mode: text('mode'),
  ticketCount: integer('ticket_count'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
})
export const giveawayRoundEntries = sqliteTable('giveaway_round_entries', {
  id: text('id').primaryKey(),
  roundId: text('round_id')
    .notNull()
    .references(() => giveawayRounds.id, { onDelete: 'cascade' }),
  participantId: text('participant_id')
    .notNull()
    .references(() => giveawayParticipants.id),
  ticketCount: integer('ticket_count').notNull(),
  position: integer('position'),
})
