# ADR 0002 — Renderizer para arquitetura multiwindow

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 1, 2, 4, 9, 13, 22 e 25  
**Batches:** 0, 2, 3 e 10

## Contexto

Settings deve abrir em uma janela Electron nativa sem iniciar outro runtime do frontend nem duplicar stores, caches, tema e clientes.

## Decisão

Usar o framework [Renderizer](https://github.com/RRenderizer/renderizer), mantido pelo proprietário do StreamKit, por meio de `@renderizer/vue`, `RenderWindowManager`, `RenderWindow` e `RenderPortal`.

Settings será uma superfície adicional do mesmo runtime Vue. Overlays, dropdowns e modais usarão o overlay root da janela proprietária, nunca um `document.body` global assumido.

## Consequências

- Pinia, tema e componentes permanecem compartilhados sem segunda inicialização do frontend.
- Preload deve estar disponível à janela principal e às superfícies filhas.
- A biblioteca ainda está em beta/alpha; fixaremos versão exata no lockfile e upgrades exigirão testes multiwindow.
- O sandbox será habilitado quando compatível; qualquer exceção necessária ao Renderizer deverá ter threat model e ADR complementar.

## Validação e reversão

E2E deve provar janela única, foco, sincronização, estilos, portals, hot reload e ausência de regressão. Se uma versão quebrar o contrato, manter a última versão validada enquanto o framework é corrigido.
