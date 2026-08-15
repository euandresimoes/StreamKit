import { exposeRenderizerBridge } from '@renderizer/vue/preload'
import type {
  BackendConnection,
  UpdateAppSettingsRequest,
  UpdateCommand,
  UpdateState,
} from '@streamkit/contracts'
import { contextBridge, ipcRenderer } from 'electron'

export type StreamKitBridge = {
  copyText: (text: string) => Promise<void>
  getBackendConnection: () => Promise<BackendConnection>
  getPlatform: () => Promise<NodeJS.Platform>
  applySettings: (settings: UpdateAppSettingsRequest) => Promise<void>
  openDevTools: () => Promise<void>
  openExternalAuth: (url: string) => Promise<void>
  openLogsDirectory: () => Promise<void>
  updateCommand: (command: UpdateCommand) => Promise<UpdateState>
  updateState: () => Promise<UpdateState | undefined>
  setUpdateActivity: (active: boolean) => Promise<void>
  onUpdateState: (listener: (state: UpdateState) => void) => () => void
  onFullscreenState: (listener: (fullscreen: boolean) => void) => () => void
}

const streamKitBridge: StreamKitBridge = {
  copyText: async (text) => ipcRenderer.invoke('streamkit:copy-text', text),
  applySettings: async (settings) => ipcRenderer.invoke('streamkit:apply-settings', settings),
  getBackendConnection: async () => ipcRenderer.invoke('streamkit:get-backend-connection'),
  getPlatform: async () => ipcRenderer.invoke('streamkit:get-platform'),
  openDevTools: async () => ipcRenderer.invoke('streamkit:open-devtools'),
  openExternalAuth: async (url) => ipcRenderer.invoke('streamkit:open-external-auth', url),
  openLogsDirectory: async () => ipcRenderer.invoke('streamkit:open-logs-directory'),
  updateCommand: async (command) => ipcRenderer.invoke('streamkit:update-command', command),
  updateState: async () => ipcRenderer.invoke('streamkit:update-state'),
  setUpdateActivity: async (active) => ipcRenderer.invoke('streamkit:update-activity', active),
  onUpdateState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => listener(state)
    ipcRenderer.on('streamkit:update-state', handler)
    return () => ipcRenderer.removeListener('streamkit:update-state', handler)
  },
  onFullscreenState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, fullscreen: boolean) => listener(fullscreen)
    ipcRenderer.on('streamkit:fullscreen-state', handler)
    return () => ipcRenderer.removeListener('streamkit:fullscreen-state', handler)
  },
}

contextBridge.exposeInMainWorld('streamkit', Object.freeze(streamKitBridge))
exposeRenderizerBridge()
