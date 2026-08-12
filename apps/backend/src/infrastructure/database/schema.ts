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
