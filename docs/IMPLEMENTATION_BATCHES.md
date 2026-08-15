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

- [x] Modelar `ParticipantSource` sem dependência direta de LivePix.
- [x] Implementar estados `draft`, `ready`, `drawing`, `completed`, `cancelled` e `archived`.
- [x] Implementar parser de vírgulas/quebras de linha, trim, remoção de vazios e preservação Unicode.
- [x] Implementar preview e contagem de entradas válidas antes da confirmação.
- [x] Implementar políticas remover duplicatas, manter ocorrências e agrupar tickets.
- [x] Comparar nomes ignorando caixa/espaços externos e preservar exibição original.
- [x] Implementar criação, preparação, importação, histórico e arquivamento de giveaway.
- [x] Congelar entradas e selecionar vencedor com `crypto` antes da animação.
- [x] Persistir rodada, snapshot de entradas, vencedor, data, modo, quantidade e prova possível.
- [x] Impedir alteração da lista durante `drawing`.
- [x] Permitir cancelamento antes da seleção e impedir troca silenciosa após seleção.
- [x] Implementar recuperação determinística de rodada interrompida.
- [x] Implementar endpoints, Zod, códigos de erro e documentação Scalar.
- [x] Criar testes unitários de parser, Unicode, duplicatas, tickets e seleção segura.
- [x] Criar integração de transações, snapshot, interrupção e recuperação com SQLite.
- [x] Validar estatisticamente somente sanidade da distribuição sem usar o teste como prova criptográfica.
- [x] Executar gate de backend/integração e build.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 7 — Giveaway: roleta, case opening e histórico visual

**Referências:** seções 7.5–7.8, 13, 17.2, 20.1–20.2 e 22 (Fase 2).

- [x] Implementar `useGiveawayStore` como estado de UI/cache confirmado pelo backend.
- [x] Criar fluxo de importação, preview, política de duplicatas e preparação.
- [x] Implementar roleta com ponteiro, aceleração, rotação, desaceleração e destaque.
- [x] Implementar opção de remover vencedor da rodada seguinte.
- [x] Implementar case opening horizontal com marcador central e celebração própria do StreamKit.
- [x] Garantir que ambos os modos representem exatamente o vencedor já persistido.
- [x] Tornar o destino final independente de FPS e duração.
- [x] Usar transformações adequadas à GPU e virtualizar/limitar itens visuais.
- [x] Implementar redução de movimento sem alterar resultado.
- [x] Desacoplar sons da lógica e usar somente identidade/assets próprios.
- [x] Implementar bloqueio de edição, feedback de rodada e confirmação de saída durante sorteio ativo.
- [x] Implementar histórico e recuperação visual de rodada interrompida.
- [x] Cobrir vazio, loading, sucesso, erro, inválido, cancelado e arquivado.
- [x] Testar componentes, animação determinística, acessibilidade e temas.
- [x] Criar E2E de importação + roleta e importação + case opening + vencedor salvo.
- [x] Criar E2E de encerramento/reabertura durante rodada e recuperação correta.
- [x] Fazer profiling em volumes máximos definidos na Batch 0.
- [x] Executar gate completo e verificar o critério de saída da Fase 2.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 8 — Games: torneio individual

**Referências:** seções 6.1, 6.3–6.7, 6.9, 11.4 (Tournaments), 12.3 (Tournaments), 17.2 e 22 (Fase 3).

- [x] Modelar torneio, entrada, partida, rodadas e audit log.
- [x] Implementar estados de torneio e de partida com transições válidas.
- [x] Implementar criação com nome, descrição, modo e tamanho.
- [x] Suportar 4, 8, 16 e 32 entradas.
- [x] Implementar BYEs apenas conforme decisão registrada na Batch 0.
- [x] Implementar adicionar, renomear, remover e reordenar participante individual.
- [x] Implementar shuffle seguro/previsível conforme critério documentado.
- [x] Implementar drag and drop de seeding antes do início e alternativa acessível.
- [x] Gerar bracket, permitir confirmação de seeding e iniciar torneio.
- [x] Propagar vencedor automaticamente à partida seguinte.
- [x] Definir campeão somente após a final.
- [x] Implementar desfazer resultado com confirmação e invalidação descendente.
- [x] Bloquear mudanças estruturais após início, salvo fluxo administrativo explícito definido.
- [x] Registrar toda alteração relevante no histórico de auditoria.
- [x] Implementar endpoints, Zod, erros estáveis e Scalar.
- [x] Implementar `useTournamentStore` e UI de bracket responsiva/rolável.
- [x] Criar unitários de geração, progressão, invalidação e estados.
- [x] Criar integração transacional e E2E de torneio individual até campeão.
- [x] Validar persistência após reinício, temas, teclado e volumes máximos.
- [x] Executar gate completo.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 9 — Games: equipes, slots e torneio completo

**Referências:** seções 6.2, 6.3, 6.8–6.9, 17.2 e 22 (Fase 3).

