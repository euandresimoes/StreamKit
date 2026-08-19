# Evidências de validação da Batch 11

**Data:** 2026-08-12

**Plataforma:** Windows 11 x64

**Artefato:** `Streamlet-0.0.0-x64-setup.exe`

## Instalador e integridade

- Empacotamento NSIS concluído sem certificado, conforme ADR 0012.
- Instalação silenciosa em diretório isolado concluída.
- Aplicativo empacotado permaneceu aberto com `AppData` de teste, sem acessar dados reais.
- Desinstalação silenciosa concluída.
- `latest.yml`, blockmap, SHA-512 do updater e SHA-256 do artefato validados.
- SHA-256 definitivo: `2ea875c2e3ed346e22ce7ae02b728b3f06ecf55489ace393921585f8d7e8e79a`.

## Dez critérios de sucesso do MVP

|   # | Critério                                   | Evidência automatizada no Windows                |
| --: | ------------------------------------------ | ------------------------------------------------ |
|   1 | Instalar e abrir                           | Smoke real do instalador com `AppData` isolado   |
|   2 | Criar e reutilizar board                   | E2E de workspace, colunas e cards após reinício  |
|   3 | Criar torneio individual ou em times       | E2E dos dois modos                               |
|   4 | Reorganizar participantes                  | E2E de membro entre times e testes de UI/teclado |
|   5 | Registrar resultados e obter campeão       | E2E de brackets individual e em times            |
|   6 | Importar nomes                             | E2E dos fluxos de giveaway com importação        |
|   7 | Executar os dois sorteios                  | E2E para roleta e abertura de caixa              |
|   8 | Fechar e reabrir sem perder dados          | Reinício exercitado nos domínios persistentes    |
|   9 | Configurações em outra janela sincronizada | E2E com dois clientes e reinício                 |
|  10 | Atualizar ou pular versão                  | Testes do gerenciador e UI de update             |

## Migração, backup e restauração

Não existe pacote público anterior. A compatibilidade anterior é representada por banco SQLite
na versão de schema anterior na suíte de integração. Os testes abrem esse banco com as migrations
atuais, comprovam backup antes de migration destrutiva, retenção, integridade e restauração para
novo destino. O upgrade entre instaladores publicados será repetido na Batch 14 quando existir
uma versão anterior real.

## Validação humana

A validação automatizada não substitui a aprovação de uso. A Batch 11 foi reaberta para o
proprietário testar os fluxos manuais, registrar problemas e preferências de UI e validar novamente
o instalador após os ajustes. Um teste adicional com streamer externo continua previsto na Batch 14.
