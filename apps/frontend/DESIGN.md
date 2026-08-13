# StreamKit — Design System (macOS 2026, Warm/Neutral Dark)

Documento de implementação. Copie os tokens, classes e estruturas exatamente como estão.
Stack de referência é irrelevante: use Vue 3 (SFC) + Tailwind CSS v4. Ícones: `lucide-vue-next`.

---

## 1. Princípios

- Janela flutuante única (estilo app nativo macOS), cantos muito arredondados (26px), vidro fosco.
- Fundo do app: **preto neutro**, sem gradiente, sem azul.
- Superfícies quentes e sutis (grafite quente), tipografia densa e pequena (11–15px), muito respiro.
- Movimento discreto: 180–450ms com easing `cubic-bezier(0.32, 0.72, 0, 1)`.
- Nunca hardcodar cores nos componentes — sempre tokens.

---

## 2. Tokens (CSS global)

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;

  --radius-sm: calc(var(--radius) - 6px);
  --radius-md: calc(var(--radius) - 3px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 5px);
  --radius-2xl: calc(var(--radius) + 10px);
  --radius-3xl: calc(var(--radius) + 16px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-popover: var(--popover);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-input: var(--input);
  --color-ring: var(--ring);
}

:root,
.dark {
  --radius: 0.875rem;

  --background: oklch(0.12 0 0); /* preto neutro */
  --foreground: oklch(0.945 0.004 85);

  --surface: oklch(0.212 0.005 70);
  --surface-2: oklch(0.248 0.006 70);

  --card: oklch(0.216 0.005 70);
  --popover: oklch(0.235 0.006 70);

  --primary: oklch(0.78 0.115 62); /* âmbar quente */
  --primary-foreground: oklch(0.2 0.02 60);

  --secondary: oklch(0.28 0.006 70);
  --secondary-foreground: oklch(0.93 0.004 85);

  --muted: oklch(0.26 0.005 70);
  --muted-foreground: oklch(0.68 0.008 75);

  --accent: oklch(0.3 0.008 70);
  --accent-foreground: oklch(0.95 0.004 85);

  --destructive: oklch(0.61 0.175 22);
  --destructive-foreground: oklch(0.97 0.01 30);

  --warning: oklch(0.8 0.13 84);
  --warning-foreground: oklch(0.22 0.03 70);

  --success: oklch(0.72 0.11 150);
  --success-foreground: oklch(0.19 0.02 150);

  --border: oklch(1 0 0 / 8%);
  --border-strong: oklch(1 0 0 / 14%);
  --input: oklch(1 0 0 / 10%);
  --ring: oklch(0.78 0.115 62 / 55%);

  --shadow-float: 0 1px 0 0 oklch(1 0 0 / 6%) inset, 0 18px 45px -18px oklch(0 0 0 / 70%);
  --shadow-panel: 0 1px 0 0 oklch(1 0 0 / 5%) inset, 0 32px 80px -32px oklch(0 0 0 / 80%);
  --gradient-primary: linear-gradient(145deg, oklch(0.84 0.11 70) 0%, oklch(0.74 0.13 48) 100%);
  --ease-mac: cubic-bezier(0.32, 0.72, 0, 1);
}
```

### Base

```css
@layer base {
  * {
    border-color: var(--color-border);
  }

  body {
    background-color: var(--color-background); /* sem background-image */
    color: var(--color-foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    letter-spacing: -0.011em;
  }

  h1,
  h2,
  h3,
  h4 {
    letter-spacing: -0.028em;
  }

  ::selection {
    background: oklch(0.78 0.115 62 / 30%);
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: oklch(1 0 0 / 10%);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: content-box;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: oklch(1 0 0 / 18%);
    background-clip: content-box;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
}
```

### Utilitários

```css
@utility glass {
  background: color-mix(in oklab, var(--surface) 72%, transparent);
  backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-float);
}

@utility glass-panel {
  background: color-mix(in oklab, var(--surface) 60%, transparent);
  backdrop-filter: blur(40px) saturate(150%);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-panel);
}

@utility raise {
  transition:
    transform 0.35s var(--ease-mac),
    box-shadow 0.35s var(--ease-mac),
    background-color 0.25s var(--ease-mac);
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-float);
  }
}

@utility press {
  transition: transform 0.18s var(--ease-mac);
  &:active {
    transform: scale(0.97);
  }
}

