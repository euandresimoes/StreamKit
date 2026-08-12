# ADR 0011 — Electron e alternância do módulo SQLite nativo

- **Status:** aceita
- **Data:** 2026-08-12
- **Referências:** especificação §§ 19, 20.1 e 24; Batches 2 e 3.

## Contexto

`better-sqlite3` precisa de binários distintos para o Node.js usado nos testes e para o ABI do Electron. Electron 43 não possui prebuild compatível com a versão fixada do driver no Windows e exigiria uma toolchain Visual Studio local. Electron 36 possui prebuild, mas acumula vulnerabilidades corrigidas em linhas posteriores.

## Decisão

- Fixar Electron `39.8.10`, primeira versão da linha testada que combina prebuild Windows disponível para `better-sqlite3@12.11.1` e correções dos advisories conhecidos do runtime.
- Antes de `dev` e `prod`, instalar explicitamente o prebuild do ABI Electron.
- Ao encerrar esses comandos, restaurar o prebuild Node com `postdev`/`postprod`.
- Manter Electron como dependência de desenvolvimento; ele e seu instalador não são copiados como dependências JavaScript do renderer.

## Risco residual

`pnpm audit` reporta `GHSA-jmr9-qjv8-65gv` em `extract-zip@2.0.1`, utilizado pelo script de instalação do pacote Electron. O advisory não oferece versão corrigida. A exposição fica limitada à instalação de artefatos oficiais fixados pelo lockfile; o pacote não participa da navegação, extração de conteúdo do usuário ou runtime distribuído. Reavaliar e remover a exceção assim que Electron substituir a dependência ou houver correção upstream.

## Consequências

- O smoke test deve abrir o Electron e, após encerramento normal, os testes de integração Node devem continuar funcionando.
- Atualizações futuras de Electron e `better-sqlite3` precisam comprovar disponibilidade do prebuild, auditoria e ambos os ABIs antes do merge.
