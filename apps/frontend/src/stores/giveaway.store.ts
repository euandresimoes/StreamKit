import type {
  CreateGiveawayRequest,
  DuplicatePolicy,
  Giveaway,
  GiveawayDetail,
  GiveawayRound,
  ParticipantPreview,
} from '@streamkit/contracts'
import { defineStore } from 'pinia'
import { streamKitApiClient } from '../services/streamkit-api.client'

export const useGiveawayStore = defineStore('giveaway', {
  state: (): {
    detail: GiveawayDetail | null
    error: string | null
    history: GiveawayRound[]
    items: Giveaway[]
    loading: boolean
    preview: ParticipantPreview | null
  } => ({ detail: null, error: null, history: [], items: [], loading: false, preview: null }),
  actions: {
    async perform<T>(fn: () => Promise<T>): Promise<T> {
      this.error = null
      this.loading = true
      try {
        return await fn()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha no giveaway'
        throw error
      } finally {
        this.loading = false
      }
    },
    async load() {
      await this.perform(async () => {
        this.items = (await streamKitApiClient.listGiveaways()).items
        const active = this.items.find((item) => item.status === 'drawing') ?? this.items[0]
        if (active) await this.select(active.id)
      })
    },
    async create(input: CreateGiveawayRequest) {
      await this.perform(async () => {
        const item = await streamKitApiClient.createGiveaway(input)
        this.items.unshift(item)
        await this.select(item.id)
      })
    },
    async select(id: string) {
      this.detail = await streamKitApiClient.giveaway(id)
      this.history = (await streamKitApiClient.giveawayHistory(id)).items
    },
    async parse(input: string, policy: DuplicatePolicy) {
      this.preview = await this.perform(() => streamKitApiClient.previewParticipants(input, policy))
    },
    async import(input: string, policy: DuplicatePolicy) {
      if (!this.detail) return
      this.detail = await this.perform(() =>
        streamKitApiClient.importParticipants(this.detail!.giveaway.id, input, policy),
      )
    },
    async prepare() {
      if (!this.detail) return
      const item = await this.perform(() =>
        streamKitApiClient.prepareGiveaway(this.detail!.giveaway.id),
      )
      this.detail.giveaway = item
    },
    async draw() {
      if (!this.detail) return
      const round = await this.perform(() =>
        streamKitApiClient.drawGiveaway(this.detail!.giveaway.id),
      )
      this.detail.activeRound = round
      this.detail.giveaway.status = 'drawing'
    },
    async complete() {
      const round = this.detail?.activeRound
      if (!this.detail || !round) return
      this.detail.activeRound = await this.perform(() =>
        streamKitApiClient.completeGiveaway(this.detail!.giveaway.id, round.id),
      )
      this.detail.giveaway.status = 'completed'
      await this.select(this.detail.giveaway.id)
    },
    async nextRound(removeWinner: boolean) {
      if (!this.detail) return
      this.detail = await this.perform(() =>
        streamKitApiClient.nextGiveawayRound(this.detail!.giveaway.id, removeWinner),
      )
    },
  },
})
