<script setup lang="ts">
import { useNotificationStore } from '../../stores/notification.store'

const notifications = useNotificationStore()
</script>

<template>
  <div class="notification-center" aria-live="polite" aria-relevant="additions removals">
    <article
      v-for="item in notifications.items"
      :key="item.id"
      class="notification"
      :class="`notification--${item.kind}`"
      :role="item.kind === 'error' ? 'alert' : 'status'"
    >
      <span class="notification__marker" aria-hidden="true" />
      <span>{{ item.message }}</span>
      <button
        type="button"
        aria-label="Dispensar notificação"
        @click="notifications.dismiss(item.id)"
      >
        ×
      </button>
    </article>
  </div>
</template>

<style scoped lang="scss">
.notification-center {
  position: fixed;
  z-index: var(--sk-z-tooltip, 40);
  display: grid;
  top: var(--sk-space-4, 1rem);
  right: var(--sk-space-4, 1rem);
  width: min(22rem, calc(100vw - 2 * var(--sk-space-4, 1rem)));
  gap: var(--sk-space-2, 0.5rem);
}

.notification {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--sk-space-2, 0.5rem);
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  border-radius: var(--sk-radius-md, 0.3125rem);
  padding: var(--sk-space-3, 0.75rem);
  background: var(--sk-bg-panel, #fff);
  box-shadow: var(--sk-notification-shadow, none);
}

.notification__marker {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--sk-accent, currentColor);
}

.notification--success .notification__marker {
  background: var(--sk-success, currentColor);
}

.notification--error .notification__marker {
  background: var(--sk-danger, currentColor);
}

.notification button {
  border: 0;
  background: transparent;
  color: var(--sk-fg-muted, currentColor);
  cursor: pointer;
}
</style>
