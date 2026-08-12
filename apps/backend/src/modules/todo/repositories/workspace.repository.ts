import type { WorkspaceEntity } from '../entities/workspace.entity'

export const WORKSPACE_REPOSITORY = Symbol('WORKSPACE_REPOSITORY')

export abstract class WorkspaceRepository {
  public abstract create(workspace: WorkspaceEntity): Promise<WorkspaceEntity>
  public abstract list(): Promise<WorkspaceEntity[]>
  public abstract nextPosition(): Promise<number>
}
