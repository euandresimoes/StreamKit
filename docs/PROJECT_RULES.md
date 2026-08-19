# Regras de desenvolvimento do Streamlet

Este documento é obrigatório para todo trabalho no Streamlet. Ele complementa a [especificação do projeto](./STREAMLET_PROJECT_SPEC.md); em caso de conflito, a especificação define o produto e este documento define o processo de execução. Uma alteração deliberada de produto deve atualizar a especificação, registrar a decisão e ajustar os batches antes da implementação.

## 1. Princípios inegociáveis

- Manter o produto local-first, modular, auditável e utilizável sem LivePix ou qualquer serviço externo.
- Tratar os dados locais do usuário como valiosos: nenhuma escrita pode falhar silenciosamente.
- Implementar o fluxo manual completo antes de adicionar automação externa.
- Manter o resultado de sorteios independente de animação, FPS ou duração visual.
- Favorecer poucos cliques, feedback claro e comportamento previsível durante uma live.
- Não ampliar o escopo de uma batch sem registrar novas tasks e seus critérios de aceitação.
- Não implementar itens futuros como parte do MVP sem uma decisão explícita registrada.

## 2. Fonte de verdade e rastreabilidade

- `docs/STREAMLET_PROJECT_SPEC.md` é a fonte de verdade do produto e da arquitetura planejada.
- `docs/IMPLEMENTATION_BATCHES.md` é a fonte de verdade do progresso de implementação.
- Toda feature, correção estrutural ou decisão deve apontar para a seção relevante da especificação.
- Decisões arquiteturais relevantes devem ser registradas em `docs/adr/` com contexto, opções, decisão e consequências.
- Se uma decisão alterar o escopo, atualizar primeiro a especificação e as tasks afetadas.
- Não marcar uma task como concluída apenas porque o código existe; todos os critérios da task e da Definition of Done devem estar satisfeitos.

## 3. Protocolo obrigatório de dúvidas

Antes de implementar uma task, verificar se há ambiguidade de produto, UX, segurança, persistência, integração, limite ou critério de aceitação.

Quando uma resposta do usuário puder melhorar materialmente a implementação:

1. pausar somente a parte afetada;
2. explicar objetivamente a dúvida, o impacto e as opções conhecidas;
3. fazer perguntas específicas ao usuário, sem pressupor uma decisão de produto;
4. registrar a resposta em um ADR quando ela for arquitetural ou duradoura;
5. modificar, remover ou adicionar tasks na batch correspondente;
6. adicionar ou ajustar critérios de aceitação e testes;
7. somente então implementar a parte afetada.

É permitido continuar em paralelo apenas com trabalho independente que não force a decisão pendente. Não usar valores provisórios em decisões críticas sem identificá-los e obter aprovação.

## 4. Fluxo obrigatório de cada batch

1. Confirmar que a batch anterior está concluída e publicada, salvo independência documentada.
2. Revisar as seções da especificação referenciadas pela batch.
3. Resolver perguntas e decisões abertas; atualizar tasks conforme as respostas.
4. Definir ou confirmar critérios de aceitação observáveis.
5. Trabalhar em TDD sempre que houver comportamento testável: teste falhando, implementação mínima, teste verde e refatoração.
6. Implementar somente o escopo da batch, preservando mudanças não relacionadas do usuário.
7. Executar os testes focados durante o desenvolvimento.
8. Ao terminar, executar integralmente o gate de qualidade da batch.
9. Corrigir todas as falhas relevantes e repetir o gate até ficar verde.
10. Revisar segurança, persistência, acessibilidade, estados de UI, logs e documentação aplicáveis.
11. Marcar `- [x]` apenas nas tasks comprovadamente concluídas.
12. Conferir que não restou task obrigatória aberta na batch.
13. Revisar o diff e confirmar que não há arquivos secretos, temporários ou alterações acidentais.
14. Criar um commit único e coerente, ou uma sequência pequena de commits coerentes quando a batch justificar.
15. Fazer push somente depois de testes verdes, revisão do diff e commit bem-sucedido.
16. Confirmar que o commit publicado está no branch/remoto esperado.

Se o repositório Git, o remote, a autenticação, o branch de destino ou a autorização de publicação não estiverem disponíveis, não simular sucesso. Manter a batch aberta, registrar o bloqueio e pedir ao usuário a informação ou ação necessária.

## 5. Gate de qualidade antes de commit e push

Executar, no mínimo, os comandos existentes equivalentes a:

```text
format/check
lint
typecheck
test:frontend
test:backend
test:integration
build
test:e2e aplicável à batch
```

Regras do gate:

