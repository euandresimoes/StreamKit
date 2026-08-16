# ADR 0030 — Implementar a integração oficial local da Kick

- Status: aceito
- Data: 2026-08-16
- Substitui: ADR 0015

## Contexto

A API pública atual da Kick oferece OAuth 2.1 com PKCE, subscriptions para eventos oficiais e
endpoints documentados de chat, livestreams e moderação. A entrega de `chat.message.sent` exige
um webhook HTTPS público.

## Decisão

Implementar a Kick usando somente a API oficial, o cofre seguro do sistema operacional e o
transporte HTTPS temporário local da Batch 26. O client secret será informado pelo usuário no
guia da Kick e nunca será embutido no build ou enviado ao renderer.

O provider terá fronteira própria para OAuth, subscriptions, validação de eventos, chat e
moderação. A lógica de participantes continuará dependente apenas dos contratos normalizados.

## Consequências

- A Kick poderá alimentar o chat, Giveaways e Torneios em modo local enquanto o túnel estiver ativo.
- A conexão depende de rede, OAuth e disponibilidade do webhook oficial.
- Ações sem endpoint oficial equivalente permanecerão indisponíveis e serão sinalizadas por
  capability, sem usar endpoints privados ou WebSocket reverso.
- O StreamKit deverá renovar o token e recriar a subscription quando a URL do túnel mudar.

## Referências

- https://docs.kick.com/getting-started/generating-tokens-oauth2-flow
- https://docs.kick.com/events/subscribe-to-events
- https://docs.kick.com/events/event-types
- https://api.kick.com/swagger/index.html
