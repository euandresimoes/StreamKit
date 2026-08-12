# ADR 0004 — Drag and drop acessível

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 4, 5, 6, 13, 17 e 25  
**Batches:** 0, 5, 8 e 9

## Decisão

Usar `@atlaskit/pragmatic-drag-and-drop`, integrado diretamente com Vue por composables pequenos e específicos. Toda ação terá alternativa equivalente por teclado/botões.

## Consequências

- A solução é independente do framework e possui primitives de elemento/target/monitor.
- Drag previews e overlays em superfícies Renderizer devem usar o owner document/window correto.
- A persistência será operação atômica com rollback visual em falha.

## Validação e reversão

Testar reordenação, movimento entre listas, cancelamento, rollback, teclado e cada superfície Renderizer. A fronteira de comandos de movimento permite trocar a biblioteca sem mudar o domínio.
