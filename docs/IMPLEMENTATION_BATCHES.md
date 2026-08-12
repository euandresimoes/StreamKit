# Plano de implementação por batches — StreamKit

Este checklist transforma a [especificação mestre](./STREAMKIT_PROJECT_SPEC.md) em unidades de entrega verificáveis. As regras obrigatórias de execução estão em [PROJECT_RULES.md](./PROJECT_RULES.md).

## Como usar este documento

- Executar as batches em ordem, salvo independência registrada.
- Antes de implementar, resolver as tasks marcadas como **decisão do usuário**.
- Se surgir uma dúvida que possa melhorar materialmente a feature, perguntar ao usuário e atualizar esta batch antes de continuar.
- Uma task permanece `- [ ]` até implementação, testes e critérios de aceitação estarem comprovados.
- Ao final de cada batch: executar o gate indicado, corrigir tudo, marcar tasks como `- [x]`, revisar o diff, fazer commit e push e confirmar o commit remoto.
- Não marcar a batch como concluída se Git/remote/autenticação estiverem indisponíveis; registrar o bloqueio.
- Itens pós-MVP continuam no plano para cobrir o projeto completo, mas não podem atrasar a primeira release funcional sem decisão explícita.

## Batch 0 — Decisões, governança e escopo

**Referências:** seções 1, 2, 3, 22, 25, 26, 27, 28 e 29.

- [x] Confirmar visão, proposta de valor, personas e os dez critérios de sucesso do MVP.
- [x] Classificar cada entrega como MVP, pós-MVP planejado ou visão futura.
- [x] Criar `docs/adr/` e um template curto de ADR.
- [x] **Decisão do usuário:** escolher framework do backend Node.js.
- [x] **Decisão do usuário:** escolher bundler do Vue e do Electron.
- [x] **Decisão do usuário:** escolher ferramenta de empacotamento e auto update.
- [x] **Decisão do usuário:** escolher driver SQLite e estratégia de migrations.
- [x] **Decisão do usuário:** escolher biblioteca de drag and drop compatível com Vue e múltiplas janelas.
- [x] **Decisão do usuário:** escolher HTTP/eventos/IPC e mecanismo de proteção da API local.
- [x] **Decisão do usuário:** confirmar Windows como plataforma oficial inicial.
- [x] **Decisão do usuário:** decidir se BYEs entram no MVP.
- [x] **Decisão do usuário:** definir limites de cards, participantes, equipes e tickets.
- [x] **Decisão do usuário:** definir licença, distribuição e visibilidade do repositório.
- [x] **Decisão do usuário:** definir canais stable/beta e estratégia de assinatura.
- [x] **Decisão do usuário:** definir auditoria pública dos sorteios.
- [x] **Decisão do usuário:** fornecer o remote Git e confirmar o branch principal para publicação.
- [x] Registrar cada decisão duradoura em ADR, incluindo consequências e riscos.
- [x] Definir critérios mensuráveis para inicialização, animação e volumes suportados.
- [x] Criar um mapa de riscos com responsável, sinal de alerta e mitigação verificável.
- [x] Revisar e aprovar a ordem de batches e o que fica fora da primeira release.
- [x] Executar validação de links/Markdown e revisão de consistência documental.
- [x] Inicializar Git nesta batch, configurar o remote e preservar a task equivalente da Batch 1 apenas como verificação.
- [x] Marcar as tasks concluídas, fazer commit e push da governança aprovada.

## Batch 1 — Fundação do monorepo e qualidade básica

**Referências:** seções 9, 10, 16, 17, 18, 22 (Fase 0) e 27.