- Nunca usar o banco real do usuário em testes.
- Usar banco temporário e diretório de usuário falso nos testes aplicáveis.
- Não ignorar teste instável; corrigir a causa ou registrar e obter decisão explícita.
- Não reduzir cobertura ou remover assertions para fazer o pipeline passar.
- Não fazer commit ou push com lint, tipos, testes necessários ou build falhando.
- Batches de empacotamento/release também exigem smoke test do artefato no Windows.
- Se um teste não puder ser executado, a batch não está concluída até a limitação ser resolvida ou o usuário aprovar uma mudança explícita de escopo.

## 6. Git e publicação

- Antes de editar, verificar `git status` e preservar mudanças preexistentes do usuário.
- Não incluir alterações alheias à batch no commit.
- Usar mensagens de commit claras e orientadas ao resultado, preferencialmente no padrão Conventional Commits.
- Não reescrever histórico, forçar push ou apagar branches sem pedido explícito.
- Não criar tag ou release como efeito colateral de uma batch comum.
- Releases só podem partir de árvore limpa, commit validado e pipeline verde.
- Depois do push, registrar na batch o commit publicado quando o processo do projeto passar a exigir evidência de execução.

## 7. Arquitetura e código

- Manter o backend como monólito modular, com limites claros por domínio.
- Controllers validam entrada e formatam saída; não contêm SQL nem regra de negócio.
- Services representam casos de uso concretos e não conhecem componentes Vue ou detalhes de Electron.
- Repositories fazem persistência e não decidem regra de negócio.
- Entities protegem invariantes e não fazem I/O.
- Validar toda entrada externa com Zod, inclusive body, params, query, IPC, arquivos, banco incompatível e eventos externos.
- Inferir tipos TypeScript dos schemas compartilhados quando frontend e backend usam o mesmo contrato.
- Não criar `utils`, `helpers`, `common` ou `shared` como depósitos genéricos.
- Não criar abstrações sem fronteira ou variação real.
- Preferir nomes baseados em casos de uso, como `CreateWorkspaceService` e `DrawWinnerService`.
- Não colocar regras de negócio em componentes Vue, composables ou stores Pinia.
- Pinia é cache/estado de interface; SQLite é a fonte de verdade persistente.
- Atualizações otimistas devem possuir rollback e feedback de falha.

## 8. Persistência, migrações e dados

- Usar o diretório retornado por `app.getPath('userData')`; nunca montar manualmente o caminho de AppData.
- Usar um banco principal `streamlet.db`, foreign keys, WAL, busy timeout e timestamps UTC.
- Usar queries parametrizadas e transações para operações com múltiplas escritas.
- Persistir explicitamente posições de colunas, cards, seeds e slots.
- Versionar migrações e testar upgrade a partir de banco anterior.
- Criar backup antes de migração destrutiva e nunca sobrescrever o único banco válido durante recuperação.
- Preferir arquivamento para torneios e giveaways concluídos; preservar auditoria relevante.
- Tratar falhas de escrita, migração e recuperação com erro estável, log seguro e caminho recuperável para o usuário.

## 9. Segurança

- Electron deve usar `contextIsolation: true`, `nodeIntegration: false`, preload mínimo e tipado e sandbox quando compatível.
- Restringir navegação, criação de janelas e abertura de links externos.
- Aplicar Content Security Policy e tratar toda entrada exibida como texto não confiável.
- Vincular API local somente a loopback e protegê-la quando acessível por outros processos.
- Nunca expor secrets ao renderer, Pinia, SQLite, logs ou mensagens de erro.
- Guardar credenciais no cofre seguro do sistema operacional por uma API restrita do processo principal/backend.
- Não registrar tokens, headers de autenticação ou payloads sensíveis integrais.
- Usar permissões mínimas na CI e manter secrets apenas no provedor seguro.
- Validar checksum de atualização, validar assinatura quando configurada e auditar dependências críticas.

## 10. Frontend, componentes base e temas SCSS

Todo componente reutilizável de base deve ficar em `apps/frontend/src/components/base/`. Isso inclui obrigatoriamente, quando existirem:

- `BaseButton`;
- `BaseSelect`;
- `BaseToggle`;
- `BaseInput`;
- `BaseSlider`;
- `BaseDropdown` (grafia canônica; não criar uma variante duplicada `BaseDropDown`);
- outros primitives reutilizáveis, como modal, tooltip, checkbox, radio, textarea, spinner e icon button.

Regras dos componentes base:

- Devem possuir API tipada, estados documentados e comportamento consistente.
- Devem cobrir default, hover, active, focus-visible, disabled, loading, readonly e invalid quando aplicável.
- Devem ser acessíveis por teclado e expor label, descrição e mensagens de erro corretamente.
- Não podem conter regra de negócio de TODO, Games, Giveaway ou Settings.
- Componentes de domínio devem compor primitives base em vez de duplicar controles.
- Cada primitive deve possuir testes de componente e exemplos/fixtures dos estados relevantes.

