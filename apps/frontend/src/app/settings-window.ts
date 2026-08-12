import type { Ref } from 'vue'
import type { RenderizerBridge } from '@renderizer/vue'

export function showSettingsWindow(
  open: Ref<boolean>,
  bridge: RenderizerBridge | undefined = window.renderizer,
): void {
  if (open.value) {
    void bridge?.control('settings', 'focus')
    return
  }
  open.value = true
}
