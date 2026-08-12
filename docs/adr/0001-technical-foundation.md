# ADR 0001 — Fundação técnica do monólito modular

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 9, 10, 12, 16 e 25  
**Batches:** 0, 1, 2 e 11

## Contexto

O StreamKit precisa de backend local estruturado em classes/casos de uso, API documentada, frontend Vue e build Electron com hot reload, empacotamento e auto update.

## Opções consideradas

- Backend: NestJS, Fastify direto ou Express.
- Build desktop: electron-vite, Vite configurado manualmente ou Electron Forge.
- Distribuição: electron-builder/electron-updater ou Forge.

## Decisão

- Backend em NestJS com adapter Fastify.
- Vue e renderers com Vite; main/preload/renderer coordenados por electron-vite.
- electron-builder como empacotador, NSIS no Windows e electron-updater para atualizações.
- Monólito modular com contracts Zod compartilhados, OpenAPI e Scalar.

## Consequências

- NestJS fornece DI e organização compatíveis com controllers/services/repositories.
- Fastify reduz overhead da API local, mas Zod permanece a validação canônica.
- electron-vite simplifica HMR dos três contextos.
- Dependências nativas exigirão rebuild e smoke test no Electron empacotado.

## Validação e reversão

O vertical slice da Batch 2 deve provar health check, persistência, Scalar e pacote Electron. Uma troca exige novo ADR e contratos de domínio permanecem independentes do framework.
