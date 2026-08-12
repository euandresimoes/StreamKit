import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const todoWorkspaces = sqliteTable('todo_workspaces', {
  createdAt: text('created_at').notNull(),
  description: text('description'),
  id: text('id').primaryKey(),
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
