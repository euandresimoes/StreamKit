# ADR 0015 — Kick exige relay hospedado para integração segura

- Status: aceito
- Data: 2026-08-13
- Referências: especificação seções 8, 10, 17 e 21; ADR 0014; Batch 18

## Contexto

O StreamKit é um desktop local-first e não possui backend público. A API oficial atual da Kick exige
`client_secret` na troca e renovação OAuth. A leitura de chat está disponível por assinatura do evento
`chat.message.sent`, cujo único método oficial documentado é webhook público HTTPS.

## Opções consideradas

1. Embutir o client secret e usar um túnel/webhook temporário no desktop.
2. Consumir endpoints ou WebSockets privados usados pelo site da Kick.
3. Criar agora um relay hospedado do StreamKit.
4. Expor a ausência de capacidades e adiar o relay para uma decisão de produto/infraestrutura.

## Decisão

Adotar a opção 4. O provider Kick declara zero capacidades no modo local. A UI explica as limitações
e os domínios de participantes continuam dependendo apenas das capacidades normalizadas. Não serão
embutidos segredos, abertos túneis automáticos nem usados endpoints privados ou engenharia reversa.

## Consequências

- Kick não fornece participantes nem chat focado no MVP local atual.
- O produto comunica indisponibilidade em vez de simular equivalência.
- Uma integração futura exige relay hospedado, gestão segura do client secret, validação de assinatura
  de webhook, política de retenção/privacidade, observabilidade, custo e consentimento do usuário.
- A futura decisão poderá adicionar capacidades sem mudar Giveaways, Games ou o chat focado.