- [x] Modelar equipe, cor, capacidade, membro e posição de slot.
- [x] Implementar criar/renomear equipe e definir capacidade válida.
- [x] Mostrar slots vazios explicitamente.
- [x] Implementar adicionar membro diretamente a um slot.
- [x] Implementar mover membro dentro da equipe e entre equipes em transação única.
- [x] Impedir exceder capacidade ou duplicar pessoa no mesmo torneio.
- [x] Implementar drag and drop com rollback e alternativa por botões/teclado.
- [x] Implementar seeding e drag and drop de equipes antes do início.
- [x] Gerar bracket por equipe e registrar equipe vencedora.
- [x] Reutilizar progressão, campeão, invalidação e auditoria do domínio comum.
- [x] Implementar endpoints e contratos de equipes/movimentação.
- [x] Cobrir todos os estados de UI e conflitos de persistência.
- [x] Criar unitários de capacidade, slots, duplicidade e ordenação.
- [x] Criar integração de movimentação concorrente/transacional.
- [x] Criar E2E de times, movimento de integrantes, bracket e campeão.
- [x] Validar reinício, histórico, acessibilidade, temas e performance.
- [x] Executar gate completo e verificar o critério de saída da Fase 3.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 10 — Settings, credenciais seguras, debug e observabilidade

**Referências:** seções 4.2, 8, 12.3 (Settings), 13.1, 15, 19 e 24.

- [x] Implementar `useSettingsStore` e persistência backend de preferências não sensíveis.
- [x] Sincronizar tema e preferências imediatamente entre janelas Renderizer.
- [x] Implementar aparência light/dark/system e redução de animações.
- [x] Implementar preferências de inicialização, tray, confirmação de saída e updates conforme suporte decidido.
- [x] Criar campo de credencial LivePix sem armazenar segredo no SQLite/Pinia.
- [x] Implementar `SecureCredentialRepository` com cofre do Windows e adapters futuros isolados.
- [x] Garantir que renderer nunca leia a credencial diretamente.
- [x] Implementar salvar, testar futuramente/status e remover credencial por API restrita.
- [x] Implementar debug por ambiente, CLI, Settings e build de desenvolvimento.
- [x] Implementar DevTools, visualização de logs, cópia de diagnóstico e abertura da pasta de logs.
- [x] Exibir versões de frontend, backend e schema do banco.
- [x] Implementar níveis `trace` a `fatal`, rotação e limite de logs.
- [x] Adicionar request/correlation IDs e duração de casos de uso.
- [x] Redigir testes que provem redaction de tokens, auth headers e payloads sensíveis.
- [x] Criar E2E da segunda janela, tema sincronizado e ausência de duplicação.
- [x] Testar adapter seguro mockado e comportamento sem cofre disponível.
- [x] Atualizar Scalar e documentação de diagnóstico.
- [x] Executar gate completo e revisão de segurança.
- [x] Marcar as tasks concluídas, fazer commit e push após o gate verde.

## Batch 11 — Auto update, empacotamento, backups e release do MVP

**Referências:** seções 2.3, 14, 16, 18, 20.3, 22 (Fase 4) e 24.

- [x] Implementar checagem não bloqueante após a UI ficar utilizável.
- [x] Implementar comparação semântica de versões e testes de borda.
- [x] Exibir versão, título e changelog com Atualizar agora/Pular esta versão.
- [x] Persistir versão pulada e permitir checagem manual.
- [x] Implementar download autorizado com progresso e erros recuperáveis.
- [x] Validar checksum antes da instalação e documentar assinatura opcional futura.
- [x] Impedir update durante sorteio/torneio ativo sem confirmação.
- [x] Separar canais stable/beta e parametrizar repositório/provedor no build.
- [x] Garantir que tokens privados nunca sejam enviados pelo renderer.
- [x] Implementar changelog padronizado por release.
- [x] Configurar empacotamento e instalador Windows.
- [x] Configurar CI de PR/push: format, lint, typecheck, testes, integração, build, E2E, cobertura e artefatos.
- [x] Configurar release por tag SemVer com validação, changelog, build, checksums, upload e smoke test.
- [x] Aplicar permissões mínimas, secrets somente na CI e lockfile fixado.
- [x] Proibir release a partir de árvore suja ou pipeline não verde.
- [x] Testar update disponível, versão pulada, erro de update e continuidade do app.
- [x] Testar migration/backup/restauração usando banco versionado anterior; repetir entre pacotes publicados na Batch 23.
- [x] Executar os dez fluxos de sucesso do MVP em Windows e registrar evidências.
- [ ] Executar teste guiado dos fluxos manuais com o proprietário/streamer e registrar os achados antes de corrigir.
- [ ] Revisar e melhorar a UI do frontend a partir dos achados do teste manual.
- [ ] Repetir os fluxos afetados no instalador após os ajustes de UI.
- [x] Executar gate completo, smoke test do instalador e auditoria do artefato.
- [x] Marcar as tasks concluídas, fazer commit e push.
- [x] Não criar/publicar release sem autorização explícita, confirmação remota e pipeline verde.

**Evidência registrada em 2026-08-12:** após reiniciar o Windows, o instalador NSIS foi
gerado e passou por instalação silenciosa, abertura com `AppData` isolado e desinstalação.
Metadados do updater, blockmap e SHA-256 também foram validados. Por decisão registrada no
ADR 0012, as releases Windows iniciais não serão assinadas e devem avisar sobre SmartScreen
e editor desconhecido. A matriz de evidências está em `docs/BATCH_11_VALIDATION.md`. Como não
existe pacote público anterior, o teste entre instaladores permanece na Batch 23. Por decisão do
ADR 0013, a batch foi reaberta para teste manual do proprietário e refinamento da interface antes
de qualquer integração. Nenhuma tag ou release foi criada sem autorização.

## Batch 12 — Núcleo de integrações e capacidades

**Referências:** seções 7, 8, 10, 11, 17, 21 e ADR 0014.

