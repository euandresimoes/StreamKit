<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BaseButton, BaseCheckbox, BaseInput, BaseModal, BaseSelect, BaseTextarea } from '../base'
import { useGiveawayStore } from '../../stores/giveaway.store'
import { useSettingsStore } from '../../stores/settings.store'
import { giveawaySoundService } from '../../services/giveaway-sound.service'
import {
  caseDestination,
  visualCaseEntries,
  wheelDestination,
  winnerIndex,
} from './giveaway-animation'

const store = useGiveawayStore()
const settings = useSettingsStore()
const name = ref('')
const raw = ref('')
const mode = ref<'wheel' | 'case-opening'>('wheel')
const policy = ref<'remove' | 'keep' | 'group-tickets'>('remove')
const removeWinner = ref(false)
const animating = ref(false)
const confirmExit = ref(false)
const modeOptions = [
  { label: 'Roleta', value: 'wheel' },
  { label: 'Case opening', value: 'case-opening' },
]
const policyOptions = [
  { label: 'Remover duplicatas', value: 'remove' },
  { label: 'Manter ocorrências', value: 'keep' },
  { label: 'Agrupar tickets', value: 'group-tickets' },
]
const round = computed(() => store.detail?.activeRound ?? null)
const winner = computed(() =>
  round.value?.entries.find((entry) => entry.participantId === round.value?.winnerParticipantId),
)
const wheelStyle = computed(() => ({
  transform: `rotate(${round.value ? wheelDestination(round.value) : 0}deg)`,
  transitionDuration: settings.reduceMotion ? '1ms' : '4s',
}))
const stripStyle = computed(() => ({
  transform: `translate3d(${round.value ? caseDestination(round.value) : 0}px,0,0)`,
  transitionDuration: settings.reduceMotion ? '1ms' : '4s',
}))
async function create() {
  await store.create({ duplicatePolicy: policy.value, mode: mode.value, name: name.value })
  name.value = ''
}
async function preview() {
  await store.parse(raw.value, policy.value)
}
async function importNames() {
  await store.import(raw.value, policy.value)
  await store.prepare()
}
async function draw() {
  await store.draw()
  await giveawaySoundService.play('draw-started')
  animating.value = true
  window.setTimeout(
    () => {
      animating.value = false
      void giveawaySoundService.play('winner-revealed')
    },
    settings.reduceMotion ? 1 : 4000,
  )
}
async function finish() {
  await store.complete()
}
function beforeUnload(event: globalThis.BeforeUnloadEvent) {
  if (store.detail?.giveaway.status === 'drawing') {
    event.preventDefault()
    event.returnValue = ''
  }
}
watch(
  () => store.detail?.giveaway.status,
  (status) => {
    if (status === 'drawing') animating.value = true
  },
)
onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload)
  await store.load()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>
