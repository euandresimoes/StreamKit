<script setup lang="ts">
withDefaults(
  defineProps<{
    disabled?: boolean
    id: string
    label: string
    max?: number
    min?: number
    modelValue: number
    step?: number
  }>(),
  { max: 100, min: 0, step: 1 },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <label class="base-slider" :for="id">
    <span>{{ label }}</span
    ><output :for="id">{{ modelValue }}</output>
    <input
      :id="id"
      type="range"
      :disabled="disabled"
      :max="max"
      :min="min"
      :step="step"
      :value="modelValue"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
  </label>
</template>

<style scoped lang="scss">
.base-slider {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--sk-space-1, 0.25rem) var(--sk-space-2, 0.5rem);
  color: var(--sk-fg-secondary, currentColor);
}

.base-slider output {
  color: var(--sk-fg-primary, currentColor);
  font-family: var(--sk-font-mono, monospace);
}

.base-slider input {
  width: 100%;
  grid-column: 1 / -1;
  accent-color: var(--sk-accent, currentColor);
}
</style>
