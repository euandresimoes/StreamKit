# Governança e escopo — Batch 0

Este documento consolida a baseline aprovada de produto da Batch 0. Decisões técnicas duradouras são registradas separadamente em `docs/adr/`.

## 1. Baseline do produto

### Visão aprovada

O StreamKit é um companion app desktop local-first para streamers. O primeiro marco é permitir organizar boards, executar torneios e giveaways durante uma live, fechar o aplicativo e retomar todo o trabalho persistido.

### Personas aprovadas

- **Streamer solo:** opera as ferramentas diretamente e precisa de poucos cliques e baixo atrito durante a live.
- **Streamer com moderadores:** opera eventos maiores e será beneficiado posteriormente por integrações e automações.
- **Comunidade participante:** observa os resultados e precisa confiar que animações não manipulam vencedores.

### Critérios de sucesso do MVP

1. Instalar e abrir o StreamKit no Windows suportado.
2. Criar e reutilizar um board Kanban.
3. Criar torneio individual ou em equipes.
4. Reorganizar participantes por drag and drop e por alternativa acessível.
5. Registrar resultados até definir um campeão.
6. Importar lista manual de nomes.
7. Executar roleta e case opening com resultado persistido antes da animação.
8. Fechar e reabrir sem perder dados confirmados.
9. Abrir Settings em uma única segunda janela com estado sincronizado.
10. Receber nova versão e escolher atualizar ou pular.

## 2. Classificação de escopo

### MVP distribuível

- Electron no Windows, Vue/Pinia/SCSS, Renderizer e backend Node.js/TypeScript.
- SQLite local, migrações, backups e armazenamento seguro de credenciais.
- TODO/Kanban completo e persistente.
- Torneios manuais de eliminação simples, individual e equipes.
- Giveaway manual com roleta, case opening, histórico e recuperação.
- Settings em segunda janela, temas, acessibilidade e debug.
- API local validada com Zod e documentada com OpenAPI/Scalar.
- Testes unitários, integração, componentes e E2E.
- Auto update, instalador, scripts raiz e CI/CD.

### Pós-MVP planejado

- Integração real com LivePix para Games e Giveaway.
- Entrada automática por contribuição, deduplicação, filas e aprovação.
- Overlays transparentes e Browser Source local para OBS.
- Temas avançados de sorteio, sons customizáveis e hotkeys globais.
- Outros formatos de torneio e torneios compartilhados.

### Visão futura

- Conta e sincronização opcional em nuvem.
- Marketplace, plugins, templates e compartilhamento de presets.
- Twitch, YouTube, Stream Deck e novas integrações.
- Goal bars, alertas, ranking, bingo, enquetes e outras ferramentas de live.

### Fora da primeira release

Todos os itens pós-MVP e de visão futura ficam fora da primeira release, salvo decisão explícita que atualize a especificação e o plano. Telemetria permanece ausente; qualquer adoção futura deverá ser transparente e opt-in.

## 3. Critérios mensuráveis aprovados

Os valores abaixo são a baseline inicial e serão medidos nas batches correspondentes.

| Área                   | Critério de aceitação                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Inicialização          | Janela utilizável em até 3 s no equipamento de referência, em pelo menos 9 de 10 inicializações com banco de volume nominal. |
| Resposta de UI         | Ação local comum apresenta feedback visual em até 100 ms.                                                                    |
| Persistência           | Escrita confirmada sobrevive a encerramento/reabertura; nenhuma confirmação é exibida antes do commit no banco.              |
| Animações              | Alvo de 60 FPS; percentil 95 de frames em até 20 ms no equipamento de referência e volume visual nominal.                    |
| Integridade do sorteio | Vencedor persistido antes da animação e idêntico após reinício/interrupção em 100% dos testes.                               |
| Drag and drop          | Operação atômica, sem duplicação/perda em 100% dos testes; falha persistente causa rollback e feedback.                      |
| Janela Settings        | No máximo uma instância; foco da existente e sincronização de preferências em até 250 ms.                                    |
| API local              | Ligada somente a loopback, health check em até 250 ms após backend pronto e payloads externos validados.                     |
| Recuperação            | Migration falha preserva banco anterior e backup restaurável em 100% dos cenários automatizados.                             |
| Qualidade              | Formatação, lint, typecheck, testes requeridos, build e E2E críticos verdes antes de commit/push.                            |

