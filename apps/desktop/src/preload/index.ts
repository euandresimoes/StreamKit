import { exposeRenderizerBridge } from '@renderizer/vue/preload'
import type {
  BackendConnection,
  UpdateAppSettingsRequest,
  UpdateCommand,
  UpdateState,
} from '@streamlet/contracts'
import { contextBridge, ipcRenderer } from 'electron'

export type StreamletBridge = {
  copyText: (text: string) => Promise<void>
  showNativeNotification: (title: string, body: string) => Promise<void>
  getAppVersion: () => Promise<string>
  playSystemSound: () => Promise<void>
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

const streamletBridge: StreamletBridge = {
  copyText: async (text) => ipcRenderer.invoke('streamlet:copy-text', text),
  showNativeNotification: async (title, body) =>
    ipcRenderer.invoke('streamlet:show-native-notification', title, body),
  getAppVersion: async () => ipcRenderer.invoke('streamlet:get-app-version'),
  playSystemSound: async () => ipcRenderer.invoke('streamlet:play-system-sound'),
  applySettings: async (settings) => ipcRenderer.invoke('streamlet:apply-settings', settings),
  getBackendConnection: async () => ipcRenderer.invoke('streamlet:get-backend-connection'),
  getPlatform: async () => ipcRenderer.invoke('streamlet:get-platform'),
  openDevTools: async () => ipcRenderer.invoke('streamlet:open-devtools'),
  openExternalAuth: async (url) => ipcRenderer.invoke('streamlet:open-external-auth', url),
  openLogsDirectory: async () => ipcRenderer.invoke('streamlet:open-logs-directory'),
  updateCommand: async (command) => ipcRenderer.invoke('streamlet:update-command', command),
  updateState: async () => ipcRenderer.invoke('streamlet:update-state'),
  setUpdateActivity: async (active) => ipcRenderer.invoke('streamlet:update-activity', active),
  onUpdateState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => listener(state)
    ipcRenderer.on('streamlet:update-state', handler)
    return () => ipcRenderer.removeListener('streamlet:update-state', handler)
  },
  onFullscreenState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, fullscreen: boolean) => listener(fullscreen)
    ipcRenderer.on('streamlet:fullscreen-state', handler)
    return () => ipcRenderer.removeListener('streamlet:fullscreen-state', handler)
  },
}

contextBridge.exposeInMainWorld('streamlet', Object.freeze(streamletBridge))
exposeRenderizerBridge()
