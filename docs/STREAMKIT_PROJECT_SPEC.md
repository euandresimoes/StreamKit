# StreamKit — Especificação de Produto, Arquitetura e Execução

> Documento mestre para orientar o planejamento, a implementação, os testes e o lançamento do MVP do StreamKit.

**Status:** planejamento inicial  
**Tipo de produto:** aplicativo desktop local para streamers  
**Plataformas-alvo iniciais:** Windows, com arquitetura preparada para macOS e Linux  
**Stack principal:** Electron, Renderizer, Vue.js, Pinia, SCSS, Node.js, TypeScript, SQLite, Jest, Zod e Scalar API

---

## 1. Visão do produto

O **StreamKit** será uma toolbox desktop para streamers. O aplicativo reunirá ferramentas de organização, torneios, sorteios e integrações em uma única experiência, mantendo todos os dados localmente no computador do usuário.

A proposta não é criar apenas uma roleta ou um gerenciador de tarefas. O StreamKit deverá funcionar como um **companion app para transmissões**, capaz de acompanhar o streamer antes, durante e depois da live.

O produto começa com quatro áreas:

1. **TODO:** workspaces em formato Kanban para organizar jogos, filmes, tarefas e outros conteúdos.
2. **Games:** criação e administração de torneios eliminatórios individuais ou em equipes.
3. **Giveaway:** sorteios manuais com roleta tradicional ou animação estilo abertura de caixa.
4. **Settings:** configurações globais em uma janela separada, criada e sincronizada pelo Renderizer.

No futuro, Games e Giveaway receberão participantes automaticamente por meio da integração com o **LivePix**.

### 1.1 Objetivo principal

Permitir que um streamer organize sua rotina e execute interações com a comunidade sem depender de várias páginas, planilhas e aplicativos separados.

### 1.2 Proposta de valor

- Uma única aplicação para várias necessidades recorrentes de streamers.
- Funcionamento local e rápido.
- Dados persistidos no computador do usuário.
- Interface visual e adequada para uso durante uma transmissão.
- Sorteios e torneios fáceis de configurar.
- Arquitetura preparada para integrações e automações futuras.
- Uso real do Renderizer para janelas secundárias com estado compartilhado.

### 1.3 Princípios do produto

- **Local-first:** o aplicativo deve continuar útil sem conta e sem serviços externos.
- **Manual antes do automático:** cada ferramenta deve funcionar manualmente antes de receber integrações.
- **Fácil durante uma live:** ações importantes devem exigir poucos cliques.
- **Auditável:** resultados, participantes e alterações relevantes devem poder ser consultados.
- **Modular:** novas ferramentas não devem exigir reescrever o núcleo do produto.
- **Responsivo e previsível:** animações não podem comprometer a integridade do resultado.
- **Sem perda silenciosa de dados:** toda escrita persistente deve ser transacional e tratada.

---

## 2. Escopo do MVP

### 2.1 Incluído no MVP

- Aplicativo desktop em Electron.
- Interface em Vue.js, Pinia e SCSS.
- Integração do Renderizer para a janela principal e a janela de configurações.
- Backend local em Node.js e TypeScript.
- Banco de dados SQLite salvo na área de dados da aplicação.
- TODO em formato Kanban com múltiplos workspaces, colunas e cards.
- Torneios manuais de eliminação simples.
- Torneios nos modos Individual e Time.
- Criação e movimentação de participantes entre equipes.
- Giveaway com importação manual de nomes.
- Roleta tradicional.
- Sorteio estilo abertura de caixa de Counter-Strike.
- Configurações globais de tema e preferências.
- Campo seguro para futura chave/API do LivePix.
- Documentação local da API com Scalar.
- Validação de entrada com Zod.
- Testes unitários, de integração e E2E.
- Modo de debug para frontend, Electron e backend.
- Atualização automática baseada em releases do repositório.
- Scripts raiz para desenvolvimento, testes, produção, build e release.
- Pipeline de CI/CD.

### 2.2 Planejado, mas não obrigatório para o primeiro MVP funcional

- Integração real com LivePix.
- Entrada automática em torneios por doação.
- Entrada automática em giveaways por doação.
- Browser Sources/overlays transparentes para OBS.
- Temas avançados para roleta e case opening.
- Sons customizáveis.
- Chaves de atalho globais.
- Login, conta, sincronização em nuvem e marketplace.
- Outros formatos de torneio, como dupla eliminação, grupos ou suíço.
- Torneios online compartilhados.

Essa separação é essencial: o domínio manual será construído primeiro e as integrações serão tratadas como novas fontes de entrada, não como parte obrigatória da lógica central.

Conforme o ADR 0013, a integração LivePix permanece adiada até o proprietário testar, refinar e
aprovar os fluxos manuais e a interface do MVP. Preparações técnicas existentes não caracterizam
uma integração funcional nem autorizam automações externas.

### 2.3 Critério de sucesso do MVP

O MVP será considerado bem-sucedido quando um streamer conseguir:

1. instalar e abrir o StreamKit;
2. criar e reutilizar um board Kanban;
3. criar um torneio individual ou em times;
4. reorganizar participantes por drag and drop;
5. registrar resultados e chegar a um campeão;
6. importar uma lista de nomes;
7. executar os dois formatos de sorteio;
8. fechar e reabrir o aplicativo sem perder dados;
9. abrir configurações em outra janela sem duplicar nem dessincronizar o estado;
10. receber a notificação de uma nova versão e escolher atualizar ou pular.

---

## 3. Personas e cenários principais

### 3.1 Streamer solo

Faz lives sozinho, administra os próprios sorteios, organiza jogos futuros e precisa de ferramentas rápidas que não atrapalhem a transmissão.

### 3.2 Streamer com moderadores

Realiza torneios e giveaways maiores. No futuro, poderá delegar operações ou automatizar inscrições por LivePix.

### 3.3 Comunidade participante

Não utiliza diretamente a aplicação no MVP, mas vê o resultado dos torneios e sorteios na live. Precisa confiar que a seleção não foi alterada pela animação.

---

## 4. Navegação e experiência geral

### 4.1 Estrutura da janela principal

- Navigation with the tabs **LIVE**, **TODO**, **GIVEAWAYS** and **TOURNAMENTS**.
- Acesso às configurações no rodapé ou cabeçalho.
- Área central dedicada ao módulo atual.
- Notificações discretas para sucesso, erro e persistência.
- Indicador visual quando o modo debug estiver habilitado.
- Diálogos de confirmação somente para ações destrutivas ou irreversíveis.

### 4.2 Janela de configurações

As configurações serão abertas em uma segunda janela por meio do **Renderizer**. A janela deve compartilhar o mesmo estado da aplicação principal, sem iniciar uma segunda instância independente do frontend.

Requisitos:

- impedir a abertura de múltiplas janelas de configurações duplicadas;
- focar a janela existente quando o usuário tentar abri-la novamente;
- sincronizar tema e preferências imediatamente;
- preservar tamanho e posição da janela;
- tratar o fechamento sem encerrar a aplicação principal;
- funcionar corretamente com hot reload no modo de desenvolvimento.

### 4.3 Estados obrigatórios de interface

Cada tela deve possuir:

- estado vazio;
- estado carregando, quando necessário;
- estado de sucesso;
- estado de erro recuperável;
- confirmação de ação destrutiva;
- feedback durante drag and drop;
- tratamento de dados inválidos ou incompletos.

