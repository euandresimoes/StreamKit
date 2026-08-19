# ADR 0025 — Live Control com players oficiais

## Contexto

A Batch 25 precisa oferecer acompanhamento operacional de uma transmissão sem transformar o Streamlet em compositor, capturador ou encoder. O aplicativo já possui conexões e adapters oficiais de chat para Twitch e YouTube, além de uma declaração explícita de indisponibilidade oficial da Kick no modo desktop local.

## Decisão

Live Control usa a API HTTP local para consultar conexões, status e chat. O renderer recebe apenas contratos validados e dados não sensíveis. O preview usa iframe do player oficial do provider: Twitch exige `parent` derivado do host do renderer; YouTube só é renderizado quando o provider retornar um `videoId`; Kick e canais sem identificador oficial exibem fallback acessível. Não haverá captura da janela do OBS, composição, encoding nem OBS WebSocket nesta batch.

## Consequências

O preview pode ficar indisponível quando a conexão não fornecer identificador oficial suficiente, sem simular um player. A seleção e o chat continuam capability-driven. Credenciais permanecem no backend/cofre e não são persistidas no frontend.
