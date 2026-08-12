# Diagnóstico e segurança de configurações

O painel **Configurações → Desenvolvedor** permite abrir DevTools, visualizar as linhas recentes do log, copiar um diagnóstico e abrir a pasta local de logs. O diagnóstico contém somente versões, versão do schema, request ID e logs já submetidos à política de redaction.

Os logs usam JSON Lines, níveis `trace`, `debug`, `info`, `warn`, `error` e `fatal`, rotação por tamanho e um arquivo anterior. Tokens Bearer, headers de autorização e campos identificados como credencial, senha, segredo, token ou API key são substituídos por `[REDACTED]`.

Preferências não sensíveis ficam na tabela `app_settings`. A credencial LivePix nunca é gravada no SQLite: no aplicativo Electron ela é cifrada pelo `safeStorage` do sistema operacional e o backend expõe apenas salvar, consultar status e remover. A API nunca devolve o valor da credencial.

Em builds de desenvolvimento, a documentação Scalar está disponível automaticamente. Em builds empacotados, use `STREAMKIT_DEBUG=true` ou o argumento `--debug` para habilitar a documentação local. As rotas de Settings ficam sob `/api/v1/settings` e o diagnóstico sob `/api/v1/system/diagnostics`.
