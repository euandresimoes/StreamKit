import { exposeRenderizerBridge } from '@renderizer/vue/preload'
import type { BackendConnection } from '@streamkit/contracts'
import { contextBridge, ipcRenderer } from 'electron'

export type StreamKitBridge = {
  getBackendConnection: () => Promise<BackendConnection>
  getPlatform: () => Promise<NodeJS.Platform>
}

const streamKitBridge: StreamKitBridge = {
  getBackendConnection: async () => ipcRenderer.invoke('streamkit:get-backend-connection'),
  getPlatform: async () => ipcRenderer.invoke('streamkit:get-platform'),
}

contextBridge.exposeInMainWorld('streamkit', Object.freeze(streamKitBridge))
exposeRenderizerBridge()
