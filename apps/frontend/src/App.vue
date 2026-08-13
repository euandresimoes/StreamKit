<script setup lang="ts">
import { RenderWindow } from '@renderizer/vue'
import { computed, onMounted, ref, watch } from 'vue'

import { showSettingsWindow } from './app/settings-window'
import { BaseButton, BaseInput, BaseSelect, BaseToggle } from './components/base'
import PrimitiveShowcase from './components/showcase/PrimitiveShowcase.vue'
import AppSidebar, { type AppModule } from './components/shell/AppSidebar.vue'
import NotificationCenter from './components/shell/NotificationCenter.vue'
import TodoKanban from './components/todo/TodoKanban.vue'
import GiveawayPanel from './components/giveaway/GiveawayPanel.vue'
import TournamentPanel from './components/tournament/TournamentPanel.vue'
import { useNotificationStore } from './stores/notification.store'
import { useSettingsStore } from './stores/settings.store'
import { useTodoStore } from './stores/todo.store'
import { useUpdateStore } from './stores/update.store'
import { useGiveawayStore } from './stores/giveaway.store'
import { useTournamentStore } from './stores/tournament.store'

const todoStore = useTodoStore()
const settings = useSettingsStore()
const notifications = useNotificationStore()
const updates = useUpdateStore()
const giveawayStore = useGiveawayStore()
const tournamentStore = useTournamentStore()
const settingsOpen = ref(false)
const confirmUpdateInstall = ref(false)
const activeModule = ref<AppModule>('todo')
const showShowcase = ref(import.meta.env.DEV)
const livePixCredential = ref('')
const debugEnabled = computed(
  () =>
    import.meta.env.DEV || import.meta.env.VITE_STREAMKIT_DEBUG === 'true' || settings.debugEnabled,
)
const themeOptions = [
  { label: 'Sistema', value: 'system' },
  { label: 'Escuro', value: 'dark' },
  { label: 'Claro', value: 'light' },
]
const updateOptions = [
  { label: 'Notificar', value: 'notify' },
  { label: 'Automático', value: 'automatic' },
  { label: 'Manual', value: 'manual' },
]
const activeTitle = computed(
  () => ({ todo: 'TODO', games: 'Games', giveaway: 'Giveaway' })[activeModule.value],
)
const activeOperation = computed(
  () =>
    giveawayStore.detail?.giveaway.status === 'drawing' ||
    tournamentStore.detail?.tournament.status === 'in_progress',
)

watch(
  activeOperation,
  (active) => {
    void window.streamkit.setUpdateActivity(active)
  },
  { immediate: true },
)

function openSettings(): void {
  showSettingsWindow(settingsOpen)
}
async function saveLivePixCredential() {
  await settings.saveCredential(livePixCredential.value)
  livePixCredential.value = ''
}
async function copyDiagnostics() {
  await settings.loadDiagnostics()
  await globalThis.navigator.clipboard.writeText(
    JSON.stringify({ frontendVersion: '0.0.0', ...settings.diagnosticInfo }, null, 2),
  )
}
async function requestInstall() {
  if (activeOperation.value) confirmUpdateInstall.value = true
  else await updates.install(false)
}
async function confirmInstall() {
  await window.streamkit.setUpdateActivity(false)
  confirmUpdateInstall.value = false
  await updates.install(false)
}
function openDevTools() {
  void window.streamkit.openDevTools()
}
function openLogsDirectory() {
  void window.streamkit.openLogsDirectory()
}

onMounted(async () => {
  await settings.load()
  await updates.initialize()
  try {
    await todoStore.loadWorkspaces()
  } catch {
    notifications.notify(todoStore.error ?? 'Falha ao carregar workspaces.', 'error')
  }
})
</script>

