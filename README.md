# StreamKit

StreamKit é uma toolbox desktop local-first para streamers, com TODO/Kanban, torneios, giveaways e configurações multiwindow. O projeto é source-available sob a [PolyForm Noncommercial License 1.0.0](./LICENSE.md), não open-source.

## Estado atual

O repositório está na fase de fundação. A especificação completa está em [docs/STREAMKIT_PROJECT_SPEC.md](./docs/STREAMKIT_PROJECT_SPEC.md) e o progresso por batches em [docs/IMPLEMENTATION_BATCHES.md](./docs/IMPLEMENTATION_BATCHES.md).

## Requisitos

- Windows 10 22H2 ou Windows 11 x64;
- Node.js 22.12 ou superior dentro da linha 22;
- pnpm 10.

## Instalação

```powershell
pnpm install --frozen-lockfile
```

Durante alterações deliberadas de dependências, execute `pnpm install` e versione o `pnpm-lock.yaml` atualizado.

## Workspaces

```text
apps/
├── backend/     # monólito modular NestJS/Fastify
├── desktop/     # Electron main e preload
└── frontend/    # Vue, Pinia e SCSS
packages/
├── config/      # configurações compartilhadas não sensíveis
├── contracts/   # schemas Zod, tipos e códigos públicos
└── test-utils/  # diretórios e recursos isolados de teste
```

## Comandos

| Comando                 | Finalidade                                                      |
| ----------------------- | --------------------------------------------------------------- |
| `pnpm dev`              | Inicia os três workspaces principais com processos coordenados. |
| `pnpm debug`            | Inicia desenvolvimento com `STREAMKIT_DEBUG=true`.              |
| `pnpm format`           | Formata arquivos suportados.                                    |
| `pnpm format:check`     | Verifica formatação sem editar.                                 |
| `pnpm lint`             | Executa ESLint com zero warnings permitido.                     |
| `pnpm typecheck`        | Verifica código e testes TypeScript de todos os workspaces.     |
| `pnpm test`             | Executa testes unitários dos seis workspaces.                   |
| `pnpm test:integration` | Executa integração do backend em ambiente isolado.              |
| `pnpm test:e2e`         | Executa o harness E2E do desktop.                               |
| `pnpm test:coverage`    | Gera cobertura de frontend e backend.                           |
| `pnpm build`            | Compila todos os workspaces.                                    |
| `pnpm validate`         | Executa todo o gate disponível da fundação.                     |

`pnpm release` existe como contrato raiz, mas a publicação permanece deliberadamente bloqueada até a Batch 11.

## Segurança dos testes

Testes que precisam de dados locais devem usar `@streamkit/test-utils`. O helper cria um diretório temporário com banco `streamkit.test.db` e oferece limpeza explícita. Nunca aponte testes para `app.getPath('userData')` real.

## Contribuição

Leia [docs/PROJECT_RULES.md](./docs/PROJECT_RULES.md) antes de alterar o projeto. Decisões duradouras devem ser registradas em `docs/adr/`.
