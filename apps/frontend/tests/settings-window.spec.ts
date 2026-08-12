import { ref } from 'vue'
import type { RenderizerBridge } from '@renderizer/vue'

import { showSettingsWindow } from '../src/app/settings-window'

function createBridge(control: RenderizerBridge['control']): RenderizerBridge {
  return {
    control,
    getState: async () => ({ isFullScreen: false, isMaximized: false }),
    isRenderizerHost: true,
    onClosed: () => () => undefined,
    onStateChange: () => () => undefined,
    ready: async () => undefined,
  }
}

describe('settings Renderizer window', () => {
  it('opens a single settings surface', () => {
    const open = ref(false)
    const control = jest.fn<
      ReturnType<RenderizerBridge['control']>,
      Parameters<RenderizerBridge['control']>
    >()

    showSettingsWindow(open, createBridge(control))

    expect(open.value).toBe(true)
    expect(control).not.toHaveBeenCalled()
  })

  it('focuses the existing surface instead of opening a duplicate', () => {
    const open = ref(true)
    const control = jest.fn<
      ReturnType<RenderizerBridge['control']>,
      Parameters<RenderizerBridge['control']>
    >()

    showSettingsWindow(open, createBridge(control))

    expect(control).toHaveBeenCalledWith('settings', 'focus')
  })
})
