/// <reference types="vite/client" />

import type { BackendConnection, UpdateAppSettingsRequest } from '@streamkit/contracts'

declare global {
  interface Window {
    streamkit: {
      getBackendConnection: () => Promise<BackendConnection>
      getPlatform: () => Promise<NodeJS.Platform>
      applySettings: (settings: UpdateAppSettingsRequest) => Promise<void>
      openDevTools: () => Promise<void>
      openLogsDirectory: () => Promise<void>
    }
  }
}

export {}
