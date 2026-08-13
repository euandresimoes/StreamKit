# Release do StreamKit

Releases Windows são disparadas exclusivamente por tags SemVer (`vMAJOR.MINOR.PATCH` ou pre-release). Tags com sufixo publicam no canal `beta`; tags sem sufixo usam `stable`.

O workflow exige lockfile congelado, gate completo, instalador NSIS, metadados do `electron-updater`, checksum SHA-256 adicional e smoke test estrutural. O updater valida o SHA-512 declarado nos metadados gerados junto com o instalador. As releases Windows iniciais não possuem assinatura Authenticode e podem exibir SmartScreen/editor desconhecido; a página da release deve informar isso e publicar o SHA-256 para conferência.

Antes de criar uma tag:

1. Atualizar `CHANGELOG.md` com resumo, novidades, correções, breaking changes e instruções.
2. Confirmar árvore Git limpa e CI da `main` verde.
3. Executar `pnpm validate` e `pnpm --filter @streamkit/desktop package:win` no Windows.
4. Executar `pnpm --filter @streamkit/desktop smoke:artifact`.
5. Obter autorização explícita para publicar.

Nunca forneça token privado ao renderer. A publicação usa apenas o `GITHUB_TOKEN` efêmero do runner. Não oriente o usuário a desativar o SmartScreen globalmente; ele deve baixar apenas da release oficial e conferir o checksum publicado.

Se uma migração falhar, o banco permanece transacionalmente na versão anterior. Migrações destrutivas exigem backup prévio; restauração sempre grava em um destino novo e validado.
