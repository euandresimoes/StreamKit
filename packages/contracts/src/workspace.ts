import { z } from 'zod'

export const EntityIdSchema = z.uuid()
export const WorkspaceNameSchema = z.string().trim().min(1).max(120)
export const WorkspaceDescriptionSchema = z.string().trim().max(500).nullable()
export const WorkspaceIconSchema = z.string().trim().min(1).max(32).default('📋')
export const TodoColumnNameSchema = z.string().trim().min(1).max(120)
export const TodoColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable()
export const TodoCardTitleSchema = z.string().trim().min(1).max(200)
export const TodoCardDescriptionSchema = z.string().trim().max(2000).nullable()
export const TodoCardNotesSchema = z.string().trim().max(5000).nullable()
export const TodoPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])
export const TodoLabelsSchema = z.array(z.string().trim().min(1).max(40)).max(12)
export const TodoChecklistSchema = z
  .array(
    z.object({
      id: EntityIdSchema,
      text: z.string().trim().min(1).max(200),
      done: z.boolean(),
    }),
  )
  .max(50)

export const CreateWorkspaceRequestSchema = z.object({
  accentColor: TodoColorSchema.optional(),
  description: z.string().trim().max(500).optional(),
  icon: WorkspaceIconSchema,
  name: WorkspaceNameSchema,
})
export const UpdateWorkspaceRequestSchema = z
  .object({
    accentColor: TodoColorSchema.optional(),
    description: WorkspaceDescriptionSchema.optional(),
    icon: WorkspaceIconSchema.optional(),
    isPinned: z.boolean().optional(),
    name: WorkspaceNameSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
export const WorkspaceSchema = z.object({
  accentColor: TodoColorSchema,
  createdAt: z.iso.datetime(),
  description: WorkspaceDescriptionSchema,
  id: EntityIdSchema,
  icon: WorkspaceIconSchema,
  isPinned: z.boolean(),
  name: WorkspaceNameSchema,
  position: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
})
export const TodoColumnSchema = z.object({
  color: TodoColorSchema,
  createdAt: z.iso.datetime(),
  id: EntityIdSchema,
  icon: z.string().trim().max(8).nullable(),
  isCollapsed: z.boolean(),
  isPinned: z.boolean(),
  name: TodoColumnNameSchema,
  position: z.number().int().nonnegative(),
  wipLimit: z.number().int().positive().nullable(),
  updatedAt: z.iso.datetime(),
  workspaceId: EntityIdSchema.nullable(),
})
export const TodoCardSchema = z.object({
  columnId: EntityIdSchema,
  createdAt: z.iso.datetime(),
  description: TodoCardDescriptionSchema,
  id: EntityIdSchema,
  accentColor: TodoColorSchema,
  isPinned: z.boolean(),
  labels: TodoLabelsSchema,
  checklist: TodoChecklistSchema,
  notes: TodoCardNotesSchema,
  priority: TodoPrioritySchema,
  position: z.number().int().nonnegative(),
  title: TodoCardTitleSchema,
  updatedAt: z.iso.datetime(),
})
export const TodoBoardSchema = z.object({
  cards: z.array(TodoCardSchema),
  columns: z.array(TodoColumnSchema),
  workspace: WorkspaceSchema,
})
export const WorkspaceListResponseSchema = z.object({
  items: z.array(WorkspaceSchema),
  selectedId: EntityIdSchema.nullable(),
})
export const CreateColumnRequestSchema = z.object({
  color: TodoColorSchema.optional(),
  icon: z.string().trim().max(8).nullable().optional(),
  name: TodoColumnNameSchema,
  wipLimit: z.number().int().positive().nullable().optional(),
})
export const UpdateColumnRequestSchema = z
  .object({
    color: TodoColorSchema.optional(),
    icon: z.string().trim().max(8).nullable().optional(),
    isCollapsed: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    name: TodoColumnNameSchema.optional(),
    position: z.number().int().nonnegative().optional(),
    wipLimit: z.number().int().positive().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
export const DeleteColumnRequestSchema = z.discriminatedUnion('strategy', [
  z.object({ strategy: z.literal('delete') }),
  z.object({ strategy: z.literal('move'), targetColumnId: EntityIdSchema }),
])
export const CreateCardRequestSchema = z.object({
  accentColor: TodoColorSchema.optional(),
  checklist: TodoChecklistSchema.optional(),
  description: z.string().trim().max(2000).optional(),
  labels: TodoLabelsSchema.optional(),
  notes: z.string().trim().max(5000).optional(),
  priority: TodoPrioritySchema.optional(),
  title: TodoCardTitleSchema,
})
export const UpdateCardRequestSchema = z
  .object({
    accentColor: TodoColorSchema.optional(),
    checklist: TodoChecklistSchema.optional(),
    description: TodoCardDescriptionSchema.optional(),
    isPinned: z.boolean().optional(),
    labels: TodoLabelsSchema.optional(),
    notes: TodoCardNotesSchema.optional(),
    priority: TodoPrioritySchema.optional(),
    title: TodoCardTitleSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
export const MoveCardRequestSchema = z.object({
  columnId: EntityIdSchema,
  position: z.number().int().nonnegative(),
})
export const SelectWorkspaceRequestSchema = z.object({ workspaceId: EntityIdSchema.nullable() })

export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>
export type Workspace = z.infer<typeof WorkspaceSchema>
export type WorkspaceListResponse = z.infer<typeof WorkspaceListResponseSchema>
export type WorkspaceName = z.infer<typeof WorkspaceNameSchema>
export type TodoColumn = z.infer<typeof TodoColumnSchema>
export type TodoCard = z.infer<typeof TodoCardSchema>
export type TodoBoard = z.infer<typeof TodoBoardSchema>
export type CreateColumnRequest = z.infer<typeof CreateColumnRequestSchema>
export type UpdateColumnRequest = z.infer<typeof UpdateColumnRequestSchema>
export type DeleteColumnRequest = z.infer<typeof DeleteColumnRequestSchema>
export type CreateCardRequest = z.infer<typeof CreateCardRequestSchema>
export type UpdateCardRequest = z.infer<typeof UpdateCardRequestSchema>
export type MoveCardRequest = z.infer<typeof MoveCardRequestSchema>

export const TodoTemplateColumnSchema = z.object({
  color: TodoColorSchema.optional(),
  icon: z.string().trim().max(8).nullable().optional(),
  name: TodoColumnNameSchema,
  wipLimit: z.number().int().positive().nullable().optional(),
  cards: z
    .array(
      z.object({
        accentColor: TodoColorSchema.optional(),
        checklist: TodoChecklistSchema.optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        labels: TodoLabelsSchema.optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
        priority: TodoPrioritySchema.optional(),
        title: TodoCardTitleSchema,
      }),
    )
    .max(200),
})
export const TodoTemplateSchema = z.object({
  id: EntityIdSchema,
  workspaceId: EntityIdSchema,
  name: WorkspaceNameSchema,
  description: z.string().trim().max(500).nullable(),
  structure: z.object({ columns: z.array(TodoTemplateColumnSchema).max(50) }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export const CreateTodoTemplateRequestSchema = z.object({
  name: WorkspaceNameSchema,
  description: z.string().trim().max(500).optional(),
})
export type TodoTemplate = z.infer<typeof TodoTemplateSchema>
export type CreateTodoTemplateRequest = z.infer<typeof CreateTodoTemplateRequestSchema>
export type TodoPriority = z.infer<typeof TodoPrioritySchema>
