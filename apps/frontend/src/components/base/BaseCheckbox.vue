<script setup lang="ts">
defineProps<{ disabled?: boolean; label: string; modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="base-checkbox">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span>{{ label }}</span>
  </label>
</template>

<style scoped lang="scss">
.base-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--sk-space-2, 0.5rem);
}

.base-checkbox input {
  width: 0.875rem;
  height: 0.875rem;
  margin: 0;
  accent-color: var(--sk-accent, currentColor);
}
</style>
