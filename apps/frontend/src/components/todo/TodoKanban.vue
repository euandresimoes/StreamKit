<script setup lang="ts">
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { computed, onBeforeUnmount, ref } from 'vue'
import { BaseButton, BaseInput, BaseModal, BaseSelect, BaseTextarea } from '../base'
import { useTodoStore } from '../../stores/todo.store'

const store = useTodoStore()
const workspaceName = ref('')
const columnName = ref('')
const cardTitles = ref<Record<string, string>>({})
const cleanups: Array<() => void> = []
const confirmWorkspaceDelete = ref(false)
const deletingColumnId = ref<string | null>(null)
const moveTargetId = ref('')
const editingCardId = ref<string | null>(null)
const editTitle = ref('')
const editDescription = ref('')
const editNotes = ref('')
const editingWorkspace = ref(false)
const editWorkspaceName = ref('')
const editWorkspaceDescription = ref('')
const editingColumnId = ref<string | null>(null)
const editColumnName = ref('')
const editColumnColor = ref('')
const workspaceOptions = computed(() =>
  store.workspaces.map((item) => ({ label: item.name, value: item.id })),
)
function cards(columnId: string) {
  return (store.board?.cards ?? [])
    .filter((card) => card.columnId === columnId)
    .sort((a, b) => a.position - b.position)
}
async function createWorkspace() {
  if (!workspaceName.value.trim()) return
  await store.createWorkspace({ name: workspaceName.value })
  workspaceName.value = ''
}
async function select(id: string) {
  if (id) await store.selectWorkspace(id)
}
async function createColumn() {
  if (!columnName.value.trim()) return
  await store.createColumn({ name: columnName.value })
  columnName.value = ''
}
async function createCard(columnId: string) {
  const title = cardTitles.value[columnId]?.trim()
  if (!title) return
  await store.createCard(columnId, { title })
  cardTitles.value[columnId] = ''
}
async function move(cardId: string, columnId: string, position: number) {
  await store.moveCard(cardId, { columnId, position })
}
function requestColumnDelete(columnId: string) {
  deletingColumnId.value = columnId
  moveTargetId.value = store.board?.columns.find((item) => item.id !== columnId)?.id ?? ''
}
async function deleteColumn(strategy: 'delete' | 'move') {
  if (!deletingColumnId.value) return
  await store.deleteColumn(
    deletingColumnId.value,
    strategy === 'delete' ? { strategy } : { strategy, targetColumnId: moveTargetId.value },
  )
  deletingColumnId.value = null
}
function editCard(card: {
  description: string | null
  id: string
  notes: string | null
  title: string
}) {
  editingCardId.value = card.id
  editTitle.value = card.title
  editDescription.value = card.description ?? ''
  editNotes.value = card.notes ?? ''
}
async function saveCard() {
  if (!editingCardId.value) return
  await store.updateCard(editingCardId.value, {
    title: editTitle.value,
    description: editDescription.value || null,
    notes: editNotes.value || null,
  })
  editingCardId.value = null
}
function editCurrentWorkspace() {
  if (!store.board) return
  editingWorkspace.value = true
  editWorkspaceName.value = store.board.workspace.name
  editWorkspaceDescription.value = store.board.workspace.description ?? ''
}
async function saveWorkspace() {
  await store.updateWorkspace({
    name: editWorkspaceName.value,
    description: editWorkspaceDescription.value || null,
  })
  editingWorkspace.value = false
}
function editColumn(column: { color: string | null; id: string; name: string }) {
  editingColumnId.value = column.id
  editColumnName.value = column.name
  editColumnColor.value = column.color ?? ''
}
async function saveColumn() {
  if (!editingColumnId.value) return
  await store.updateColumn(editingColumnId.value, {
    name: editColumnName.value,
    color: editColumnColor.value || null,
  })
  editingColumnId.value = null
}
async function deleteWorkspace() {
  await store.deleteWorkspace()
  confirmWorkspaceDelete.value = false
}
function bindCard(element: HTMLElement | null, cardId: string) {
  if (!(element instanceof HTMLElement)) return
  cleanups.push(draggable({ element, getInitialData: () => ({ cardId }) }))
}
function bindColumn(element: HTMLElement | null, columnId: string) {
  if (!(element instanceof HTMLElement)) return
  cleanups.push(
    dropTargetForElements({
      element,
      getData: () => ({ columnId }),
      onDrop: ({ source }) => {
        const cardId = source.data.cardId
        if (typeof cardId === 'string') void move(cardId, columnId, cards(columnId).length)
      },
    }),
  )
}
onBeforeUnmount(() => combine(...cleanups)())
</script>

