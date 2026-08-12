<script setup lang="ts">
defineProps<{ text: string }>()
</script>

<template>
  <span class="base-tooltip" tabindex="0">
    <slot />
    <span class="base-tooltip__content" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped lang="scss">
.base-tooltip {
  position: relative;
  display: inline-flex;
}

.base-tooltip__content {
  position: absolute;
  z-index: var(--sk-z-tooltip, 40);
  bottom: calc(100% + var(--sk-space-1, 0.25rem));
  left: 50%;
  padding: var(--sk-space-1, 0.25rem) var(--sk-space-2, 0.5rem);
  border-radius: var(--sk-radius-sm, 0.1875rem);
  background: var(--sk-tooltip-bg, #171a20);
  color: var(--sk-tooltip-fg, #fff);
  font-size: var(--sk-font-size-xs, 0.6875rem);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, var(--sk-space-1, 0.25rem));
  transition: opacity var(--sk-motion-fast, 100ms) var(--sk-easing-standard, ease);
  white-space: nowrap;
}

.base-tooltip:hover .base-tooltip__content,
.base-tooltip:focus-within .base-tooltip__content {
  opacity: 1;
}
</style>
