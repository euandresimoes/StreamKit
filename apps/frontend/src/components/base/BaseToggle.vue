<script setup lang="ts">
defineProps<{ description?: string; disabled?: boolean; label: string; modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="base-toggle" :class="{ 'base-toggle--disabled': disabled }">
    <span>
      <strong>{{ label }}</strong>
      <small v-if="description">{{ description }}</small>
    </span>
    <input
      class="u-visually-hidden"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      role="switch"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="base-toggle__track" aria-hidden="true"><span /></span>
  </label>
</template>

<style scoped lang="scss">
.base-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-space-3, 0.75rem);
  cursor: pointer;
}

.base-toggle strong,
.base-toggle small {
  display: block;
}

.base-toggle small {
  color: var(--sk-fg-muted, currentColor);
}

.base-toggle__track {
  display: flex;
  width: 2rem;
  height: 1.125rem;
  flex: none;
  align-items: center;
  border-radius: 1rem;
  padding: var(--sk-border-width, 1px);
  background: var(--sk-toggle-track, currentColor);
  transition: background var(--sk-motion-fast, 100ms) var(--sk-easing-standard, ease);
}

.base-toggle__track span {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: var(--sk-fg-on-accent, #fff);
  transition: transform var(--sk-motion-fast, 100ms) var(--sk-easing-standard, ease);
}

input:checked + .base-toggle__track {
  background: var(--sk-toggle-active, currentColor);
}

input:checked + .base-toggle__track span {
  transform: translateX(0.875rem);
}

input:focus-visible + .base-toggle__track {
  outline: var(--sk-focus-width, 2px) solid var(--sk-focus-color, currentColor);
  outline-offset: var(--sk-focus-offset, 2px);
}

.base-toggle--disabled {
  cursor: not-allowed;
  opacity: var(--sk-opacity-disabled, 0.48);
}
</style>
