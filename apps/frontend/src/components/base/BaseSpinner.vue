<script setup lang="ts">
withDefaults(defineProps<{ label?: string; size?: 'small' | 'medium' }>(), {
  label: 'Carregando',
  size: 'medium',
})
</script>

<template>
  <span class="base-spinner" :class="`base-spinner--${size}`" role="status">
    <span aria-hidden="true" />
    <span class="u-visually-hidden">{{ label }}</span>
  </span>
</template>

<style scoped lang="scss">
.base-spinner span:first-child {
  display: block;
  width: 1.125rem;
  height: 1.125rem;
  border: 0.125rem solid var(--sk-spinner-track, currentColor);
  border-top-color: var(--sk-spinner-active, currentColor);
  border-radius: 50%;
  animation: spin var(--sk-motion-normal, 160ms) linear infinite;
}

.base-spinner--small span:first-child {
  width: 0.875rem;
  height: 0.875rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
