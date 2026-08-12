<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BaseButton, BaseInput, BaseModal, BaseSelect } from '../base'
import { useTournamentStore } from '../../stores/tournament.store'

const store = useTournamentStore(),
  name = ref(''),
  description = ref(''),
  participantName = ref(''),
  size = ref('4'),
  dragged = ref<string | null>(null),
  undoMatch = ref<string | null>(null)
const sizes = [4, 8, 16, 32].map((value) => ({ label: `${value} entradas`, value: String(value) }))
const rounds = computed(() => [
  ...new Set(store.detail?.matches.map((match) => match.roundNumber) ?? []),
])
const entryNames = computed(
  () =>
    new Map(
      store.detail?.participants.map((participant) => [
        participant.entryId,
        participant.displayName,
      ]) ?? [],
    ),
)
const structural = computed(() => store.detail?.tournament.status === 'draft')
async function create() {
  await store.create({
    bracketSize: Number(size.value) as 4 | 8 | 16 | 32,
    description: description.value.trim() || null,
    mode: 'individual',
    name: name.value,
  })
  name.value = ''
  description.value = ''
}
async function add() {
  await store.add(participantName.value)
  participantName.value = ''
}
function move(participantId: string, seed: number) {
  return store.reorder(participantId, seed)
}
function drop(seed: number) {
  if (dragged.value) void move(dragged.value, seed)
  dragged.value = null
}
async function confirmUndo() {
  if (undoMatch.value) await store.undo(undoMatch.value)
  undoMatch.value = null
}
function beforeUnload(event: globalThis.BeforeUnloadEvent) {
  if (store.detail?.tournament.status === 'in_progress') {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload)
  await store.load()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <section class="tournament" aria-labelledby="tournament-title">
    <header>
      <div>
        <h2 id="tournament-title">Torneio individual</h2>
        <p>Eliminação simples, local e auditável.</p>
      </div>
      <span v-if="store.detail" class="status">{{ store.detail.tournament.status }}</span>
    </header>
    <div v-if="store.loading && !store.detail" class="standard-state" role="status">
      Carregando…
    </div>
    <div v-else-if="store.error" class="standard-state standard-state--error" role="alert">
      {{ store.error }}
    </div>
    <form v-else-if="!store.detail" class="setup" @submit.prevent="create">
      <BaseInput id="tournament-name" v-model="name" label="Nome" /><BaseInput
        id="tournament-description"
        v-model="description"
        label="Descrição (opcional)"
      /><BaseSelect
        id="tournament-size"
        v-model="size"
        label="Tamanho"
        :options="sizes"
      /><BaseButton type="submit" :disabled="!name.trim()">Criar torneio</BaseButton>
    </form>
    <template v-else>
      <section v-if="structural" class="seeding" aria-labelledby="seeding-title">
        <div>
          <h3 id="seeding-title">Seeding</h3>
          <p>
            {{ store.detail.participants.length }}/{{ store.detail.tournament.bracketSize }}
            entradas · BYEs não são permitidos.
          </p>
        </div>
        <form class="participant-form" @submit.prevent="add">
          <BaseInput
            id="participant-name"
            v-model="participantName"
            label="Participante"
          /><BaseButton
            type="submit"
            :disabled="
              !participantName.trim() ||
              store.detail.participants.length >= store.detail.tournament.bracketSize
            "
            >Adicionar</BaseButton
          >
        </form>
        <ol class="participant-list">
          <li
            v-for="participant in store.detail.participants"
            :key="participant.id"
            draggable="true"
            tabindex="0"
            @dragstart="dragged = participant.id"
            @dragover.prevent
            @drop="drop(participant.seed)"
          >
            <span class="seed">{{ participant.seed }}</span
            ><BaseInput
              :id="`participant-${participant.id}`"
              :model-value="participant.displayName"
              label="Nome"
              @update:model-value="store.rename(participant.id, $event)"
            />
            <BaseButton
              variant="ghost"
              :disabled="participant.seed === 1"
              :aria-label="`Mover ${participant.displayName} para cima`"
              @click="move(participant.id, participant.seed - 1)"
              >↑</BaseButton
            ><BaseButton
              variant="ghost"
              :disabled="participant.seed === store.detail.participants.length"
              :aria-label="`Mover ${participant.displayName} para baixo`"
              @click="move(participant.id, participant.seed + 1)"
              >↓</BaseButton
            ><BaseButton variant="danger" @click="store.remove(participant.id)">Remover</BaseButton>
          </li>
        </ol>
        <div class="actions">
          <BaseButton :disabled="store.detail.participants.length < 2" @click="store.shuffle"
            >Embaralhar com segurança</BaseButton
          ><BaseButton
            variant="primary"
            :disabled="store.detail.participants.length !== store.detail.tournament.bracketSize"
            @click="store.generate"
            >Gerar bracket</BaseButton
          >
        </div>
      </section>
      <section v-else class="bracket" aria-label="Bracket do torneio">
        <div v-for="round in rounds" :key="round" class="round">
          <h3>Rodada {{ round }}</h3>
          <article
            v-for="match in store.detail.matches.filter((item) => item.roundNumber === round)"
            :key="match.id"
            class="match"
            :data-status="match.status"
          >
            <span>Partida {{ match.matchNumber }} · {{ match.status }}</span>
            <button
              v-for="entryId in [match.leftEntryId, match.rightEntryId]"
              :key="entryId ?? 'empty'"
              type="button"
              :disabled="
                store.detail.tournament.status !== 'in_progress' ||
                match.status !== 'in_progress' ||
                !entryId
              "
              :class="{ winner: entryId === match.winnerEntryId }"
              @click="entryId && store.winner(match.id, entryId)"
            >
              {{ entryId ? entryNames.get(entryId) : 'Aguardando resultado' }}
            </button>
            <BaseButton v-if="match.winnerEntryId" variant="ghost" @click="undoMatch = match.id"
              >Desfazer resultado</BaseButton
            >
          </article>
        </div>
      </section>
      <div class="actions">
        <BaseButton
          v-if="store.detail.tournament.status === 'ready'"
          variant="primary"
          @click="store.start"
          >Confirmar seeding e iniciar</BaseButton
        ><BaseButton v-if="store.detail.tournament.status === 'finished'" @click="store.archive"
          >Arquivar torneio</BaseButton
        >
      </div>
      <section v-if="store.detail.championEntryId" class="champion" role="status">
        <span>CAMPEÃO</span>
        <h3>{{ entryNames.get(store.detail.championEntryId) }}</h3>
      </section>
      <details>
        <summary>Histórico de auditoria ({{ store.detail.auditLog.length }})</summary>
        <ol>
          <li v-for="entry in store.detail.auditLog" :key="entry.id">
            {{ entry.createdAt }} · {{ entry.action }}
          </li>
        </ol>
      </details>
    </template>
    <BaseModal :open="Boolean(undoMatch)" title="Desfazer resultado?" @close="undoMatch = null"
      ><p>Resultados dependentes serão invalidados.</p>
      <template #footer
        ><BaseButton variant="ghost" @click="undoMatch = null">Cancelar</BaseButton
        ><BaseButton variant="danger" @click="confirmUndo">Confirmar</BaseButton></template
      ></BaseModal
    >
  </section>
</template>

<style scoped lang="scss">
.tournament {
  display: grid;
  gap: var(--sk-space-4, 1rem);
}
.tournament > header,
.actions,
.participant-form {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--sk-space-3, 0.75rem);
}
.tournament h2,
.tournament h3,
.tournament p {
  margin: 0;
}
.status,
.seed {
  font: var(--sk-font-size-xs, 0.6875rem) var(--sk-font-mono, monospace);
  color: var(--sk-accent, currentColor);
}
.setup,
.seeding {
  display: grid;
  gap: var(--sk-space-4, 1rem);
  max-width: 60rem;
}
.participant-list {
  display: grid;
  gap: var(--sk-space-2, 0.5rem);
  margin: 0;
  padding: 0;
  list-style: none;
}
.participant-list li {
  display: grid;
  grid-template-columns: 2rem minmax(12rem, 1fr) auto auto auto;
  align-items: end;
  gap: var(--sk-space-2, 0.5rem);
  padding: var(--sk-space-2, 0.5rem);
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  background: var(--sk-bg-panel, transparent);
}
.bracket {
  display: flex;
  gap: var(--sk-space-6, 1.5rem);
  overflow: auto;
  padding-block: var(--sk-space-2, 0.5rem);
}
.round {
  display: grid;
  min-width: 15rem;
  align-content: space-around;
  gap: var(--sk-space-4, 1rem);
}
.match {
  display: grid;
  gap: var(--sk-space-1, 0.25rem);
  padding: var(--sk-space-3, 0.75rem);
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  border-radius: var(--sk-radius-md, 0.375rem);
  background: var(--sk-bg-panel, transparent);
}
.match > button {
  min-height: 2.25rem;
  border: 0;
  border-inline-start: 0.2rem solid var(--sk-border-strong, currentColor);
  background: var(--sk-bg-elevated, transparent);
  color: inherit;
  text-align: start;
}
.match > button:focus-visible {
  outline: var(--sk-focus-width, 2px) solid var(--sk-focus-ring, currentColor);
}
.match > button.winner {
  border-inline-start-color: var(--sk-success, currentColor);
  font-weight: 700;
}
.champion {
  padding: var(--sk-space-4, 1rem);
  border: var(--sk-border-width, 1px) solid var(--sk-success, currentColor);
  text-align: center;
}
@media (max-width: 48rem) {
  .participant-list li {
    grid-template-columns: 2rem 1fr;
  }
  .participant-form,
  .tournament > header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
