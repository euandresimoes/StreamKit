import type { CreateWorkspaceRequest, Workspace } from '@streamkit/contracts'
import { defineStore } from 'pinia'

import { streamKitApiClient } from '../services/streamkit-api.client'

export const useTodoStore = defineStore('todo', {
  actions: {
    async createWorkspace(input: CreateWorkspaceRequest): Promise<void> {
      this.error = null
      this.loading = true
      try {
        const workspace = await streamKitApiClient.createWorkspace(input)
        this.workspaces.push(workspace)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao criar workspace'
        throw error
      } finally {
        this.loading = false
      }
    },
    async loadWorkspaces(): Promise<void> {
      this.error = null
      this.loading = true
      try {
        const response = await streamKitApiClient.listWorkspaces()
        this.workspaces = response.items
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao carregar workspaces'
        throw error
      } finally {
        this.loading = false
      }
    },
  },
  state: (): { error: string | null; loading: boolean; workspaces: Workspace[] } => ({
    error: null,
    loading: false,
    workspaces: [],
  }),
})