<template>
  <section class="giveaway" aria-labelledby="giveaway-title">
    <header>
      <div>
        <h2 id="giveaway-title">Giveaway</h2>
        <p>Sorteio local, persistente e auditável.</p>
      </div>
      <span v-if="store.detail" class="status">{{ store.detail.giveaway.status }}</span>
    </header>
    <div v-if="store.loading && !store.detail" class="standard-state" role="status">
      Carregando…
    </div>
    <div v-else-if="store.error" class="standard-state standard-state--error" role="alert">
      {{ store.error }}
    </div>
    <form v-else-if="!store.detail" class="setup" @submit.prevent="create">
      <BaseInput id="giveaway-name" v-model="name" label="Nome do giveaway" /><BaseSelect
        id="giveaway-mode"
        v-model="mode"
        label="Modo"
        :options="modeOptions"
      /><BaseSelect
        id="giveaway-policy"
        v-model="policy"
        label="Duplicatas"
        :options="policyOptions"
      /><BaseButton type="submit" :disabled="!name.trim()">Criar</BaseButton>
    </form>
    <template v-else
      ><section v-if="store.detail.giveaway.status === 'draft'" class="setup">
        <BaseTextarea
          id="giveaway-names"
          v-model="raw"
          label="Participantes"
          description="Separe por vírgulas ou linhas."
        />
        <div>
          <BaseButton :disabled="!raw.trim()" @click="preview">Pré-visualizar</BaseButton
          ><BaseButton :disabled="!store.preview?.validCount" variant="primary" @click="importNames"
            >Confirmar e preparar</BaseButton
          >
        </div>
        <div v-if="store.preview" role="status">
          <strong>{{ store.preview.validCount }}</strong> participantes ·
          {{ store.preview.ticketCount }} tickets
          <ul>
            <li v-for="entry in store.preview.entries.slice(0, 100)" :key="entry.normalizedName">
              {{ entry.displayName }} × {{ entry.ticketCount }}
            </li>
          </ul>
        </div>
      </section>
      <section v-else-if="round" class="stage" :aria-busy="animating">
        <div v-if="round.mode === 'wheel'" class="wheel-wrap">
          <i class="pointer" />
          <div class="wheel" :style="wheelStyle">
            <span
              v-for="(entry, index) in round.entries"
              :key="entry.participantId"
              :style="{ transform: `rotate(${(index * 360) / round.entries.length}deg)` }"
              >{{ entry.displayName }}</span
            >
          </div>
        </div>
        <div v-else class="case">
          <i />
          <div class="case-strip" :style="stripStyle">
            <span
              v-for="(entry, index) in visualCaseEntries(round)"
              :key="`${index}-${entry.participantId}`"
              >{{ entry.displayName }}</span
            >
          </div>
        </div>
        <div v-if="!animating" class="winner" role="status">
          <h3>{{ winner?.displayName }}</h3>
          <p>Vencedor persistido · hash {{ round.snapshotHash.slice(0, 12) }}…</p>
          <BaseButton v-if="round.status === 'drawing'" variant="primary" @click="finish"
            >Concluir animação</BaseButton
          ><template v-else
            ><BaseCheckbox
              v-model="removeWinner"
              label="Remover vencedor da próxima rodada"
            /><BaseButton @click="store.nextRound(removeWinner)"
              >Próxima rodada</BaseButton
            ></template
          >
        </div>
      </section>
      <div v-else-if="store.detail.giveaway.status === 'ready'" class="standard-state">
        <h3>Pronto para sortear</h3>
        <p>{{ store.detail.participants.length }} participantes confirmados.</p>
        <BaseButton variant="primary" @click="draw">Sortear agora</BaseButton>
      </div>
      <div v-else class="standard-state">
        <h3>{{ store.detail.giveaway.status }}</h3>
        <p>Este giveaway não pode ser editado.</p>
      </div>
      <section class="history">
        <h3>Histórico</h3>
        <p v-if="!store.history.length">Nenhuma rodada concluída.</p>
        <ol>
          <li v-for="item in store.history" :key="item.id">
            {{ item.entries[winnerIndex(item)]?.displayName }} ·
            {{ new Date(item.startedAt).toLocaleString() }}
          </li>
        </ol>
      </section></template
    >
    <BaseModal :open="confirmExit" title="Sorteio em andamento" @close="confirmExit = false"
      ><p>O resultado está salvo e será recuperado ao reabrir.</p></BaseModal
    >
  </section>
</template>
<style scoped lang="scss">
.giveaway {
  display: grid;
  gap: var(--sk-space-4, 1rem);
}
.giveaway > header,
.setup,
.setup > div,
.winner {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--sk-space-3, 0.75rem);
}
h2,
h3,
p {
  margin: 0;
}
.status {
  padding: var(--sk-space-1, 0.25rem) var(--sk-space-2, 0.5rem);
  background: var(--sk-accent-soft, #def);
}
.stage {
  display: grid;
  min-height: 26rem;
  place-items: center;
  overflow: hidden;
}
.wheel-wrap {
  position: relative;
}
.pointer {
  position: absolute;
  z-index: 2;
  top: -1rem;
  left: calc(50% - 0.5rem);
  border: 0.75rem solid transparent;
  border-top-color: var(--sk-accent, #167);
}
.wheel {
  position: relative;
  width: 22rem;
  height: 22rem;
  border: 1rem solid var(--sk-accent, #167);
  border-radius: 50%;
  transition: transform 4s cubic-bezier(0.12, 0.7, 0.08, 1);
  will-change: transform;
}
.wheel span {
  position: absolute;
  left: 50%;
  width: 50%;
  padding: 0.5rem;
  transform-origin: left 11rem;
}
.case {
  position: relative;
  width: min(60rem, 100%);
  overflow: hidden;
}
.case > i {
  position: absolute;
  z-index: 2;
  left: 50%;
  height: 100%;
  border-left: 0.2rem solid var(--sk-accent, #167);
}
.case-strip {
  display: flex;
  transition: transform 4s cubic-bezier(0.12, 0.7, 0.08, 1);
  will-change: transform;
}
.case-strip span {
  flex: 0 0 9rem;
  padding: 2rem 0.5rem;
  border: 1px solid var(--sk-border-subtle, #ccc);
  text-align: center;
}
.winner {
  flex-direction: column;
  align-items: center;
}
.history {
  border-top: 1px solid var(--sk-border-subtle, #ccc);
  padding-top: var(--sk-space-3, 0.75rem);
}
[data-reduced-motion='true'] .wheel,
[data-reduced-motion='true'] .case-strip {
  transition-duration: 1ms;
}
@media (max-width: 48rem) {
  .setup {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