- [x] Verificar repositório Git, remote e branch de destino configurados na Batch 0.
- [x] Criar workspaces para `apps/desktop`, `apps/frontend`, `apps/backend` e `packages/*`.
- [x] Criar `packages/contracts`, `packages/config` e `packages/test-utils`.
- [x] Configurar TypeScript estrito compartilhado e referências entre projetos.
- [x] Configurar package manager e lockfile determinístico.
- [x] Configurar formatter, ESLint e convenções de imports.
- [x] Configurar Jest e runners necessários para frontend, backend, integração e E2E.
- [x] Criar scripts raiz `dev`, `dev:*`, `debug`, `test`, `test:*`, `lint`, `typecheck`, `build`, `prod` e `release`.
- [x] Coordenar processos com `concurrently`, nomes/cores distintos e encerramento conjunto em falha crítica.
- [x] Garantir que testes usem diretórios e bancos isolados do usuário real.
- [x] Criar estrutura modular inicial de controllers, services, repositories, entities, schemas, errors e tests.
- [x] Configurar checagem de formatação, lint, tipos e testes no CI inicial.
- [x] Documentar setup local, requisitos e comandos no README.
- [x] Adicionar testes mínimos que provem a configuração de cada workspace.
- [x] Executar `format/check`, `lint`, `typecheck`, testes e build.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 2 — Electron, Renderizer, backend local e vertical slice

**Referências:** seções 4, 9, 12, 19, 22 (Fase 0), 23 e 24.

- [x] Criar processo principal Electron, preload mínimo tipado e renderer Vue.
- [x] Habilitar `contextIsolation`, desabilitar `nodeIntegration` e aplicar sandbox quando compatível.
- [x] Configurar CSP, bloqueio de navegação inesperada, criação arbitrária de janelas e links externos inseguros.
- [x] Integrar Renderizer para janela principal e janela de Settings com hot reload.
- [x] Impedir Settings duplicada e focar a janela existente.
- [x] Preservar tamanho/posição e fechar Settings sem encerrar o app.
- [x] Subir backend local em `127.0.0.1`, porta dinâmica e proteção definida no ADR.
- [x] Restringir IPC a capacidades nativas e validar seus payloads com Zod.
- [x] Criar endpoint `/api/v1/health` e documentação OpenAPI/Scalar em debug/desenvolvimento.
- [x] Criar formato de erro estável com `code`, `message`, `details` e `requestId`.
- [x] Implementar o vertical slice de criação/listagem de workspace ponta a ponta.
- [x] Validar Zod, service, repository SQLite, resposta tipada e atualização Pinia no slice.
- [x] Reabrir o app e comprovar persistência do workspace.
- [x] Criar E2E do vertical slice incluindo reinício.
- [x] Testar regressão entre janela principal e Settings.
- [x] Executar gate completo, incluindo E2E e build Electron.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 3 — Design system, temas e shell da aplicação

**Referências:** seções 3, 4, 8.1 (Aparência), 13, 20.1, 20.2 e 24.

- [x] Criar sidebar TODO/Games/Giveaway e acesso a Settings.
- [x] Criar layout central, notificações e indicador de debug.
- [x] Implementar arquitetura SCSS em `abstracts`, `base`, `tokens`, `themes`, `components` e `utilities`.
- [x] Definir tokens de fundação, semânticos e por componente.
- [x] Definir como tokens de tema background, foreground, borders, radius, shadow, outline, focus ring, spacing, typography, opacity, z-index e motion.
- [x] Implementar temas light, dark e system via CSS custom properties com fallbacks seguros.
- [x] Garantir que um tema novo possa ser criado sem alterar seletores dos componentes.
- [x] Criar `apps/frontend/src/components/base/`.
- [x] Implementar `BaseButton`, `BaseSelect`, `BaseToggle`, `BaseInput`, `BaseSlider` e `BaseDropdown`.
- [x] Criar primitives adicionais realmente reutilizados, como modal, tooltip, checkbox, textarea, spinner e icon button.
- [x] Cobrir estados default, hover, active, focus-visible, disabled, loading, readonly e invalid quando aplicáveis.
- [x] Garantir APIs tipadas, labels acessíveis, teclado, mensagens de erro e tooltips.
- [x] Criar fixtures/showcase visual dos primitives em todos os temas e estados.
- [x] Criar testes de componentes e testes de contraste/foco possíveis de automatizar.
- [x] Implementar redução de movimento e evitar dependência exclusiva de cor.
- [x] Implementar estados padrão de vazio, loading, sucesso, erro e confirmação destrutiva.
- [x] Verificar ausência de vazamento de estilos, valores mágicos repetidos e `!important` injustificado.
- [x] Validar visualmente no Windows, temas light/dark/system, zoom e redução de movimento.
- [x] Executar gate completo de frontend, acessibilidade, build e smoke test.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 4 — SQLite, migrações, contratos e infraestrutura de dados

