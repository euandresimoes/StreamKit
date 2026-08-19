# ADR 0016 — Partidas operacionais, progressão e chat bilateral

**Status:** aceita  
**Data:** 2026-08-13  
**Responsáveis:** Streamlet  
**Especificação:** seções 6, 8, 10 e 17  
**Batches:** 20

## Contexto

O bracket de eliminação simples já persiste entradas e vencedores, mas a operação durante uma live
precisa distinguir a partida atual, representar o resultado de ambos os lados, consultar os chats das
equipes e testar dezenas ou milhares de participantes sem controlar muitas contas reais.

Separar "registrar vencedor" de "avançar para a próxima fase" permitiria estados contraditórios. Um
empate também não produz vencedor válido em eliminação simples. Providers reais não são adequados
para testes determinísticos ou de carga.

## Drivers da decisão

- Operar uma partida durante a live com poucos cliques e estado inequívoco.
- Preservar progressão, auditoria e recuperação após reinício.
- Isolar mensagens pelas identidades externas das duas equipes.
- Reproduzir testes funcionais e de carga sem dezenas de contas reais.

## Opções consideradas

### Opção A — Resultado e avanço em ações separadas

- Benefício: permite aprovação intermediária.
- Custo: cria estados contraditórios entre vencedor registrado e slot seguinte vazio/incorreto.

### Opção B — Confirmação transacional com simulador compartilhado

- Benefício: uma ação persiste resultado e progressão; o simulador exercita o pipeline real.
- Custo: exige migration, invalidação descendente e separação rigorosa entre debug e produção.

## Decisão

- Cada torneio possui no máximo uma partida atual.
- Cada lado usa `pending`, `won`, `lost`, `forfeit` ou `draw` como resultado operacional.
- Apenas `won/lost` e `won/forfeit` concluem uma partida.
- `draw/draw` preserva o estado para desempate e não avança nenhum lado.
- Confirmar um resultado finaliza a partida e propaga o vencedor atomicamente.
- O chat da partida é derivado das identidades persistidas dos dois lados e permanece acessível até
  outra partida ser iniciada.
- Um provider simulado determinístico usa o mesmo pipeline de eventos e é registrado somente em
  desenvolvimento/debug.

## Consequências

### Positivas

- O banco persiste seleção da partida, estado por lado e timestamps operacionais.
- Corrigir um resultado invalida descendentes de forma auditável.
- Participantes manuais permanecem na escalação sem identidades de chat fictícias.
- Testes de carga exercitam captura, deduplicação, persistência e UI sem depender de contas reais.

### Negativas e trade-offs

- O simulador não comprova OAuth ou transporte externo, cobertos por adapters e testes reais.
- A progressão transacional exige migration e regras explícitas de invalidação descendente.

## Validação

- Unitários de invariantes e combinações de resultado.
- Integrações SQLite de progressão, rollback, restart, auditoria e chat isolado.
- Componentes do bracket em 4, 8, 16 e 32 entradas e E2E dos modos individual/equipes.
- Soak determinístico de 10.000 eventos com duplicatas, burst e reconexão.

## Plano de reversão

O simulador pode ser removido sem alterar dados de produção porque não é registrado nesses builds.
O estado operacional novo deve ser preservado por migrations aditivas; uma UX futura pode ocultá-lo,
mas a progressão persistida e a auditoria não podem ser descartadas.
