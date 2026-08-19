# ADR 0028 — Transporte opcional de eventos externos

## Contexto

Providers de pagamento e outras integrações podem exigir um callback público, mas o Streamlet é um
desktop local-first. O usuário não deve configurar DNS, portas, proxy, Cloudflare Tunnel ou ngrok, e o
produto não deve manter um backend de negócio remoto.

## Decisão

O backend local mantém uma fila SQLite durável e expõe somente rotas de ingress registradas por
provider. O listener continua preso a `127.0.0.1`; cada endpoint tem identificador aleatório, segredo
fora da fila e limite de requisições. O payload passa por contrato Zod, deduplicação por
`provider/eventId`, processamento assíncrono, retry com backoff e dead letter.

Quando um provider realmente precisar de callback, o adapter inicia um Cloudflare Quick Tunnel
automaticamente, grava o binário no diretório de dados do usuário e publica apenas a URL do callback
registrado. O túnel é encerrado quando não há endpoints ativos ou quando o desktop fecha. O status é
consultável apenas pela API local autenticada. Providers com WebSocket ou streaming não ativam essa
infraestrutura.

Assinaturas, headers específicos, verificação de timestamp e regras de replay são responsabilidade do
adapter de cada provider antes de chamar o contrato comum. LivePix e Kick serão implementados em
batches posteriores; esta batch entrega apenas a base reutilizável.

## Alternativas consideradas

- Polling universal: rejeitado porque aumenta requisições, quota e latência, além de não atender
  providers que só oferecem webhook.
- Backend remoto próprio: rejeitado por custo, superfície de exposição e divergência do requisito
  local-first.
- Port forwarding ou configuração manual de túnel: rejeitado por exigir conhecimento técnico do
  usuário e expor a rede doméstica.

## Consequências

- O processamento e os segredos continuam locais, mas eventos percorrem o túnel HTTPS enquanto ele
  estiver ativo.
- A URL pública é dinâmica e pode mudar; o provider deve ser atualizado pelo adapter quando isso
  ocorrer.
- O primeiro uso pode baixar o binário do Cloudflared para o diretório de dados do usuário.
- Falha do túnel não derruba o backend: o estado fica `error` e o provider recebe diagnóstico para
  retry/reconfiguração.
- Payloads brutos ficam retidos localmente por tempo limitado para permitir retry e recuperação após
  reinício; nenhum token é persistido na fila ou enviado ao frontend.