<template>
  <section class="todo-shell" aria-labelledby="todo-title">
    <header class="todo-toolbar">
      <div>
        <h2 id="todo-title">Kanban</h2>
        <span>{{ store.workspaces.length }} workspace(s)</span>
      </div>
      <form @submit.prevent="createWorkspace">
        <BaseInput
          id="workspace-create"
          v-model="workspaceName"
          label="Novo workspace"
        /><BaseButton type="submit" :disabled="!workspaceName.trim()">Criar</BaseButton>
      </form>
    </header>
    <div v-if="store.loading && !store.board" class="standard-state" role="status">
      <h3>Carregando…</h3>
    </div>
    <div v-else-if="store.error" class="standard-state standard-state--error" role="alert">
      <h3>Erro recuperável</h3>
      <p>{{ store.error }}</p>
      <BaseButton @click="store.loadWorkspaces()">Tentar novamente</BaseButton>
    </div>
    <div v-else-if="store.workspaces.length === 0" class="standard-state">
      <h3>Nenhum workspace</h3>
      <p>Crie o primeiro para começar seu board.</p>
    </div>
    <template v-else>
      <nav class="board-actions" aria-label="Workspace ativo">
        <BaseSelect
          id="workspace-active"
          :model-value="store.selectedId ?? ''"
          label="Workspace"
          :options="workspaceOptions"
          @update:model-value="select"
        />
        <form @submit.prevent="createColumn">
          <BaseInput id="column-create" v-model="columnName" label="Nova coluna" /><BaseButton
            type="submit"
            :disabled="!columnName.trim()"
            >Adicionar coluna</BaseButton
          >
        </form>
        <BaseButton variant="ghost" @click="editCurrentWorkspace">Editar workspace</BaseButton>
        <BaseButton variant="danger" @click="confirmWorkspaceDelete = true"
          >Excluir workspace</BaseButton
        >
      </nav>
      <div v-if="store.board?.columns.length === 0" class="standard-state">
        <h3>Board vazio</h3>
        <p>Adicione a primeira coluna.</p>
      </div>
      <div v-else class="kanban" aria-label="Board Kanban">
        <article
          v-for="(column, columnIndex) in store.board?.columns"
          :key="column.id"
          :ref="(el) => bindColumn(el as HTMLElement, column.id)"
          class="kanban-column"
        >
          <header>
            <strong>{{ column.name }}</strong>
            <div>
              <BaseButton aria-label="Editar coluna" variant="ghost" @click="editColumn(column)"
                >Editar</BaseButton
              >
              <BaseButton
                aria-label="Mover coluna para esquerda"
                variant="ghost"
                :disabled="columnIndex === 0"
                @click="store.updateColumn(column.id, { position: columnIndex - 1 })"
                >←</BaseButton
              ><BaseButton
                aria-label="Mover coluna para direita"
                variant="ghost"
                :disabled="columnIndex === (store.board?.columns.length ?? 0) - 1"
                @click="store.updateColumn(column.id, { position: columnIndex + 1 })"
                >→</BaseButton
              ><BaseButton
                aria-label="Excluir coluna"
                variant="ghost"
                @click="requestColumnDelete(column.id)"
                >×</BaseButton
              >
            </div>
          </header>
          <ul>
            <li
              v-for="(card, index) in cards(column.id)"
              :key="card.id"
              :ref="(el) => bindCard(el as HTMLElement, card.id)"
              class="kanban-card"
            >
              <strong>{{ card.title }}</strong>
              <p v-if="card.description">{{ card.description }}</p>
              <div>
                <BaseButton aria-label="Editar card" variant="ghost" @click="editCard(card)"
                  >Editar</BaseButton
                >
                <BaseButton
                  aria-label="Mover card para cima"
                  variant="ghost"
                  :disabled="index === 0"
                  @click="move(card.id, column.id, index - 1)"
                  >↑</BaseButton
                ><BaseButton
                  aria-label="Mover card para baixo"
                  variant="ghost"
                  :disabled="index === cards(column.id).length - 1"
                  @click="move(card.id, column.id, index + 1)"
                  >↓</BaseButton
                ><BaseButton
                  aria-label="Excluir card"
                  variant="ghost"
                  @click="store.deleteCard(card.id)"
                  >Excluir</BaseButton
                >
              </div>
            </li>
          </ul>
          <form @submit.prevent="createCard(column.id)">
            <BaseTextarea
              :id="`card-${column.id}`"
              :model-value="cardTitles[column.id] ?? ''"
              label="Novo card"
              :maxlength="200"
              @update:model-value="cardTitles[column.id] = $event"
            /><BaseButton type="submit" :disabled="!cardTitles[column.id]?.trim()"
              >Adicionar</BaseButton
            >
          </form>
        </article>
      </div>
    </template>
    <BaseModal
      :open="confirmWorkspaceDelete"
      title="Excluir workspace?"
      @close="confirmWorkspaceDelete = false"
      ><p>Esta ação excluirá suas colunas e cards.</p>
      <template #actions
        ><BaseButton variant="ghost" @click="confirmWorkspaceDelete = false">Cancelar</BaseButton
        ><BaseButton variant="danger" @click="deleteWorkspace">Excluir</BaseButton></template
      ></BaseModal
    >
    <BaseModal
      :open="Boolean(deletingColumnId)"
      title="Excluir coluna"
      @close="deletingColumnId = null"
      ><p>Escolha explicitamente o destino dos cards.</p>
      <BaseSelect
        v-if="moveTargetId"
        id="column-delete-target"
        v-model="moveTargetId"
        label="Mover para"
        :options="
          (store.board?.columns ?? [])
            .filter((item) => item.id !== deletingColumnId)
            .map((item) => ({ label: item.name, value: item.id }))
        "
      /><template #actions
        ><BaseButton variant="ghost" @click="deletingColumnId = null">Cancelar</BaseButton
        ><BaseButton v-if="moveTargetId" @click="deleteColumn('move')">Mover cards</BaseButton
        ><BaseButton variant="danger" @click="deleteColumn('delete')"
          >Apagar cards</BaseButton
        ></template
      ></BaseModal
    >
    <BaseModal :open="Boolean(editingCardId)" title="Editar card" @close="editingCardId = null"
      ><BaseInput
        id="edit-card-title"
        v-model="editTitle"
        label="Título"
        :maxlength="200"
      /><BaseTextarea
        id="edit-card-description"
        v-model="editDescription"
        label="Descrição"
        :maxlength="2000"
      /><BaseTextarea
        id="edit-card-notes"
        v-model="editNotes"
        label="Notas"
        :maxlength="5000"
      /><template #actions
        ><BaseButton variant="ghost" @click="editingCardId = null">Cancelar</BaseButton
        ><BaseButton :disabled="!editTitle.trim()" @click="saveCard">Salvar</BaseButton></template
      ></BaseModal
    >
    <BaseModal :open="editingWorkspace" title="Editar workspace" @close="editingWorkspace = false"
      ><BaseInput
        id="edit-workspace-name"
        v-model="editWorkspaceName"
        label="Nome"
        :maxlength="120"
      /><BaseTextarea
        id="edit-workspace-description"
        v-model="editWorkspaceDescription"
        label="Descrição"
        :maxlength="500"
      /><template #actions
        ><BaseButton variant="ghost" @click="editingWorkspace = false">Cancelar</BaseButton
        ><BaseButton :disabled="!editWorkspaceName.trim()" @click="saveWorkspace"
          >Salvar</BaseButton
        ></template
      ></BaseModal
    >
    <BaseModal
      :open="Boolean(editingColumnId)"
      title="Editar coluna"
      @close="editingColumnId = null"
      ><BaseInput
        id="edit-column-name"
        v-model="editColumnName"
        label="Nome"
        :maxlength="120"
      /><BaseInput
        id="edit-column-color"
        v-model="editColumnColor"
        label="Cor hexadecimal opcional"
        placeholder="#336699"
      /><template #actions
        ><BaseButton variant="ghost" @click="editingColumnId = null">Cancelar</BaseButton
        ><BaseButton :disabled="!editColumnName.trim()" @click="saveColumn"
          >Salvar</BaseButton
        ></template
      ></BaseModal
    >
  </section>
</template>

<style scoped lang="scss">
.todo-shell {
  display: grid;
  gap: var(--sk-space-4, 1rem);
}
.todo-toolbar,
.board-actions,
.todo-toolbar form,
.board-actions form,
.kanban-column > header,
.kanban-card > div {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--sk-space-2, 0.5rem);
}
h2,
p {
  margin: 0;
}
.kanban {
  display: flex;
  min-height: 24rem;
  gap: var(--sk-space-3, 0.75rem);
  overflow: auto;
}
.kanban-column {
  flex: 0 0 18rem;
  padding: var(--sk-space-3, 0.75rem);
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  border-radius: var(--sk-radius-md, 0.375rem);
  background: var(--sk-bg-panel, transparent);
}
.kanban-column ul {
  display: grid;
  gap: var(--sk-space-2, 0.5rem);
  padding: 0;
  list-style: none;
}
.kanban-card {
  cursor: grab;
  padding: var(--sk-space-3, 0.75rem);
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  border-radius: var(--sk-radius-sm, 0.25rem);
  background: var(--sk-bg-app, #fff);
}
@media (max-width: 48rem) {
  .todo-toolbar,
  .board-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
