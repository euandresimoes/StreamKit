import {
  ApiErrorSchema,
  BackendConnectionSchema,
  type CreateCardRequest,
  CreateCardRequestSchema,
  type CreateColumnRequest,
  CreateColumnRequestSchema,
  type CreateWorkspaceRequest,
  CreateWorkspaceRequestSchema,
  type DeleteColumnRequest,
  DeleteColumnRequestSchema,
  type MoveCardRequest,
  MoveCardRequestSchema,
  SelectWorkspaceRequestSchema,
  type TodoBoard,
  TodoBoardSchema,
  type TodoCard,
  TodoCardSchema,
  type TodoColumn,
  TodoColumnSchema,
  type UpdateCardRequest,
  UpdateCardRequestSchema,
  type UpdateColumnRequest,
  UpdateColumnRequestSchema,
  type UpdateWorkspaceRequest,
  UpdateWorkspaceRequestSchema,
  type Workspace,
  type WorkspaceListResponse,
  WorkspaceListResponseSchema,
  WorkspaceSchema,
} from '@streamkit/contracts'

export class StreamKitApiClient {
  public createWorkspace(input: CreateWorkspaceRequest): Promise<Workspace> {
    return this.json('/api/v1/todo/workspaces', WorkspaceSchema, {
      body: JSON.stringify(CreateWorkspaceRequestSchema.parse(input)),
      method: 'POST',
    })
  }
  public listWorkspaces(): Promise<WorkspaceListResponse> {
    return this.json('/api/v1/todo/workspaces', WorkspaceListResponseSchema)
  }
  public board(id: string): Promise<TodoBoard> {
    return this.json(`/api/v1/todo/workspaces/${id}`, TodoBoardSchema)
  }
  public updateWorkspace(id: string, input: UpdateWorkspaceRequest): Promise<Workspace> {
    return this.json(`/api/v1/todo/workspaces/${id}`, WorkspaceSchema, {
      body: JSON.stringify(UpdateWorkspaceRequestSchema.parse(input)),
      method: 'PATCH',
    })
  }
  public deleteWorkspace(id: string): Promise<void> {
    return this.empty(`/api/v1/todo/workspaces/${id}`, { method: 'DELETE' })
  }
  public selectWorkspace(workspaceId: string | null): Promise<void> {
    return this.empty('/api/v1/todo/workspaces/select', {
      body: JSON.stringify(SelectWorkspaceRequestSchema.parse({ workspaceId })),
      method: 'POST',
    })
  }
  public createColumn(id: string, input: CreateColumnRequest): Promise<TodoColumn> {
    return this.json(`/api/v1/todo/workspaces/${id}/columns`, TodoColumnSchema, {
      body: JSON.stringify(CreateColumnRequestSchema.parse(input)),
      method: 'POST',
    })
  }
  public updateColumn(id: string, input: UpdateColumnRequest): Promise<TodoColumn> {
    return this.json(`/api/v1/todo/columns/${id}`, TodoColumnSchema, {
      body: JSON.stringify(UpdateColumnRequestSchema.parse(input)),
      method: 'PATCH',
    })
  }
  public deleteColumn(id: string, input: DeleteColumnRequest): Promise<void> {
    return this.empty(`/api/v1/todo/columns/${id}/delete`, {
      body: JSON.stringify(DeleteColumnRequestSchema.parse(input)),
      method: 'POST',
    })
  }
  public createCard(id: string, input: CreateCardRequest): Promise<TodoCard> {
    return this.json(`/api/v1/todo/columns/${id}/cards`, TodoCardSchema, {
      body: JSON.stringify(CreateCardRequestSchema.parse(input)),
      method: 'POST',
    })
  }
  public updateCard(id: string, input: UpdateCardRequest): Promise<TodoCard> {
    return this.json(`/api/v1/todo/cards/${id}`, TodoCardSchema, {
      body: JSON.stringify(UpdateCardRequestSchema.parse(input)),
      method: 'PATCH',
    })
  }
  public deleteCard(id: string): Promise<void> {
    return this.empty(`/api/v1/todo/cards/${id}`, { method: 'DELETE' })
  }
  public moveCard(id: string, input: MoveCardRequest): Promise<TodoCard> {
    return this.json(`/api/v1/todo/cards/${id}/move`, TodoCardSchema, {
      body: JSON.stringify(MoveCardRequestSchema.parse(input)),
      method: 'POST',
    })
  }
  private async json<T>(
    path: string,
    schema: { parse: (value: unknown) => T },
    init: RequestInit = {},
  ): Promise<T> {
    return schema.parse(await (await this.request(path, init)).json())
  }
  private async empty(path: string, init: RequestInit): Promise<void> {
    await this.request(path, init)
  }
  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const connection = BackendConnectionSchema.parse(await window.streamkit.getBackendConnection())
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${connection.token}`)
    if (init.body) headers.set('content-type', 'application/json')
    const response = await fetch(`${connection.baseUrl}${path}`, { ...init, headers })
    if (!response.ok) {
      const error = ApiErrorSchema.parse(await response.json())
      throw new Error(`${error.error.code}: ${error.error.message}`)
    }
    return response
  }
}
export const streamKitApiClient = new StreamKitApiClient()