<template>
  <div class="streamkit" v-bind="settings.themeAttributes">
    <AppSidebar
      :active-module="activeModule"
      @navigate="activeModule = $event"
      @settings="openSettings"
    />
    <main class="workspace">
      <header class="workspace__toolbar">
        <div>
          <span class="workspace__context">STREAMKIT /</span>
          <h1>{{ activeTitle }}</h1>
        </div>
        <div class="workspace__toolbar-actions">
          <span v-if="debugEnabled" class="debug-badge">DEBUG</span>
          <BaseButton v-if="debugEnabled" variant="ghost" @click="showShowcase = !showShowcase">
            {{ showShowcase ? 'Ocultar showcase' : 'Showcase' }}
          </BaseButton>
        </div>
      </header>

      <section v-if="activeModule === 'todo'" class="workspace__content">
        <TodoKanban />
        <PrimitiveShowcase v-if="showShowcase" />
      </section>
      <section v-else-if="activeModule === 'giveaway'" class="workspace__content">
        <GiveawayPanel />
      </section>
      <section v-else-if="activeModule === 'games'" class="workspace__content">
        <TournamentPanel />
      </section>

      <section v-else class="workspace__content standard-state" :aria-label="activeTitle">
        <span class="standard-state__icon" aria-hidden="true">◇</span>
        <h2>{{ activeTitle }}</h2>
        <p>Módulo preparado para a batch correspondente.</p>
      </section>
      <footer class="status-bar">
        <span><i aria-hidden="true" /> Backend local</span><span>{{ settings.theme }}</span>
        <span v-if="debugEnabled">Modo debug ativo</span>
      </footer>
    </main>
    <NotificationCenter />
    <BaseModal
      :open="Boolean(updates.state?.available)"
      title="Atualização disponível"
      @close="updates.state?.available && updates.skip(updates.state.available.version)"
    >
      <template v-if="updates.state?.available"
        ><h3>{{ updates.state.available.title }}</h3>
        <p>Versão {{ updates.state.available.version }} · canal {{ updates.state.channel }}</p>
        <p>{{ updates.state.available.changelog }}</p>
        <p v-if="updates.state.status === 'downloading'" role="status">
          Baixando… {{ Math.round(updates.state.progress ?? 0) }}%
        </p>
        <p v-if="updates.state.error" role="alert">
          {{ updates.state.error }}. O StreamKit continua disponível.
        </p></template
      >
      <template #footer
        ><BaseButton
          v-if="updates.state?.available"
          variant="ghost"
          @click="updates.skip(updates.state.available.version)"
          >Pular esta versão</BaseButton
        ><BaseButton
          v-if="updates.state?.status === 'available'"
          variant="primary"
          @click="updates.download"
          >Atualizar agora</BaseButton
        ><BaseButton
          v-if="updates.state?.status === 'downloaded'"
          variant="primary"
          @click="requestInstall"
          >Instalar e reiniciar</BaseButton
        ></template
      >
    </BaseModal>
    <BaseModal
      :open="confirmUpdateInstall"
      title="Interromper operação ativa?"
      @close="confirmUpdateInstall = false"
      ><p>
        A instalação fechará o aplicativo. Confirme somente após salvar ou concluir a operação
        atual.
      </p>
      <template #footer
        ><BaseButton variant="ghost" @click="confirmUpdateInstall = false">Cancelar</BaseButton
        ><BaseButton variant="danger" @click="confirmInstall"
          >Instalar mesmo assim</BaseButton
        ></template
      ></BaseModal
    >

    <RenderWindow
      v-model:open="settingsOpen"
      config-id="settings"
      fallback="none"
      title="StreamKit — Configurações"
      window-id="settings"
    >
      <template #default="{ control }">
        <section class="settings-window" v-bind="settings.themeAttributes">
          <header>
            <div>
              <span>STREAMKIT</span>
              <h2>Aparência</h2>
            </div>
            <BaseButton variant="ghost" @click="control('close')">Fechar</BaseButton>
          </header>
          <div class="settings-window__body">
            <BaseSelect id="theme" v-model="settings.theme" label="Tema" :options="themeOptions" />
            <BaseToggle
              v-model="settings.reduceMotion"
              description="Reduz transições e animações não essenciais."
              label="Reduzir movimento"
            />
            <BaseToggle v-model="settings.openAtLogin" label="Abrir com o sistema" />
            <BaseToggle v-model="settings.minimizeToTray" label="Minimizar para a bandeja" />
            <BaseToggle
              v-model="settings.confirmExitDuringActive"
              label="Confirmar saída durante atividade"
            />
            <BaseSelect
              id="update-preference"
              v-model="settings.updatePreference"
              label="Atualizações"
              :options="updateOptions"
            />
            <BaseButton @click="updates.check">Verificar atualizações agora</BaseButton>
            <section class="settings-group">
              <h3>LivePix</h3>
              <BaseInput
                id="livepix-credential"
                v-model="livePixCredential"
                type="password"
                autocomplete="off"
                label="Credencial"
                description="Armazenada pelo cofre seguro do sistema; nunca no SQLite."
              />
              <div>
                <BaseButton
                  :disabled="!livePixCredential.trim() || settings.credential?.available === false"
                  @click="saveLivePixCredential"
                  >Salvar no cofre</BaseButton
                ><BaseButton
                  variant="danger"
                  :disabled="!settings.credential?.configured"
                  @click="settings.removeCredential"
                  >Remover</BaseButton
                >
              </div>
              <p role="status">
                {{
                  settings.credential?.available
                    ? settings.credential.configured
                      ? 'Credencial configurada'
                      : 'Credencial não configurada'
                    : 'Cofre seguro indisponível'
                }}
              </p>
            </section>
            <section class="settings-group">
              <h3>Desenvolvedor</h3>
              <BaseToggle v-model="settings.debugEnabled" label="Modo debug" />
              <div>
                <BaseButton @click="openDevTools">Abrir DevTools</BaseButton
                ><BaseButton @click="settings.loadDiagnostics">Mostrar logs</BaseButton
                ><BaseButton @click="copyDiagnostics">Copiar diagnóstico</BaseButton
                ><BaseButton @click="openLogsDirectory">Abrir pasta de logs</BaseButton>
              </div>
              <p>
                Frontend 0.0.0 · Backend {{ settings.diagnosticInfo?.backendVersion ?? '—' }} ·
                Schema {{ settings.diagnosticInfo?.databaseSchemaVersion ?? '—' }}
              </p>
              <pre v-if="settings.diagnosticInfo">{{
                settings.diagnosticInfo.logLines.join('\n')
              }}</pre>
            </section>
            <p v-if="settings.error" role="alert">{{ settings.error }}</p>
            <p role="status">{{ todoStore.workspaces.length }} workspace(s) sincronizado(s).</p>
          </div>
        </section>
      </template>
    </RenderWindow>
  </div>