---

## 5. Módulo TODO

### 5.1 Objetivo

Oferecer boards Kanban reutilizáveis para qualquer tipo de organização do streamer, como:

- Jogos para jogar;
- Filmes para assistir;
- Ideias de conteúdo;
- Tarefas da live;
- Patrocínios;
- Clipes para editar.

### 5.2 Hierarquia do domínio

```text
Workspace
└── Columns
    └── Cards
```

Exemplo:

```text
Workspace: Filmes
├── Para assistir
├── Assistindo
├── Assistido
└── Reembolsado
```

### 5.3 Funcionalidades do MVP

#### Workspaces

- criar workspace;
- renomear workspace;
- definir descrição opcional;
- selecionar workspace ativo;
- listar workspaces;
- excluir workspace mediante confirmação;
- persistir a última seleção do usuário.

#### Colunas

- criar coluna;
- renomear coluna;
- reordenar colunas;
- definir cor opcional;
- excluir coluna;
- decidir, na exclusão, se os cards serão movidos ou apagados.

#### Cards

- criar card;
- editar título;
- editar descrição opcional;
- adicionar observações opcionais;
- mover card entre colunas por drag and drop;
- reordenar card dentro da mesma coluna;
- excluir card;
- registrar datas de criação e atualização.

#### Evolução operacional (Batch 24)

- colunas podem ter ícone, cor, limite WIP, estado recolhido e pin persistente;
- cards suportam prioridade, cor de destaque, etiquetas, checklist e pin;
- templates são salvos por workspace e podem recriar sua estrutura localmente;
- detalhes de card usam modal base compartilhado e as etiquetas/prioridades usam primitives visuais reutilizáveis;
- esta evolução não adiciona chat ou colaboração em tempo real.

### 5.4 Regras de negócio

- Um workspace precisa ter um nome não vazio.
- Um workspace pode começar sem colunas, mas a interface deve sugerir a criação da primeira.
- Uma coluna pertence a exatamente um workspace.
- Um card pertence a exatamente uma coluna e, indiretamente, a um workspace.
- A ordem de colunas e cards deve ser persistida explicitamente.
- Mover um card deve ser uma única operação transacional.
- Excluir um workspace remove suas colunas e cards em cascata após confirmação.
- Excluir uma coluna com cards exige uma decisão explícita do usuário.
- Aplicar um template substitui a estrutura atual do workspace e exige ação explícita do usuário.

### 5.5 Fora do MVP inicial

- anexos;
- comentários colaborativos;
- responsáveis;
- sincronização em nuvem;
- automações;
- calendário;
- etiquetas complexas.

---

## 6. Módulo Tournaments — Tournament Bracket

### 6.1 Objetivo

Permitir a criação de torneios visuais semelhantes ao Challonge, inicialmente no formato de **eliminação simples**.

Fluxo esperado:

```text
Oitavas → Quartas → Semifinal → Final → Campeão
```

O número real de rodadas dependerá da quantidade de participantes ou equipes.

### 6.2 Modos de torneio

#### Individual

Cada entrada do bracket representa uma pessoa.

#### Time

Cada entrada do bracket representa uma equipe com:

- nome;
- cor opcional;
- número máximo de slots;
- lista ordenada de membros.

O usuário poderá arrastar uma pessoa de um slot para outro, inclusive entre equipes.

### 6.3 Fluxo de criação

1. Clicar em **Novo torneio**.
2. Informar nome e descrição opcional.
3. Selecionar **Individual** ou **Time**.
4. Definir tamanho do torneio.
5. No modo Time, definir quantidade de integrantes por time.
6. Adicionar participantes manualmente.
7. Organizar participantes/equipes.
8. Gerar o bracket.
9. Confirmar o seeding.
10. Iniciar o torneio.

### 6.4 Tamanhos aceitos inicialmente

Para simplificar o primeiro lançamento:

- 4 entradas: semifinal e final;
- 8 entradas: quartas, semifinal e final;
- 16 entradas: oitavas, quartas, semifinal e final;
- 32 entradas: fase de 32, oitavas, quartas, semifinal e final.

O suporte a quantidades não potências de dois pode ser adicionado com **BYEs**. Se BYEs entrarem no MVP, sua criação deve ser automática e previsível.

### 6.5 Estados do torneio

- `draft`: configuração livre;
- `ready`: bracket gerado e aguardando início;
- `in_progress`: partidas em andamento;
- `finished`: campeão definido;
- `archived`: oculto da lista principal, preservado no histórico.

### 6.6 Estados de uma partida

- `pending`: depende de resultados anteriores;
- `ready`: os dois lados estão definidos;
- `in_progress`: partida iniciada;
- `finished`: vencedor registrado;
- `cancelled`: partida invalidada.

Cada torneio pode possuir no máximo uma **partida atual**. Selecionar uma partida `ready` como atual
a inicia e destaca no bracket; partidas `pending`, finalizadas ou sem os dois lados definidos não
podem ser iniciadas. A partida atual permanece selecionada depois do resultado para consulta do chat
até o operador iniciar outra partida.

Cada lado da partida possui um resultado operacional:

- `pending`: resultado ainda não informado;
- `won`: venceu a partida;
- `lost`: perdeu a partida;
- `forfeit`: desistiu e concede vitória ao adversário;
- `draw`: empatou e exige desempate antes da progressão.

Somente combinações coerentes podem ser confirmadas: `won/lost` ou `won/forfeit`. Um empate pode ser
registrado como estado operacional e histórico, mas não finaliza nem avança a partida eliminatória.

### 6.7 Operações do modo Individual

- adicionar pessoa;
- renomear pessoa;
- remover pessoa;
- reordenar seeding;
- embaralhar seeding;
- arrastar uma pessoa para outro slot antes do início;
- registrar vencedor de cada partida;
- desfazer resultado com confirmação e invalidação dos resultados dependentes.

### 6.8 Operações do modo Time

- criar equipe;
- renomear equipe;
- definir capacidade;
- adicionar membro diretamente a um slot;
- manter slots vazios visíveis;
- mover membro dentro da mesma equipe;
- mover membro para outra equipe;
- impedir que a capacidade seja excedida;
- impedir que uma mesma pessoa ocupe dois slots no mesmo torneio, salvo configuração futura específica;
- arrastar equipes no seeding antes do início;
- registrar a equipe vencedora de cada partida.

### 6.9 Regras de progressão

- Ao concluir uma partida, o vencedor ocupa automaticamente o slot correto da rodada seguinte.
- O campeão só é definido quando a final é concluída.
- Alterar um resultado anterior invalida os resultados descendentes que dependem dele.
- Depois que o torneio começa, alterações estruturais devem ser bloqueadas ou exigir uma operação explícita de edição administrativa.
- O histórico deve registrar alterações de resultados.
- Confirmar um resultado finaliza a partida, persiste os resultados dos dois lados e ocupa o slot da
  rodada seguinte em uma única transação; não existe uma segunda ação manual para "avançar".

### 6.9.1 Painel operacional e chat da partida

Selecionar a partida atual abre um painel com os dois lados, seus participantes, estados e ações de
resultado. Para participantes capturados por provider, o painel oferece chats isolados por equipe ou
participante usando `provider`, `channel_id` e `provider_user_id`; entradas manuais sem identidade
externa permanecem visíveis na escalação, mas não geram um chat fictício.

