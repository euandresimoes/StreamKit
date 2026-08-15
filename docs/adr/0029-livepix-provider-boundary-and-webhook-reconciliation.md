# ADR 0029 — Fronteira do provider LivePix e reconciliação de webhooks

## Contexto

LivePix expõe OAuth2, endpoints para consultar mensagens/pagamentos e uma API de webhooks. O webhook
envia apenas dados básicos; os detalhes precisam ser consultados na API. O provider também pode
reenviar um evento quando não recebe HTTP 200, e a URL do StreamKit muda quando o túnel local é
recriado.

Pagamentos são uma área crítica: uma duplicata pode inserir participantes duas vezes, uma perda pode
invalidar uma campanha e uma URL antiga pode deixar webhooks órfãos na conta do usuário.

## Decisão

LivePix terá um adapter isolado em `apps/backend/src/modules/payments/providers/livepix/`, atrás de um
contrato `ContributionProvider`. O adapter fará OAuth2, chamadas HTTP, rate limit, consulta de
detalhes, CRUD do webhook, reconciliação e normalização. Nenhuma regra de sorteio, torneio ou equipe
ficará nele.

O envelope será persistido na fila local antes do HTTP 200. Duplicatas serão reconhecidas por um
identificador externo estável e não produzirão efeitos repetidos. O valor, mensagem e identidade só
serão aceitos depois da consulta autenticada dos detalhes do recurso.

Toda URL nova será tratada como uma nova geração: iniciar e verificar o túnel, registrar a URL nova,
persistir o vínculo remoto, remover o webhook antigo após confirmação e reconciliar em caso de crash.
O estado local manterá referências suficientes para remover órfãos conhecidos sem tocar em webhooks de
outras instalações. A máquina de estados só anunciará `ready` quando o webhook remoto estiver
confirmado.

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
- Trocar a URL sobrescrevendo o webhook anterior: cria janela de perda e órfãos em crashes.