**Referências:** seções 8.2, 10.1, 11, 12, 17.3, 20.3 e 24.

- [x] Resolver `userData` pelo Electron e criar diretórios `data`, `logs`, `backups` e `cache`.
- [x] Criar `streamkit.db` com foreign keys, WAL, busy timeout e timestamps UTC.
- [x] Implementar runner de migrations versionadas e tabela `schema_migrations`.
- [x] Criar backup automático antes de migrations destrutivas e política de retenção.
- [x] Implementar recuperação que nunca sobrescreva o único banco válido.
- [x] Criar migrations iniciais para TODO, tournaments, giveaways, settings e integration events.
- [x] Implementar repositories parametrizados, sem concatenação de entrada em SQL.
- [x] Criar transações para operações com múltiplas escritas.
- [x] Centralizar schemas Zod, tipos inferidos, eventos e códigos de erro compartilhados.
- [x] Validar payloads do banco quando houver risco de incompatibilidade de versão.
- [x] Implementar bancos temporários por suíte e diretório de usuário falso.
- [x] Testar migration limpa, upgrade, falha, rollback, WAL, concorrência básica e backup/restauração.
- [x] Documentar procedimento de backup e restauração.
- [x] Atualizar OpenAPI/Scalar com contratos de infraestrutura expostos.
- [x] Executar gate completo, incluindo testes de migration sobre banco de versão anterior.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 5 — TODO/Kanban completo

**Referências:** seções 5, 11.4 (TODO), 12.3 (TODO), 13.1–13.2, 17.2 e 22 (Fase 1).

- [x] Implementar entidades e invariantes de workspace, coluna e card.
- [x] Implementar criar, listar, selecionar, renomear, descrever e excluir workspace.
- [x] Persistir e restaurar o último workspace selecionado.
- [x] Implementar criar, renomear, colorir, reordenar e excluir coluna.
- [x] Ao excluir coluna com cards, exigir escolha entre mover e apagar.
- [x] Implementar criar, editar título/descrição/notas e excluir card.
- [x] Registrar `created_at` e `updated_at` corretamente.
- [x] Implementar mover card entre colunas e reordenar na mesma coluna em transação única.
- [x] Persistir posições explicitamente e evitar colisões/duplicações.
- [x] Implementar endpoints, schemas Zod, erros estáveis e documentação Scalar do TODO.
- [x] Implementar `useTodoStore` sem torná-la fonte persistente de verdade.
- [x] Implementar UI Kanban compondo primitives de `components/base`.
- [x] Implementar drag and drop com feedback, atualização otimista e rollback.
- [x] Implementar alternativa por teclado/botões para todas as movimentações.
- [x] Cobrir vazio, loading, sucesso, erro, inválido e confirmações destrutivas.
- [x] Testar exclusão em cascata e decisão explícita de coluna com cards.
- [x] Criar unitários de invariantes/reordenação e integração transacional com SQLite.
- [x] Criar E2E de workspace/colunas/cards, movimento e persistência após reinício.
- [x] Validar UX, temas, acessibilidade e ausência de regressão na janela Settings.
- [x] Executar gate completo e verificar o critério de saída da Fase 1.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 6 — Giveaway: domínio, importação e integridade

**Referências:** seções 7.1–7.4, 7.6, 7.8, 11.4 (Giveaways), 12.3 (Giveaways), 17.2 e 22 (Fase 2).