**Independência registrada:** esta batch não altera os fluxos manuais em validação na Batch 11.
Ela só pode começar sobre o estado atual depois que as mudanças React/backend pendentes forem
validadas e publicadas, evitando misturar a migração de UI com integrações externas.

- [x] **Decisão do usuário:** separar providers de chat de gateways/providers de pagamento.
- [x] **Decisão do usuário:** incluir Twitch, YouTube e Kick; manter LivePix, Bots e canvas fora do escopo.
- [x] Registrar a arquitetura orientada a capacidades no ADR 0014.
- [x] Criar contratos Zod de conexão, capacidade, identidade externa e evento normalizado.
- [x] Criar módulo `integrations` no backend sem dependência de Giveaway ou Games.
- [x] Persistir conexões sem segredos, offsets e eventos necessários com migrations versionadas.
- [x] Deduplicar eventos por `provider + externalEventId` e processá-los de forma idempotente.
- [x] Implementar event bus local com inscrição/desinscrição e isolamento de falhas entre consumidores.
- [x] Implementar estado `disconnected`, `connecting`, `connected`, `reconnecting`, `error` e `revoked`.
- [x] Implementar backoff com jitter, cancelamento e recuperação após reinício.
- [x] Garantir que payload bruto sensível, tokens e refresh tokens não sejam salvos no SQLite/logs.
- [x] Criar adapters simulados e testes de contrato, migrations, duplicatas e reconexão.
- [x] Executar gate completo, marcar tasks comprovadas, fazer commit e push.

**Evidência registrada em 2026-08-13:** migration v7, contratos compartilhados, repository,
event bus, registry, lifecycle manager, adapter simulado e UI de conexões foram validados por 28
testes unitários do backend, 25 testes de integração, 8 E2E do desktop, lint, typecheck e builds
de todos os workspaces no comando `pnpm validate`.

## Batch 13 — Twitch Chat

**Referências:** seções 8, 10, 17, 21 e ADR 0014.

- [x] **Dependência externa:** cadastrar o aplicativo Twitch e fornecer/configurar o Client ID.
- [x] Implementar Device Authorization para aplicativo desktop, sem redirect/token no renderer e com escopos mínimos.
- [x] Guardar tokens somente no cofre e validar a sessão no início e periodicamente.
- [x] Implementar leitura de mensagens via EventSub/WebSocket, sem usar IRC como núcleo novo.
- [x] Normalizar identidade, handle, nome, avatar, badges, mensagem e timestamps.
- [x] Implementar escrita de chat somente quando o usuário conceder a capacidade e os escopos.
- [x] Tratar keepalive, revogação, reconexão, duplicatas e limites da API.
- [x] Criar tela de conectar/desconectar, canal selecionado, capacidades e diagnóstico seguro.
- [x] Testar OAuth sem segredo real, tradução de payloads, revogação e reconexão.
- [x] Executar gate completo, marcar tasks comprovadas, fazer commit e push.

**Evidência registrada em 2026-08-13:** Device Authorization, cofre multi-provider,
validação/refresh, EventSub, escrita de chat, UI e adapters passaram no gate completo com 30 testes
unitários do backend, 25 integrações, 18 testes do desktop e 8 E2E. O aplicativo público do StreamKit
foi cadastrado na Twitch e o teste real controlado concluiu autorização, conexão EventSub e captura por
`!join`: a conta principal conectada e uma conta secundária em outro navegador foram persistidas como
participantes distintos no giveaway de roleta. A Batch 13 está concluída.

## Batch 14 — Fontes de participantes em Giveaways

**Referências:** seções 7, 11, 17, 21 e ADR 0014.

**Independência registrada:** regras, persistência e UI desta batch são verificáveis com o adapter
simulado da Batch 12 e não dependem do Client ID/teste real ainda aberto na Batch 13.

- [x] Generalizar `ParticipantSource` para fonte manual ou conexão de chat configurada.
- [x] Persistir regra de captura por giveaway e seu estado pausado/ativo/finalizado.
- [x] Implementar mensagem exata, prefixo e texto contido, com comparação Unicode definida.
- [x] Implementar qualquer mensagem e janela de coleta configurável.
- [x] Implementar uma entrada por identidade ou múltiplos tickets conforme política explícita.
- [x] Implementar filtros por broadcaster, bot, moderador e membro quando a capacidade existir.
- [x] Mostrar preview, total capturado, duplicatas ignoradas, conexão e erro recuperável.
- [x] Preservar os capturados após desconexão, reinício ou exclusão da credencial.
- [x] Permitir iniciar/parar manualmente, pausar a captura ao iniciar o sorteio e exigir retomada explícita.
- [x] Persistir e aplicar o limite configurável de participantes nas fontes manual e chat.
- [x] Limitar e filtrar visualmente a lista de participantes sem deslocar os controles de captura.
- [x] Testar concorrência, duplicatas, troca de handle, limite, restart e modo manual offline.
- [x] Executar gate completo, marcar tasks comprovadas, fazer commit e push.

**Evidência registrada em 2026-08-13:** a origem por participante, regras e contadores foram
persistidos no SQLite; a captura usa a identidade estável do provider, comparação NFKC sem distinção
de caixa, filtros de papel, janela temporal e políticas `unique`/`tickets`. A UI permite configurar,
pausar, retomar e remover regras e acompanha participantes e contadores. Testes focados cobrem os
modos de correspondência, filtros, troca de handle, duplicidade e restart; os limites transacionais e
o fluxo manual offline são cobertos pelas proteções do repositório e pela suíte de regressão. O gate
completo passou com 32 testes unitários do backend, 26 integrações, 18 testes do desktop e 8 E2E.