@utility text-gradient-primary {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@keyframes sk-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@utility animate-sk-in {
  animation: sk-in 0.45s var(--ease-mac) both;
}

@keyframes sk-pulse-ring {
  0% {
    box-shadow: 0 0 0 0 oklch(0.78 0.115 62 / 35%);
  }
  100% {
    box-shadow: 0 0 0 14px oklch(0.78 0.115 62 / 0%);
  }
}
@utility animate-sk-ping {
  animation: sk-pulse-ring 1.8s var(--ease-mac) infinite;
}
```

### Fontes

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap"
/>
```

---

## 3. Escala tipográfica (usar exatamente)

| Uso                      | Classe                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| Título de seção em modal | `text-[15px] font-semibold`                                                |
| Título de card / bloco   | `text-[13px] font-semibold`                                                |
| Corpo / label            | `text-[12.5px]` ou `text-[13px] font-medium`                               |
| Descrição secundária     | `text-[11.5px] text-muted-foreground`                                      |
| Label de grupo (caps)    | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` |
| Aba da topbar            | `text-[12px] font-semibold tracking-wide`                                  |
| Badge / meta             | `text-[10.5px]` – `text-[11px]`                                            |
| Valores/versões          | `font-mono`                                                                |

Raios: botões `rounded-xl`, cards/blocos `rounded-2xl`, modal `rounded-3xl`, janela `rounded-[26px]`, pills pequenos `rounded-lg`.

---

## 4. Botão

Base (todas as variantes):

```
press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl
text-[13px] font-medium cursor-pointer transition-all duration-200
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed
[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
```

Variantes:

| Variante             | Classes                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` (primário) | `bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_1px_0_0_oklch(1_0_0/25%)_inset,0_8px_20px_-10px_oklch(0_0_0/70%)] hover:brightness-108` |
| `secondary`          | `bg-secondary text-secondary-foreground border border-border-strong shadow-[0_1px_0_0_oklch(1_0_0/6%)_inset] hover:bg-accent`                                 |
| `ghost`              | `text-muted-foreground hover:bg-accent hover:text-accent-foreground`                                                                                          |
| `outline`            | `border border-border-strong bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground`                                                     |
| `danger`             | `bg-destructive text-destructive-foreground shadow-[0_1px_0_0_oklch(1_0_0/18%)_inset] hover:brightness-110`                                                   |
| `warning`            | `bg-warning text-warning-foreground shadow-[0_1px_0_0_oklch(1_0_0/22%)_inset] hover:brightness-108`                                                           |
| `success`            | `bg-success text-success-foreground shadow-[0_1px_0_0_oklch(1_0_0/22%)_inset] hover:brightness-108`                                                           |
| `link`               | `text-primary underline-offset-4 hover:underline`                                                                                                             |

Tamanhos: `default h-9 px-4` · `sm h-8 rounded-lg px-3 text-xs` · `lg h-11 rounded-2xl px-6 text-sm` · `icon h-9 w-9` · `icon-sm h-7 w-7 rounded-lg`.

Loading: prop `loading` → desabilita o botão e prefixa `<Loader2 class="animate-spin" />` antes do slot.

Vue (`Button.vue`), com `class-variance-authority` + `tailwind-merge`:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { Loader2 } from "lucide-vue-next";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?:
      "default" | "secondary" | "ghost" | "outline" | "danger" | "warning" | "success" | "link";
    size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
    loading?: boolean;
    disabled?: boolean;
  }>(),
  { variant: "default", size: "default", loading: false },
);

const VARIANTS = {/* tabela acima */} as const;
const SIZES = {/* tamanhos acima */} as const;

const classes = computed(() => cn(BASE, VARIANTS[props.variant], SIZES[props.size]));
</script>

<template>
  <button :class="classes" :disabled="loading || disabled">
    <Loader2 v-if="loading" class="size-4 animate-spin" />
    <slot />
  </button>
