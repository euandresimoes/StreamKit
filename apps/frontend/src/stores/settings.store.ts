import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemePreference = 'dark' | 'light' | 'system'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemePreference>('system')
  const reduceMotion = ref(false)
  const themeAttributes = computed(() => ({
    'data-reduced-motion': String(reduceMotion.value),
    'data-theme': theme.value,
  }))

  return { reduceMotion, theme, themeAttributes }
})
