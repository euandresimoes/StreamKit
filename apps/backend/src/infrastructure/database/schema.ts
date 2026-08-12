import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const todoWorkspaces = sqliteTable('todo_workspaces', {
  createdAt: text('created_at').notNull(),
  description: text('description'),
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  updatedAt: text('updated_at').notNull(),
})