**Evidência complementar em 2026-08-13:** o botão de captura alterna explicitamente entre ativo e
pausado; iniciar um sorteio pausa as regras ativas na mesma transação e elas não reiniciam após o
resultado. A migration 11 persiste `max_participants`, validado para importação, chat e alteração de
configuração. A lista ganhou busca e rolagem interna, e o compositor do chat preserva o botão circular.

## Batch 15 — Fontes de participantes em Games

**Referências:** seções 6, 11, 17, 21 e ADR 0014.

- [x] Reutilizar as mesmas conexões e regras sem duplicar lógica de captura do Giveaway.
- [x] Persistir origem e identidade externa dos participantes do torneio.
- [x] Adicionar participantes capturados à fila antes da distribuição individual/em equipes.
- [x] Respeitar capacidade, duplicatas e torneio já iniciado com feedback observável.
- [x] Preservar criação, edição, remoção, drag and drop e sorteio manuais.
- [x] Testar torneio individual, equipes, lotação, restart, desconexão e modo offline.
- [x] Executar gate completo, marcar tasks comprovadas, fazer commit e push.

**Evidência registrada em 2026-08-13:** Giveaways e Games passaram a compor o mesmo matcher de
captura e o mesmo hook/painel de conexões, mantendo repositórios próprios apenas para invariantes de
cada domínio. A migração 9 persiste regras e identidade `provider + providerUserId`; a origem aparece
na fila e participantes de equipes aguardam distribuição manual ou aleatória. Testes de integração
cobrem torneio individual, equipes, troca de handle, duplicidade, capacidade, torneio iniciado,
restart e participante manual offline. O gate completo passou com 32 testes unitários do backend,
28 integrações, 18 testes do desktop e 8 E2E.

## Batch 16 — Chat focado em vencedor e equipe campeã

**Referências:** seções 6, 7, 8, 17, 21 e ADR 0014.

- [x] Persistir um buffer local limitado de mensagens normalizadas, com política de retenção explícita.
- [x] Indexar mensagens por `provider + channelId + providerUserId`.
- [x] Abrir painel flutuante ao confirmar vencedor de giveaway com mensagens somente do vencedor.
- [x] Abrir painel equivalente para os membros da equipe campeã.
- [x] Mostrar plataforma, avatar, handle, status, histórico recente e mensagens em tempo real.
- [x] Permitir resposta apenas quando `ChatWriter` estiver disponível e autorizado.
- [x] Implementar copiar handle, vazio, desconectado, revogado e erro de envio.
- [x] Tratar conteúdo externo como texto não confiável e limitar memória/banco/renderização.
- [x] Testar isolamento entre usuários/equipes, retenção, restart, XSS e acessibilidade.
- [x] Executar gate completo, marcar tasks comprovadas, fazer commit e push.

**Evidência registrada em 2026-08-13:** a migração 10 criou um buffer SQLite indexado pela
identidade estável, limitado globalmente a 10.000 mensagens e 24 horas, e associou canal às origens
capturadas. O painel flutuante deriva o vencedor/campeão exclusivamente do resultado persistido,
acompanha novas mensagens, exibe identidades e estado de escrita, copia handle e só permite resposta
em conexão `connected` com `chat.write`. React renderiza mensagem/handle como texto. Integrações
cobrem isolamento entre canal/usuário/equipe, vencedor de giveaway, equipe campeã, XSS, retenção,
limite e restart; o teste frontend cobre landmarks e labels acessíveis. O gate completo passou com
1 teste frontend, 32 unitários do backend, 32 integrações, 18 testes do desktop e 8 E2E.

## Batch 17 — YouTube Live Chat

**Referências:** seções 8, 10, 17, 21 e ADR 0014.

- [x] **Dependência externa:** criar projeto Google, habilitar YouTube Data API e configurar Client ID desktop.
- [x] Implementar OAuth de aplicativo instalado com PKCE, browser do sistema e callback loopback.
- [x] Guardar refresh/access tokens somente no cofre e implementar revogação/desconexão.
- [x] Descobrir/selecionar transmissão e `liveChatId` sem exigir IDs técnicos na UX comum.
- [x] Ler mensagens com `streamList` quando disponível e fallback documentado respeitando quota.
- [x] Normalizar ID do canal do autor, handle/nome, avatar, papel, mensagem e eventos suportados.
- [x] Expor escrita somente com capacidade, escopo e transmissão ativa compatíveis.
- [x] Mostrar quota/limitação, chat encerrado e autorização não verificada de forma acionável.
- [x] Executar a suíte compartilhada de fontes, chat focado, revogação e reconexão.
- [x] Executar gate completo, marcar tasks comprovadas, fazer commit e push.

**Evidência parcial registrada em 2026-08-13:** OAuth desktop usa PKCE S256, `state` aleatório,
callback em `127.0.0.1` com porta efêmera e nenhum client secret; tokens ficam no cofre e refresh,
revogação e desconexão atualizam as conexões. A UI descobre lives ativas pelo título. O adapter
normaliza identidade/cargos, persiste cursor, respeita `pollingIntervalMillis`, lê e escreve pela API
oficial. Como o runtime não inclui transporte gRPC, o fallback `liveChatMessages.list` está
documentado em `CHAT_INTEGRATIONS.md`, junto de quota/privacidade/suporte. Testes controlados cobrem
PKCE completo, cofre, refresh, descoberta, normalização, leitura e escrita; as suítes compartilhadas
cobrem fontes e chat focado. O gate passou com 1 teste frontend, 38 unitários do backend, 32
integrações, 18 testes do desktop e 8 E2E. A validação externa ainda estava pendente nessa etapa.

