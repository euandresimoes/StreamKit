# Batch 27 — LivePix Payment Gateway

## Objetivo

Implementar o provider de pagamentos recebidos do LivePix como um módulo isolado, reutilizando a
infraestrutura opcional de eventos externos da Batch 26 e mantendo o núcleo de Giveaway, Games e
Torneios independente de qualquer gateway.

O primeiro recorte recebe mensagens/pagamentos e assinaturas do canal, resolve os detalhes pela API
oficial e traduz tudo para um contrato interno de contribuição. A contribuição poderá ser associada à
plataforma global selecionada e ao handle/channelId exato definido pelo streamer, conforme o ADR 0027.

## Fontes oficiais validadas

- [LivePix API](https://docs.livepix.gg/api)
- [OpenAPI da API LivePix](https://api.livepix.gg)

A documentação oficial descreve OAuth2, limites por endpoint, webhooks com payload básico, consulta
posterior dos detalhes e retry do webhook quando a resposta não for HTTP 200. Nenhum campo de
assinatura HMAC deve ser presumido sem existir na documentação/conta utilizada; o adapter deve validar
somente garantias comprovadas pelo provider.

## Estrutura planejada

```text
apps/backend/src/modules/payments/
├── payment-provider.contract.ts
├── payment-provider.registry.ts
├── payment-connection.service.ts
└── providers/
    └── livepix/
        ├── livepix-api.client.ts
        ├── livepix-auth.service.ts
        ├── livepix-webhook.service.ts
        ├── livepix-payment.provider.ts
        ├── livepix.schemas.ts
        └── livepix.errors.ts

packages/contracts/src/payment.ts
docs/batches/batch-27-livepix-payment-gateway/
```

Providers futuros ganham uma pasta própria sob `providers/`, sem compartilhar detalhes de OAuth,
payload, rate limit ou webhook por herança acidental.

## Critério de saída

A batch só estará concluída quando o fluxo funcionar com eventos simulados e ambiente autorizado,
incluindo autorização, webhook, consulta de detalhes, deduplicação, troca de URL, reconexão, falhas de
rede, expiração de token, restart do desktop e preservação do modo manual.

As tasks executáveis estão em `docs/IMPLEMENTATION_BATCHES.md`; as decisões de confiabilidade e
segurança estão em `ARCHITECTURE.md`.
