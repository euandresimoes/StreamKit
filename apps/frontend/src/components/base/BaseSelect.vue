<script setup lang="ts">
type SelectOption = { disabled?: boolean; label: string; value: string }

const props = defineProps<{
  disabled?: boolean
  error?: string
  id: string
  label: string
  modelValue: string
  options: SelectOption[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const messageId = `${props.id}-message`
</script>

<template>
  <label class="base-field" :for="id">
    <span class="base-field__label">{{ label }}</span>
    <select
      :id="id"
      class="base-field__control"
      :aria-describedby="error ? messageId : undefined"
      :aria-invalid="Boolean(error)"
      :disabled="disabled"
      :value="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :disabled="option.disabled"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <span v-if="error" :id="messageId" class="base-field__message base-field__message--error">
      {{ error }}
    </span>
  </label>
</template>
