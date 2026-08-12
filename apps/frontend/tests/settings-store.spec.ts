import { createPinia, setActivePinia } from 'pinia'

import { useSettingsStore } from '../src/stores/settings.store'

describe('settings store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shares theme and reduced-motion attributes reactively', () => {
    const settings = useSettingsStore()
    settings.theme = 'dark'
    settings.reduceMotion = true

    expect(settings.themeAttributes).toEqual({
      'data-reduced-motion': 'true',
      'data-theme': 'dark',
    })
  })
})