- [ ] Modelar `ParticipantSource` sem dependência direta de LivePix.
- [ ] Implementar estados `draft`, `ready`, `drawing`, `completed`, `cancelled` e `archived`.
- [ ] Implementar parser de vírgulas/quebras de linha, trim, remoção de vazios e preservação Unicode.
- [ ] Implementar preview e contagem de entradas válidas antes da confirmação.
- [ ] Implementar políticas remover duplicatas, manter ocorrências e agrupar tickets.
- [ ] Comparar nomes ignorando caixa/espaços externos e preservar exibição original.
- [ ] Implementar criação, preparação, importação, histórico e arquivamento de giveaway.
- [ ] Congelar entradas e selecionar vencedor com `crypto` antes da animação.
- [ ] Persistir rodada, snapshot de entradas, vencedor, data, modo, quantidade e prova possível.
- [ ] Impedir alteração da lista durante `drawing`.
- [ ] Permitir cancelamento antes da seleção e impedir troca silenciosa após seleção.
- [ ] Implementar recuperação determinística de rodada interrompida.
- [ ] Implementar endpoints, Zod, códigos de erro e documentação Scalar.
- [ ] Criar testes unitários de parser, Unicode, duplicatas, tickets e seleção segura.
- [ ] Criar integração de transações, snapshot, interrupção e recuperação com SQLite.
- [ ] Validar estatisticamente somente sanidade da distribuição sem usar o teste como prova criptográfica.
- [ ] Executar gate de backend/integração e build.
- [ ] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 7 — Giveaway: roleta, case opening e histórico visual

**Referências:** seções 7.5–7.8, 13, 17.2, 20.1–20.2 e 22 (Fase 2).

- [ ] Implementar `useGiveawayStore` como estado de UI/cache confirmado pelo backend.
- [ ] Criar fluxo de importação, preview, política de duplicatas e preparação.
- [ ] Implementar roleta com ponteiro, aceleração, rotação, desaceleração e destaque.
- [ ] Implementar opção de remover vencedor da rodada seguinte.
- [ ] Implementar case opening horizontal com marcador central e celebração própria do StreamKit.
- [ ] Garantir que ambos os modos representem exatamente o vencedor já persistido.
- [ ] Tornar o destino final independente de FPS e duração.
- [ ] Usar transformações adequadas à GPU e virtualizar/limitar itens visuais.
- [ ] Implementar redução de movimento sem alterar resultado.
- [ ] Desacoplar sons da lógica e usar somente identidade/assets próprios.
- [ ] Implementar bloqueio de edição, feedback de rodada e confirmação de saída durante sorteio ativo.
- [ ] Implementar histórico e recuperação visual de rodada interrompida.
- [ ] Cobrir vazio, loading, sucesso, erro, inválido, cancelado e arquivado.
- [ ] Testar componentes, animação determinística, acessibilidade e temas.
- [ ] Criar E2E de importação + roleta e importação + case opening + vencedor salvo.
- [ ] Criar E2E de encerramento/reabertura durante rodada e recuperação correta.
- [ ] Fazer profiling em volumes máximos definidos na Batch 0.
- [ ] Executar gate completo e verificar o critério de saída da Fase 2.
- [ ] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 8 — Games: torneio individual

**Referências:** seções 6.1, 6.3–6.7, 6.9, 11.4 (Tournaments), 12.3 (Tournaments), 17.2 e 22 (Fase 3).

- [ ] Modelar torneio, entrada, partida, rodadas e audit log.
- [ ] Implementar estados de torneio e de partida com transições válidas.
- [ ] Implementar criação com nome, descrição, modo e tamanho.
- [ ] Suportar 4, 8, 16 e 32 entradas.
- [ ] Implementar BYEs apenas conforme decisão registrada na Batch 0.
- [ ] Implementar adicionar, renomear, remover e reordenar participante individual.
- [ ] Implementar shuffle seguro/previsível conforme critério documentado.
- [ ] Implementar drag and drop de seeding antes do início e alternativa acessível.
- [ ] Gerar bracket, permitir confirmação de seeding e iniciar torneio.
- [ ] Propagar vencedor automaticamente à partida seguinte.
- [ ] Definir campeão somente após a final.
- [ ] Implementar desfazer resultado com confirmação e invalidação descendente.
- [ ] Bloquear mudanças estruturais após início, salvo fluxo administrativo explícito definido.
- [ ] Registrar toda alteração relevante no histórico de auditoria.
- [ ] Implementar endpoints, Zod, erros estáveis e Scalar.
- [ ] Implementar `useTournamentStore` e UI de bracket responsiva/rolável.
- [ ] Criar unitários de geração, progressão, invalidação e estados.
- [ ] Criar integração transacional e E2E de torneio individual até campeão.
- [ ] Validar persistência após reinício, temas, teclado e volumes máximos.
- [ ] Executar gate completo.
- [ ] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 9 — Games: equipes, slots e torneio completo

