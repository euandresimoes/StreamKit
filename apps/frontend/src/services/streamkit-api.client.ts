import {
  ApiErrorSchema,
  BackendConnectionSchema,
  type CreateCardRequest,
  CreateCardRequestSchema,
  type CreateColumnRequest,
  CreateColumnRequestSchema,
  type CreateGiveawayRequest,
  CreateGiveawayRequestSchema,
  type CreateTournamentRequest,
  CreateTournamentRequestSchema,
  type CreateWorkspaceRequest,
  CreateWorkspaceRequestSchema,
  type DeleteColumnRequest,
  DeleteColumnRequestSchema,
  type DuplicatePolicy,
  GiveawayDetailSchema,
  GiveawayHistorySchema,
  GiveawayListSchema,
  GiveawayRoundSchema,
  GiveawaySchema,
  type MoveCardRequest,
  MoveCardRequestSchema,
  ParticipantPreviewSchema,
  SelectWorkspaceRequestSchema,
  type TodoBoard,
  TodoBoardSchema,
  type TodoCard,
  TodoCardSchema,
  type TodoColumn,
  TodoColumnSchema,
  TournamentDetailSchema,
  TournamentListSchema,
  TournamentSchema,
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
  public listTournaments() {
    return this.json('/api/v1/tournaments', TournamentListSchema)
  }
  public createTournament(input: CreateTournamentRequest) {
    return this.json('/api/v1/tournaments', TournamentSchema, {
      body: JSON.stringify(CreateTournamentRequestSchema.parse(input)),
      method: 'POST',
    })
  }
  public tournament(id: string) {
    return this.json(`/api/v1/tournaments/${id}`, TournamentDetailSchema)
  }
  public addTournamentParticipant(id: string, displayName: string) {
    return this.json(`/api/v1/tournaments/${id}/participants`, TournamentDetailSchema, {
      body: JSON.stringify({ displayName }),
      method: 'POST',
    })
  }
  public renameTournamentParticipant(id: string, participantId: string, displayName: string) {
    return this.json(
      `/api/v1/tournaments/${id}/participants/${participantId}`,
      TournamentDetailSchema,
      { body: JSON.stringify({ displayName }), method: 'PATCH' },
    )
  }
  public removeTournamentParticipant(id: string, participantId: string) {
    return this.json(
      `/api/v1/tournaments/${id}/participants/${participantId}`,
      TournamentDetailSchema,
      { method: 'DELETE' },
    )
  }
  public reorderTournamentParticipant(id: string, participantId: string, seed: number) {
    return this.json(
      `/api/v1/tournaments/${id}/participants/${participantId}/reorder`,
      TournamentDetailSchema,
      { body: JSON.stringify({ seed }), method: 'POST' },
    )
  }
  public tournamentAction(
    id: string,
    action: 'shuffle' | 'bracket/generate' | 'start' | 'archive',
  ) {
    return this.json(`/api/v1/tournaments/${id}/${action}`, TournamentDetailSchema, {
      method: 'POST',
    })
  }
  public setTournamentWinner(id: string, matchId: string, winnerEntryId: string) {
    return this.json(
      `/api/v1/tournaments/${id}/matches/${matchId}/winner`,
      TournamentDetailSchema,
      { body: JSON.stringify({ winnerEntryId }), method: 'POST' },
    )
  }
  public undoTournamentResult(id: string, matchId: string) {
    return this.json(`/api/v1/tournaments/${id}/matches/${matchId}/undo`, TournamentDetailSchema, {
      method: 'POST',
    })
  }
  public listGiveaways() {
    return this.json('/api/v1/giveaways', GiveawayListSchema)
  }
  public createGiveaway(input: CreateGiveawayRequest) {
    return this.json('/api/v1/giveaways', GiveawaySchema, {
      body: JSON.stringify(CreateGiveawayRequestSchema.parse(input)),
      method: 'POST',
    })
  }
  public giveaway(id: string) {
    return this.json(`/api/v1/giveaways/${id}`, GiveawayDetailSchema)
  }
  public previewParticipants(input: string, policy: DuplicatePolicy) {
    return this.json('/api/v1/giveaways/parse-participants', ParticipantPreviewSchema, {
      body: JSON.stringify({ input, policy }),
      method: 'POST',
    })
  }
  public importParticipants(id: string, input: string, policy: DuplicatePolicy) {
    return this.json(`/api/v1/giveaways/${id}/participants/import`, GiveawayDetailSchema, {
      body: JSON.stringify({ input, policy }),
      method: 'POST',
    })
  }
  public prepareGiveaway(id: string) {
    return this.json(`/api/v1/giveaways/${id}/prepare`, GiveawaySchema, { method: 'POST' })
  }
  public drawGiveaway(id: string) {
    return this.json(`/api/v1/giveaways/${id}/draw`, GiveawayRoundSchema, { method: 'POST' })
  }
  public completeGiveaway(id: string, roundId: string) {
    return this.json(`/api/v1/giveaways/${id}/rounds/${roundId}/complete`, GiveawayRoundSchema, {
      method: 'POST',
    })
  }
  public giveawayHistory(id: string) {
    return this.json(`/api/v1/giveaways/${id}/history`, GiveawayHistorySchema)
  }
  public nextGiveawayRound(id: string, removeWinner: boolean) {
    return this.json(`/api/v1/giveaways/${id}/next-round`, GiveawayDetailSchema, {
      body: JSON.stringify({ removeWinner }),
      method: 'POST',
    })
  }
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
