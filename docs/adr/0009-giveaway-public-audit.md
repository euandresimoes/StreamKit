# ADR 0009 — Auditoria pública do giveaway

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 7, 17, 25 e 26  
**Batches:** 0, 6 e 7

## Decisão

Exibir e exportar por rodada: ID, data/hora, modo, quantidade de entradas/tickets, política de duplicatas, vencedor e hash do snapshot congelado. Não expor dados pessoais desnecessários nem alegar prova criptográfica reproduzível sem um protocolo futuro de commit-reveal.

## Consequências

O público consegue correlacionar animação, resultado e histórico imutável. O hash detecta alteração do snapshot, mas não prova sozinho a imparcialidade da fonte aleatória.

## Validação e reversão

Testar que o snapshot e vencedor são persistidos antes da animação, que o hash muda com qualquer entrada e que dados sensíveis não entram no export.

