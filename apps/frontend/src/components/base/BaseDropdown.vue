<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

withDefaults(defineProps<{ align?: 'start' | 'end'; disabled?: boolean; label: string }>(), {
  align: 'start',
  disabled: false,
})
const open = ref(false)

function close(): void {
  open.value = false
}
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}
window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="base-dropdown" @focusout="!$el.contains($event.relatedTarget) && close()">
    <button
      class="base-dropdown__trigger"
      type="button"
      :aria-expanded="open"
      :disabled="disabled"
      @click="open = !open"
    >
      {{ label }} <span aria-hidden="true">▾</span>
    </button>
    <div v-if="open" class="base-dropdown__menu" :class="`base-dropdown__menu--${align}`">
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.base-dropdown {
  position: relative;
  display: inline-flex;
}

.base-dropdown__trigger {
  min-height: var(--sk-size-control-md, 2rem);
  border: var(--sk-border-width, 1px) solid var(--sk-button-border, currentColor);
  border-radius: var(--sk-button-radius, 0.1875rem);
  padding: 0 var(--sk-space-2, 0.5rem);
  background: var(--sk-button-bg, transparent);
  color: var(--sk-button-fg, currentColor);
  cursor: pointer;
}

.base-dropdown__menu {
  position: absolute;
  z-index: var(--sk-z-dropdown, 30);
  top: calc(100% + var(--sk-space-1, 0.25rem));
  min-width: 10rem;
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  border-radius: var(--sk-radius-md, 0.3125rem);
  padding: var(--sk-space-1, 0.25rem);
  background: var(--sk-dropdown-bg, #fff);
  box-shadow: var(--sk-dropdown-shadow, none);
}

.base-dropdown__menu--end {
  right: 0;
}
</style>