**Evidência real registrada em 2026-08-13:** o Client OAuth desktop foi configurado com PKCE e
autenticação opcional do token endpoint; uma conta real autorizou o aplicativo, uma transmissão
ativa foi descoberta e selecionada, e mensagens `!entrar` de participantes reais foram capturadas no
Giveaway. A validação revelou e corrigiu filtros incompatíveis em `liveBroadcasts.list`, intervalos de
polling abaixo de 1 segundo, timestamps com nanossegundos, eventos de sistema sem autor e recuperação
de erros antigos. A Batch 17 está concluída.

## Batch 18 — Kick Chat

**Referências:** seções 8, 10, 17, 21 e ADR 0014.

- [x] **Decisão/dependência externa:** validar documentação oficial vigente, acesso ao programa e Client ID.
- [x] Mapear somente capacidades oficialmente disponíveis; não depender de endpoints privados/reversos.
- [x] Não implementar OAuth/cofre/leitura/escrita enquanto a API oficial exigir segredo distribuível e webhook público.
- [x] Exibir capacidades ausentes em vez de simular equivalência com Twitch/YouTube.
- [x] Manter fontes de Giveaway/Games e chat focado capability-driven, sem caso especial privado da Kick.
- [x] Testar o contrato de indisponibilidade e a ausência de capacidades falsas.
- [x] Executar gate completo, marcar tasks comprovadas, fazer commit e push.

**Decisão registrada em 2026-08-13:** a documentação oficial exige `client_secret` na troca e no
refresh OAuth e entrega `chat.message.sent` somente por webhook público HTTPS. Embutir o segredo no
desktop violaria as regras de segurança; expor um webhook exigiria relay hospedado, nova superfície de
privacidade/operação e uma decisão futura explícita. A Batch 18, portanto, implementa detecção e UX de
capacidade ausente, sem OAuth falso, endpoints privados ou WebSocket reverso. A decisão e as fontes
oficiais estão detalhadas em `CHAT_INTEGRATIONS.md`.

**Evidência de qualidade:** o gate completo passou com 1 teste frontend, 39 unitários do backend,
32 integrações, 18 testes do desktop e 8 E2E. O teste específico confirma que o contrato Kick expõe
zero capacidades e contém as três limitações verificadas, preservando as regressões offline e dos
providers suportados.

## Batch 19 — Robustez e validação das integrações de chat

**Referências:** seções 17, 18, 20, 24, 26 e ADR 0014.

- [x] Executar soak test de conexões simultâneas Twitch, YouTube e Kick com adapters controlados.
- [x] Validar restart, perda de rede, suspensão do Windows, refresh, revogação e encerramento de live.
- [x] Validar quotas, backpressure, retenção, índices SQLite e listas grandes.
- [x] Auditar cofre, OAuth/PKCE/state, callback loopback, CSP, logs e exportação de diagnóstico.
- [x] Validar acessibilidade, redução de movimento, vazio, loading e erros em todas as telas.
- [x] Confirmar que TODO e todos os fluxos manuais continuam funcionando totalmente offline.
- [x] Atualizar documentação do usuário, privacidade, diagnóstico e suporte por provider.
- [x] Executar gate completo e E2E no instalador Windows.
- [x] Marcar tasks comprovadas, fazer commit e push.

**Concluída em 2026-08-13.** O soak controlado processou 750 mensagens simultâneas dos três
providers, rejeitou 50 duplicatas e comprovou recuperação após perda de rede e retomada do Windows.
Os testes cobrem refresh/revogação, live encerrada, quota, buffer limitado a 10.000 mensagens,
retenção de 24 horas e índices SQLite. A auditoria confirmou cofre do sistema, OAuth desktop sem
segredo embarcado, PKCE/`state`/callback loopback, CSP restritiva, redação de logs e diagnóstico
sanitizado. Estados de loading/vazio/erro e redução de movimento foram revisados nas telas da feature.

**Evidência de qualidade:** `pnpm validate` passou com format, lint, typecheck, builds, 2 testes de
frontend, 39 unitários do backend, 33 integrações, 19 testes desktop e 8 E2E offline. O instalador
Windows unsigned `StreamKit-0.0.0-x64-setup.exe` foi gerado e passou no smoke de integridade com
SHA-256 `47c0dd961074b0e8b27c53a05549bc650b77af6539cd4891bb33348c564dee2d`.

## Batch 20 — Operação de torneios, bracket e simulação de chat

**Referências:** seções 6, 8, 10, 17, 18, 24 e ADRs 0014 e 0016.

**Critério de saída:** um operador consegue popular, conduzir e concluir torneios individuais e por
equipes com chats simulados/externos, restaurar todo o estado após reinício e executar o cenário de
10.000 eventos sem perda silenciosa, progressão inconsistente ou bloqueio perceptível da UI.

### 20.1 Provider simulado e carga