O chat bilateral fica disponível durante a partida e depois do resultado até outra partida ser
iniciada. Respostas só são habilitadas por uma conexão `connected` com capacidade `chat.write` para o
provider e canal correspondentes. Ao finalizar o torneio, o painel focado da equipe campeã continua
derivado do resultado persistido.

### 6.9.2 Provider simulado para desenvolvimento

Builds de desenvolvimento/debug podem expor um provider simulado pela mesma interface dos providers
reais. Ele deve emitir eventos pelo pipeline normal e nunca estar disponível em builds de produção.
O simulador fornece identidades e avatares determinísticos, cenários reproduzíveis, rajadas,
duplicatas, troca de handle, papéis, desconexão/reconexão e encerramento de chat. Deve permitir validar
8, 16, 32, 1.000 e 10.000 eventos sem exigir contas reais.

### 6.10 Integração LivePix futura

No modo automático:

1. o streamer define um valor mínimo de doação;
2. o StreamKit recebe um evento válido do LivePix;
3. o nome do participante é extraído do título/nome informado no donate;
4. o nome passa por normalização e validação;
5. o participante é colocado em uma fila;
6. o sistema encontra uma equipe com slot livre;
7. o participante é inserido automaticamente;
8. a interface registra a origem da inscrição e o identificador do evento para impedir duplicidade.

A política de distribuição deverá ser configurável futuramente:

- primeira equipe com vaga;
- round-robin;
- equipe aleatória;
- balanceamento por quantidade de integrantes;
- fila aguardando aprovação manual.

### 6.11 Decisões que devem ser fechadas antes da integração

- campo exato do LivePix usado como nome;
- comportamento para nome vazio;
- comportamento para nomes repetidos;
- estorno ou cancelamento de doação;
- eventos duplicados;
- lotação de todos os times;
- persistência e rotação de credenciais;
- disponibilidade e contrato oficial da API/webhook.

---

## 7. Módulo Giveaway

### 7.1 Objetivo

Permitir sorteios rápidos, visualmente interessantes e confiáveis durante uma live.

### 7.2 Fontes de participantes

O domínio deve trabalhar com a abstração `ParticipantSource`.

Fontes previstas:

- `manual`: disponível no MVP;
- `livepix`: prevista para versão futura;
- outras integrações futuras sem alteração do núcleo do sorteio.

### 7.3 Importação manual

O usuário poderá colar nomes separados por:

- quebra de linha;
- vírgula;
- combinação de ambos.

Exemplo:

```text
Ana
Bruno, Carlos
Daniela
```

O parser deverá:

1. dividir por vírgulas e quebras de linha;
2. remover espaços externos;
3. remover entradas vazias;
4. preservar acentos e caracteres Unicode;
5. apresentar uma prévia antes de confirmar;
6. informar quantas entradas válidas foram encontradas;
7. tratar duplicatas conforme a configuração do sorteio.

### 7.4 Política de duplicatas

O usuário poderá escolher:

- **remover duplicatas:** cada nome participa uma vez;
- **manter duplicatas:** cada ocorrência representa um ticket;
- **agrupar tickets:** mostrar uma pessoa com a quantidade de entradas.

A comparação padrão deve ignorar espaços externos e diferenças de caixa, mas preservar o nome original para exibição.

Cada giveaway deve persistir um limite configurável entre 1 e 10.000 participantes. O mesmo limite
deve ser aplicado atomicamente à importação manual e à captura por provider; a configuração não
pode ser reduzida abaixo da quantidade atual de participantes ativos.

### 7.5 Modos de sorteio

#### Roleta comum

- participantes distribuídos visualmente na roda;
- botão para iniciar;
- aceleração, rotação e desaceleração;
- ponteiro claro;
- destaque do vencedor;
- opção de remover o vencedor da próxima rodada;
- histórico dos resultados.

#### Case Opening

Inspirado visualmente em uma abertura de caixa de Counter-Strike:

- participantes dispostos horizontalmente;
- movimento rápido inicial;
- desaceleração progressiva;
- marcador central;
- parada no vencedor;
- animação final de celebração;
- histórico do resultado.

O visual pode ser inspirado no formato, mas deve utilizar identidade, assets e sons próprios do StreamKit.

### 7.6 Integridade do sorteio

O vencedor deve ser escolhido pela lógica de domínio **antes da animação começar**. A animação apenas representa o resultado já definido.

Fluxo:

1. congelar a lista de entradas;
2. gerar o vencedor usando uma fonte segura de aleatoriedade;
3. salvar rodada, entradas e vencedor;
4. iniciar a animação apontando para esse vencedor;
5. marcar a rodada como concluída quando a animação terminar;
6. recuperar corretamente uma rodada interrompida se o aplicativo fechar.

Requisitos:

- usar `crypto` em vez de `Math.random()` para a seleção;
- impedir alterações na lista durante a rodada;
- registrar data, modo, quantidade de entradas e vencedor;
- manter o resultado independente de FPS e duração da animação;
- permitir cancelar antes da seleção, mas não trocar silenciosamente um vencedor já selecionado.

### 7.7 Integração LivePix futura

O streamer definirá:

- valor mínimo para participar;
- quantidade de tickets por faixa ou por valor;
- janela de tempo da campanha;
- tratamento de nomes duplicados;
- aprovação automática ou manual.

Cada evento deverá possuir um identificador idempotente. O mesmo donate nunca poderá gerar entradas duas vezes.

### 7.8 Estados do giveaway

- `draft`: lista ainda editável;
- `ready`: configuração validada;
- `drawing`: seleção/animação em andamento;
- `completed`: vencedor salvo;
- `cancelled`: sorteio cancelado;
- `archived`: guardado no histórico.

---

## 8. Configurações globais

### 8.1 Categorias iniciais

#### Aparência

- tema claro;
- tema escuro;
- seguir tema do sistema;
- cor de destaque futura;
- redução de animações para acessibilidade.

#### Aplicação

- abrir com o sistema, opcional;
- minimizar para bandeja, opcional;
- confirmar antes de sair durante um sorteio ou torneio ativo;
- idioma futuro;
- comportamento de atualização automática.

#### LivePix

- chave/API token;
- botão de testar conexão, quando a integração existir;
- status da integração;
- remover credencial.

#### Desenvolvedor

- habilitar modo debug;
- abrir DevTools;
- mostrar logs;
- copiar informações de diagnóstico;
- abrir diretório de logs;
- consultar versão do frontend, backend e banco.

### 8.2 Persistência de credenciais

A chave do LivePix não deverá ser armazenada em texto puro no SQLite. Preferências não sensíveis podem ficar no banco, mas segredos deverão usar o armazenamento seguro do sistema operacional, por exemplo por meio de uma integração com Windows Credential Manager, macOS Keychain e Secret Service no Linux.

O renderer nunca deverá acessar credenciais diretamente. Toda operação sensível deve passar por uma API restrita exposta pelo processo principal/backend.

---

## 9. Arquitetura de alto nível

```text
Electron Main Process
├── Ciclo de vida do app
├── Gerenciamento de janelas
├── Auto updater
├── Armazenamento seguro
├── Backend local
└── IPC permitido

Vue Renderer + Renderizer
├── Janela principal
├── Janela de configurações
├── Pinia stores
├── Módulos de UI
└── Clientes da API/eventos

Backend Node.js + TypeScript
├── TODO
├── Tournaments
├── Giveaways
├── Settings
├── Updates/Diagnostics
├── LivePix futuro
└── SQLite
```

