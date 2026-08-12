<script setup lang="ts">
import BaseSpinner from './BaseSpinner.vue'

withDefaults(
  defineProps<{
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  }>(),
  { disabled: false, loading: false, type: 'button', variant: 'secondary' },
)
</script>

<template>
  <button
    class="base-button"
    :class="`base-button--${variant}`"
    :disabled="disabled || loading"
    :type="type"
  >
    <BaseSpinner v-if="loading" label="Processando" size="small" />
    <slot />
  </button>
</template>

<style scoped lang="scss">
.base-button {
  display: inline-flex;
  min-height: var(--sk-size-control-md, 2rem);
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-2, 0.5rem);
  border: var(--sk-border-width, 1px) solid var(--sk-button-border, currentColor);
  border-radius: var(--sk-button-radius, 0.1875rem);
  padding: 0 var(--sk-space-3, 0.75rem);
  background: var(--sk-button-bg, transparent);
  box-shadow: var(--sk-button-shadow, none);
  color: var(--sk-button-fg, currentColor);
  cursor: pointer;
  font-weight: var(--sk-font-weight-medium, 600);
  transition:
    background var(--sk-motion-fast, 100ms) var(--sk-easing-standard, ease),
    border-color var(--sk-motion-fast, 100ms) var(--sk-easing-standard, ease);
}

.base-button:hover:not(:disabled) {
  background: var(--sk-bg-hover, transparent);
  border-color: var(--sk-border-strong, currentColor);
}

.base-button:active:not(:disabled) {
  transform: translateY(var(--sk-border-width, 1px));
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: var(--sk-opacity-disabled, 0.48);
}

.base-button--primary {
  border-color: var(--sk-button-primary-bg, currentColor);
  background: var(--sk-button-primary-bg, currentColor);
  color: var(--sk-button-primary-fg, #fff);
}

.base-button--primary:hover:not(:disabled) {
  background: var(--sk-accent-hover, currentColor);
}

.base-button--danger {
  border-color: var(--sk-danger, currentColor);
  color: var(--sk-danger, currentColor);
}

.base-button--ghost {
  border-color: transparent;
  background: transparent;
}
</style>
