/// <reference types="vite/client" />

import type {
  BackendConnection,
  UpdateAppSettingsRequest,
  UpdateCommand,
  UpdateState,
} from '@streamkit/contracts'

declare global {
  interface Window {
    streamkit: {
      getBackendConnection: () => Promise<BackendConnection>
      getPlatform: () => Promise<NodeJS.Platform>
      applySettings: (settings: UpdateAppSettingsRequest) => Promise<void>
      openDevTools: () => Promise<void>
      openLogsDirectory: () => Promise<void>
      updateCommand: (command: UpdateCommand) => Promise<UpdateState>
      updateState: () => Promise<UpdateState | undefined>
      setUpdateActivity: (active: boolean) => Promise<void>
      onUpdateState: (listener: (state: UpdateState) => void) => () => void
    }
  }
}

export {}
