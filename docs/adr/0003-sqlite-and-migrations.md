# ADR 0003 — SQLite, driver e migrations

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 11, 17, 20 e 25  
**Batches:** 0 e 4

## Contexto

O produto local-first precisa de transações previsíveis, migrations versionadas, backup e boa performance dentro do processo local.

## Decisão

Usar um único `streamkit.db` com `better-sqlite3`, Drizzle ORM como query/schema layer e Drizzle Kit para gerar migrations versionadas. Repositories continuam sendo a única fronteira de persistência dos casos de uso.

## Consequências

- A API síncrona simplifica transações locais, mas queries pesadas não podem bloquear animações.
- `better-sqlite3` é nativo e deve ser recompilado para a versão do Electron.
- Migrations geradas serão revisadas e testadas; produção nunca usará schema push destrutivo.

## Validação e reversão

Testar banco limpo, upgrades, rollback, WAL, backup/restauração e pacote Electron. O schema SQL versionado permite trocar o query builder sem alterar entidades e services.
