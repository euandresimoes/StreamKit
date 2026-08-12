/// <reference types="vite/client" />

import type { BackendConnection } from '@streamkit/contracts'

declare global {
  interface Window {
    streamkit: {
      getBackendConnection: () => Promise<BackendConnection>
      getPlatform: () => Promise<NodeJS.Platform>
    }
  }
}

export {}