- [x] Registrar `SimulatedChatProviderAdapter` somente em desenvolvimento/debug, sem aparecer em produção.
- [x] Criar contratos e endpoints de controle sem regra de Games/Giveaway dentro do adapter.
- [x] Criar painel de simulação com cenários de 8, 16, 32, 1.000 e 10.000 identidades determinísticas.
- [x] Permitir mensagem/prefixo, ritmo instantâneo, gradual ou em rajadas e iniciar/parar emissão.
- [x] Simular duplicatas, tickets, bots, broadcaster, moderadores, membros e troca de handle estável.
- [x] Simular perda de rede, reconexão e encerramento sem afetar providers reais.
- [x] Continuar emitindo mensagens dos participantes depois da inscrição para testar chats de partida.
- [x] Medir recebidos, processados, duplicados, rejeitados, fila/latência e persistência no cenário de carga.
- [x] Garantir backpressure/fila limitada e nenhuma escrita silenciosamente perdida.

### 20.2 Modelo e persistência operacional

- [x] Definir contratos Zod para partida atual, resultado por lado e comandos de iniciar/confirmar/reabrir.
- [x] Criar migration não destrutiva para estado por lado, partida atual e timestamps necessários.
- [x] Garantir no máximo uma partida atual por torneio e aceitar apenas partidas `ready` completas.
- [x] Implementar `pending`, `won`, `lost`, `forfeit` e `draw` com combinações válidas.
- [x] Manter empate sem progressão até o operador registrar um desempate.
- [x] Confirmar resultado e propagar vencedor para a próxima rodada em uma transação.
- [x] Reabrir/corrigir com confirmação, auditoria e invalidação dos descendentes afetados.
- [x] Restaurar partida atual, resultados, progressão e campeão após reinício.

### 20.3 Bracket e painel da partida

- [x] Refazer o layout do bracket para alinhar rounds, conectores e cards em 4, 8, 16 e 32 entradas.
- [x] Preservar zoom/scroll, legibilidade, foco, redução de movimento e alternativa ao drag and drop.
- [x] Selecionar/iniciar a partida atual pelo card e destacar com outline e indicador textual.
- [x] Mostrar estado, equipes/participantes e resultado de cada lado sem depender somente de cor.
- [x] Criar painel operacional bilateral com escalação e ações ganhar, perder, desistir e empatar.
- [x] Derivar automaticamente o estado oposto e impedir combinações contraditórias.
- [x] Manter o resultado/chat consultável até o início da próxima partida.
- [x] Virtualizar ou limitar listas grandes para não degradar a árvore.

### 20.4 Chat bilateral e integração com Games

- [x] Validar captura simulada, Twitch e YouTube em torneio individual e por equipes.
- [x] Preservar atribuição manual, drag and drop e distribuição aleatória dos capturados.
- [x] Criar consulta de chat por lado usando somente identidades externas persistidas daquele lado.
- [x] Exibir duas colunas/abas com avatar, handle, provider, mensagens e estado da conexão.
- [x] Permitir resposta somente por conexão compatível `connected` com `chat.write`.
- [x] Informar participantes manuais sem chat e suportar equipes com Twitch e YouTube simultaneamente.
- [x] Preservar chat bilateral durante/depois da partida e chat focado da campeã ao finalizar.
- [x] Isolar mensagens por provider, canal e identidade; preservar retenção de 24 horas e limite global.

### 20.5 Testes, documentação e gate

- [x] Cobrir invariantes, combinações inválidas, empate, desistência, progressão e rollback em unitários.
- [x] Cobrir migrations, transações, concorrência, restart, auditoria e chats isolados em integração.
- [x] Cobrir layout 4/8/16/32, seleção, teclado, estados e chat bilateral em componentes.
- [x] Cobrir torneio individual/equipes completo, correção de resultado e restart em E2E.
- [x] Executar soak com 10.000 eventos, burst, duplicatas e reconexão sem usar o banco real.
- [x] Atualizar especificação, Scalar/OpenAPI, privacidade e guia de teste do simulador.
- [x] Executar format, lint, typecheck, todas as suítes, build e E2E aplicável.
- [x] Revisar diff/segurança, marcar somente tasks comprovadas, fazer commit e push.

**Concluída em 2026-08-13.** A operação de Games passou a ter uma única partida atual,
resultados bilaterais persistidos, empate sem avanço, correção auditada, bracket por rodadas e chat
isolado por lado. O simulador determinístico de debug percorre o mesmo pipeline persistente dos
providers reais e oferece cenários até 10.000 eventos. O gate completo `pnpm validate` passou com
47 unitários do backend, 34 integrações, 10 testes de frontend, 19 testes desktop e 8 E2E.

## Batch 21 — LivePix

**Referências:** seções 6.10–6.11, 7.2, 7.7, 8.1 (LivePix), 11.4 (`integration_events`), 17.2, 21 e 22 (Fase 5).

**Adiada por decisão do usuário em 2026-08-12:** não implementar até os fluxos manuais e a UI
da Batch 11 serem testados, refinados e aprovados. A leitura inicial da documentação oficial não
constitui início de implementação.

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

## Batch 22 — OBS, overlays e expansão

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

## Batch 23 — Validação final do projeto completo

**Referências:** seções 1–29, com ênfase em 2.3, 17, 18, 24, 26 e 29.

