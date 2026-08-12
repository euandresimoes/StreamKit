# ADR 0010 — pnpm como package manager

**Status:** aceita
**Data:** 2026-08-12
**Responsáveis:** André Simões
**Especificação:** seções 10, 16, 18 e 25
**Batches:** 1 e posteriores

## Contexto

O monorepo precisa de workspaces, instalação reproduzível, bom compartilhamento de dependências e comandos filtrados por pacote.

## Opções consideradas

- npm workspaces.
- pnpm workspaces.
- Yarn workspaces.

## Decisão

Usar pnpm 10, fixado pelo campo `packageManager`, com `pnpm-workspace.yaml`, lockfile versionado e instalação `--frozen-lockfile` na CI.

## Consequências

- Dependências de workspace usam o protocolo `workspace:*`.
- CI e desenvolvimento exigem pnpm 10 e Node.js 22.
- Dependências nativas aprovadas serão declaradas explicitamente em `onlyBuiltDependencies`.

## Validação e reversão

A instalação limpa e todos os scripts raiz devem funcionar com lockfile congelado. Uma troca exige novo ADR e regeneração deliberada do lockfile e workflows.