**Referências:** seções 6.2, 6.3, 6.8–6.9, 17.2 e 22 (Fase 3).

- [ ] Modelar equipe, cor, capacidade, membro e posição de slot.
- [ ] Implementar criar/renomear equipe e definir capacidade válida.
- [ ] Mostrar slots vazios explicitamente.
- [ ] Implementar adicionar membro diretamente a um slot.
- [ ] Implementar mover membro dentro da equipe e entre equipes em transação única.
- [ ] Impedir exceder capacidade ou duplicar pessoa no mesmo torneio.
- [ ] Implementar drag and drop com rollback e alternativa por botões/teclado.
- [ ] Implementar seeding e drag and drop de equipes antes do início.
- [ ] Gerar bracket por equipe e registrar equipe vencedora.
- [ ] Reutilizar progressão, campeão, invalidação e auditoria do domínio comum.
- [ ] Implementar endpoints e contratos de equipes/movimentação.
- [ ] Cobrir todos os estados de UI e conflitos de persistência.
- [ ] Criar unitários de capacidade, slots, duplicidade e ordenação.
- [ ] Criar integração de movimentação concorrente/transacional.
- [ ] Criar E2E de times, movimento de integrantes, bracket e campeão.
- [ ] Validar reinício, histórico, acessibilidade, temas e performance.
- [ ] Executar gate completo e verificar o critério de saída da Fase 3.
- [ ] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 10 — Settings, credenciais seguras, debug e observabilidade

**Referências:** seções 4.2, 8, 12.3 (Settings), 13.1, 15, 19 e 24.

- [ ] Implementar `useSettingsStore` e persistência backend de preferências não sensíveis.
- [ ] Sincronizar tema e preferências imediatamente entre janelas Renderizer.
- [ ] Implementar aparência light/dark/system e redução de animações.
- [ ] Implementar preferências de inicialização, tray, confirmação de saída e updates conforme suporte decidido.
- [ ] Criar campo de credencial LivePix sem armazenar segredo no SQLite/Pinia.
- [ ] Implementar `SecureCredentialRepository` com cofre do Windows e adapters futuros isolados.
- [ ] Garantir que renderer nunca leia a credencial diretamente.
- [ ] Implementar salvar, testar futuramente/status e remover credencial por API restrita.
- [ ] Implementar debug por ambiente, CLI, Settings e build de desenvolvimento.
- [ ] Implementar DevTools, visualização de logs, cópia de diagnóstico e abertura da pasta de logs.
- [ ] Exibir versões de frontend, backend e schema do banco.
- [ ] Implementar níveis `trace` a `fatal`, rotação e limite de logs.
- [ ] Adicionar request/correlation IDs e duração de casos de uso.
- [ ] Redigir testes que provem redaction de tokens, auth headers e payloads sensíveis.
- [ ] Criar E2E da segunda janela, tema sincronizado e ausência de duplicação.
- [ ] Testar adapter seguro mockado e comportamento sem cofre disponível.
- [ ] Atualizar Scalar e documentação de diagnóstico.
- [ ] Executar gate completo e revisão de segurança.
- [ ] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 11 — Auto update, empacotamento, backups e release do MVP

**Referências:** seções 2.3, 14, 16, 18, 20.3, 22 (Fase 4) e 24.

