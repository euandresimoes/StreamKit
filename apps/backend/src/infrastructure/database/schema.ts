import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const todoWorkspaces = sqliteTable('todo_workspaces', {
  createdAt: text('created_at').notNull(),
  description: text('description'),
  id: text('id').primaryKey(),
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
    name: text('name').notNull(),
    position: integer('position').notNull(),
    updatedAt: text('updated_at').notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => todoWorkspaces.id, { onDelete: 'cascade' }),
  },
  (table) => [unique().on(table.workspaceId, table.position)],
)

export const todoCards = sqliteTable(
  'todo_cards',
  {
    columnId: text('column_id')
      .notNull()
      .references(() => todoColumns.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
    description: text('description'),
    id: text('id').primaryKey(),
    notes: text('notes'),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [unique().on(table.columnId, table.position)],
)

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  updatedAt: text('updated_at').notNull(),
  valueJson: text('value_json').notNull(),
})

export const tournaments = sqliteTable('tournaments', {
  bracketSize: integer('bracket_size').notNull(),
  createdAt: text('created_at').notNull(),
  description: text('description'),
  id: text('id').primaryKey(),
  mode: text('mode').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  teamCapacity: integer('team_capacity'),
  updatedAt: text('updated_at').notNull(),
})
export const tournamentParticipants = sqliteTable('tournament_participants', {
  createdAt: text('created_at').notNull(),
  displayName: text('display_name').notNull(),
  externalRef: text('external_ref'),
  id: text('id').primaryKey(),
  identityKey: text('identity_key'),
  source: text('source').notNull(),
  tournamentId: text('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
})
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
  id: text('id').primaryKey(),
  leftEntryId: text('left_entry_id').references(() => tournamentEntries.id),
  matchNumber: integer('match_number').notNull(),
  nextMatchId: text('next_match_id'),
  nextSlot: text('next_slot'),
  rightEntryId: text('right_entry_id').references(() => tournamentEntries.id),
  roundNumber: integer('round_number').notNull(),
  status: text('status').notNull(),
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
  source: text('source').notNull(),
  status: text('status').notNull(),
  duplicatePolicy: text('duplicate_policy').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
export const giveawayParticipants = sqliteTable('giveaway_participants', {
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  id: text('id').primaryKey(),
  giveawayId: text('giveaway_id')
    .notNull()
    .references(() => giveaways.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  ticketCount: integer('ticket_count').notNull(),
  externalRef: text('external_ref'),
  createdAt: text('created_at').notNull(),
})
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