- [ ] Auditar todas as tasks e reabrir qualquer item sem evidência.
- [ ] Confirmar cobertura das 29 seções pela matriz abaixo.
- [ ] Confirmar que todos os critérios de sucesso do MVP passam no instalador Windows.
- [ ] Testar upgrade, backup e restauração entre dois instaladores publicados.
- [ ] Fazer teste guiado com streamer real e transformar achados em tasks antes de corrigir.
- [ ] Confirmar que módulos manuais funcionam sem rede, LivePix ou serviços externos.
- [ ] Validar integridade de sorteios e auditoria de torneios.
- [ ] Validar persistência, restart, migrations, backups e recuperação de falha.
- [ ] Auditar Electron, API local, IPC, CSP, cofre, logs, updates, CI e dependências.
- [ ] Auditar todos os componentes base, tokens e temas, inclusive estados e acessibilidade.
- [ ] Executar format, lint, typecheck, todos os testes, cobertura, build e E2E.
- [ ] Instalar, atualizar, pular versão, recuperar erro e desinstalar em ambiente Windows limpo.
- [ ] Fazer smoke/soak test em cenário de live e nos limites definidos.
- [ ] Atualizar README, documentação Scalar, ADRs, backup/restauração, changelog e suporte.
- [ ] Verificar árvore limpa, artefatos, checksums e pipeline remoto verde; validar assinatura somente quando configurada.
- [ ] Marcar as tasks concluídas, fazer commit e push da documentação final.
- [ ] Publicar release final somente com autorização explícita e confirmação de todos os gates.

## Batch 24 — TODO operacional: colunas inteligentes, cards, pins e templates

**Escopo aprovado:** evoluir o TODO sem transformá-lo em chat. O board permanece local-first e todas as operações passam pelo backend e por migrações versionadas.

- [x] Persistir ícone, limite WIP, colapso e pin das colunas.
- [x] Persistir prioridade, cor, etiquetas, checklist e pin dos cards.
- [x] Criar tabela `todo_templates` e endpoints para salvar, listar, aplicar e excluir templates.
- [x] Expor contratos Zod para os novos campos e manter entidades/repositórios tipados.
- [x] Criar primitives base de prioridade e etiquetas para reutilização visual.
- [x] Atualizar TODO para o layout de hub/grid usado por Games e Giveaways.
- [ ] Adicionar testes de migração, contrato, repositório e E2E das operações de template.
- [ ] Executar gate completo e validar upgrade em banco existente antes de marcar a batch como concluída.

## Batch 25 — Live Control: preview oficial, chat e metadados

**Decisão complementar registrada no ADR 0027:** participantes manuais, capturados e futuros
eventos LivePix usam a plataforma/live global selecionada e uma identidade exata do provider.
Twitch/Kick usam handle; YouTube usa `channelId`. O `providerUserId` oficial é associado quando a
mensagem chega e passa a ser usado pelo chat focado.

**Escopo aprovado:** criar uma área de controle da transmissão que complemente OBS/Streamlabs. O StreamKit não fará captura, composição ou encoding da live nesta batch; essas responsabilidades continuam no OBS/Streamlabs. O preview deve utilizar exclusivamente os players oficiais de Twitch, YouTube e Kick, sem capturar a janela do OBS e sem implementar OBS WebSocket nesta batch.

**Referências:** seções 2.2, 4, 9.2, 9.5, 12, 13, 17, 19, 20, 21 e 28 da especificação.

### 25.1 Shell da tela e seleção de plataforma

- [x] Criar `LiveControlTab` como tela independente e acessível no frontend.
- [x] Criar `LivePlatformSelector` reutilizando o mapa de brand icons existente para Twitch, YouTube e Kick.
- [x] Permitir selecionar somente conexões autorizadas e em estado `connected`.
- [x] Mostrar estado vazio quando nenhuma plataforma estiver conectada ou quando não houver transmissão ativa.
- [x] Mostrar no header plataforma, status da conexão, espectadores e duração da live.
- [x] Atualizar espectadores, duração e status sem bloquear a interface e com tratamento de erro recuperável.
- [x] Isolar a seleção de plataforma da lógica de domínio por meio de `useLiveControl` e casos de uso específicos.

### 25.2 Preview oficial da transmissão

- [ ] Criar `LivePreview` com adaptadores por plataforma e contrato compartilhado de embed.
- [x] Renderizar o player oficial da Twitch com os parâmetros de domínio/`parent` exigidos pela plataforma.
- [x] Renderizar o player oficial do YouTube usando o identificador da transmissão ativa e as regras de embed oficiais.
- [ ] Renderizar o player oficial do Kick conforme o identificador/canal retornado pelo provider.
- [x] Não expor tokens, client secrets ou credenciais no renderer, URL do embed, logs ou banco local.
- [x] Exibir fallback explícito para transmissão offline, embed bloqueado, canal indisponível ou provider sem suporte a preview.
- [x] Respeitar CSP, navegação restrita, permissões de iframe e `prefers-reduced-motion`.
- [ ] Testar redimensionamento, viewport estreito, zoom, tema claro/escuro e recuperação após reconexão.

### 25.3 Chat real da plataforma

- [ ] Reutilizar o componente base de chat existente dentro de `LiveChatPanel`.
- [x] Exibir mensagens em tempo real somente da plataforma selecionada, mantendo isolamento por canal e provider.
- [ ] Mostrar avatar, handle, badges, timestamp, estado de conexão e mensagens de erro sem vazar credenciais.
- [x] Permitir resposta apenas quando o provider estiver conectado e possuir a capacidade `chat.write`.
- [ ] Pausar/reconectar o stream de mensagens com backoff, fila limitada e feedback visível.
- [x] Manter retenção e limites já definidos para chat, sem transformar a tela em um histórico ilimitado.
- [x] Cobrir estados vazio, carregando, offline e erro recuperável; rate limit/reconexão de UI permanecem pendentes.

