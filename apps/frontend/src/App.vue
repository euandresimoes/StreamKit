<script setup lang="ts">
import { RenderWindow } from '@renderizer/vue'
import { onMounted, ref } from 'vue'

import { showSettingsWindow } from './app/settings-window'
import { useTodoStore } from './stores/todo.store'

const todoStore = useTodoStore()
const workspaceName = ref('')
const settingsOpen = ref(false)
const theme = ref<'dark' | 'light'>('dark')

async function createWorkspace(): Promise<void> {
  const name = workspaceName.value
  if (!name.trim()) return

  await todoStore.createWorkspace({ name })
  workspaceName.value = ''
}

function openSettings(): void {
  showSettingsWindow(settingsOpen)
}

onMounted(async () => {
  await todoStore.loadWorkspaces()
})
</script>

<template>
  <main class="app-shell" :data-theme="theme">
    <header class="app-header">
      <div>
        <p class="eyebrow">STREAMKIT</p>
        <h1>Workspaces</h1>
      </div>
      <button type="button" data-testid="open-settings" @click="openSettings">Configurações</button>
    </header>

    <form class="workspace-form" @submit.prevent="createWorkspace">
      <label for="workspace-name">Nome do workspace</label>
      <div class="form-row">
        <input
          id="workspace-name"
          v-model="workspaceName"
          maxlength="120"
          placeholder="Ex.: Filmes"
        />
        <button type="submit" :disabled="todoStore.loading || !workspaceName.trim()">Criar</button>
      </div>
    </form>

    <p v-if="todoStore.loading">Carregando…</p>
    <p v-else-if="todoStore.error" role="alert">
      {{ todoStore.error }}
    </p>
    <p v-else-if="todoStore.workspaces.length === 0">Crie seu primeiro workspace.</p>
    <ul v-else class="workspace-list">
      <li v-for="workspace in todoStore.workspaces" :key="workspace.id">
        {{ workspace.name }}
      </li>
    </ul>

    <RenderWindow
      v-model:open="settingsOpen"
      config-id="settings"
      fallback="none"
      title="StreamKit — Configurações"
      window-id="settings"
    >
      <template #default="{ control }">
        <section class="settings-window" :data-theme="theme">
          <header>
            <div>
              <p class="eyebrow">STREAMKIT</p>
              <h2>Configurações</h2>
            </div>
            <button type="button" @click="control('close')">Fechar</button>
          </header>
          <label>
            Tema compartilhado
            <select v-model="theme">
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
            </select>
          </label>
          <p>{{ todoStore.workspaces.length }} workspace(s) sincronizado(s).</p>
        </section>
      </template>
    </RenderWindow>
  </main>
</template>

<style lang="scss">
:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: #0d0f13;
  color: #f4f6fb;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input,
select {
  font: inherit;
}

.app-shell,
.settings-window {
  min-height: 100vh;
  padding: 32px;
  background: #111318;
  color: #f4f6fb;

  &[data-theme='light'] {
    background: #f4f6fb;
    color: #151821;
  }
}

.app-header,
.settings-window > header,
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin: 0;
  color: #8ea8ff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

h1,
h2 {
  margin: 4px 0 0;
}

.workspace-form {
  max-width: 680px;
  margin-top: 48px;
}

.workspace-form label {
  display: block;
  margin-bottom: 8px;
}

.form-row input {
  flex: 1;
}

input,
select,
button {
  min-height: 40px;
  border: 1px solid #3c4352;
  border-radius: 8px;
  padding: 8px 12px;
  background: #20242d;
  color: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.workspace-list {
  display: grid;
  max-width: 680px;
  padding: 0;
  gap: 8px;
  list-style: none;
}

.workspace-list li {
  border: 1px solid #303641;
  border-radius: 8px;
  padding: 16px;
}
</style>
