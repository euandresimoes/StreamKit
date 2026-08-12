import type {
  CreateCardRequest,
  CreateColumnRequest,
  CreateWorkspaceRequest,
  DeleteColumnRequest,
  MoveCardRequest,
  TodoBoard,
  UpdateCardRequest,
  UpdateColumnRequest,
  UpdateWorkspaceRequest,
  Workspace,
} from '@streamkit/contracts'
import { defineStore } from 'pinia'
import { streamKitApiClient } from '../services/streamkit-api.client'

export const useTodoStore = defineStore('todo', {
  actions: {
    async perform<T>(operation: () => Promise<T>): Promise<T> {
      this.error = null
      this.loading = true
      try {
        return await operation()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao salvar dados'
        throw error
      } finally {
        this.loading = false
      }
    },
    async loadWorkspaces(): Promise<void> {
      await this.perform(async () => {
        const result = await streamKitApiClient.listWorkspaces()
        this.workspaces = result.items
        this.selectedId = result.selectedId
        if (this.selectedId) await this.loadBoard(this.selectedId)
      })
    },
    async createWorkspace(input: CreateWorkspaceRequest): Promise<void> {
      await this.perform(async () => {
        const item = await streamKitApiClient.createWorkspace(input)
        this.workspaces.push(item)
        await this.selectWorkspace(item.id)
      })
    },
    async selectWorkspace(id: string): Promise<void> {
      await this.perform(async () => {
        await streamKitApiClient.selectWorkspace(id)
        this.selectedId = id
        this.board = await streamKitApiClient.board(id)
      })
    },
    async loadBoard(id: string): Promise<void> {
      this.board = await streamKitApiClient.board(id)
    },
    async updateWorkspace(input: UpdateWorkspaceRequest): Promise<void> {
      if (!this.selectedId) return
      await this.perform(async () => {
        const item = await streamKitApiClient.updateWorkspace(this.selectedId!, input)
        this.workspaces = this.workspaces.map((value) => (value.id === item.id ? item : value))
        if (this.board) this.board.workspace = item
      })
    },
    async deleteWorkspace(): Promise<void> {
      if (!this.selectedId) return
      await this.perform(async () => {
        await streamKitApiClient.deleteWorkspace(this.selectedId!)
        this.workspaces = this.workspaces.filter((item) => item.id !== this.selectedId)
        this.selectedId = this.workspaces[0]?.id ?? null
        await streamKitApiClient.selectWorkspace(this.selectedId)
        this.board = this.selectedId ? await streamKitApiClient.board(this.selectedId) : null
      })
    },
    async createColumn(input: CreateColumnRequest): Promise<void> {
      if (!this.board) return
      await this.perform(async () => {
        this.board!.columns.push(
          await streamKitApiClient.createColumn(this.board!.workspace.id, input),
        )
      })
    },
    async updateColumn(id: string, input: UpdateColumnRequest): Promise<void> {
      await this.perform(async () => {
        const item = await streamKitApiClient.updateColumn(id, input)
        if (this.board) {
          this.board.columns = this.board.columns
            .map((value) => (value.id === id ? item : value))
            .sort((a, b) => a.position - b.position)
        }
      })
    },
    async deleteColumn(id: string, input: DeleteColumnRequest): Promise<void> {
      await this.perform(async () => {
        await streamKitApiClient.deleteColumn(id, input)
        if (this.selectedId) await this.loadBoard(this.selectedId)
      })
    },
    async createCard(columnId: string, input: CreateCardRequest): Promise<void> {
      await this.perform(async () => {
        this.board?.cards.push(await streamKitApiClient.createCard(columnId, input))
      })
    },
    async updateCard(id: string, input: UpdateCardRequest): Promise<void> {
      await this.perform(async () => {
        const item = await streamKitApiClient.updateCard(id, input)
        if (this.board)
          this.board.cards = this.board.cards.map((value) => (value.id === id ? item : value))
      })
    },
    async deleteCard(id: string): Promise<void> {
      await this.perform(async () => {
        await streamKitApiClient.deleteCard(id)
        if (this.board) this.board.cards = this.board.cards.filter((value) => value.id !== id)
      })
    },
    async moveCard(id: string, input: MoveCardRequest): Promise<void> {
      if (!this.board) return
      const snapshot = structuredClone(this.board.cards)
      const card = this.board.cards.find((item) => item.id === id)
      if (card) {
        card.columnId = input.columnId
        card.position = input.position
      }
      try {
        const saved = await streamKitApiClient.moveCard(id, input)
        await this.loadBoard(this.selectedId!)
        if (!saved) throw new Error('Falha ao mover')
      } catch (error) {
        this.board.cards = snapshot
        this.error = error instanceof Error ? error.message : 'Falha ao mover card'
        throw error
      }
    },
  },
  state: (): {
    board: TodoBoard | null
    error: string | null
    loading: boolean
    selectedId: string | null
    workspaces: Workspace[]
  } => ({ board: null, error: null, loading: false, selectedId: null, workspaces: [] }),
})