### 9.1 Estilo arquitetural

O backend será um **monólito modular**. Todos os módulos vivem no mesmo processo/projeto e compartilham infraestrutura, mas mantêm limites claros de responsabilidade.

Cada módulo deverá conter, quando aplicável:

- `controllers/`: entrada e saída da aplicação;
- `services/`: casos de uso e orquestração;
- `repositories/`: contratos e persistência;
- `entities/`: entidades e invariantes de domínio;
- `schemas/`: validações Zod e DTOs inferidos;
- `errors/`: erros específicos do domínio;
- `tests/`: testes do módulo.

### 9.2 Responsabilidades por camada

| Camada     | Responsabilidade                                            | Não deve fazer                                   |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Controller | Receber requisição, validar contrato e devolver resposta    | SQL, regra de negócio ou lógica de UI            |
| Service    | Executar um caso de uso e coordenar dependências            | Conhecer detalhes de Electron ou componentes Vue |
| Repository | Ler e gravar entidades                                      | Decidir regras de negócio                        |
| Entity     | Proteger invariantes e representar comportamento do domínio | Fazer I/O ou acessar banco                       |
| Schema     | Validar formato e limites dos dados externos                | Persistir ou executar caso de uso                |

### 9.3 Single Responsibility Principle

Uma classe deverá possuir um motivo principal para mudar. Exemplos:

- `CreateWorkspaceService` cria um workspace;
- `MoveCardService` move e reordena um card;
- `GenerateBracketService` gera o bracket;
- `AdvanceTournamentWinnerService` registra e propaga um vencedor;
- `ParseParticipantListService` interpreta o texto colado;
- `DrawWinnerService` seleciona e persiste o vencedor;
- `CheckForUpdatesService` consulta releases;
- `SecureCredentialRepository` acessa o cofre do sistema.

Evitar classes genéricas gigantes como `TodoService`, `GameManager` ou `Utils` contendo dezenas de responsabilidades.

### 9.4 Orientação a classes

O backend utilizará classes para entidades, serviços, controllers, repositories e adapters. Funções puras pequenas continuam aceitáveis apenas para operações sem estado e claramente utilitárias, caso a restrição “somente classes” torne o código artificial. A decisão final deverá favorecer clareza e testabilidade, e não quantidade de classes.

No frontend, componentes Vue, composables e stores Pinia seguirão os padrões naturais do ecossistema; a exigência de classes se aplica principalmente ao domínio e backend.

### 9.5 Comunicação interna

Opções aceitas:

- API HTTP local em porta dinâmica vinculada apenas a `127.0.0.1`;
- IPC tipado e restrito entre renderer e Electron;
- eventos internos/WebSocket para atualizações em tempo real e futuros overlays.

Decisão recomendada:

- API HTTP local para os casos de uso documentados pelo Scalar;
- canal de eventos para sincronização reativa;
- IPC somente para capacidades nativas do Electron.

O renderer não deve receber acesso irrestrito ao Node.js.

---

## 10. Estrutura sugerida do repositório

```text
streamkit/
├── apps/
│   ├── desktop/
│   │   ├── src/main/
│   │   ├── src/preload/
│   │   └── tests/
│   ├── frontend/
│   │   ├── src/app/
│   │   ├── src/modules/todo/
│   │   ├── src/modules/tournament/
│   │   ├── src/modules/giveaway/
│   │   ├── src/modules/settings/
│   │   ├── src/stores/
│   │   ├── src/styles/
│   │   └── tests/
│   └── backend/
│       ├── src/modules/todo/
│       ├── src/modules/tournaments/
│       ├── src/modules/giveaways/
│       ├── src/modules/settings/
│       ├── src/modules/integrations/
│       ├── src/infrastructure/database/
│       ├── src/infrastructure/logging/
│       ├── src/shared/
│       └── test/
├── packages/
│   ├── contracts/
│   ├── config/
│   └── test-utils/
├── scripts/
├── docs/
├── .github/workflows/
├── package.json
├── tsconfig.base.json
└── README.md
```

### 10.1 Contratos compartilhados

O pacote `contracts` deverá guardar:

- schemas Zod compartilhados;
- tipos inferidos a partir dos schemas;
- nomes e payloads de eventos;
- respostas públicas da API;
- códigos de erro estáveis.

Não duplicar interfaces manualmente no frontend e backend quando elas representam o mesmo contrato.

---

## 11. Persistência SQLite

### 11.1 Local dos arquivos

O caminho não deve ser montado manualmente com `AppData`. O Electron deverá fornecer a pasta correta por sistema operacional usando:

```ts
app.getPath('userData')
```

Estrutura conceitual:

```text
<userData>/
├── data/
│   └── streamkit.db
├── logs/
├── backups/
├── cache/
└── settings.json
```

No Windows, `<userData>` normalmente estará dentro de AppData; em outros sistemas, apontará para o diretório equivalente.

### 11.2 Estratégia de banco

Para o MVP, usar **um banco principal `streamkit.db`** é mais seguro do que um `.db` separado por módulo. Isso permite transações consistentes, migrações únicas e backups simples. Os dados de TODO, Games, Giveaway e configurações ficam em tabelas separadas dentro do mesmo arquivo.

Arquivos adicionais poderão existir para:

- backups versionados;
- exportações de workspaces ou torneios;
- fixtures de desenvolvimento e testes;
- banco isolado para cada suíte de teste.

### 11.3 Configurações recomendadas

- foreign keys habilitadas;
- journal mode WAL;
- busy timeout configurado;
- transações para operações com múltiplas escritas;
- migrações versionadas;
- backup antes de migrações destrutivas;
- timestamps em UTC;
- IDs em UUID ou outro formato estável;
- nenhuma concatenação manual de SQL com entrada do usuário.

### 11.4 Modelo inicial de dados

#### TODO

| Tabela            | Campos principais                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `todo_workspaces` | `id`, `name`, `description`, `position`, `created_at`, `updated_at`                        |
| `todo_columns`    | `id`, `workspace_id`, `name`, `color`, `position`, `created_at`, `updated_at`              |
| `todo_cards`      | `id`, `column_id`, `title`, `description`, `notes`, `position`, `created_at`, `updated_at` |

#### Tournaments

