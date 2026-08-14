# ADR 0026 — Janelas limitadas para listas operacionais

## Contexto

Giveaways e chats podem conter até 10.000 entradas persistidas. Renderizar cada participante, cada mensagem ou cópias completas da animação no React causa pressão de memória, layout e GC, especialmente durante uma live.

## Decisão

Persistência, sorteio, auditoria e contagem continuam usando o conjunto completo. A camada de apresentação usa janelas limitadas a 50 participantes/mensagens por vez. Quando uma animação já possui vencedor definido, a janela mantém o vencedor visível. O chat mantém retenção no backend, mas entrega e renderiza somente a janela operacional recente. O pruning do buffer é amortizado por tempo ou quantidade de eventos, sem alterar o limite global de retenção.

## Consequências

Listas maiores exibem uma indicação de que existem mais itens e oferecem busca/seleção para navegação. O resultado do sorteio não depende do subconjunto renderizado. A solução evita adicionar uma biblioteca de virtualização antes de medir um caso que exija rolagem contínua; se necessário, a mesma fronteira poderá receber virtualização posteriormente.
