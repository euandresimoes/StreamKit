<script setup lang="ts">
import BaseIconButton from '../base/BaseIconButton.vue'

export type AppModule = 'todo' | 'games' | 'giveaway'

defineProps<{ activeModule: AppModule }>()
defineEmits<{ navigate: [module: AppModule]; settings: [] }>()
</script>

<template>
  <aside class="app-sidebar" aria-label="Módulos do StreamKit">
    <div class="app-sidebar__brand" aria-label="StreamKit">SK</div>
    <nav>
      <button
        v-for="item in [
          { id: 'todo', icon: '✓', label: 'TODO' },
          { id: 'games', icon: '⌘', label: 'Games' },
          { id: 'giveaway', icon: '◇', label: 'Giveaway' },
        ]"
        :key="item.id"
        class="app-sidebar__item"
        :class="{ 'app-sidebar__item--active': activeModule === item.id }"
        type="button"
        :aria-current="activeModule === item.id ? 'page' : undefined"
        @click="$emit('navigate', item.id as AppModule)"
      >
        <span aria-hidden="true">{{ item.icon }}</span
        >{{ item.label }}
      </button>
    </nav>
    <BaseIconButton
      class="app-sidebar__settings"
      label="Abrir configurações"
      @click="$emit('settings')"
    >
      <span aria-hidden="true">⚙</span>
    </BaseIconButton>
  </aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  display: flex;
  width: var(--sk-size-sidebar, 13.5rem);
  min-height: 100vh;
  flex-direction: column;
  border-inline-end: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  background: var(--sk-sidebar-bg, transparent);
}

.app-sidebar__brand {
  display: flex;
  height: 3rem;
  align-items: center;
  padding: 0 var(--sk-space-4, 1rem);
  border-block-end: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  color: var(--sk-accent, currentColor);
  font-family: var(--sk-font-mono, monospace);
  font-weight: var(--sk-font-weight-medium, 600);
  letter-spacing: 0.12em;
}

.app-sidebar nav {
  display: grid;
  gap: var(--sk-space-1, 0.25rem);
  padding: var(--sk-space-2, 0.5rem);
}

.app-sidebar__item {
  display: flex;
  min-height: var(--sk-size-control-md, 2rem);
  align-items: center;
  gap: var(--sk-space-2, 0.5rem);
  border: 0;
  border-radius: var(--sk-radius-sm, 0.1875rem);
  padding: 0 var(--sk-space-3, 0.75rem);
  background: transparent;
  color: var(--sk-fg-secondary, currentColor);
  cursor: pointer;
  text-align: start;
}

.app-sidebar__item:hover {
  background: var(--sk-bg-hover, transparent);
  color: var(--sk-fg-primary, currentColor);
}

.app-sidebar__item--active {
  background: var(--sk-sidebar-active-bg, transparent);
  box-shadow: inset 0.1875rem 0 var(--sk-sidebar-active-fg, currentColor);
  color: var(--sk-sidebar-active-fg, currentColor);
}

.app-sidebar__settings {
  margin: auto var(--sk-space-3, 0.75rem) var(--sk-space-3, 0.75rem);
}

@media (max-width: 48rem) {
  .app-sidebar {
    width: 100%;
    min-height: auto;
    flex-direction: row;
    align-items: center;
    border-block-end: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
    border-inline-end: 0;
  }

  .app-sidebar__brand {
    width: 3rem;
    border-block-end: 0;
  }

  .app-sidebar nav {
    display: flex;
    flex: 1;
  }

  .app-sidebar__item--active {
    box-shadow: inset 0 -0.1875rem var(--sk-sidebar-active-fg, currentColor);
  }

  .app-sidebar__settings {
    margin: 0 var(--sk-space-2, 0.5rem) 0 0;
  }
}
</style>