Regras obrigatórias de SCSS e theming:

- Nenhum componente deve depender de cores, espaçamentos, radius, bordas, outlines, sombras, tipografia, opacidade, z-index ou duração de animação escritos como valores mágicos repetidos.
- Definir tokens semânticos globais para superfície, texto, ação, feedback, foco, borda e elevação.
- Definir tokens específicos por componente para todas as partes personalizáveis, com fallback explícito para tokens semânticos.
- Expor tokens de runtime como CSS custom properties por tema; usar SCSS para organização, geração e validação, não para congelar temas no build.
- Tokens de componente devem cobrir, quando aplicável: background, foreground, border color/style/width, radius, shadow, outline, focus ring, spacing, size, typography, icon size, opacity, transition e estados interativos.
- Separar tokens de fundação, tokens semânticos e tokens de componente. Um tema novo deve alterar tokens sem reescrever seletores dos componentes.
- Manter temas `light`, `dark` e `system`, com fallback seguro quando um token estiver ausente.
- Proibir seletores globais que vazem estilo entre módulos e evitar `!important`, salvo exceção documentada.
- Encapsular estilos por componente e usar nomenclatura previsível para variantes e estados.
- Tratar contraste, foco visível, redução de movimento e zoom como requisitos de design system.
- Validar visualmente todos os estados dos primitives em cada tema antes de concluir a batch correspondente.

Estrutura mínima:

```text
apps/frontend/src/
├── components/base/
└── styles/
    ├── abstracts/   # funções, mixins e contratos de tokens
    ├── base/        # reset e tipografia global
    ├── tokens/      # foundation, semantic e component tokens
    ├── themes/      # light, dark e system
    ├── components/  # apenas estilos reutilizáveis deliberados
    └── utilities/   # utilidades pequenas e controladas
```

## 11. UX e acessibilidade

- Toda tela aplicável deve cobrir vazio, carregando, sucesso, erro recuperável, dados inválidos e confirmação destrutiva.
- Drag and drop deve mostrar origem/destino, suportar rollback e possuir alternativa por botões/teclado.
- Não depender apenas de cor para comunicar estado.
- Ícones devem possuir label acessível ou tooltip adequado.
- Respeitar `prefers-reduced-motion` e a preferência interna de redução de movimento.
- Não bloquear a interface durante health check, update check ou operações demoradas evitáveis.
- Preservar foco, posição e tamanho das janelas de forma previsível.

## 12. Testes

- Seguir TDD para regras de domínio e casos de uso sempre que viável.
- Testar cenários felizes, erros, limites, concorrência/transação e recuperação relevantes.
- Unitários cobrem entidades, normalização, duplicatas, tickets, brackets, progressão, invalidação, capacidade e ordenação.
- Integração cobre repositories SQLite reais temporários, migrações, transações, controllers/Zod e adapters.
- Componentes cobrem estados, acessibilidade, drag and drop, temas e sincronização entre janelas.
- E2E cobre os fluxos críticos descritos na especificação e persistência após reinício.
- Cobertura é evidência auxiliar; assertions semânticas e comportamento são prioritários.
- Toda correção de bug deve incluir teste de regressão quando tecnicamente possível.

## 13. Logs, diagnóstico e performance

- Usar request/correlation IDs nas fronteiras aplicáveis.
- Registrar início/fim e duração de casos de uso importantes sem vazar dados sensíveis.
- Implementar níveis, rotação e limite de tamanho dos logs.
- Manter operações de banco fora do caminho crítico das animações.
- Fazer seleção do vencedor antes da animação com fonte segura de aleatoriedade (`crypto`).
- Tornar o destino visual determinístico e independente de frame rate.
- Limitar ou virtualizar listas visuais grandes e usar transformações adequadas à GPU.
- Medir antes de otimizar e preservar a opção de redução de movimento.

## 14. Documentação e Definition of Done

Uma feature só pode ser considerada pronta quando, conforme aplicável:

- comportamento e critérios de aceitação estão definidos;
- dúvida relevante foi respondida e refletida nas tasks;
- schemas Zod e contratos compartilhados estão atualizados;
- responsabilidades arquiteturais estão respeitadas;
- migração/repository e transações estão corretos;
- códigos de erro são estáveis;
- estados de UI e acessibilidade foram tratados;
- testes relevantes e E2E crítico estão verdes;
- persistência após reinício foi validada;
- logs não expõem dados sensíveis;
- OpenAPI/Scalar e documentação do usuário foram atualizados;
- formatação, lint, typecheck e build passam;
- comportamento foi validado no Windows quando aplicável;
- não há regressão conhecida entre as janelas Renderizer;
- tasks foram marcadas somente após as evidências acima;
- commit e push foram feitos e confirmados conforme o fluxo da batch.
