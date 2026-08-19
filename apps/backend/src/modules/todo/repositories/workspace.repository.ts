import type {
  CreateTodoTemplateRequest,
  DeleteColumnRequest,
  MoveCardRequest,
  TodoBoard,
  TodoCard,
  TodoColumn,
  TodoTemplate,
  UpdateCardRequest,
  UpdateColumnRequest,
  UpdateWorkspaceRequest,
} from '@streamlet/contracts'
import type { WorkspaceEntity } from '../entities/workspace.entity'

export const WORKSPACE_REPOSITORY = Symbol('WORKSPACE_REPOSITORY')

export abstract class WorkspaceRepository {
  public abstract create(workspace: WorkspaceEntity): Promise<WorkspaceEntity>
  public abstract list(): Promise<WorkspaceEntity[]>
  public abstract nextPosition(): Promise<number>
  public abstract findBoard(id: string): Promise<TodoBoard | null>
  public abstract update(id: string, input: UpdateWorkspaceRequest): Promise<WorkspaceEntity | null>
  public abstract delete(id: string): Promise<boolean>
  public abstract select(id: string | null): Promise<void>
  public abstract selectedId(): Promise<string | null>
  public abstract createColumn(
    workspaceId: string,
    name: string,
    color: string | null,
  ): Promise<TodoColumn | null>
  public abstract updateColumn(id: string, input: UpdateColumnRequest): Promise<TodoColumn | null>
  public abstract deleteColumn(id: string, input: DeleteColumnRequest): Promise<boolean>
  public abstract createCard(
    columnId: string,
    title: string,
    description: string | null,
    notes: string | null,
  ): Promise<TodoCard | null>
  public abstract updateCard(id: string, input: UpdateCardRequest): Promise<TodoCard | null>
  public abstract deleteCard(id: string): Promise<boolean>
  public abstract moveCard(id: string, input: MoveCardRequest): Promise<TodoCard | null>
  public abstract createTemplate(
    workspaceId: string,
    input: CreateTodoTemplateRequest,
  ): Promise<TodoTemplate | null>
  public abstract listTemplates(workspaceId: string): Promise<TodoTemplate[]>
  public abstract applyTemplate(workspaceId: string, templateId: string): Promise<TodoBoard | null>
  public abstract deleteTemplate(id: string): Promise<boolean>
}
