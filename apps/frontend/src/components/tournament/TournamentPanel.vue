<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BaseButton, BaseInput, BaseModal, BaseSelect } from '../base'
import { useTournamentStore } from '../../stores/tournament.store'
import { useSettingsStore } from '../../stores/settings.store'

const store = useTournamentStore(),
  settings = useSettingsStore(),
  name = ref(''),
  description = ref(''),
  participantName = ref(''),
  teamName = ref(''),
  teamColor = ref(''),
  mode = ref<'individual' | 'team'>('individual'),
  teamCapacity = ref('4'),
  size = ref('4'),
  dragged = ref<string | null>(null),
  draggedTeam = ref<string | null>(null),
  selectedMember = ref<string | null>(null),
  undoMatch = ref<string | null>(null)
const sizes = [4, 8, 16, 32].map((value) => ({ label: `${value} entradas`, value: String(value) }))
const capacities = Array.from({ length: 16 }, (_, index) => ({
  label: `${index + 1} slots`,
  value: String(index + 1),
}))
const modes = [
  { label: 'Individual', value: 'individual' },
  { label: 'Equipes', value: 'team' },
]
const rounds = computed(() => [
  ...new Set(store.detail?.matches.map((match) => match.roundNumber) ?? []),
])
const entryNames = computed(
  () =>
    new Map([
      ...(store.detail?.participants
        .filter((participant) => participant.entryId)
        .map((participant) => [participant.entryId!, participant.displayName] as const) ?? []),
      ...(store.detail?.teams.map((team) => [team.entryId, team.name] as const) ?? []),
    ]),
)
const structural = computed(() => store.detail?.tournament.status === 'draft')
async function create() {
  await store.create({
    bracketSize: Number(size.value) as 4 | 8 | 16 | 32,
    description: description.value.trim() || null,
    mode: mode.value,
    name: name.value,
    teamCapacity: mode.value === 'team' ? Number(teamCapacity.value) : null,
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
function slots(capacity: number) {
  return Array.from({ length: capacity }, (_, index) => index + 1)
}
function memberAt(teamId: string, slotPosition: number) {
  return store.detail?.teamMembers.find(
    (member) => member.teamId === teamId && member.slotPosition === slotPosition,
  )
}
async function addTeam() {
  await store.addTeam(teamName.value, teamColor.value.trim() || null)
  teamName.value = ''
  teamColor.value = ''
}
async function useSlot(teamId: string, slotPosition: number) {
  if (selectedMember.value) {
    await store.moveTeamMember(selectedMember.value, teamId, slotPosition)
    selectedMember.value = null
  } else if (participantName.value.trim()) {
    await store.addTeamMember(teamId, participantName.value, slotPosition)
    participantName.value = ''
  }
}
function dropMember(teamId: string, slotPosition: number) {
  if (dragged.value) void store.moveTeamMember(dragged.value, teamId, slotPosition)
  dragged.value = null
}
function dropTeam(seed: number) {
  if (draggedTeam.value) void store.reorderTeam(draggedTeam.value, seed)
  draggedTeam.value = null
}
async function confirmUndo() {
  if (undoMatch.value) await store.undo(undoMatch.value)
  undoMatch.value = null
}
function beforeUnload(event: globalThis.BeforeUnloadEvent) {
  if (settings.confirmExitDuringActive && store.detail?.tournament.status === 'in_progress') {
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
        <h2 id="tournament-title">Torneios</h2>
        <p>Eliminação simples, local e auditável.</p>
      </div>
      <span v-if="store.detail" class="status">{{ store.detail.tournament.status }}</span>
    </header>
    <div v-if="store.loading && !store.detail" class="standard-state" role="status">
      Carregando…
    </div>
    <div
      v-else-if="store.error && !store.detail"
      class="standard-state standard-state--error"
      role="alert"
    >
      {{ store.error }}
    </div>
    <form v-else-if="!store.detail" class="setup" @submit.prevent="create">
      <BaseInput id="tournament-name" v-model="name" label="Nome" /><BaseInput
        id="tournament-description"
        v-model="description"
        label="Descrição (opcional)"
      /><BaseSelect id="tournament-mode" v-model="mode" label="Modo" :options="modes" /><BaseSelect
        id="tournament-size"
        v-model="size"
        label="Tamanho"
        :options="sizes"
      /><BaseSelect
        v-if="mode === 'team'"
        id="team-capacity"
        v-model="teamCapacity"
        label="Capacidade por equipe"
        :options="capacities"
      /><BaseButton type="submit" :disabled="!name.trim()">Criar torneio</BaseButton>
    </form>
    <template v-else>
      <div v-if="store.error" class="inline-error" role="alert">
        {{ store.error }}<BaseButton variant="ghost" @click="store.error = null">Fechar</BaseButton>
      </div>
      <section
        v-if="structural && store.detail.tournament.mode === 'individual'"
        class="seeding"
        aria-labelledby="seeding-title"
      >
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
            @drop="drop(participant.seed ?? 1)"
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
              @click="move(participant.id, (participant.seed ?? 1) - 1)"
              >↑</BaseButton
            ><BaseButton
              variant="ghost"
              :disabled="participant.seed === store.detail.participants.length"
              :aria-label="`Mover ${participant.displayName} para baixo`"
              @click="move(participant.id, (participant.seed ?? 1) + 1)"
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
      <section
        v-else-if="structural"
        class="seeding team-seeding"
        aria-labelledby="team-seeding-title"
      >
        <div>
          <h3 id="team-seeding-title">Equipes e slots</h3>
          <p>
            {{ store.detail.teams.length }}/{{ store.detail.tournament.bracketSize }} equipes ·
            slots vazios permanecem visíveis.
          </p>
        </div>
        <form class="participant-form" @submit.prevent="addTeam">
          <BaseInput id="team-name" v-model="teamName" label="Nome da equipe" /><BaseInput
            id="team-color"
            v-model="teamColor"
            label="Cor opcional"
          /><BaseButton
            type="submit"
            :disabled="
              !teamName.trim() || store.detail.teams.length >= store.detail.tournament.bracketSize
            "
            >Criar equipe</BaseButton
          >
        </form>
        <BaseInput
          id="team-member-name"
          v-model="participantName"
          label="Novo membro"
          description="Digite um nome e escolha um slot vazio; ou selecione um membro para movê-lo."
        />
        <ol class="team-list">
          <li
            v-for="team in store.detail.teams"
            :key="team.id"
            draggable="true"
            tabindex="0"
            @dragstart="draggedTeam = team.id"
            @dragover.prevent
            @drop="dropTeam(team.seed)"
          >
            <header>
              <span class="seed">{{ team.seed }}</span
              ><BaseInput
                :id="`team-${team.id}`"
                :model-value="team.name"
                label="Equipe"
                @update:model-value="store.updateTeam(team.id, $event, team.color, team.capacity)"
              /><BaseInput
                :id="`team-color-${team.id}`"
                :model-value="team.color ?? ''"
                label="Cor"
                @update:model-value="
                  store.updateTeam(team.id, team.name, $event.trim() || null, team.capacity)
                "
              /><BaseSelect
                :id="`capacity-${team.id}`"
                :model-value="String(team.capacity)"
                label="Capacidade"
                :options="capacities"
                @update:model-value="
                  store.updateTeam(team.id, team.name, team.color, Number($event))
                "
              /><BaseButton
                variant="ghost"
                :disabled="team.seed === 1"
                @click="store.reorderTeam(team.id, team.seed - 1)"
                >↑</BaseButton
              ><BaseButton
                variant="ghost"
                :disabled="team.seed === store.detail.teams.length"
                @click="store.reorderTeam(team.id, team.seed + 1)"
                >↓</BaseButton
              >
            </header>
            <ol class="slot-list" :aria-label="`Slots da equipe ${team.name}`">
              <li
                v-for="slot in slots(team.capacity)"
                :key="slot"
                tabindex="0"
                @dragover.prevent
                @drop="dropMember(team.id, slot)"
              >
                <span>Slot {{ slot }}</span
                ><template v-if="memberAt(team.id, slot)"
                  ><strong>{{ memberAt(team.id, slot)?.displayName }}</strong
                  ><BaseButton
                    variant="ghost"
                    :aria-pressed="selectedMember === memberAt(team.id, slot)?.id"
                    @click="selectedMember = memberAt(team.id, slot)?.id ?? null"
                    >{{
                      selectedMember === memberAt(team.id, slot)?.id
                        ? 'Selecionado'
                        : 'Selecionar para mover'
                    }}</BaseButton
                  ><span
                    draggable="true"
                    @dragstart.stop="dragged = memberAt(team.id, slot)?.id ?? null"
                    >⠿</span
                  ></template
                ><template v-else
                  ><em>Slot vazio</em
                  ><BaseButton
                    :disabled="!participantName.trim() && !selectedMember"
                    @click="useSlot(team.id, slot)"
                    >{{ selectedMember ? 'Mover para cá' : 'Adicionar neste slot' }}</BaseButton
                  ></template
                >
              </li>
            </ol>
          </li>
        </ol>
        <div class="actions">
          <BaseButton :disabled="store.detail.teams.length < 2" @click="store.shuffle"
            >Embaralhar equipes</BaseButton
          ><BaseButton
            variant="primary"
            :disabled="store.detail.teams.length !== store.detail.tournament.bracketSize"
            @click="store.generate"
            >Gerar bracket por equipes</BaseButton
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
.inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-space-3, 0.75rem);
  padding: var(--sk-space-3, 0.75rem);
  border: var(--sk-border-width, 1px) solid var(--sk-danger, currentColor);
  color: var(--sk-danger, currentColor);
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
.team-list,
.slot-list {
  display: grid;
  gap: var(--sk-space-2, 0.5rem);
  margin: 0;
  padding: 0;
  list-style: none;
}
.team-list > li {
  padding: var(--sk-space-3, 0.75rem);
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  background: var(--sk-bg-panel, transparent);
}
.team-list > li > header,
.slot-list li {
  display: flex;
  align-items: end;
  gap: var(--sk-space-2, 0.5rem);
}
.slot-list {
  margin-block-start: var(--sk-space-3, 0.75rem);
}
.slot-list li {
  min-height: 2.75rem;
  align-items: center;
  justify-content: space-between;
  padding: var(--sk-space-2, 0.5rem);
  border: var(--sk-border-width, 1px) dashed var(--sk-border-subtle, currentColor);
  background: var(--sk-bg-elevated, transparent);
}
.slot-list em {
  color: var(--sk-fg-muted, currentColor);
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