- [ ] Implementar checagem não bloqueante após a UI ficar utilizável.
- [ ] Implementar comparação semântica de versões e testes de borda.
- [ ] Exibir versão, título e changelog com Atualizar agora/Pular esta versão.
- [ ] Persistir versão pulada e permitir checagem manual.
- [ ] Implementar download autorizado com progresso e erros recuperáveis.
- [ ] Validar assinatura/checksum antes da instalação.
- [ ] Impedir update durante sorteio/torneio ativo sem confirmação.
- [ ] Separar canais stable/beta e parametrizar repositório/provedor no build.
- [ ] Garantir que tokens privados nunca sejam enviados pelo renderer.
- [ ] Implementar changelog padronizado por release.
- [ ] Configurar empacotamento e instalador Windows.
- [ ] Configurar CI de PR/push: format, lint, typecheck, testes, integração, build, E2E, cobertura e artefatos.
- [ ] Configurar release por tag SemVer com validação, changelog, build, assinatura, checksums, upload e smoke test.
- [ ] Aplicar permissões mínimas, secrets somente na CI e lockfile fixado.
- [ ] Proibir release a partir de árvore suja ou pipeline não verde.
- [ ] Testar update disponível, versão pulada, erro de update e continuidade do app.
- [ ] Testar migration/backup/restauração usando pacote de versão anterior.
- [ ] Executar os dez fluxos de sucesso do MVP em Windows.
- [ ] Fazer teste guiado com streamer real e transformar achados em tasks antes de corrigir.
- [ ] Executar gate completo, smoke test do instalador e auditoria do artefato.
- [ ] Marcar as tasks concluídas, fazer commit e push.
- [ ] Somente após confirmação remota e pipeline verde, criar/publicar a release autorizada.

## Batch 12 — LivePix

**Referências:** seções 6.10–6.11, 7.2, 7.7, 8.1 (LivePix), 11.4 (`integration_events`), 17.2, 21 e 22 (Fase 5).

- [ ] **Decisão do usuário:** validar documentação oficial, acesso, contrato/API/webhook e limites do provedor.
- [ ] **Decisão do usuário:** definir campo do nome, nome vazio/repetido, estorno, lotação, retenção e rotação de credenciais.
- [ ] **Decisão do usuário:** definir tickets por valor/faixa, janela e aprovação automática/manual.
- [ ] **Decisão do usuário:** definir distribuição em times: primeira vaga, round-robin, aleatória, balanceada ou fila.
- [ ] Atualizar ADRs, contratos, privacidade, tasks e critérios após as respostas.
- [ ] Implementar interface `ContributionProvider` independente do fornecedor.
- [ ] Implementar `LivePixContributionProvider` traduzindo para contrato interno Zod.
- [ ] Implementar conexão, desconexão, validação de credencial e estado visível.
- [ ] Implementar reconexão com backoff e tolerância a eventos fora de ordem.
- [ ] Persistir evento necessário e deduplicar por `eventId` de forma idempotente.
- [ ] Implementar fila de falhas, aprovação e reprocessamento seguro.
- [ ] Implementar campanha automática de giveaway sem alterar o núcleo manual.
- [ ] Implementar tickets, duplicatas, janela de campanha e aprovação configuradas.
- [ ] Implementar fila e preenchimento automático de equipes conforme política escolhida.
- [ ] Registrar origem/external ref sem expor dados desnecessários.
- [ ] Garantir que modo manual continue funcional quando LivePix falhar.
- [ ] Criar testes unitários e integração com eventos simulados, duplicados, fora de ordem, estorno e reconexão.
- [ ] Executar testes reais somente em ambiente controlado e autorizado.
- [ ] Fazer revisão de segurança, privacidade, retenção e logs.
- [ ] Executar gate completo e verificar o critério de saída da Fase 5.
- [ ] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 13 — OBS, overlays e expansão

**Referências:** seções 2.2, 9.5, 20, 22 (Fase 6) e 28.

- [ ] **Decisão do usuário:** priorizar e recortar overlays, goal bars, sons, hotkeys, integrações, plugins e temas avançados.
- [ ] Atualizar especificação, ADRs e criar sub-batches para cada capacidade aprovada.
- [ ] Implementar Browser Source local e overlays transparentes sem expor API insegura.
- [ ] Implementar canal de eventos em tempo real autenticado/restrito.
- [ ] Criar editor de tema sobre os mesmos tokens, sem duplicar seletores.
- [ ] Implementar sons desacoplados da lógica e configurações de volume/redução.
- [ ] Implementar hotkeys/Stream Deck com conflitos, permissões e desativação segura.
- [ ] Implementar goal bars e outras ferramentas aprovadas como módulos independentes.
- [ ] Criar SDK/contrato de plugins apenas após fronteiras reais estarem definidas.
- [ ] Adicionar integrações futuras via adapters sem acoplar domínios centrais.
- [ ] Fazer threat modeling para superfícies web, plugins e integrações.
- [ ] Criar testes unitários, integração, componentes e E2E de cada sub-batch.
- [ ] Fazer profiling durante live simulada, recuperação de falhas e testes de longa duração.
- [ ] Executar gate completo por sub-batch.
- [ ] Marcar tasks, fazer commit e push somente após cada sub-batch verde.

