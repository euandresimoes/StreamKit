# ADR 0007 — Licenciamento source-available e distribuição

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 18, 25 e 28  
**Batches:** 0 e 11

## Decisão

- Licenciar o StreamKit sob PolyForm Noncommercial License 1.0.0.
- Classificar o projeto como source-available, não open-source.
- Manter o código no repositório público `https://github.com/euandresimoes/StreamKit`.
- Distribuir binários oficiais por GitHub Releases.
- Usos comerciais exigem autorização/licença separada do licensor.

## Consequências

Uso, modificação e distribuição são permitidos somente para finalidades admitidas pela licença. O texto e o `Required Notice` devem acompanhar código e distribuições.

## Validação e reversão

CI verifica a presença de `LICENSE.md` nos artefatos. Mudança de licença exige análise de contribuições e novo ADR; licenças já concedidas não são retroativamente apagadas.
