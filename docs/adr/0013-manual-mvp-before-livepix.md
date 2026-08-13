# ADR 0013 — Validar e lapidar o MVP manual antes da LivePix

**Status:** aceita

**Data:** 2026-08-12

**Responsáveis:** André Simões

**Especificação:** seções 2, 21, 22 e 29

**Batches:** 11 e 12

## Contexto

As funcionalidades manuais do MVP já estão implementadas e automatizadamente validadas, mas
ainda precisam de uso real pelo proprietário e de uma rodada de refinamento da interface. A
integração LivePix pertence à fase seguinte e adicionaria autenticação, rede e automações antes
de o núcleo manual estar aprovado em uso.

## Decisão

- Reabrir a Batch 11 para aceitação manual e refinamento da UI do frontend.
- Não iniciar a implementação da Batch 12 até autorização explícita posterior.
- Manter estruturas preparatórias já seguras, como cofre de credenciais e origem de participante,
  sem apresentá-las como integração funcional.
- Continuar considerando SQLite e os fluxos manuais independentes como núcleo do produto.

## Consequências

- LivePix, polling, webhooks e automações ficam adiados sem impedir o uso manual.
- Achados do teste do proprietário serão registrados como tasks da Batch 11 antes das correções.
- A Batch 12 somente será retomada depois da aprovação dos fluxos manuais e da UI.

## Validação e reversão

A Batch 11 volta a ser concluída após teste guiado do proprietário, registro/correção dos achados,
gate verde e publicação dos ajustes. Retomar LivePix exige pedido explícito e revisão das decisões
de produto listadas na Batch 12.
