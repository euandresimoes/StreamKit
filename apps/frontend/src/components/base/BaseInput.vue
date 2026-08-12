<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    autocomplete?: string
    description?: string
    disabled?: boolean
    error?: string
    id: string
    label: string
    maxlength?: number
    modelValue: string
    placeholder?: string
    readonly?: boolean
    type?: 'text' | 'email' | 'password' | 'search'
  }>(),
  { disabled: false, readonly: false, type: 'text' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const messageId = `${props.id}-message`
</script>

<template>
  <label class="base-field" :for="id">
    <span class="base-field__label">{{ label }}</span>
    <input
      :id="id"
      class="base-field__control"
      :aria-describedby="description || error ? messageId : undefined"
      :aria-invalid="Boolean(error)"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :readonly="readonly"
      :type="type"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
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
