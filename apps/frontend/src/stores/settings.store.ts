import type {
  CredentialStatus,
  DiagnosticInfo,
  ThemePreference,
  UpdateAppSettingsRequest,
} from '@streamkit/contracts'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { streamKitApiClient } from '../services/streamkit-api.client'

export { type ThemePreference }
export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemePreference>('system'),
    reduceMotion = ref(false),
    openAtLogin = ref(false),
    minimizeToTray = ref(false),
    confirmExitDuringActive = ref(true),
    updatePreference = ref<'automatic' | 'notify' | 'manual'>('notify'),
    debugEnabled = ref(false)
  const hydrated = ref(false),
    error = ref<string | null>(null),
    credential = ref<CredentialStatus | null>(null),
    diagnosticInfo = ref<DiagnosticInfo | null>(null)
  const themeAttributes = computed(() => ({
    'data-reduced-motion': String(reduceMotion.value),
    'data-theme': theme.value,
  }))
  const snapshot = (): UpdateAppSettingsRequest => ({
    confirmExitDuringActive: confirmExitDuringActive.value,
    debugEnabled: debugEnabled.value,
    minimizeToTray: minimizeToTray.value,
    openAtLogin: openAtLogin.value,
    reduceMotion: reduceMotion.value,
    theme: theme.value,
    updatePreference: updatePreference.value,
  })
  let pending = Promise.resolve()
  async function load() {
    try {
      const value = await streamKitApiClient.settings()
      theme.value = value.theme
      reduceMotion.value = value.reduceMotion
      openAtLogin.value = value.openAtLogin
      minimizeToTray.value = value.minimizeToTray
      confirmExitDuringActive.value = value.confirmExitDuringActive
      updatePreference.value = value.updatePreference
      debugEnabled.value = value.debugEnabled
      credential.value = await streamKitApiClient.credentialStatus()
      hydrated.value = true
      await window.streamkit.applySettings(snapshot())
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : 'Falha ao carregar configurações'
    }
  }
  function persist() {
    if (!hydrated.value) return
    const value = snapshot()
    pending = pending.then(async () => {
      try {
        await streamKitApiClient.updateSettings(value)
        await window.streamkit.applySettings(value)
        error.value = null
      } catch (reason) {
        error.value = reason instanceof Error ? reason.message : 'Falha ao salvar configurações'
      }
    })
  }
  async function saveCredential(value: string) {
    credential.value = await streamKitApiClient.saveCredential(value)
  }
  async function removeCredential() {
    credential.value = await streamKitApiClient.removeCredential()
  }
  async function loadDiagnostics() {
    diagnosticInfo.value = await streamKitApiClient.diagnostics()
  }
  watch(
    [
      theme,
      reduceMotion,
      openAtLogin,
      minimizeToTray,
      confirmExitDuringActive,
      updatePreference,
      debugEnabled,
    ],
    persist,
  )
  return {
    confirmExitDuringActive,
    credential,
    debugEnabled,
    diagnosticInfo,
    error,
    hydrated,
    load,
    loadDiagnostics,
    minimizeToTray,
    openAtLogin,
    reduceMotion,
    removeCredential,
    saveCredential,
    theme,
    themeAttributes,
    updatePreference,
  }
})
