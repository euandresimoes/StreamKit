<script setup lang="ts">
withDefaults(defineProps<{ active?: boolean; disabled?: boolean; label: string }>(), {
  active: false,
  disabled: false,
})
defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    class="base-icon-button"
    :class="{ 'base-icon-button--active': active }"
    type="button"
    :aria-label="label"
    :aria-pressed="active"
    :disabled="disabled"
    :title="label"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.base-icon-button {
  display: inline-flex;
  width: var(--sk-size-control-md, 2rem);
  height: var(--sk-size-control-md, 2rem);
  align-items: center;
  justify-content: center;
  border: var(--sk-border-width, 1px) solid transparent;
  border-radius: var(--sk-radius-sm, 0.1875rem);
  background: transparent;
  color: var(--sk-fg-secondary, currentColor);
  cursor: pointer;
}

.base-icon-button:hover:not(:disabled),
.base-icon-button--active {
  background: var(--sk-bg-hover, transparent);
  color: var(--sk-accent, currentColor);
}
</style>
