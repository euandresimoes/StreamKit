import { z } from 'zod'

export const EntityIdSchema = z.uuid()
export const WorkspaceNameSchema = z.string().trim().min(1).max(120)
export const WorkspaceDescriptionSchema = z.string().trim().max(500).nullable()
export const TodoColumnNameSchema = z.string().trim().min(1).max(120)
export const TodoColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable()
export const TodoCardTitleSchema = z.string().trim().min(1).max(200)
export const TodoCardDescriptionSchema = z.string().trim().max(2000).nullable()
export const TodoCardNotesSchema = z.string().trim().max(5000).nullable()

export const CreateWorkspaceRequestSchema = z.object({
  description: z.string().trim().max(500).optional(),
  name: WorkspaceNameSchema,
})
export const UpdateWorkspaceRequestSchema = z
  .object({
    description: WorkspaceDescriptionSchema.optional(),
    name: WorkspaceNameSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
export const WorkspaceSchema = z.object({
  createdAt: z.iso.datetime(),
  description: WorkspaceDescriptionSchema,
  id: EntityIdSchema,
  name: WorkspaceNameSchema,
  position: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
})
export const TodoColumnSchema = z.object({
  color: TodoColorSchema,
  createdAt: z.iso.datetime(),
  id: EntityIdSchema,
  name: TodoColumnNameSchema,
  position: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
  workspaceId: EntityIdSchema,
})
export const TodoCardSchema = z.object({
  columnId: EntityIdSchema,
  createdAt: z.iso.datetime(),
  description: TodoCardDescriptionSchema,
  id: EntityIdSchema,
  notes: TodoCardNotesSchema,
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
  name: TodoColumnNameSchema,
})
export const UpdateColumnRequestSchema = z
  .object({
    color: TodoColorSchema.optional(),
    name: TodoColumnNameSchema.optional(),
    position: z.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
export const DeleteColumnRequestSchema = z.discriminatedUnion('strategy', [
  z.object({ strategy: z.literal('delete') }),
  z.object({ strategy: z.literal('move'), targetColumnId: EntityIdSchema }),
])
export const CreateCardRequestSchema = z.object({
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  title: TodoCardTitleSchema,
})
export const UpdateCardRequestSchema = z
  .object({
    description: TodoCardDescriptionSchema.optional(),
    notes: TodoCardNotesSchema.optional(),
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
