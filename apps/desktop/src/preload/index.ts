import { exposeRenderizerBridge } from '@renderizer/vue/preload'
import type { BackendConnection, UpdateAppSettingsRequest } from '@streamkit/contracts'
import { contextBridge, ipcRenderer } from 'electron'

export type StreamKitBridge = {
  getBackendConnection: () => Promise<BackendConnection>
  getPlatform: () => Promise<NodeJS.Platform>
  applySettings: (settings: UpdateAppSettingsRequest) => Promise<void>
  openDevTools: () => Promise<void>
  openLogsDirectory: () => Promise<void>
}

const streamKitBridge: StreamKitBridge = {
  applySettings: async (settings) => ipcRenderer.invoke('streamkit:apply-settings', settings),
  getBackendConnection: async () => ipcRenderer.invoke('streamkit:get-backend-connection'),
  getPlatform: async () => ipcRenderer.invoke('streamkit:get-platform'),
  openDevTools: async () => ipcRenderer.invoke('streamkit:open-devtools'),
  openLogsDirectory: async () => ipcRenderer.invoke('streamkit:open-logs-directory'),
}

contextBridge.exposeInMainWorld('streamkit', Object.freeze(streamKitBridge))
exposeRenderizerBridge()
