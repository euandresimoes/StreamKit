import { z } from 'zod'

export const WorkspaceNameSchema = z.string().trim().min(1).max(120)

export type WorkspaceName = z.infer<typeof WorkspaceNameSchema>