</template>

<style scoped lang="scss">
.streamkit {
  display: flex;
  min-height: 100vh;
  background: var(--sk-bg-app, #f3f4f6);
  color: var(--sk-fg-primary, #171a20);
}

.workspace {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-rows: auto 1fr var(--sk-size-statusbar, 1.5rem);
}

.workspace__toolbar {
  display: flex;
  min-height: 3rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-space-3, 0.75rem);
  padding: 0 var(--sk-space-4, 1rem);
  border-block-end: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  background: var(--sk-bg-panel, transparent);
}

.workspace__toolbar > div,
.workspace__toolbar-actions {
  display: flex;
  align-items: baseline;
  gap: var(--sk-space-2, 0.5rem);
}

.workspace__context {
  color: var(--sk-fg-muted, currentColor);
  font-family: var(--sk-font-mono, monospace);
  font-size: var(--sk-font-size-xs, 0.6875rem);
}

.workspace h1,
.workspace h2,
.workspace h3 {
  margin: 0;
}

.workspace h1 {
  font-size: var(--sk-font-size-lg, 1rem);
}

.workspace__content {
  min-height: 0;
  overflow: auto;
  padding: var(--sk-space-4, 1rem);
}

.panel-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--sk-space-4, 1rem);
  margin-block-end: var(--sk-space-4, 1rem);
}

