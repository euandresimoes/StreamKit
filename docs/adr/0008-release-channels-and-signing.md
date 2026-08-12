# ADR 0008 — Canais, assinatura e auto update

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 14, 18 e 25  
**Batches:** 0 e 11

## Decisão

- Canais `stable` e `beta`, publicados separadamente no GitHub Releases.
- Instalador NSIS e metadados gerados pelo electron-builder; atualização por electron-updater.
- Release pública stable assinada quando o certificado estiver configurado, sempre com checksum.
- Builds internos não assinados devem ser identificados como desenvolvimento e nunca promovidos silenciosamente a stable.

## Consequências

Assinatura reduz alertas e risco de supply chain, mas requer certificado e secret de CI. O updater só instalará artefato/metadados produzidos juntos pelo pipeline autorizado.

## Validação e reversão

Testar stable/beta, checksum inválido, assinatura inválida, versão pulada e rollback operacional por release corretiva de versão superior.
