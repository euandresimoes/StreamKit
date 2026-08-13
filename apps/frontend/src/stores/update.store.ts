import type { UpdateState } from '@streamkit/contracts'
import { defineStore } from 'pinia'

export const useUpdateStore = defineStore('update', {
  state: (): { state: UpdateState | null } => ({ state: null }),
  actions: {
    async initialize() {
      this.state = (await window.streamkit.updateState()) ?? null
      window.streamkit.onUpdateState((state) => {
        this.state = state
      })
    },
    async check() {
      this.state = await window.streamkit.updateCommand({ action: 'check', manual: true })
    },
    async download() {
      this.state = await window.streamkit.updateCommand({ action: 'download' })
    },
    async install(active: boolean) {
      await window.streamkit.setUpdateActivity(active)
      this.state = await window.streamkit.updateCommand({ action: 'install' })
    },
    async skip(version: string) {
      this.state = await window.streamkit.updateCommand({ action: 'skip', version })
    },
  },
})
