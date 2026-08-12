import { z } from 'zod'

export const WorkspaceNameSchema = z.string().trim().min(1).max(120)
export const WorkspaceDescriptionSchema = z.string().trim().max(500).nullable()

export const CreateWorkspaceRequestSchema = z.object({
  description: z.string().trim().max(500).optional(),
  name: WorkspaceNameSchema,
})

export const WorkspaceSchema = z.object({
  createdAt: z.iso.datetime(),
  description: WorkspaceDescriptionSchema,
  id: z.uuid(),
  name: WorkspaceNameSchema,
  position: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
})

export const WorkspaceListResponseSchema = z.object({
  items: z.array(WorkspaceSchema),
})

export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>
export type Workspace = z.infer<typeof WorkspaceSchema>
export type WorkspaceListResponse = z.infer<typeof WorkspaceListResponseSchema>
export type WorkspaceName = z.infer<typeof WorkspaceNameSchema>
