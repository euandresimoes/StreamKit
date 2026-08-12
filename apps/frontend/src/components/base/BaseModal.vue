<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) emit('close')
  if (event.key !== 'Tab' || !props.open || !dialog.value) return

  const focusable = Array.from(
    dialog.value.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'))
  if (focusable.length === 0) return
  const first = focusable[0]!
  const last = focusable.at(-1)!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
watch(
  () => props.open,
  async (open) => {
    document.body.classList.toggle('has-modal', open)
    if (open) {
      await nextTick()
      dialog.value?.querySelector<HTMLElement>('button, input, select, textarea')?.focus()
    }
  },
  { immediate: true },
)
window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  document.body.classList.remove('has-modal')
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="base-modal" role="presentation" @mousedown.self="emit('close')">
      <section
        ref="dialog"
        aria-modal="true"
        class="base-modal__dialog"
        role="dialog"
        :aria-label="title"
      >
        <header>
          <h2>{{ title }}</h2>
        </header>
        <div class="base-modal__body"><slot /></div>
        <footer><slot name="actions" /></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.base-modal {
  position: fixed;
  z-index: var(--sk-z-modal, 50);
  display: grid;
  background: var(--sk-modal-backdrop, rgb(0 0 0 / 56%));
  inset: 0;
  place-items: center;
}

.base-modal__dialog {
  width: min(28rem, calc(100vw - 2 * var(--sk-space-4, 1rem)));
  border: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  border-radius: var(--sk-radius-md, 0.3125rem);
  background: var(--sk-modal-bg, #fff);
  box-shadow: var(--sk-shadow-modal, none);
}

.base-modal header,
.base-modal__body,
.base-modal footer {
  padding: var(--sk-space-4, 1rem);
}

.base-modal header,
.base-modal footer {
  border-block-end: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
}

.base-modal footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--sk-space-2, 0.5rem);
  border-block-start: var(--sk-border-width, 1px) solid var(--sk-border-subtle, currentColor);
  border-block-end: 0;
}

.base-modal h2 {
  margin: 0;
  font-size: var(--sk-font-size-lg, 1rem);
}
</style>
