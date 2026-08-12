# Dados, backup e recuperação

O SQLite é a fonte persistente de verdade do StreamKit. TODOs, torneios, partidas,
giveaways, configurações não sensíveis e seus históricos ficam no arquivo
`<userData>/data/streamkit.db`; fechar o aplicativo não descarta esses dados. Pinia e
memória mantêm apenas estado temporário da interface.

O diretório raiz é sempre obtido por `app.getPath('userData')`. O aplicativo cria
`data`, `logs`, `backups` e `cache` abaixo desse caminho. Credenciais e tokens nunca
são gravados no SQLite.

## Backups automáticos

Antes de uma migration classificada como destrutiva, o StreamKit conclui o checkpoint
do WAL e cria uma cópia em `<userData>/backups`. São mantidas as cinco cópias
automáticas mais recentes. Essa retenção não afeta os dados normais do usuário e não
transforma backups em versões editáveis.

## Recuperação segura

Uma cópia só pode ser restaurada após passar pelo `PRAGMA quick_check`. A recuperação
sempre grava em um caminho novo e falha se o destino já existir; ela nunca sobrescreve
o único banco disponível. A troca do banco principal deve ocorrer apenas depois de:

1. fechar completamente o StreamKit;
2. preservar o banco principal e seus arquivos `-wal`/`-shm`, se existirem;
3. restaurar a cópia em um caminho novo;
4. abrir e validar migrations, integridade e dados no arquivo restaurado;
5. substituir o banco principal somente após confirmação explícita do usuário.

Em caso de falha de migration, a transação é revertida e a versão não é registrada em
`schema_migrations`. Não apague manualmente o banco principal durante a recuperação.
