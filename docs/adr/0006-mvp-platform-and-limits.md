# ADR 0006 — Plataforma, limites e baseline do MVP

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 2, 6.4, 18, 20, 22 e 25  
**Batches:** 0–11 e 14

## Decisão

- Plataforma oficial inicial: Windows 10 22H2 e Windows 11 x64.
- Equipamento de referência: CPU de 4 núcleos, 8 GB RAM e SSD.
- BYEs fora do MVP; brackets de 4, 8, 16 e 32.
- Limites: 100 workspaces; 50 colunas e 10.000 cards por workspace; 32 entradas por torneio; 16 membros por equipe; 10.000 participantes únicos e 100.000 tickets por giveaway.
- Metas de performance e confiabilidade ficam na seção 3 de `docs/BATCH_0_GOVERNANCE.md`.

## Consequências

Os limites reduzem risco do primeiro release e tornam testes reproduzíveis. Listas grandes exigem paginação/virtualização. Elevar qualquer limite requer profiling e testes de persistência.

## Validação e reversão

Executar testes nos limites e smoke test no equipamento de referência. Limites poderão subir por configuração versionada após evidência.

