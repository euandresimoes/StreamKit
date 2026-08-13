export type IntegrationRuntimeConfig = {
  twitchClientId: string | null
  youtubeClientId: string | null
}

export const INTEGRATION_RUNTIME_CONFIG = Symbol('INTEGRATION_RUNTIME_CONFIG')

export const DEFAULT_INTEGRATION_RUNTIME_CONFIG: IntegrationRuntimeConfig = {
  twitchClientId: null,
  youtubeClientId: null,
}
