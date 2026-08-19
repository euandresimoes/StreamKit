import { Inject, Injectable } from '@nestjs/common'
import {
  type CreateTodoTemplateRequest,
  type DeleteColumnRequest,
  type MoveCardRequest,
  type TodoBoard,
  TodoBoardSchema,
  type TodoCard,
  TodoCardSchema,
  type TodoColumn,
  TodoColumnSchema,
  type TodoTemplate,
  TodoTemplateSchema,
  type UpdateCardRequest,
  type UpdateColumnRequest,
  type UpdateWorkspaceRequest,
  WorkspaceSchema,
} from '@streamlet/contracts'
import { and, asc, eq, max, sql } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../../infrastructure/database/database.tokens'
import {
  appSettings,
  todoCards,
  todoColumns,
  todoTemplates,
  todoWorkspaces,
} from '../../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../../infrastructure/database/sqlite-database'
import { WorkspaceEntity } from '../entities/workspace.entity'
import { WorkspaceRepository } from './workspace.repository'

@Injectable()
export class SqliteWorkspaceRepository extends WorkspaceRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {
    super()
  }

  public async create(workspace: WorkspaceEntity): Promise<WorkspaceEntity> {
    await this.database.orm.insert(todoWorkspaces).values(workspace)
    return workspace
  }

  public async list(): Promise<WorkspaceEntity[]> {
    const rows = await this.database.orm
      .select()
      .from(todoWorkspaces)
      .orderBy(asc(todoWorkspaces.position))

    return rows.map((unvalidatedRow) => {
      const row = WorkspaceSchema.parse(unvalidatedRow)
      return new WorkspaceEntity(
        row.id,
        row.name,
        row.description,
        row.icon,
        row.position,
        row.createdAt,
        row.updatedAt,
        row.accentColor,
        row.isPinned,
      )
    })
  }

  public async nextPosition(): Promise<number> {
    const [result] = await this.database.orm
      .select({ highestPosition: max(todoWorkspaces.position) })
      .from(todoWorkspaces)

    return (result?.highestPosition ?? -1) + 1
  }

  public async selectedId(): Promise<string | null> {
    const [row] = await this.database.orm
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'todo.selectedWorkspaceId'))
    return row ? (JSON.parse(row.valueJson) as string | null) : null
  }

  public async select(id: string | null): Promise<void> {
    const now = new Date().toISOString()
    await this.database.orm
      .insert(appSettings)
      .values({ key: 'todo.selectedWorkspaceId', valueJson: JSON.stringify(id), updatedAt: now })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { valueJson: JSON.stringify(id), updatedAt: now },
      })
  }

  public async findBoard(id: string): Promise<TodoBoard | null> {
    const [workspace] = await this.database.orm
      .select()
      .from(todoWorkspaces)
      .where(eq(todoWorkspaces.id, id))
    if (!workspace) return null
    const columns = await this.database.orm
      .select()
      .from(todoColumns)
      .where(eq(todoColumns.workspaceId, id))
      .orderBy(asc(todoColumns.position))
    const cards =
      columns.length === 0
        ? []
        : await this.database.orm
            .select()
            .from(todoCards)
            .where(
              sql`${todoCards.columnId} IN (${sql.join(
                columns.map((column) => sql`${column.id}`),
                sql`, `,
              )})`,
            )
            .orderBy(asc(todoCards.position))
    return TodoBoardSchema.parse({
      workspace,
      columns,
      cards: cards.map((card) => ({
        ...card,
        labels: JSON.parse(card.labelsJson ?? '[]'),
        checklist: JSON.parse(card.checklistJson ?? '[]'),
      })),
    })
  }

  public async update(id: string, input: UpdateWorkspaceRequest): Promise<WorkspaceEntity | null> {
    await this.database.orm
      .update(todoWorkspaces)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(todoWorkspaces.id, id))
    const board = await this.findBoard(id)
    return board
      ? new WorkspaceEntity(
          board.workspace.id,
          board.workspace.name,
          board.workspace.description,
          board.workspace.icon,
          board.workspace.position,
          board.workspace.createdAt,
          board.workspace.updatedAt,
          board.workspace.accentColor,
          board.workspace.isPinned,
        )
      : null
  }

  public async delete(id: string): Promise<boolean> {
    return (
      this.database.orm.delete(todoWorkspaces).where(eq(todoWorkspaces.id, id)).run().changes > 0
    )
  }

  public async createColumn(
    workspaceId: string,
    name: string,
    color: string | null,
  ): Promise<TodoColumn | null> {
    const [workspace] = await this.database.orm
      .select({ id: todoWorkspaces.id })
      .from(todoWorkspaces)
      .where(eq(todoWorkspaces.id, workspaceId))
    if (!workspace) return null
    const [highest] = await this.database.orm
      .select({ value: max(todoColumns.position) })
      .from(todoColumns)
      .where(eq(todoColumns.workspaceId, workspaceId))
    const now = new Date().toISOString()
    const row = {
      color,
      createdAt: now,
      id: crypto.randomUUID(),
      name,
      position: (highest?.value ?? -1) + 1,
      updatedAt: now,
      workspaceId,
      icon: null,
      isCollapsed: false,
      isPinned: false,
      wipLimit: null,
    }
    await this.database.orm.insert(todoColumns).values(row)
    return TodoColumnSchema.parse(row)
  }

  public async updateColumn(id: string, input: UpdateColumnRequest): Promise<TodoColumn | null> {
    const [current] = await this.database.orm
      .select()
      .from(todoColumns)
      .where(eq(todoColumns.id, id))
    if (!current) return null
    return this.database.transaction(() => {
      if (input.position !== undefined && input.position !== current.position) {
        const ordered = this.database.orm
          .select()
          .from(todoColumns)
          .where(eq(todoColumns.workspaceId, current.workspaceId))
          .orderBy(asc(todoColumns.position))
          .all()
          .filter((column) => column.id !== id)
        ordered.splice(Math.min(input.position, ordered.length), 0, current)
        ordered.forEach((column, index) =>
          this.database.orm
            .update(todoColumns)
            .set({ position: -1000 - index })
            .where(eq(todoColumns.id, column.id))
            .run(),
        )
        ordered.forEach((column, position) =>
          this.database.orm
            .update(todoColumns)
            .set({ position })
            .where(eq(todoColumns.id, column.id))
            .run(),
        )
      }
      this.database.orm
        .update(todoColumns)
        .set({ ...input, updatedAt: new Date().toISOString() })
        .where(eq(todoColumns.id, id))
        .run()
      return TodoColumnSchema.parse({ ...current, ...input, updatedAt: new Date().toISOString() })
    })
  }

  public async deleteColumn(id: string, input: DeleteColumnRequest): Promise<boolean> {
    return this.database.transaction(() => {
      const [column] = this.database.orm
        .select()
        .from(todoColumns)
        .where(eq(todoColumns.id, id))
        .all()
      if (!column) return false
      if (input.strategy === 'move') {
        const [target] = this.database.orm
          .select()
          .from(todoColumns)
          .where(
            and(
              eq(todoColumns.id, input.targetColumnId),
              eq(todoColumns.workspaceId, column.workspaceId),
            ),
          )
          .all()
        if (!target) return false
        const [highest] = this.database.orm
          .select({ value: max(todoCards.position) })
          .from(todoCards)
          .where(eq(todoCards.columnId, target.id))
          .all()
        const moving = this.database.orm
          .select()
          .from(todoCards)
          .where(eq(todoCards.columnId, id))
          .orderBy(asc(todoCards.position))
          .all()
        moving.forEach((card, index) =>
          this.database.orm
            .update(todoCards)
            .set({
              columnId: target.id,
              position: (highest?.value ?? -1) + 1 + index,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(todoCards.id, card.id))
            .run(),
        )
      }
      this.database.orm.delete(todoColumns).where(eq(todoColumns.id, id)).run()
      this.normalizeColumns(column.workspaceId)
      return true
    })
  }

  public async createCard(
    columnId: string,
    title: string,
    description: string | null,
    notes: string | null,
  ): Promise<TodoCard | null> {
    const [column] = await this.database.orm
      .select({ id: todoColumns.id })
      .from(todoColumns)
      .where(eq(todoColumns.id, columnId))
    if (!column) return null
    const [highest] = await this.database.orm
      .select({ value: max(todoCards.position) })
      .from(todoCards)
      .where(eq(todoCards.columnId, columnId))
    const now = new Date().toISOString()
    const row = {
      accentColor: null,
      columnId,
      createdAt: now,
      description,
      id: crypto.randomUUID(),
      notes,
      priority: 'normal' as const,
      isPinned: false,
      labelsJson: '[]',
      checklistJson: '[]',
      position: (highest?.value ?? -1) + 1,
      title,
      updatedAt: now,
    }
    await this.database.orm.insert(todoCards).values(row)
    return TodoCardSchema.parse({ ...row, labels: [], checklist: [] })
  }
  public async updateCard(id: string, input: UpdateCardRequest): Promise<TodoCard | null> {
    const { labels, checklist, ...scalarInput } = input
    await this.database.orm
      .update(todoCards)
      .set({
        ...scalarInput,
        ...(labels === undefined ? {} : { labelsJson: JSON.stringify(labels) }),
        ...(checklist === undefined ? {} : { checklistJson: JSON.stringify(checklist) }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(todoCards.id, id))
    const [row] = await this.database.orm.select().from(todoCards).where(eq(todoCards.id, id))
    return row
      ? TodoCardSchema.parse({
          ...row,
          labels: JSON.parse(row.labelsJson ?? '[]'),
          checklist: JSON.parse(row.checklistJson ?? '[]'),
        })
      : null
  }
  public async deleteCard(id: string): Promise<boolean> {
    const [card] = await this.database.orm.select().from(todoCards).where(eq(todoCards.id, id))
    if (!card) return false
    return this.database.transaction(() => {
      this.database.orm.delete(todoCards).where(eq(todoCards.id, id)).run()
      this.normalizeCards(card.columnId)
      return true
    })
  }
  public async moveCard(id: string, input: MoveCardRequest): Promise<TodoCard | null> {
    return this.database.transaction(() => {
      const [card] = this.database.orm.select().from(todoCards).where(eq(todoCards.id, id)).all()
      const [target] = this.database.orm
        .select()
        .from(todoColumns)
        .where(eq(todoColumns.id, input.columnId))
        .all()
      if (!card || !target) return null
      const sourceCards = this.database.orm
        .select()
        .from(todoCards)
        .where(eq(todoCards.columnId, card.columnId))
        .orderBy(asc(todoCards.position))
        .all()
        .filter((item) => item.id !== id)
      const targetCards =
        card.columnId === input.columnId
          ? sourceCards
          : this.database.orm
              .select()
              .from(todoCards)
              .where(eq(todoCards.columnId, input.columnId))
              .orderBy(asc(todoCards.position))
              .all()
      const position = Math.min(input.position, targetCards.length)
      targetCards.splice(position, 0, card)
      const affected =
        card.columnId === input.columnId ? targetCards : [...sourceCards, ...targetCards]
      affected.forEach((item, index) =>
        this.database.orm
          .update(todoCards)
          .set({ position: -100000 - index })
          .where(eq(todoCards.id, item.id))
          .run(),
      )
      sourceCards.forEach((item, index) =>
        this.database.orm
          .update(todoCards)
          .set({ columnId: card.columnId, position: index })
          .where(eq(todoCards.id, item.id))
          .run(),
      )
      targetCards.forEach((item, index) =>
        this.database.orm
          .update(todoCards)
          .set({ columnId: input.columnId, position: index })
          .where(eq(todoCards.id, item.id))
          .run(),
      )
      const updatedAt = new Date().toISOString()
      this.database.orm.update(todoCards).set({ updatedAt }).where(eq(todoCards.id, id)).run()
      return TodoCardSchema.parse({
        ...card,
        columnId: input.columnId,
        position,
        updatedAt,
        labels: JSON.parse(card.labelsJson ?? '[]'),
        checklist: JSON.parse(card.checklistJson ?? '[]'),
      })
    })
  }
  public async createTemplate(
    workspaceId: string,
    input: CreateTodoTemplateRequest,
  ): Promise<TodoTemplate | null> {
    const board = await this.findBoard(workspaceId)
    if (!board) return null
    const now = new Date().toISOString()
    const row = {
      id: crypto.randomUUID(),
      workspaceId,
      name: input.name,
      description: input.description ?? null,
      structureJson: JSON.stringify({
        columns: board.columns.map((column) => ({
          name: column.name,
          color: column.color,
          icon: column.icon,
          wipLimit: column.wipLimit,
          cards: board.cards
            .filter((card) => card.columnId === column.id)
            .map((card) => ({
              title: card.title,
              description: card.description,
              notes: card.notes,
              priority: card.priority,
              accentColor: card.accentColor,
              labels: card.labels,
              checklist: card.checklist,
            })),
        })),
      }),
      createdAt: now,
      updatedAt: now,
    }
    await this.database.orm.insert(todoTemplates).values(row)
    return TodoTemplateSchema.parse({ ...row, structure: JSON.parse(row.structureJson) })
  }
  public async listTemplates(workspaceId: string): Promise<TodoTemplate[]> {
    void workspaceId
    const rows = await this.database.orm
      .select()
      .from(todoTemplates)
      .orderBy(asc(todoTemplates.updatedAt))
    return rows.map((row) =>
      TodoTemplateSchema.parse({ ...row, structure: JSON.parse(row.structureJson) }),
    )
  }
  public async applyTemplate(workspaceId: string, templateId: string): Promise<TodoBoard | null> {
    const [template] = await this.database.orm
      .select()
      .from(todoTemplates)
      .where(eq(todoTemplates.id, templateId))
    if (!template) return null
    const structure = JSON.parse(template.structureJson) as {
      columns: Array<{
        name: string
        color?: string | null
        icon?: string | null
        wipLimit?: number | null
        cards: Array<Record<string, unknown>>
      }>
    }
    this.database.transaction(() => {
      this.database.orm.delete(todoColumns).where(eq(todoColumns.workspaceId, workspaceId)).run()
      structure.columns.forEach((column, columnIndex) => {
        const columnId = crypto.randomUUID()
        const now = new Date().toISOString()
        this.database.orm
          .insert(todoColumns)
          .values({
            id: columnId,
            workspaceId,
            name: column.name,
            color: column.color ?? null,
            icon: column.icon ?? null,
            wipLimit: column.wipLimit ?? null,
            position: columnIndex,
            isCollapsed: false,
            isPinned: false,
            createdAt: now,
            updatedAt: now,
          })
          .run()
        column.cards.forEach((card, cardIndex) =>
          this.database.orm
            .insert(todoCards)
            .values({
              id: crypto.randomUUID(),
              columnId,
              title: String(card.title),
              description: (card.description as string | null) ?? null,
              notes: (card.notes as string | null) ?? null,
              priority: (card.priority as string) ?? 'normal',
              accentColor: (card.accentColor as string | null) ?? null,
              labelsJson: JSON.stringify(card.labels ?? []),
              checklistJson: JSON.stringify(card.checklist ?? []),
              isPinned: false,
              position: cardIndex,
              createdAt: now,
              updatedAt: now,
            })
            .run(),
        )
      })
    })
    return this.findBoard(workspaceId)
  }
  public async deleteTemplate(id: string): Promise<boolean> {
    return this.database.orm.delete(todoTemplates).where(eq(todoTemplates.id, id)).run().changes > 0
  }
  private normalizeCards(columnId: string): void {
    this.database.orm
      .select()
      .from(todoCards)
      .where(eq(todoCards.columnId, columnId))
      .orderBy(asc(todoCards.position))
      .all()
      .forEach((card, position) =>
        this.database.orm
          .update(todoCards)
          .set({ position })
          .where(eq(todoCards.id, card.id))
          .run(),
      )
  }
  private normalizeColumns(workspaceId: string): void {
    this.database.orm
      .select()
      .from(todoColumns)
      .where(eq(todoColumns.workspaceId, workspaceId))
      .orderBy(asc(todoColumns.position))
      .all()
      .forEach((column, position) =>
        this.database.orm
          .update(todoColumns)
          .set({ position })
          .where(eq(todoColumns.id, column.id))
          .run(),
      )
  }
}