O equipamento de referência é Windows 10 22H2 ou Windows 11 x64, CPU de 4 núcleos, 8 GB de RAM e SSD. Os volumes máximos estão registrados no ADR 0006.

## 4. Mapa de riscos

| ID   | Risco                             | Responsável      | Sinal de alerta                          | Mitigação verificável                                        | Batch de controle |
| ---- | --------------------------------- | ---------------- | ---------------------------------------- | ------------------------------------------------------------ | ----------------- |
| R-01 | Escopo excessivo                  | Product owner    | Item pós-MVP entra no caminho crítico    | Classificação de escopo revisada em todo planejamento        | 0, 14             |
| R-02 | Complexidade do bracket           | Games            | Progressão/invalidação inconsistente     | Potências de dois primeiro e testes exaustivos de árvore     | 8, 9              |
| R-03 | Perda/duplicação no drag and drop | TODO/Games       | Estado visual diverge do SQLite          | Transação única, rollback e alternativa por comandos         | 5, 9              |
| R-04 | Sorteio parecer manipulado        | Giveaway         | Resultado depende de frame/timing        | Seleção com `crypto`, snapshot e persistência pré-animação   | 6, 7              |
| R-05 | Corrupção/migration falhar        | Data             | Banco não abre após upgrade              | WAL, transações, backup pré-migration e teste de restauração | 4, 11             |
| R-06 | Credencial exposta                | Security         | Secret aparece em renderer/DB/log        | Cofre do SO, API restrita e testes de redaction              | 10, 12            |
| R-07 | Update comprometido               | Desktop/Release  | Artefato ou metadado adulterado          | Checksums, metadados íntegros e workflow protegido           | 11                |
| R-08 | LivePix indisponível              | Integrations     | Reconexões/falhas recorrentes            | Modo manual independente, adapter, backoff e fila            | 12                |
| R-09 | Animação pesada                   | Frontend         | Frame p95 acima do alvo                  | Profiling, GPU, limite/virtualização e reduced motion        | 7                 |
| R-10 | Arquitetura excessiva             | Tech lead        | Abstração sem segunda variação/fronteira | ADR e revisão contra YAGNI/SRP                               | todas             |
| R-11 | Renderizer dessincronizado        | Desktop/Frontend | Settings diverge ou duplica              | E2E multiwindow, store/eventos compartilhados                | 2, 10             |
| R-12 | Dependência nativa incompatível   | Platform/Data    | Build Electron falha após upgrade        | Versões fixadas, rebuild nativo e smoke test empacotado      | 1, 4, 11          |
| R-13 | API local acessível indevidamente | Security         | Processo externo chama casos de uso      | Loopback, token efêmero e validação de origem/canal          | 2, 14             |
| R-14 | Git/release sem rastreabilidade   | Release          | Batch sem commit remoto verde            | Gate obrigatório, branch/remote confirmados e CI protegida   | 0, 1, 11          |

## 5. Ordem de entrega proposta

A ordem permanece: governança; fundação; Electron/vertical slice; design system; dados; TODO; Giveaway domínio/UI; Games individual/equipes; Settings/segurança; distribuição; LivePix; OBS/expansão; validação final.

Essa ordem prova cedo a arquitetura ponta a ponta, entrega primeiro os módulos manuais e impede que integrações futuras contaminem o domínio central.

## 6. Decisões aprovadas

| Tema               | Decisão                                                                 | ADR  |
| ------------------ | ----------------------------------------------------------------------- | ---- |
| Backend/build      | NestJS + Fastify, Vite/electron-vite, electron-builder/electron-updater | 0001 |
| Multiwindow        | Renderizer com um runtime Vue e superfícies Electron nativas            | 0002 |
| Persistência       | better-sqlite3 + Drizzle ORM/Kit                                        | 0003 |
| Drag and drop      | Pragmatic Drag and Drop com alternativa acessível                       | 0004 |
| Comunicação        | HTTP loopback dinâmico, SSE, IPC nativo e token efêmero                 | 0005 |
| Plataforma/limites | Windows x64, sem BYEs e limites iniciais definidos                      | 0006 |
| Licença            | PolyForm Noncommercial 1.0.0, source-available                          | 0007 |
| Releases           | stable/beta, GitHub Releases, NSIS e checksum; sem assinatura inicial   | 0012 |
| Auditoria          | Metadados públicos e hash do snapshot por rodada                        | 0009 |