## Batch 14 — Validação final do projeto completo

**Referências:** seções 1–29, com ênfase em 2.3, 17, 18, 24, 26 e 29.

- [ ] Auditar todas as tasks e reabrir qualquer item sem evidência.
- [ ] Confirmar cobertura das 29 seções pela matriz abaixo.
- [ ] Confirmar que todos os critérios de sucesso do MVP passam no instalador Windows.
- [ ] Confirmar que módulos manuais funcionam sem rede, LivePix ou serviços externos.
- [ ] Validar integridade de sorteios e auditoria de torneios.
- [ ] Validar persistência, restart, migrations, backups e recuperação de falha.
- [ ] Auditar Electron, API local, IPC, CSP, cofre, logs, updates, CI e dependências.
- [ ] Auditar todos os componentes base, tokens e temas, inclusive estados e acessibilidade.
- [ ] Executar format, lint, typecheck, todos os testes, cobertura, build e E2E.
- [ ] Instalar, atualizar, pular versão, recuperar erro e desinstalar em ambiente Windows limpo.
- [ ] Fazer smoke/soak test em cenário de live e nos limites definidos.
- [ ] Atualizar README, documentação Scalar, ADRs, backup/restauração, changelog e suporte.
- [ ] Verificar árvore limpa, artefatos, checksums, assinaturas e pipeline remoto verde.
- [ ] Marcar as tasks concluídas, fazer commit e push da documentação final.
- [ ] Publicar release final somente com autorização explícita e confirmação de todos os gates.

## Matriz de cobertura da especificação

| Seção | Assunto                      | Batches principais                    |
| ----- | ---------------------------- | ------------------------------------- |
| 1     | Visão do produto             | 0, 14                                 |
| 2     | Escopo do MVP                | 0, 11, 13, 14                         |
| 3     | Personas e cenários          | 0, 3                                  |
| 4     | Navegação e experiência      | 2, 3, 10                              |
| 5     | TODO                         | 5                                     |
| 6     | Games/Tournament             | 8, 9, 12                              |
| 7     | Giveaway                     | 6, 7, 12                              |
| 8     | Configurações globais        | 3, 4, 10, 12                          |
| 9     | Arquitetura de alto nível    | 1, 2, 13                              |
| 10    | Estrutura do repositório     | 1, 4                                  |
| 11    | SQLite                       | 4, 5, 6, 8, 9, 12                     |
| 12    | API e Scalar                 | 2, 4, 5, 6, 8, 9, 10                  |
| 13    | Estado do frontend           | 3, 5, 7, 8                            |
| 14    | Auto update e releases       | 11                                    |
| 15    | Debug e observabilidade      | 10                                    |
| 16    | Scripts raiz                 | 1, 11                                 |
| 17    | Estratégia de testes         | todas as batches de implementação, 14 |
| 18    | CI/CD                        | 1, 11, 14                             |
| 19    | Segurança do Electron        | 2, 10, 14                             |
| 20    | Performance e confiabilidade | 3, 4, 7, 11, 13, 14                   |
| 21    | Arquitetura LivePix          | 12                                    |
| 22    | Roadmap                      | 0–13                                  |
| 23    | Primeiro vertical slice      | 2                                     |
| 24    | Definition of Done           | todas as batches                      |
| 25    | Decisões pendentes           | 0, 12, 13                             |
| 26    | Riscos e mitigação           | 0, 14                                 |
| 27    | Princípios de implementação  | 0, 1 e todas as implementações        |
| 28    | Visão futura                 | 0, 13                                 |
| 29    | Resumo executivo             | 0, 14                                 |
