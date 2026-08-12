<script setup lang="ts">
import { ref } from 'vue'

import {
  BaseButton,
  BaseCheckbox,
  BaseDropdown,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseSlider,
  BaseTextarea,
  BaseToggle,
  BaseTooltip,
} from '../base'

const checked = ref(true)
const input = ref('Canal principal')
const select = ref('dark')
const slider = ref(60)
const text = ref('Notas do operador')
const toggle = ref(true)
const confirmOpen = ref(false)
</script>

<template>
  <section class="primitive-showcase" aria-labelledby="showcase-title">
    <header>
      <h2 id="showcase-title">Componentes base</h2>
      <span>Todos os estados e temas</span>
    </header>
    <div class="primitive-showcase__grid">
      <BaseInput id="showcase-input" v-model="input" label="Entrada" />
      <BaseInput id="showcase-invalid" v-model="input" error="Valor inválido" label="Inválido" />
      <BaseSelect
        id="showcase-select"
        v-model="select"
        label="Tema"
        :options="[
          { label: 'Escuro', value: 'dark' },
          { label: 'Claro', value: 'light' },
        ]"
      />
      <BaseSlider id="showcase-slider" v-model="slider" label="Intensidade" />
      <BaseTextarea id="showcase-textarea" v-model="text" label="Notas" />
      <div class="primitive-showcase__stack">
        <BaseToggle v-model="toggle" label="Alternância" />
        <BaseCheckbox v-model="checked" label="Checkbox" />
        <BaseDropdown label="Dropdown"><button type="button">Ação</button></BaseDropdown>
      </div>
      <div class="primitive-showcase__actions">
        <BaseButton variant="primary">Primário</BaseButton>
        <BaseButton>Secundário</BaseButton>
        <BaseButton loading>Carregando</BaseButton>
        <BaseButton disabled>Desabilitado</BaseButton>
        <BaseTooltip text="Informação contextual"
          ><span tabindex="0">Passe o mouse</span></BaseTooltip
        >
        <BaseButton variant="danger" @click="confirmOpen = true">Excluir…</BaseButton>
      </div>
    </div>
    <BaseModal :open="confirmOpen" title="Excluir item?" @close="confirmOpen = false">
      Esta ação não pode ser desfeita.
      <template #actions>
        <BaseButton @click="confirmOpen = false">Cancelar</BaseButton>
        <BaseButton variant="danger" @click="confirmOpen = false">Excluir</BaseButton>
      </template>
    </BaseModal>
  </section>
</template>

<style scoped lang="scss">
.primitive-showcase {
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  background: var(--sk-bg-panel, transparent);
}

.primitive-showcase > header {
  display: flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sk-space-3, 0.75rem);
  border-block-end: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  background: var(--sk-bg-raised, transparent);
}

.primitive-showcase h2 {
  margin: 0;
  font-size: var(--sk-font-size-md, 0.8125rem);
}

.primitive-showcase header span {
  color: var(--sk-fg-muted, currentColor);
  font-size: var(--sk-font-size-xs, 0.6875rem);
}

.primitive-showcase__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--sk-space-4, 1rem);
  padding: var(--sk-space-4, 1rem);
}

.primitive-showcase__stack,
.primitive-showcase__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--sk-space-2, 0.5rem);
}
</style>
