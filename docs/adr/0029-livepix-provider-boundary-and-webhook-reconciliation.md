# ADR 0029 — Fronteira do provider LivePix e URL de notificações do aplicativo

## Contexto

LivePix expõe OAuth2, endpoints para consultar mensagens/pagamentos e uma API de webhooks. O webhook
envia apenas dados básicos; os detalhes precisam ser consultados na API. O provider também pode
reenviar um evento quando não recebe HTTP 200, e a URL do Streamlet muda quando o túnel local é
recriado.

Pagamentos são uma área crítica: uma duplicata pode inserir participantes duas vezes, uma perda pode
invalidar uma campanha e uma URL antiga pode deixar webhooks órfãos na conta do usuário.

## Decisão

LivePix terá um adapter isolado em `apps/backend/src/modules/payments/providers/livepix/`, atrás de um
contrato `ContributionProvider`. O adapter fará OAuth2 `client_credentials`, chamadas HTTP, tratamento
de rate limit, consulta de detalhes e normalização. Nenhuma regra de sorteio, torneio ou equipe ficará
nele.

Cada conexão solicita o token com os escopos mínimos dos endpoints utilizados
(`account:read messages:read payments:read webhooks`) e reutiliza esse token até próximo da expiração.
A URL pública do túnel é configurada pelo usuário no campo **URL de
notificações** do aplicativo em Settings > API no LivePix. O provider não chama `GET`, `POST` ou
`DELETE /v2/webhooks`; esses endpoints apresentaram `429` persistente mesmo entre janelas de reset e
são desnecessários quando a URL já está vinculada ao aplicativo.

Depois de reiniciar o Streamlet, a URL temporária muda. O estado local anterior é invalidado sem
chamar o LivePix, e o guia exige que o usuário atualize a URL de notificações antes de conectar de
novo.

O envelope será persistido na fila local antes do HTTP 200. Duplicatas serão reconhecidas por um
identificador externo estável e não produzirão efeitos repetidos. O valor, mensagem e identidade só
serão aceitos depois da consulta autenticada dos detalhes do recurso.

Toda URL nova será tratada como uma nova geração local: iniciar e verificar o túnel, exibir a URL para
configuração e persistir a referência local. A máquina de estados anuncia `ready` depois que o token é
validado e o túnel está disponível; o LivePix não oferece confirmação automática da alteração feita no
painel do aplicativo.

Os recursos `message` e `payment` serão aceitos. Doações nomeadas usam `message` e exigem consulta em
`GET /v2/messages/{id}`; pagamentos sem identidade usam `GET /v2/payments/{id}` e permanecem pendentes
quando não puderem ser vinculados a um participante.

Uma contribuição nomeada recebida sem campanha aplicável permanece persistida e é reavaliada quando
uma captura fica ativa. Giveaways em `draft` aceitam a primeira contribuição válida e passam para
`ready`, como já ocorre na captura por chat. Duplicatas e contribuições acima da capacidade não criam
participantes adicionais.

Participantes originados pelo LivePix mantêm a contribuição como fonte do valor e da moeda exibidos,
sem duplicar esses dados na tabela de participantes. A plataforma de chat escolhida é vinculada desde
a captura; quando uma mensagem com o mesmo handle chega, o participante recebe a identidade estável e
o avatar da plataforma. Giveaway e Tournament apresentam esses dados pelo mesmo componente de painel.

## Segurança

- Segredos e tokens ficam no cofre seguro do sistema operacional.
- O endpoint local usa rota aleatória, segredo de ingress e validação de conta/provider.
- Não será inventada assinatura HMAC: só serão usadas garantias documentadas pelo LivePix.
- Logs e diagnósticos não conterão tokens, headers ou mensagens integrais.
- O modo manual permanece funcional quando OAuth, API ou túnel estiver indisponível.

## Alternativas rejeitadas

- Acoplar LivePix diretamente ao domínio de Giveaway: dificultaria providers futuros e tornaria a
  indisponibilidade financeira uma falha do núcleo.
- Confiar somente no payload do webhook: o LivePix documenta que ele é básico e exige consulta de
  detalhes.
- Substituir webhook por polling contínuo: aumenta quota/latência e não resolve a entrega push.
- Reconciliar e rotacionar webhooks pela API: os endpoints de gerenciamento retornaram `429`
  persistente e tornaram a conexão imprevisível no aplicativo local.
- Consultar ou limpar webhooks automaticamente: pode tocar configurações externas que o Streamlet não
  consegue atribuir com segurança a uma instalação específica.
