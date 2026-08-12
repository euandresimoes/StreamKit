<script setup lang="ts">
const props = defineProps<{
  description?: string
  disabled?: boolean
  error?: string
  id: string
  label: string
  modelValue: string
  readonly?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const messageId = `${props.id}-message`
</script>

<template>
  <label class="base-field" :for="id">
    <span class="base-field__label">{{ label }}</span>
    <textarea
      :id="id"
      class="base-field__control"
      :aria-describedby="description || error ? messageId : undefined"
      :aria-invalid="Boolean(error)"
      :disabled="disabled"
      :readonly="readonly"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <span
      v-if="description || error"
      :id="messageId"
      class="base-field__message"
      :class="{ 'base-field__message--error': error }"
    >
      {{ error || description }}
    </span>
  </label>
</template>
