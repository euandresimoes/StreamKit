# ADR 0014 — Integrações de live orientadas a capacidades

**Status:** aceita

**Data:** 2026-08-13

**Responsáveis:** André Simões

**Especificação:** seções 8, 10, 11, 17, 21, 22 e 28

**Batches:** 12 a 19

## Contexto

Giveaways e Games precisam receber participantes dos chats da Twitch, YouTube e Kick. As mesmas
conexões deverão servir futuramente a outras ferramentas, sem acoplar os domínios às APIs de cada
plataforma. Integrações de pagamento possuem identidade, eventos e garantias diferentes das de
chat e não devem ser forçadas no mesmo contrato.

## Decisão

- Criar um módulo local de integrações no backend, orientado a capacidades declaradas.
- Separar contratos como `ChatReader`, `ChatWriter` e `UserIdentity` de capacidades futuras de
  pagamento.
- Normalizar eventos externos antes de entregá-los aos consumidores e deduplicá-los pela identidade
  externa estável do evento.
- Identificar usuários por `provider + providerUserId`; handles e nomes serão apenas atributos
  mutáveis de exibição.
- Persistir conexões sem segredos, regras de captura, participantes capturados e o estado mínimo de
  processamento no SQLite. Tokens e refresh tokens permanecem exclusivamente no cofre do sistema.
- Fazer Giveaway e Games consumirem fontes de participantes, sem conhecer SDKs ou payloads de
  Twitch, YouTube ou Kick.
- Manter entrada manual totalmente funcional sem rede.
- Implementar Twitch, YouTube e Kick como adapters separados; capacidades ausentes ficam visíveis
  na UI e nunca são simuladas.
- Manter LivePix, pagamentos, Bots e editor visual fora das batches 12 a 19.

## Consequências

- Uma integração pode oferecer leitura sem escrita ou metadados de membro sem quebrar consumidores.
- Mensagens de vencedor e de equipes podem ser filtradas por identidade estável entre mudanças de
  handle.
- OAuth, quotas, reconexão e limitações continuam específicos de cada adapter.
- Cadastros OAuth e políticas de revisão dos fornecedores são dependências externas explícitas.

## Validação e reversão

Contratos serão exercitados com adapters simulados e cada adapter real terá testes de tradução,
deduplicação, reconexão e revogação. Um adapter pode ser desabilitado sem remover participantes já
persistidos nem impedir os fluxos manuais.