### 25.4 Editor de metadados da live

- [ ] Criar `LiveMetadataEditor` em uma seção abaixo do preview/chat, organizada em layout responsivo.
- [ ] Criar campos tipados para título, descrição, categoria/jogo, idioma e tags.
- [ ] Criar toggles/switches somente para capacidades declaradas pelo provider, como modo lento, seguidores/subscribers only, emotes e visibilidade.
- [ ] Exibir valores atuais retornados pelo provider e indicar campos alterados localmente.
- [ ] Implementar salvar, descartar e estado de sincronização por provider.
- [ ] Impedir perda silenciosa: erro de atualização deve preservar rascunho, mostrar código estável/request ID e permitir tentar novamente.
- [x] Validar tamanho, formato e permissões no contrato Zod compartilhado antes de chamar o backend.
- [ ] Garantir que provider sem suporte a um campo mostre estado disabled/read-only com explicação acessível.

### 25.5 Arquitetura, contratos e segurança

- [x] Definir contratos Zod compartilhados para status, preview, chat, capacidades e metadados da transmissão.
- [x] Criar adapters por provider sem regra de UI ou de Games/Giveaway dentro dos adapters.
- [ ] Criar casos de uso separados para consultar transmissão, atualizar metadados e assinar chat.
- [ ] Persistir apenas preferências locais não sensíveis, como plataforma selecionada e layout; nunca persistir tokens no frontend/SQLite.
- [ ] Reutilizar o cofre seguro e as conexões existentes dos providers.
- [ ] Adicionar request/correlation ID aos erros de fronteira e redigir payloads sensíveis nos logs.
- [x] Registrar ADR especificando o uso dos players oficiais e a exclusão de captura do OBS/OBS WebSocket nesta batch.

### 25.6 Testes e critérios de aceitação

- [ ] Cobrir adapters e contratos com Twitch, YouTube, Kick, provider offline e provider sem capacidade de edição.
- [ ] Cobrir componentes de header, selector, preview, chat e editor em estados claro/escuro, erro, loading, vazio e disabled.
- [ ] Cobrir salvar/descartar, rollback de falha e concorrência de atualização de metadados.
- [ ] Cobrir CSP/iframe, viewport estreito, acessibilidade por teclado e redução de movimento.
- [ ] Cobrir E2E com transmissão simulada, troca de plataforma, chat isolado e persistência da preferência após reinício.
- [ ] Executar gate completo de format, lint, typecheck, testes frontend/backend/integration, build e E2E aplicável.
- [ ] Revisar diff, segurança, privacidade e documentação antes de marcar qualquer task como concluída.

### 25.7 Proteção de carga visual e operacional

- [x] Limitar a janela visual do Giveaway a 50 participantes e preservar o vencedor selecionado na animação.
- [x] Limitar listas operacionais de Games e mensagens de chat a 50 itens renderizados por janela.
- [x] Amortizar o pruning do buffer de chat sem reduzir retenção ou auditoria persistida.
- [x] Adicionar teste de regressão com 1.000 participantes e ADR de janelas limitadas.
- [ ] Executar profiling controlado com 1.000 e 10.000 eventos/participantes no Windows e registrar os resultados.

## Matriz de cobertura da especificação

| Seção | Assunto                      | Batches principais                    |
| ----- | ---------------------------- | ------------------------------------- |
| 1     | Visão do produto             | 0, 14                                 |
| 2     | Escopo do MVP                | 0, 11, 13, 14                         |
| 3     | Personas e cenários          | 0, 3                                  |
| 4     | Navegação e experiência      | 2, 3, 10, 25                          |
| 5     | TODO                         | 5, 24                                 |
| 6     | Games/Tournament             | 8, 9, 12                              |
| 7     | Giveaway                     | 6, 7, 12                              |
| 8     | Configurações globais        | 3, 4, 10, 12                          |
| 9     | Arquitetura de alto nível    | 1, 2, 13                              |
| 10    | Estrutura do repositório     | 1, 4                                  |
| 11    | SQLite                       | 4, 5, 6, 8, 9, 12, 14–16, 20          |
| 12    | API e Scalar                 | 2, 4, 5, 6, 8, 9, 10, 25              |
| 13    | Estado do frontend           | 3, 5, 7, 8, 25                        |
| 14    | Auto update e releases       | 11                                    |
| 15    | Debug e observabilidade      | 10                                    |
| 16    | Scripts raiz                 | 1, 11                                 |
| 17    | Estratégia de testes         | todas as batches de implementação, 22 |
| 18    | CI/CD                        | 1, 11, 22                             |
| 19    | Segurança do Electron        | 2, 10, 12–19, 22                      |
| 20    | Performance e confiabilidade | 3, 4, 7, 11, 12–19, 21, 22            |
| 21    | Integrações externas         | 12–20, 25                             |
| 22    | Roadmap                      | 0–25                                  |
| 23    | Primeiro vertical slice      | 2                                     |
| 24    | Definition of Done           | todas as batches                      |
| 25    | Decisões pendentes           | 0, 12, 13, 17, 18, 20, 21             |
| 26    | Riscos e mitigação           | 0, 19, 22                             |
| 27    | Princípios de implementação  | 0, 1 e todas as implementações        |
| 28    | Visão futura                 | 0, 21, 25                             |
| 29    | Resumo executivo             | 0, 22, 25                             |
