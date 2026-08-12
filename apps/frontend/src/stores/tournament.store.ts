import type { CreateTournamentRequest, Tournament, TournamentDetail } from '@streamkit/contracts'
import { defineStore } from 'pinia'
import { streamKitApiClient } from '../services/streamkit-api.client'

export const useTournamentStore = defineStore('tournament', {
  state: (): {
    detail: TournamentDetail | null
    error: string | null
    items: Tournament[]
    loading: boolean
  } => ({ detail: null, error: null, items: [], loading: false }),
  actions: {
    async perform<T>(operation: () => Promise<T>) {
      this.error = null
      this.loading = true
      try {
        return await operation()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha no torneio'
        throw error
      } finally {
        this.loading = false
      }
    },
    async load() {
      await this.perform(async () => {
        this.items = (await streamKitApiClient.listTournaments()).items
        const active =
          this.items.find((item) => item.status === 'in_progress') ??
          this.items.find((item) => item.status !== 'archived')
        if (active) this.detail = await streamKitApiClient.tournament(active.id)
      })
    },
    async create(input: CreateTournamentRequest) {
      await this.perform(async () => {
        const item = await streamKitApiClient.createTournament(input)
        this.items.unshift(item)
        this.detail = await streamKitApiClient.tournament(item.id)
      })
    },
    async select(id: string) {
      this.detail = await this.perform(() => streamKitApiClient.tournament(id))
    },
    async mutate(operation: (id: string) => Promise<TournamentDetail>) {
      if (!this.detail) return
      this.detail = await this.perform(() => operation(this.detail!.tournament.id))
    },
    add(name: string) {
      return this.mutate((id) => streamKitApiClient.addTournamentParticipant(id, name))
    },
    addTeam(name: string, color: string | null) {
      return this.mutate((id) => streamKitApiClient.addTournamentTeam(id, { color, name }))
    },
    updateTeam(teamId: string, name: string, color: string | null, capacity: number) {
      return this.mutate((id) =>
        streamKitApiClient.updateTournamentTeam(id, teamId, { capacity, color, name }),
      )
    },
    addTeamMember(teamId: string, displayName: string, slotPosition: number) {
      return this.mutate((id) =>
        streamKitApiClient.addTournamentTeamMember(id, teamId, displayName, slotPosition),
      )
    },
    moveTeamMember(memberId: string, targetTeamId: string, targetSlotPosition: number) {
      return this.mutate((id) =>
        streamKitApiClient.moveTournamentTeamMember(id, memberId, targetTeamId, targetSlotPosition),
      )
    },
    reorderTeam(teamId: string, seed: number) {
      return this.mutate((id) => streamKitApiClient.reorderTournamentTeam(id, teamId, seed))
    },
    rename(participantId: string, name: string) {
      return this.mutate((id) =>
        streamKitApiClient.renameTournamentParticipant(id, participantId, name),
      )
    },
    remove(participantId: string) {
      return this.mutate((id) => streamKitApiClient.removeTournamentParticipant(id, participantId))
    },
    reorder(participantId: string, seed: number) {
      return this.mutate((id) =>
        streamKitApiClient.reorderTournamentParticipant(id, participantId, seed),
      )
    },
    shuffle() {
      return this.mutate((id) => streamKitApiClient.tournamentAction(id, 'shuffle'))
    },
    generate() {
      return this.mutate((id) => streamKitApiClient.tournamentAction(id, 'bracket/generate'))
    },
    start() {
      return this.mutate((id) => streamKitApiClient.tournamentAction(id, 'start'))
    },
    archive() {
      return this.mutate((id) => streamKitApiClient.tournamentAction(id, 'archive'))
    },
    winner(matchId: string, entryId: string) {
      return this.mutate((id) => streamKitApiClient.setTournamentWinner(id, matchId, entryId))
    },
    undo(matchId: string) {
      return this.mutate((id) => streamKitApiClient.undoTournamentResult(id, matchId))
    },
  },
})
