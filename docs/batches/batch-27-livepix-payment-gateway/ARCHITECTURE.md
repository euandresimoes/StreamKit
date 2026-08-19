# Arquitetura — LivePix Payment Gateway

## Fronteiras

O provider LivePix é responsável por OAuth2, chamadas HTTP do LivePix, CRUD do webhook, renovação da
URL pública, consulta dos detalhes e normalização do evento. Ele não decide sorteio, distribuição de
times, vencedor, banimento, chat privado ou regras de campanha.

O domínio de contribuição recebe apenas um evento normalizado:

```ts
type ContributionReceived = {
  eventId: string
  provider: 'livepix'
  providerResourceId: string
  providerReference: string | null
  participantHandle: string | null
  participantPlatform: 'kick' | 'twitch' | 'youtube' | null
  message: string | null
  amountInCents: number | null
  currency: string | null
  contributionType: 'payment' | 'message' | 'subscription' | 'subscription_cancelled'
  occurredAt: string
}
```

`participantHandle` usa exatamente o nome escolhido pelo doador, sem tentar transformá-lo em nome de
exibição. O vínculo com Twitch/Kick/YouTube é feito pelo fluxo de identidade do Streamlet, não pelo
adapter LivePix.

## Fluxo confiável de evento

```text
LivePix webhook básico
  → validar formato, userId, clientId, endpoint e tipo permitido
  → persistir envelope idempotente na fila local
  → responder HTTP 200 somente após a persistência durável
  → buscar detalhes por resource.id/reference usando token em memória
  → validar resposta completa e normalizar
  → publicar ContributionReceived
  → marcar processado; retry/dead-letter em falha
```

O webhook nunca executa comandos de Giveaway, Games ou Torneio diretamente. O payload básico não é
tratado como prova suficiente do valor ou da mensagem; o valor final vem da consulta autenticada ao
endpoint de detalhes do LivePix.

## OAuth2 e segredos

- `client_id`, `client_secret`, access token e refresh token ficam somente no cofre seguro do sistema
  operacional.
- Tokens são reutilizados até a expiração; não emitir token a cada chamada.
- Renovação de token possui single-flight: várias requisições simultâneas aguardam a mesma renovação.
- `401` invalida o access token em memória e tenta uma única renovação controlada.
- Revogação, falha de consentimento e escopo insuficiente produzem estado visível e recuperável.
- Nenhum token, Authorization header ou payload completo aparece em SQLite, frontend ou logs.

## Webhook e troca de URL

O LivePix permite consultar, criar e excluir webhooks pela API. Como a URL do Quick Tunnel é dinâmica,
a troca será tratada como geração de endpoint:

1. Iniciar o novo túnel e verificar que ele está pronto.
2. Criar o novo webhook no LivePix.
3. Persistir o novo `remoteWebhookId`, URL, geração e estado somente após resposta válida.
4. Manter o endpoint anterior em uma janela curta de sobreposição quando tecnicamente possível.
5. Excluir o webhook anterior após o novo estar registrado.
6. Se a exclusão falhar, manter a referência antiga para reconciliação posterior; não apagar o estado
   local e não criar webhooks infinitos.

Se o processo cair entre essas etapas, o restart executa reconciliação: lista webhooks do LivePix,
identifica os endpoints pertencentes à instalação por uma marca identificável na URL, escolhe a geração
mais recente válida e remove órfãos conhecidos com segurança. Como o LivePix reenvia eventos quando não
recebe HTTP 200, a deduplicação por `providerResourceId`/event id precisa tornar a sobreposição segura.

## Reconexão automática

Estados mínimos: `disconnected`, `authenticating`, `connecting`, `ready`, `degraded`, `reconciling`,
`reauthorization_required` e `stopped`.

- Falhas transitórias de rede, DNS, túnel ou API usam backoff exponencial com jitter e limite.
- A reconexão não emite novo OAuth token desnecessariamente.
- A queda do túnel inicia nova geração apenas se o provider estiver ativo.
- Ao obter nova URL, o provider executa o fluxo de troca acima antes de anunciar `ready`.
- O provider não confirma `ready` enquanto o webhook remoto não estiver registrado e verificável.
- Após restart, a reconciliação é obrigatória antes de processar eventos novos.

## Rate limit e API

O client lê `X-RateLimit-Limit` e trata `429` com `Retry-After` quando presente. Consultas de detalhes
são limitadas, agrupadas quando a API permitir e nunca repetidas por evento já resolvido. Erros 4xx
permanentes não entram em retry infinito; erros 5xx, timeout e indisponibilidade transitória entram na
fila com backoff e dead-letter auditável.

## Escopo inicial e exclusões

Incluído: conta autenticada, conexão/desconexão, webhook de pagamentos/mensagens/assinaturas, consulta
de detalhes, normalização, identidade exata, reconexão, troca de URL, deduplicação, diagnóstico e
testes simulados.

Fora do primeiro recorte: criar pagamentos pelo Streamlet, saque, alteração de controles do LivePix,
regras financeiras, chargeback automático, cobrança recorrente criada pelo Streamlet e qualquer
dependência obrigatória de rede para o modo manual.
