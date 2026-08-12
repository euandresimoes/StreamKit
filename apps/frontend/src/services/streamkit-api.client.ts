import {
  ApiErrorSchema,
  BackendConnectionSchema,
  type CreateWorkspaceRequest,
  CreateWorkspaceRequestSchema,
  type Workspace,
  type WorkspaceListResponse,
  WorkspaceListResponseSchema,
  WorkspaceSchema,
} from '@streamkit/contracts'

export class StreamKitApiClient {
  public async createWorkspace(input: CreateWorkspaceRequest): Promise<Workspace> {
    const payload = CreateWorkspaceRequestSchema.parse(input)
    const response = await this.request('/api/v1/todo/workspaces', {
      body: JSON.stringify(payload),
      method: 'POST',
    })
    return WorkspaceSchema.parse(await response.json())
  }

  public async listWorkspaces(): Promise<WorkspaceListResponse> {
    const response = await this.request('/api/v1/todo/workspaces')
    return WorkspaceListResponseSchema.parse(await response.json())
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const connection = BackendConnectionSchema.parse(await window.streamkit.getBackendConnection())
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${connection.token}`)
    headers.set('content-type', 'application/json')

    const response = await fetch(`${connection.baseUrl}${path}`, { ...init, headers })
    if (!response.ok) {
      const error = ApiErrorSchema.parse(await response.json())
      throw new Error(`${error.error.code}: ${error.error.message}`)
    }
    return response
  }
}

export const streamKitApiClient = new StreamKitApiClient()
