# ADR 0012 — Releases Windows iniciais sem assinatura Authenticode

**Status:** aceita  
**Data:** 2026-08-12  
**Responsáveis:** André Simões  
**Especificação:** seções 14, 18, 24, 25 e 26  
**Batches:** 11 e 14  
**Substitui:** ADR 0008 quanto à exigência de assinatura para releases públicas

## Contexto

Um certificado Authenticode possui custo recorrente que não se justifica antes de o produto
ser validado. Sem ele, o Windows pode mostrar SmartScreen e identificar o editor como
desconhecido. Isso reduz confiança e conversão, mas não impede tecnicamente a instalação
quando o usuário aceita conscientemente o aviso.

## Opções consideradas

- Adquirir um certificado antes da primeira release pública.
- Adiar toda distribuição pública até existir certificado.
- Publicar inicialmente sem assinatura, documentando o aviso e mantendo controles de
  integridade e origem.

## Decisão

- Releases Windows iniciais poderão ser publicadas sem assinatura Authenticode.
- A página da release deve avisar que o Windows pode exibir SmartScreen/editor desconhecido
  e explicar como conferir o SHA-256 antes da instalação.
- SHA-256 publicado, SHA-512 dos metadados do updater, pipeline protegido e artefatos gerados
  juntos continuam obrigatórios.
- A CI não exigirá secrets de certificado e não enviará secrets ao renderer.
- Assinatura poderá ser adotada futuramente quando custo e tração justificarem, mediante
  revisão desta decisão e smoke test do artefato assinado.

## Consequências

- A primeira instalação terá mais atrito e alguns usuários poderão recusá-la.
- Checksums comprovam integridade em relação à release oficial, mas não substituem identidade
  criptográfica do editor nem eliminam todos os riscos de supply chain.
- O projeto deve comunicar o risco honestamente e nunca instruir o usuário a desativar
  proteções globais do Windows.

## Validação e reversão

O smoke test deve instalar o mesmo executável cujo checksum foi publicado e confirmar o aviso
esperado em Windows. A adoção futura de certificado exige reativar assinatura na CI, validar
Authenticode e atualizar a documentação antes da publicação.
