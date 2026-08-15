# ADR 0030: Isolamento e limites dos eventos em tempo de execução

## Status

Accepted

## Contexto

Chats e webhooks são fluxos contínuos e não podem crescer indefinidamente em memória ou no SQLite. Uma reconexão também não pode misturar mensagens de uma live anterior, e falhas transitórias não devem perder eventos nem repetir efeitos de forma não controlada.

## Decisão

- Cada conexão de live recebe uma chave de sessão derivada da transmissão ativa. O buffer de chat é limpo quando a sessão muda e consultas de chat filtram pela sessão atual.
- O buffer mantém no máximo 100 mensagens e os eventos processados têm retenção de 24 horas e limite de 10.000 registros.
- Eventos com falha de handler permanecem reprocessáveis; duplicatas já processadas são ignoradas.
- A fila externa limita payloads a 256 KB e 10.000 registros. Itens presos em `processing` são devolvidos para retry após cinco minutos.
- Operações de sorteio, início e conclusão de partidas usam transições condicionais dentro de transação para impedir dupla execução concorrente.
- Contribuições LivePix são deduplicadas antes da consulta de detalhes e só são marcadas como processadas depois de uma aplicação válida; pendências podem ser resolvidas manualmente com a plataforma selecionada.
- IDs de rota e JSON persistido devem ser validados antes de chegar aos serviços.

## Consequências

O sistema prioriza consistência e limites previsíveis. Em picos que excederem a capacidade da fila externa, a entrada é rejeitada com erro explícito para permitir retry do remetente, em vez de degradar silenciosamente o aplicativo.