| Tabela                    | Campos principais                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tournaments`             | `id`, `name`, `description`, `mode`, `status`, `bracket_size`, `team_capacity`, `created_at`, `updated_at`                                                        |
| `tournament_participants` | `id`, `tournament_id`, `display_name`, `source`, `external_ref`, `created_at`                                                                                     |
| `tournament_teams`        | `id`, `tournament_id`, `name`, `color`, `seed`, `capacity`, `created_at`, `updated_at`                                                                            |
| `tournament_team_members` | `id`, `team_id`, `participant_id`, `slot_position`, `created_at`                                                                                                  |
| `tournament_entries`      | `id`, `tournament_id`, `participant_id` ou `team_id`, `seed`, `created_at`                                                                                        |
| `tournament_matches`      | `id`, `tournament_id`, `round_number`, `match_number`, `left_entry_id`, `right_entry_id`, `winner_entry_id`, `next_match_id`, `next_slot`, `status`, `updated_at` |
| `tournament_audit_log`    | `id`, `tournament_id`, `action`, `payload_json`, `created_at`                                                                                                     |

#### Giveaways

| Tabela                   | Campos principais                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `giveaways`              | `id`, `name`, `mode`, `source`, `status`, `duplicate_policy`, `max_participants`, `created_at`, `updated_at` |
| `giveaway_participants`  | `id`, `giveaway_id`, `display_name`, `normalized_name`, `ticket_count`, `external_ref`, `created_at`         |
| `giveaway_rounds`        | `id`, `giveaway_id`, `status`, `winner_participant_id`, `random_proof`, `started_at`, `completed_at`         |
| `giveaway_round_entries` | `id`, `round_id`, `participant_id`, `ticket_count`                                                           |

#### Configurações e infraestrutura

| Tabela               | Campos principais                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `app_settings`       | `key`, `value_json`, `updated_at`                                                                            |
| `schema_migrations`  | `version`, `name`, `applied_at`                                                                              |
| `integration_events` | `id`, `provider`, `external_event_id`, `event_type`, `status`, `payload_json`, `received_at`, `processed_at` |

Credenciais não devem ser armazenadas em `app_settings`.

### 11.5 Exclusão e histórico

- Dados descartáveis podem usar exclusão física.
- Torneios e giveaways concluídos devem preferir arquivamento.
- Logs de auditoria relevantes não devem ser alterados silenciosamente.
- A aplicação deverá oferecer, futuramente, exportação e limpeza de dados.

---

## 12. API e documentação Scalar

### 12.1 Convenções

- prefixo sugerido: `/api/v1`;
- JSON como formato padrão;
- IDs na URL;
- códigos HTTP coerentes;
- erros em formato estável;
- documentação OpenAPI consumida pelo Scalar;
- documentação ativada por padrão apenas em desenvolvimento/debug ou protegida no build distribuído.

### 12.2 Formato de erro

```json
{
  "error": {
    "code": "TODO_CARD_NOT_FOUND",
    "message": "Card not found",
    "details": null,
    "requestId": "..."
  }
}
```

### 12.3 Rotas conceituais

#### TODO

- `GET /api/v1/todo/workspaces`
- `POST /api/v1/todo/workspaces`
- `PATCH /api/v1/todo/workspaces/:id`
- `DELETE /api/v1/todo/workspaces/:id`
- `POST /api/v1/todo/workspaces/:id/columns`
- `PATCH /api/v1/todo/columns/:id`
- `POST /api/v1/todo/columns/:id/cards`
- `PATCH /api/v1/todo/cards/:id`
- `POST /api/v1/todo/cards/:id/move`

#### Tournaments

- `GET /api/v1/tournaments`
- `POST /api/v1/tournaments`
- `GET /api/v1/tournaments/:id`
- `POST /api/v1/tournaments/:id/participants`
- `POST /api/v1/tournaments/:id/teams`
- `POST /api/v1/tournaments/:id/team-members/move`
- `POST /api/v1/tournaments/:id/bracket/generate`
- `POST /api/v1/tournaments/:id/start`
- `POST /api/v1/tournaments/:id/matches/:matchId/winner`
- `POST /api/v1/tournaments/:id/archive`

#### Giveaways

- `GET /api/v1/giveaways`
- `POST /api/v1/giveaways`
- `POST /api/v1/giveaways/parse-participants`
- `POST /api/v1/giveaways/:id/participants/import`
- `POST /api/v1/giveaways/:id/prepare`
- `POST /api/v1/giveaways/:id/draw`
- `POST /api/v1/giveaways/:id/rounds/:roundId/complete`
- `GET /api/v1/giveaways/:id/history`

#### Settings e diagnóstico

- `GET /api/v1/settings`
- `PATCH /api/v1/settings`
- `GET /api/v1/health`
- `GET /api/v1/diagnostics`

### 12.4 Zod

Todo dado externo deve ser validado na borda do sistema:

- body;
- query params;
- route params;
- eventos IPC;
- eventos do LivePix;
- configurações carregadas de arquivo;
- payloads recuperados do banco quando houver risco de versão incompatível.

Os tipos TypeScript deverão ser inferidos dos schemas sempre que possível para impedir divergência entre validação e tipagem.

---

## 13. Estado do frontend

### 13.1 Pinia

Stores sugeridas:

- `useAppStore`: ciclo de vida e estado global não persistente;
- `useSettingsStore`: tema e preferências;
- `useTodoStore`: board ativo e operações Kanban;
- `useTournamentStore`: torneio atual, times e bracket;
- `useGiveawayStore`: configuração, participantes e animação;
- `useUpdateStore`: versões, changelog e decisão do usuário;
- `useNotificationStore`: mensagens e erros.

### 13.2 Regra de persistência

Pinia não é a fonte final de verdade dos dados persistentes. O banco é a fonte de verdade. A store mantém estado de interface e cache, chama casos de uso e aplica atualizações confirmadas.

Para drag and drop, pode haver atualização otimista, mas uma falha de persistência deve reverter o estado e informar o usuário.

### 13.3 Estilos SCSS

Organização sugerida:

```text
styles/
├── abstracts/   # tokens, variáveis, mixins
├── base/        # reset, tipografia
├── themes/      # dark, light, system
├── components/  # estilos reutilizáveis
└── utilities/   # utilidades pequenas
```

Evitar valores mágicos repetidos. Cores, espaçamento, tipografia, radius, sombras e duração de animações devem ser tokens.

### 13.4 Acessibilidade

- navegação por teclado nas ações principais;
- foco visível;
- contraste adequado;
- alternativa a drag and drop por comandos/botões;
- suporte a redução de movimento;
- ícones acompanhados de label ou tooltip;
- não depender somente de cor para representar estado.

---

## 14. Auto update e releases

### 14.1 Comportamento esperado

Ao abrir o StreamKit:

1. aguardar a interface ficar utilizável;
2. consultar releases do repositório sem bloquear a inicialização;
3. comparar a versão instalada com a versão disponível;
4. se houver atualização, exibir título, versão e changelog;
5. permitir **Atualizar agora** ou **Pular esta versão**;
6. baixar com progresso visível após autorização;
7. validar o checksum do pacote e, quando futuramente configurada, sua assinatura;
8. instalar no momento seguro definido para a plataforma;
9. informar erros sem impedir o uso da versão atual.

### 14.2 Regras

- Não mostrar novamente uma versão explicitamente pulada.
- Permitir verificar atualizações manualmente.
- Não aplicar atualização durante sorteio ou torneio ativo sem confirmação.
- Releases de teste devem usar canal separado, como `beta`.
- O repositório e o provedor de release devem ser configuráveis no build.
- Releases Windows iniciais podem ser não assinadas conforme o ADR 0012; checksum e aviso claro de SmartScreen são obrigatórios.
- A API do repositório não deve receber tokens privados a partir do renderer.

### 14.3 Changelog

Cada release deve conter:

- versão;
- título curto;
- resumo;
- novidades;
- correções;
- breaking changes, se existirem;
- instruções especiais, quando necessárias.

---

## 15. Modo debug e observabilidade

### 15.1 Ativação

O debug poderá ser ativado por:

- variável de ambiente;
- argumento de CLI;
- configuração no menu Developer;
- build de desenvolvimento.

### 15.2 O que deve registrar

- inicialização e encerramento;
- versão do app;
- ambiente;
- caminho lógico do banco, sem expor informações sensíveis desnecessárias;
- execução de migrações;
- chamadas e duração dos casos de uso;
- erros de banco;
- abertura e fechamento de janelas;
- checagem de atualização;
- eventos de integração sem credenciais;
- IDs de correlação/request IDs.

### 15.3 Níveis

- `trace`: detalhes extremos, apenas desenvolvimento;
- `debug`: fluxo técnico;
- `info`: eventos normais;
- `warn`: comportamento recuperável inesperado;
- `error`: falha de operação;
- `fatal`: falha que impede o aplicativo de continuar.

### 15.4 Segurança dos logs

Nunca registrar:

- chave do LivePix;
- payload integral sensível de doações;
- headers de autenticação;
- dados privados desnecessários;
- caminhos ou informações que não sejam úteis para diagnóstico.

Logs deverão possuir rotação e limite de tamanho.

---

## 16. Scripts raiz e experiência de desenvolvimento

O `package.json` raiz deve coordenar frontend, backend e desktop com `concurrently`.

### 16.1 Scripts esperados

```json
{
  "scripts": {
    "dev": "concurrently ...",
    "dev:frontend": "...",
    "dev:backend": "...",
    "dev:desktop": "...",
    "debug": "...",
    "test": "concurrently ...",
    "test:frontend": "...",
    "test:backend": "...",
    "test:e2e": "...",
    "test:coverage": "...",
    "lint": "...",
    "typecheck": "...",
    "build": "...",
    "prod": "...",
    "release": "..."
  }
}
```

Os comandos reais serão definidos conforme o bundler, runner do Electron e ferramenta de empacotamento escolhidos.

### 16.2 Semântica

- `dev`: inicia backend, frontend e Electron com hot reload.
- `debug`: inicia os três com logs detalhados e DevTools.
- `test`: roda testes de frontend e backend juntos.
- `test:e2e`: executa fluxos completos em ambiente isolado.
- `test:coverage`: gera cobertura consolidada.
- `lint`: valida padrões de código.
- `typecheck`: verifica todos os projetos TypeScript sem emitir build.
- `build`: gera artefatos de frontend, backend e desktop.
- `prod`: executa localmente a versão compilada.
- `release`: valida, versiona, empacota e publica uma release autorizada.

### 16.3 Regras para scripts

- processos devem encerrar juntos quando um serviço crítico falhar;
- logs devem possuir nomes e cores distintos;
- não usar portas fixas conflitantes quando uma porta dinâmica resolver;
- testes não devem acessar o banco real do usuário;
- release deve falhar se lint, types, testes ou build falharem;
- credenciais de publicação e, quando adotadas, de assinatura devem existir somente no ambiente seguro da CI.

---

## 17. Estratégia de testes

### 17.1 TDD

O fluxo recomendado para cada caso de uso:

1. escrever um teste que descreve o comportamento;
2. confirmar a falha pelo motivo esperado;
3. implementar o mínimo necessário;
4. fazer o teste passar;
5. refatorar mantendo os testes verdes;
6. adicionar cenários de erro e borda.

### 17.2 Pirâmide de testes

#### Unitários

Foco em regras puras e entidades:

- normalização da lista de participantes;
- política de duplicatas;
- cálculo de tickets;
- geração de bracket;
- progressão de vencedores;
- invalidação de resultados descendentes;
- capacidade de times;
- reordenação de cards;
- comparação de versões.

#### Integração

Foco em múltiplas camadas:

- services com repositories SQLite reais em banco temporário;
- migrações;
- transações;
- controllers com validação Zod;
- armazenamento seguro por adapter mockado;
- eventos idempotentes do LivePix no futuro.

#### Frontend/componentes

- estados vazios;
- criação e edição de cards;
- drag and drop;
- importação e prévia de nomes;
- renderização do bracket;
- modal de atualização;
- sincronização da janela de configurações.

#### E2E

Fluxos completos:

1. criar workspace, colunas e mover card;
2. reiniciar o aplicativo e verificar persistência;
3. criar torneio individual e definir campeão;
4. criar times, mover integrantes e gerar bracket;
5. importar nomes e concluir roleta;
6. concluir case opening e verificar vencedor salvo;
7. abrir configurações em segunda janela e alterar tema;
8. simular release nova e pular versão;
9. simular atualização com erro e continuar usando o app;
10. executar migração sobre uma cópia de banco de versão anterior.

### 17.3 Bancos de teste

- banco em memória para alguns unitários/integrados simples;
- arquivo temporário por suíte para validar WAL, migrações e reinicialização;
- diretório de usuário falso no E2E;
- limpeza automática após os testes;
- proibição explícita de apontar testes para o banco de produção.

### 17.4 Cobertura

Cobertura é um indicador, não o objetivo final. Regras de negócio críticas devem possuir cobertura alta e cenários semânticos claros. Evitar testes que apenas executam linhas sem verificar comportamento.

---

## 18. CI/CD

### 18.1 Pull requests e pushes

Pipeline de validação:

1. instalar dependências com lockfile;
2. validar formatação;
3. executar lint;
4. executar typecheck;
5. executar testes de frontend;
6. executar testes de backend;
7. executar testes de integração;
8. gerar build;
9. executar E2E compatível com o ambiente;
10. publicar relatório de cobertura e artefatos de diagnóstico.

### 18.2 Matriz de sistemas

No início, Windows é obrigatório. Linux pode ser usado para validações rápidas, mas builds do Electron devem ser testados no sistema correspondente. macOS exigirá runner e assinatura próprios quando entrar no escopo.

### 18.3 Release

Uma tag semântica, por exemplo `v0.1.0`, deverá disparar:

1. validação completa;
2. geração do changelog;
3. build de produção;
4. empacotamento do instalador;
5. assinatura opcional quando futuramente configurada;
6. geração de checksums;
7. publicação da release;
8. upload dos arquivos necessários ao auto updater;
9. smoke test do pacote gerado.

### 18.4 Versionamento

Usar Semantic Versioning:

- `MAJOR`: alteração incompatível;
- `MINOR`: nova funcionalidade compatível;
- `PATCH`: correção compatível.

Durante o período `0.x`, manter changelogs claros porque mudanças estruturais ainda serão frequentes.

### 18.5 Proteções

- nenhuma release a partir de uma árvore suja;
- nenhuma publicação sem testes verdes;
- permissões mínimas no workflow;
- secrets somente no provedor de CI;
- dependências fixadas por lockfile;
- revisão de atualizações de dependências críticas;
- artefatos e checksums preservados.

---

## 19. Segurança do Electron

Configurações mínimas:

- `contextIsolation: true`;
- `nodeIntegration: false` no renderer;
- sandbox quando compatível;
- preload com API mínima e tipada;
- validação Zod em todo payload IPC;
- Content Security Policy;
- bloqueio de navegação inesperada;
- bloqueio de criação arbitrária de janelas;
- abertura de links externos somente após validação;
- backend local ligado apenas a loopback;
- token efêmero ou outra proteção se a API local puder ser acessada por processos externos;
- nenhuma credencial exposta ao frontend;
- dependências auditadas.

Entradas de usuário exibidas na roleta, times e cards devem ser tratadas como texto, nunca como HTML confiável.

---

## 20. Performance e confiabilidade

### 20.1 Metas iniciais

- inicialização rápida em máquinas comuns;
- interface a 60 FPS nas animações quando possível;
- drag and drop sem gravação excessiva;
- carregamento incremental para históricos grandes;
- operações de banco fora do caminho crítico da animação;
- recuperação segura após encerramento inesperado.

### 20.2 Animações de sorteio

- resultado independente do frame rate;
- uso de transformações adequadas para GPU;
- quantidade visual de itens limitada ou virtualizada;
- na operaÃ§Ã£o de live, giveaway e torneio, manter no mÃ¡ximo 50 participantes/mensagens montados por janela; o conjunto completo permanece no backend para sorteio, auditoria e persistÃªncia;
- reprodução determinística do destino final;
- opção de reduzir movimento;
- sons desacoplados da lógica de seleção.

### 20.3 Backups

- backup automático antes de migração;
- retenção limitada dos últimos backups;
- restauração documentada;
- opção futura de exportar dados pelo aplicativo;
- nunca sobrescrever o único banco válido durante uma recuperação.

---

## 21. Integrações externas orientadas a capacidades

### 21.1 Núcleo reutilizável

O backend terá um módulo de integrações independente de Games, Giveaway e TODO. Cada adapter
declarará capacidades reais, como leitura de chat, escrita de chat e identidade de usuário. Chat e
pagamentos usam contratos distintos, embora compartilhem conexão, cofre, logs e diagnóstico.

Eventos de chat serão normalizados com:

- `provider`, `externalEventId`, `channelId` e timestamp;
- `providerUserId` estável, handle, nome e avatar mutáveis;
- mensagem tratada como texto não confiável;
- metadados opcionais somente quando a capacidade existir.

O identificador canônico de uma pessoa externa será `provider + providerUserId`, nunca apenas o
handle. Tokens e refresh tokens ficam exclusivamente no cofre seguro do sistema operacional.

### 21.2 Fontes de participantes por chat

Twitch, YouTube e Kick poderão alimentar Giveaway e Games através de regras persistidas:

- qualquer mensagem, mensagem exata, prefixo ou texto contido;
- janela de coleta, pausa e retomada;
- uma entrada por identidade ou múltiplos tickets conforme configuração;
- filtros por broadcaster, bot, moderador ou membro quando suportados;
- preservação de participantes após desconexão e reinício.

Entrada manual continua obrigatoriamente disponível e independente de rede.

### 21.3 Chat focado

Após um vencedor de Giveaway ou uma equipe campeã, um painel poderá mostrar somente as mensagens
das identidades correspondentes. O histórico local será limitado por retenção e indexado por
`provider + channelId + providerUserId`. Respostas somente serão habilitadas quando o adapter
declarar `ChatWriter` e a autorização possuir os escopos necessários.

### 21.4 Providers de chat aprovados

- Twitch via APIs oficiais e EventSub/WebSocket;
- YouTube Live Chat via APIs oficiais, respeitando quota e duração da transmissão;
- Kick somente através de APIs oficiais disponíveis ao aplicativo, sem endpoints privados.

Cada provider deve mostrar capacidades indisponíveis, revogação, quota, desconexão e erro de forma
acionável. OAuth de desktop usa browser do sistema, proteção de estado e PKCE quando suportado.

### 21.5 Fora do escopo desta fase

Bots, canvas visual, gateways de pagamento e LivePix não fazem parte das batches de chat. A
arquitetura preserva pontos de extensão, mas não implementa essas features antecipadamente.

### 21.6 LivePix — arquitetura futura

> A implementação desta arquitetura foi detalhada na Batch 27. O provider deve permanecer isolado em
> `apps/backend/src/modules/payments/providers/livepix/`, reutilizar o transporte opcional da Batch 26
> e manter o núcleo manual independente do gateway.

#### 21.6.1 Adapter do provedor

O domínio não deve depender diretamente do LivePix. Criar uma interface conceitual:

```ts
interface ContributionProvider {
  connect(): Promise<void>
  disconnect(): Promise<void>
  validateCredentials(): Promise<boolean>
  subscribe(handler: ContributionHandler): Promise<Unsubscribe>
}
```

O adapter `LivePixContributionProvider` traduzirá dados externos para um contrato interno:

```ts
type ContributionReceived = {
  eventId: string
  provider: 'livepix'
  donorDisplayName: string | null
  title: string | null
  amountInCents: number
  currency: string
  occurredAt: string
}
```

#### 21.6.2 Pipeline de evento

```text
Evento externo
→ validação Zod
→ deduplicação por eventId
→ persistência do evento bruto necessário
→ normalização
→ aplicação das regras da campanha
→ fila/aprovação
→ inclusão no torneio ou giveaway
→ registro do resultado do processamento
```

#### 21.6.3 Requisitos

- idempotência;
- conexão explícita usando a URL de notificações configurada no aplicativo LivePix;
- tolerância a eventos fora de ordem;
- estado de conexão visível;
- fila de eventos com falha;
- reprocessamento seguro;
- logs sem segredos;
- política clara de privacidade e retenção.

---

## 22. Roadmap de implementação

### Fase 0 — Fundação

- definir monorepo/workspaces;
- configurar TypeScript compartilhado;
- configurar lint e formatação;
- configurar testes;
- criar Electron, Vue e backend mínimos;
- integrar Renderizer;
- definir comunicação local;
- configurar SQLite e migrações;
- implementar logs e modo debug;
- criar CI inicial.

**Saída:** app abre, frontend conversa com backend, configurações abrem em outra janela e um health check passa.

### Fase 1 — TODO

- workspaces;
- colunas;
- cards;
- drag and drop;
- reordenação persistente;
- estados vazios e erros;
- testes unitários, integração e E2E.

**Saída:** primeiro módulo realmente utilizável e persistente.

### Fase 2 — Giveaway manual

- parser de nomes;
- prévia;
- duplicatas/tickets;
- criação de giveaway;
- seleção criptograficamente adequada;
- roleta;
- case opening;
- histórico;
- recuperação de rodada interrompida.

**Saída:** ferramenta memorável pronta para teste em uma live real.

### Fase 3 — Games manual

- torneio individual;
- times e slots;
- drag and drop de integrantes;
- geração de bracket;
- progressão de resultados;
- campeão;
- histórico e invalidação de resultados.

**Saída:** torneio completo de eliminação simples.

### Fase 4 — Produto distribuível

- configurações finais;
- auto update;
- instalador;
- checksum obrigatório e assinatura opcional futura;
- CI/CD de release;
- backup e migrações;
- telemetria somente se futura, transparente e opt-in;
- teste com streamer real.

**Saída:** primeira release pública confiável.

### Fase 5 — Integrações de chat

- núcleo orientado a capacidades e eventos normalizados;
- Twitch Chat;
- fontes de participantes para Giveaway e Games;
- chat focado em vencedor e equipe campeã;
- YouTube Live Chat;
- Kick Chat conforme APIs oficiais disponíveis;
- segurança, reconexão, retenção e validação no Windows.

**Saída:** participantes entram por chats oficiais sem acoplar os módulos e sem remover o modo manual.

### Fase 6 — LivePix

- validar documentação e acesso do provedor;
- armazenamento seguro de credenciais;
- adapter;
- deduplicação;
- campanha automática para giveaway;
- preenchimento automático de times;
- tratamento de reconexão e falhas;
- testes com eventos simulados e reais controlados.

**Saída:** primeira automação externa sem alterar o núcleo manual.

### Fase 7 — OBS e expansão

- overlays transparentes;
- Browser Source local;
- eventos em tempo real;
- editor de tema;
- goal bars;
- sons;
- hotkeys;
- novas integrações e ferramentas.

---

## 23. Ordem recomendada do primeiro vertical slice

Antes de construir módulos inteiros em camadas isoladas, implementar um fluxo vertical pequeno:

1. abrir o StreamKit;
2. criar um workspace pelo Vue;
3. validar o payload com Zod;
4. executar `CreateWorkspaceService`;
5. persistir via repository SQLite;
6. devolver o contrato tipado;
7. atualizar a store Pinia;
8. fechar e reabrir o aplicativo;
9. listar o workspace salvo;
10. executar o mesmo fluxo em E2E.

Esse slice valida de uma vez Electron, frontend, backend, contratos, banco, testes e empacotamento.

---

## 24. Definition of Done

Uma funcionalidade só está pronta quando:

- comportamento e critérios de aceitação estão definidos;
- schemas Zod existem;
- regras estão em classes/casos de uso com responsabilidade clara;
- acesso ao banco ocorre por repository;
- erros esperados possuem códigos estáveis;
- testes relevantes estão verdes;
- E2E cobre o fluxo crítico quando aplicável;
- loading, vazio, sucesso e erro foram tratados;
- persistência após reinício foi validada;
- logs não expõem dados sensíveis;
- documentação Scalar foi atualizada;
- lint e typecheck passam;
- build de produção funciona;
- interface foi testada no Windows;
- não há regressão conhecida em outras janelas do Renderizer.

---

## 25. Decisões pendentes

Estas decisões devem ser registradas antes ou durante a Fase 0:

1. Framework do backend Node.js — a estrutura descrita é compatível com NestJS, mas a escolha deve ser explícita.
2. Bundler do frontend e do Electron.
3. Ferramenta de empacotamento e auto update.
4. Biblioteca/driver SQLite e estratégia de migrations.
5. Biblioteca de drag and drop compatível com Vue e múltiplas janelas.
6. Canal de comunicação: HTTP + eventos, IPC ou combinação.
7. Porta dinâmica e mecanismo de autenticação da API local.
8. Sistemas suportados no primeiro release — recomendado começar oficialmente por Windows.
9. Quantidades não potências de dois e BYEs no torneio inicial.
10. Limites máximos de cards, participantes, equipes e tickets.
11. Política de licenciamento e distribuição.
12. Repositório público ou privado.
13. Canal stable/beta e estratégia de assinatura de releases.
14. Grau de auditoria que será mostrado ao público durante o sorteio.

Cada decisão relevante deve ser registrada em `docs/adr/` como um **Architecture Decision Record** curto: contexto, opções, decisão e consequências.

### 25.1 Decisões fechadas na Batch 0

As decisões acima foram fechadas em 12 de agosto de 2026 e registradas nos ADRs 0001 a 0009:

- NestJS com adapter Fastify;
- Vite/electron-vite;
- electron-builder, NSIS e electron-updater;
- better-sqlite3 com Drizzle ORM/Kit;
- Pragmatic Drag and Drop com alternativa acessível;
- HTTP local em porta dinâmica, SSE, IPC nativo e token efêmero por sessão;
- Windows 10 22H2 e Windows 11 x64 como suporte inicial;
- brackets de 4, 8, 16 e 32, sem BYEs no MVP;
- limites iniciais documentados no ADR 0006;
- PolyForm Noncommercial License 1.0.0, código source-available público e binários via GitHub Releases;
- canais stable/beta, checksum obrigatório e releases Windows iniciais sem assinatura conforme ADR 0012;
- auditoria pública de sorteio com metadados e hash do snapshot;
- Renderizer como framework obrigatório para superfícies multiwindow com um único runtime Vue.

---

## 26. Riscos e mitigação

| Risco                             | Impacto                 | Mitigação                                                  |
| --------------------------------- | ----------------------- | ---------------------------------------------------------- |
| Escopo grande demais para o MVP   | atraso e abandono       | separar manual, LivePix e OBS em fases                     |
| Bracket complexo                  | bugs de progressão      | começar com eliminação simples e tamanhos definidos        |
| Drag and drop inconsistente       | perda/duplicação visual | operações atômicas, rollback e alternativa por botões      |
| Resultado parecer manipulado      | perda de confiança      | selecionar antes da animação e manter histórico            |
| Banco corrompido/migração falhar  | perda de dados          | WAL, transações e backup antes de migration                |
| Credencial exposta                | incidente de segurança  | cofre do sistema e isolamento do renderer                  |
| Auto update comprometido          | risco crítico           | checksums, metadados íntegros e releases protegidas        |
| API externa instável              | automação indisponível  | modo manual sempre funcional e adapter isolado             |
| Animação pesada                   | travamento durante live | profiling, virtualização e redução de efeitos              |
| Arquitetura excessiva cedo demais | baixa velocidade        | casos de uso claros, interfaces apenas em fronteiras reais |

---

## 27. Princípios de implementação

- Não colocar regra de negócio em componentes Vue.
- Não executar SQL em controllers ou services.
- Não usar tipos TypeScript como substitutos de validação em runtime.
- Não transformar `shared`, `common`, `helpers` ou `utils` em depósitos genéricos.
- Não criar abstração sem uma fronteira ou variação real.
- Não armazenar secrets no SQLite ou Pinia persistido.
- Não permitir que a animação decida o vencedor.
- Não depender do LivePix para que Games e Giveaway funcionem.
- Não usar o banco real em testes.
- Não publicar release sem build reproduzível e testes verdes.
- Preferir nomes de classes e métodos baseados em casos de uso concretos.
- Manter módulos independentes, mas evitar microserviços prematuros.
- Tratar dados locais do usuário como valiosos desde a primeira versão.

---

## 28. Visão futura

Depois do MVP, o StreamKit poderá evoluir para uma plataforma completa de operação de lives:

- overlays para OBS;
- metas e goal bars;
- alertas de contribuições;
- ranking de apoiadores;
- bingo e enquetes;
- gerador de equipes;
- hotkeys e Stream Deck;
- templates e temas;
- plugins;
- integração com Twitch, YouTube e outras plataformas;
- sincronização opcional em nuvem;
- compartilhamento de presets;
- marketplace de ferramentas visuais.

Essa expansão deve preservar a ideia central: **uma aplicação desktop rápida, confiável e modular que concentra as ferramentas de que um streamer realmente precisa.**

---

## 29. Resumo executivo do plano

O StreamKit será construído como um monólito modular local, com Electron e Renderizer no desktop, Vue/Pinia/SCSS no frontend e Node.js/TypeScript/SQLite no backend. O primeiro objetivo não será integrar serviços externos, mas provar três ferramentas manuais completas e persistentes: Kanban, Giveaway e Tournament Bracket.

O Giveaway será o principal elemento visual e demonstrável, especialmente o modo case opening. O Tournament Bracket será limitado inicialmente à eliminação simples. O TODO validará cedo a fundação CRUD, drag and drop e persistência.

LivePix entrará posteriormente por adapters e fontes de participantes, mantendo todo o núcleo independente. A aplicação terá auto update, debug, documentação Scalar, validação Zod, testes orientados por TDD/E2E, armazenamento seguro de credenciais e CI/CD desde a fundação.

O primeiro marco real é simples: **um streamer instalar, usar o StreamKit em uma live, fechar o aplicativo e voltar depois com todo o seu trabalho preservado.**