.panel-heading span {
  color: var(--sk-fg-muted, currentColor);
  font-size: var(--sk-font-size-xs, 0.6875rem);
}

.workspace-form {
  display: flex;
  align-items: end;
  gap: var(--sk-space-2, 0.5rem);
}

.workspace-form .base-field {
  width: min(20rem, 40vw);
}

.workspace-list {
  display: grid;
  margin: 0 0 var(--sk-space-4, 1rem);
  padding: 0;
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  background: var(--sk-bg-panel, transparent);
  list-style: none;
}

.workspace-list li {
  display: grid;
  min-height: 2.5rem;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--sk-space-2, 0.5rem);
  padding: 0 var(--sk-space-3, 0.75rem);
  border-block-end: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
}

.workspace-list li:last-child {
  border-block-end: 0;
}

.workspace-list li:hover {
  background: var(--sk-bg-hover, transparent);
}

.workspace-list small {
  color: var(--sk-success, currentColor);
}

.standard-state {
  display: grid;
  min-height: 15rem;
  align-content: center;
  justify-items: center;
  color: var(--sk-fg-secondary, currentColor);
  text-align: center;
}

.standard-state__icon {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  margin-block-end: var(--sk-space-2, 0.5rem);
  border: var(--sk-border-width, 1px) solid var(--sk-border-strong, currentColor);
  border-radius: 50%;
  place-items: center;
}

.standard-state--error .standard-state__icon {
  border-color: var(--sk-danger, currentColor);
  color: var(--sk-danger, currentColor);
}

.status-bar {
  display: flex;
  align-items: center;
  gap: var(--sk-space-4, 1rem);
  padding: 0 var(--sk-space-3, 0.75rem);
  background: var(--sk-accent, #1668c7);
  color: var(--sk-fg-on-accent, #fff);
  font-size: var(--sk-font-size-xs, 0.6875rem);
}

.status-bar i {
  display: inline-block;
  width: 0.4375rem;
  height: 0.4375rem;
  margin-inline-end: var(--sk-space-1, 0.25rem);
  border-radius: 50%;
  background: var(--sk-success, #66d9a3);
}

.debug-badge {
  border: var(--sk-border-width, 1px) solid var(--sk-warning, currentColor);
  border-radius: var(--sk-radius-sm, 0.1875rem);
  padding: var(--sk-space-1, 0.25rem) var(--sk-space-2, 0.5rem);
  color: var(--sk-warning, currentColor);
  font: var(--sk-font-size-xs, 0.6875rem) var(--sk-font-mono, monospace);
}

.settings-window {
  min-height: 100vh;
  background: var(--sk-bg-app, #f3f4f6);
  color: var(--sk-fg-primary, #171a20);
}

.settings-window > header {
  display: flex;
  min-height: 3rem;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sk-space-4, 1rem);
  border-block-end: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  background: var(--sk-bg-panel, transparent);
}

.settings-window header span {
  color: var(--sk-fg-muted, currentColor);
  font-size: var(--sk-font-size-xs, 0.6875rem);
}

.settings-window__body {
  display: grid;
  max-width: 34rem;
  gap: var(--sk-space-4, 1rem);
  padding: var(--sk-space-4, 1rem);
}
.settings-group {
  display: grid;
  gap: var(--sk-space-3, 0.75rem);
  padding-block: var(--sk-space-3, 0.75rem);
  border-block-start: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
}
.settings-group > div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sk-space-2, 0.5rem);
}
.settings-group pre {
  max-height: 14rem;
  overflow: auto;
  padding: var(--sk-space-2, 0.5rem);
  background: var(--sk-bg-elevated, transparent);
  font: var(--sk-font-size-xs, 0.6875rem) var(--sk-font-mono, monospace);
  white-space: pre-wrap;
}

@media (max-width: 48rem) {
  .streamkit {
    flex-direction: column;
  }

  .workspace-form,
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .workspace-form .base-field {
    width: 100%;
  }
}
</style>
