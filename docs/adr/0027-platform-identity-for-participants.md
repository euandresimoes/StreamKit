# ADR 0027 — Identidade de plataforma para participantes

**Status:** aceito  
**Data:** 2026-08-14  
**Especificação:** seções 6.10–6.11, 7.2, 7.7, 8.1 e 25

## Contexto

Participantes manuais, capturados pelo chat e futuramente recebidos do LivePix precisam abrir o
mesmo chat privado quando vencerem. Nome de exibição não é uma identidade confiável e não deve
ser usado para procurar mensagens entre plataformas.

## Decisão

O participante será associado à live global selecionada e a uma identidade específica da
plataforma:

- Twitch e Kick usam o handle normalizado como identidade inicial;
- YouTube usa exclusivamente o `channelId`;
- quando uma mensagem compatível chegar, o `providerUserId` oficial será persistido e passará a
  ser a identidade preferencial;
- o chat focado consulta o identificador oficial e, enquanto o vínculo ainda estiver pendente,
  usa a identidade inicial exata no mesmo provider/canal;
- LivePix não cria uma identidade paralela: sua contribuição será vinculada à plataforma global
  selecionada e ao identificador informado pelo streamer/doador.

Não haverá correspondência aproximada nem fallback entre plataformas. Um participante manual sem
mensagem recebida permanece válido no sorteio/torneio, mas seu chat privado fica vazio até a
identidade aparecer no fluxo conectado.

## Consequências

- O cadastro manual precisa receber provider e canal da live global selecionada.
- Capturas automáticas devem vincular participantes pendentes antes de criar duplicatas.
- A identidade do YouTube não deve ser derivada de `displayName`.
- A seleção global reduz a possibilidade de regras e chats apontarem para canais diferentes.
- A integração LivePix continua futura; esta decisão apenas define o contrato de identidade.
