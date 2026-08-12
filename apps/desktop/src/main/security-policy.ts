import type { BrowserWindowConstructorOptions } from 'electron'

export function createSecureWebPreferences(
  preload: string,
): NonNullable<BrowserWindowConstructorOptions['webPreferences']> {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    preload,
    sandbox: true,
    webSecurity: true,
  }
}

export function isAllowedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}