</template>
```

`cn`: `twMerge(clsx(...inputs))`.

---

## 5. Input / Switch / Separator

- Input: `h-9 w-full rounded-xl border border-input bg-surface-2/60 px-3 text-[12.5px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all`. Chaves de API: adicionar `font-mono` e `type="password"`.
- Switch: trilha `h-5 w-9 rounded-full transition-colors`, ligado `bg-primary`, desligado `bg-surface-2 border border-border-strong`; knob `size-4 rounded-full bg-foreground shadow translate-x-0 → translate-x-4`, transição `.2s var(--ease-mac)`; `disabled:opacity-45`.
- Separator: `h-px w-full bg-border` (usar `my-4`).
- Badge de status: `rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success` com ícone `size-3`.

---

## 6. Shell da janela

```html
<main class="flex min-h-screen items-stretch justify-center p-4 sm:p-7">
  <div
    class="glass-panel flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[26px]"
  >
    <!-- topbar -->
    <div class="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
      <!-- 1. semáforo macOS -->
      <div class="flex items-center gap-2">
        <span
          class="size-3 rounded-full transition-opacity hover:opacity-70"
          style="background:oklch(0.64 0.17 25)"
        ></span>
        <span
          class="size-3 rounded-full transition-opacity hover:opacity-70"
          style="background:oklch(0.8 0.13 84)"
        ></span>
        <span
          class="size-3 rounded-full transition-opacity hover:opacity-70"
          style="background:oklch(0.72 0.11 150)"
        ></span>
      </div>

      <!-- 2. abas: ALINHADAS À ESQUERDA, sem trilho de fundo -->
      <nav class="flex gap-1 pl-3">
        <button
          class="press flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold tracking-wide transition-all duration-300
                       bg-surface-2 text-foreground shadow-[0_1px_0_0_oklch(1_0_0/8%)_inset]"
        >
          <!-- ativa -->
        </button>
        <button
          class="press flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold tracking-wide transition-all duration-300
                       text-muted-foreground hover:text-foreground"
        >
          <!-- inativa -->
        </button>
      </nav>

      <!-- 3. ações à direita -->
      <div class="ml-auto flex items-center gap-1.5">
        <button><!-- ghost icon-sm: Search --></button>
        <button><!-- ghost icon-sm: Settings --></button>
      </div>
    </div>

    <!-- conteúdo: remonta na troca de aba para reproduzir a animação -->
    <div class="animate-sk-in flex min-h-0 flex-1 flex-col">
      <!-- TodoTab | GamesTab | GiveawaysTab -->
    </div>
  </div>
</main>
```

Regras obrigatórias da topbar:

- **Sem** logo, sem nome do app, sem badge "Manual".
- **Sem** background no container das abas; fundo apenas na aba ativa (`bg-surface-2`).
- **Sem** status bar no rodapé da janela.
- Abas: `TODO` (ListTodo), `GAMES` (Swords), `GIVEAWAYS` (Gift) — ícones `size-3.5`.
- Em Vue, use `:key="tab"` no wrapper do conteúdo para reexecutar `animate-sk-in`.

---

## 7. Modal de Configurações (menu real, aside + painel)

Estrutura: overlay (`bg-black/60 backdrop-blur-sm`) + painel centralizado.

```html
<div
  class="glass-panel max-w-[860px] gap-0 overflow-hidden rounded-3xl border-border-strong bg-popover/95 p-0"
>
  <div class="flex min-h-[460px]">
    <aside class="w-[220px] shrink-0 border-r border-border bg-surface-2/40 p-3">
      <p
        class="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Configurações
      </p>
      <nav class="flex flex-col gap-0.5">
        <!-- item -->
        <button
          class="press flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-200
                       bg-surface-2 text-foreground"
        >
          <!-- ativo; inativo: text-muted-foreground hover:text-foreground -->
          <svg class="size-4"></svg>
          <span class="flex-1">
            <span class="block text-[12.5px] font-medium">Aparência</span>
            <span class="block text-[10.5px] opacity-70">Tema e densidade</span>
          </span>
        </button>
      </nav>
    </aside>

    <section class="animate-sk-in min-w-0 flex-1 overflow-y-auto p-6">
      <!-- painel da seção ativa -->
    </section>
  </div>
</div>
```

Abas do aside (ordem fixa):

1. **Aparência** — `Palette` · "Tema e densidade"
2. **Sistema** — `MonitorCog` · "Janela e inicialização"
3. **Integrações** — `Plug` · "LivePix API"
4. **Atualizações** — `RefreshCw` · versão atual (ex. "v0.4.0")

Cabeçalho de cada painel: `h3.text-[15px] font-semibold` + `p.text-[12px] text-muted-foreground`.

Linha de opção (reutilizável, `SettingsRow`):

```html
<div class="flex items-start gap-3 py-3">
  <div class="flex-1">
    <p class="text-[13px] font-medium">Título</p>
    <p class="text-[11.5px] text-muted-foreground">Descrição</p>
  </div>
  <!-- controle (Switch, Button, etc.) -->
</div>
```

Agrupe linhas em `div.divide-y.divide-border`.

### Aparência

Grid `grid-cols-3 gap-3` de cards de tema: `raise rounded-2xl border p-3 text-left`, ativo `border-primary bg-surface-2/70`, inativo `border-border`. Dentro: swatch `h-12 w-full rounded-xl border border-border` com a cor, e legenda `text-[12px] font-medium` + `Check size-3 text-primary` quando ativo.
Temas: Grafite quente `oklch(0.24 0.006 70)`, Preto neutro `oklch(0.12 0 0)`, Grafite frio `oklch(0.26 0.01 260)`.
Abaixo do `Separator`: "Modo compacto" e "Reduzir animações" (switches).

### Sistema

Switches: "Abrir com o sistema", "Manter na bandeja", "Aceleração por hardware". Depois `Separator` e ações alinhadas à direita: `ghost` "Abrir pasta de dados" + `danger` "Resetar preferências".

### Integrações

Bloco `rounded-2xl border border-border bg-surface-2/60 p-4`: header com `KeyRound size-4 text-primary` + "LivePix API Key" + badge "Conectado" (só quando conectado). Linha com `Input` (password, mono) + `Button` primário "Salvar" (estado `loading` ~1.2s) + `Button danger` "Limpar". Nota `text-[11.5px] text-muted-foreground`.
Depois `Separator` e a linha "Modo automático" com `Zap size-4 text-warning` e switch **desabilitado** (em breve).

### Atualizações

Card `rounded-2xl border border-border bg-surface-2/60 p-4` com ícone em caixa `size-10 rounded-xl bg-[image:var(--gradient-primary)]` (`Download size-5 text-primary-foreground`), versão em `text-[13px] font-semibold`, subtítulo com última verificação, e `Button secondary` "Verificar agora" com `loading`.
Depois: switches "Atualizar automaticamente" (ligado, desabilitado) e "Canal beta". `Separator`, label caps "Novidades" e lista `text-[12px] text-muted-foreground` com itens prefixados por `•`.

---

## 8. Padrões das abas

- **TODO (kanban)**: workspaces com emoji + nome; colunas em faixa horizontal com scroll (`overflow-x-auto`), cada coluna `w-[280px] rounded-2xl border border-border bg-surface/60 p-3` com header (nome + contador em `text-[11px] text-muted-foreground`). Card: `raise cursor-grab rounded-xl border border-border bg-card p-3 text-[12.5px]`, com nota `text-[11.5px] text-muted-foreground` e tag `rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px]`. Drag & drop nativo HTML5 (`draggable`, `dragover.prevent`, `drop`), com destino em `ring-1 ring-ring`.
- **GAMES (torneios)**: alternador Individual/Equipe usando o mesmo padrão de abas (fundo só no ativo). Lista de inscritos à esquerda, equipes/slots à direita: slot vazio `rounded-xl border border-dashed border-border-strong p-2.5 text-[11.5px] text-muted-foreground`. Bracket adaptativo: só renderiza as rodadas necessárias (`2^n ≥ inscritos`); colunas por rodada com pares conectados; label da rodada em caps.
- **GIVEAWAYS (sorteios)**: `textarea` (`min-h-[180px] rounded-2xl border border-input bg-surface-2/60 p-3 font-mono text-[12.5px]`) aceitando nomes separados por `,` ou quebra de linha. Dois modos: **Roleta** (rotação com `transition: transform 5s var(--ease-mac)`, ponteiro no topo) e **Caixa** (esteira horizontal com `translateX` desacelerando, marcador central `animate-sk-ping`). Vencedor em `text-gradient-primary` com `text-2xl font-semibold`.

---

## 9. Checklist de implementação

- [ ] Tokens copiados; `background` preto neutro sem `background-image`.
- [ ] Sem cores hardcoded (`bg-black`, `text-white`, hex) nos componentes.
- [ ] Todas as variantes de botão + estado `loading`.
- [ ] Topbar: semáforo → abas à esquerda (fundo só na ativa) → ações à direita; sem logo, sem badge, sem status bar.
- [ ] Configurações como menu real (aside 220px + painel), 4 seções.
- [ ] `press`/`raise`/`animate-sk-in` aplicados em botões, cards e trocas de seção.
- [ ] Fontes Geist e Geist Mono carregadas.
