import { Inject, Injectable } from '@nestjs/common'
import type {
  CreateCardRequest,
  CreateColumnRequest,
  DeleteColumnRequest,
  MoveCardRequest,
  TodoBoard,
  TodoCard,
  TodoColumn,
  UpdateCardRequest,
  UpdateColumnRequest,
  UpdateWorkspaceRequest,
  Workspace,
} from '@streamkit/contracts'
import { ApiApplicationError } from '../../../application/api-error'
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '../repositories/workspace.repository'

@Injectable()
export class ManageTodoService {
  public constructor(
    @Inject(WORKSPACE_REPOSITORY) private readonly repository: WorkspaceRepository,
  ) {}
  private required<T>(
    value: T | null,
    code: 'TODO_CARD_NOT_FOUND' | 'TODO_COLUMN_NOT_FOUND' | 'TODO_WORKSPACE_NOT_FOUND',
    message: string,
  ): T {
    if (!value) throw new ApiApplicationError(code, message, 404)
    return value
  }
  public board(id: string): Promise<TodoBoard> {
    return this.repository
      .findBoard(id)
      .then((value) => this.required(value, 'TODO_WORKSPACE_NOT_FOUND', 'Workspace not found'))
  }
  public updateWorkspace(id: string, input: UpdateWorkspaceRequest): Promise<Workspace> {
    return this.repository
      .update(id, input)
      .then((value) => this.required(value, 'TODO_WORKSPACE_NOT_FOUND', 'Workspace not found'))
  }
  public async deleteWorkspace(id: string): Promise<void> {
    if (!(await this.repository.delete(id)))
      throw new ApiApplicationError('TODO_WORKSPACE_NOT_FOUND', 'Workspace not found', 404)
    if ((await this.repository.selectedId()) === id) {
      const remaining = await this.repository.list()
      await this.repository.select(remaining[0]?.id ?? null)
    }
  }
  public async selectWorkspace(id: string | null): Promise<void> {
    if (id && !(await this.repository.findBoard(id)))
      throw new ApiApplicationError('TODO_WORKSPACE_NOT_FOUND', 'Workspace not found', 404)
    await this.repository.select(id)
  }
  public createColumn(id: string, input: CreateColumnRequest): Promise<TodoColumn> {
    return this.repository
      .createColumn(id, input.name, input.color ?? null)
      .then((value) => this.required(value, 'TODO_WORKSPACE_NOT_FOUND', 'Workspace not found'))
  }
  public updateColumn(id: string, input: UpdateColumnRequest): Promise<TodoColumn> {
    return this.repository
      .updateColumn(id, input)
      .then((value) => this.required(value, 'TODO_COLUMN_NOT_FOUND', 'Column not found'))
  }
  public async deleteColumn(id: string, input: DeleteColumnRequest): Promise<void> {
    if (!(await this.repository.deleteColumn(id, input)))
      throw new ApiApplicationError(
        'TODO_COLUMN_NOT_FOUND',
        'Column or target column not found',
        404,
      )
  }
  public createCard(id: string, input: CreateCardRequest): Promise<TodoCard> {
    return this.repository
      .createCard(id, input.title, input.description ?? null, input.notes ?? null)
      .then((value) => this.required(value, 'TODO_COLUMN_NOT_FOUND', 'Column not found'))
  }
  public updateCard(id: string, input: UpdateCardRequest): Promise<TodoCard> {
    return this.repository
      .updateCard(id, input)
      .then((value) => this.required(value, 'TODO_CARD_NOT_FOUND', 'Card not found'))
  }
  public async deleteCard(id: string): Promise<void> {
    if (!(await this.repository.deleteCard(id)))
      throw new ApiApplicationError('TODO_CARD_NOT_FOUND', 'Card not found', 404)
  }
  public moveCard(id: string, input: MoveCardRequest): Promise<TodoCard> {
    return this.repository
      .moveCard(id, input)
      .then((value) =>
        this.required(value, 'TODO_CARD_NOT_FOUND', 'Card or target column not found'),
      )
  }
}
