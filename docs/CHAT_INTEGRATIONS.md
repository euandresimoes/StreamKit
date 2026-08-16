# Integrações de chat

## Dados locais e privacidade

O StreamKit guarda conexões sem credenciais no SQLite. Access tokens e refresh tokens ficam somente
no cofre seguro do sistema operacional. Mensagens necessárias ao chat focado são mantidas localmente
por no máximo 24 horas e o buffer global é limitado a 10.000 mensagens. Avatares retornados pelos
providers são baixados com limite de tamanho, convertidos em `data:` base64 e persistidos uma única
vez por identidade nesse buffer, evitando dependência futura da URL remota e repetição por mensagem.
Excluir uma credencial não remove participantes ou resultados já persistidos.

## Twitch

O Client ID do aplicativo Twitch é configurado pelo usuário no guia de integração do StreamKit.
Tokens e credenciais do usuário nunca devem ser embutidos. A conexão
usa Device Authorization, EventSub WebSocket e os escopos mínimos de leitura/escrita de chat.

## YouTube

1. Crie um projeto no Google Cloud, habilite **YouTube Data API v3** e configure uma credencial OAuth
   do tipo aplicativo para computador.
2. Configure `STREAMKIT_YOUTUBE_CLIENT_ID` apenas como fallback de desenvolvimento. No desktop,
   o Client ID é configurado pelo usuário no guia. Para clientes do Google que
   exigem autenticação na troca do code, defina também `STREAMKIT_YOUTUBE_CLIENT_SECRET` com o valor
   baixado no JSON do cliente desktop. Ele permanece somente no processo principal e nunca é enviado
   ao renderer, SQLite ou logs.
3. Em Configurações > Integrações, conecte o YouTube, autorize no navegador e escolha uma transmissão
   ativa pelo título. O usuário não precisa copiar `videoId` ou `liveChatId`.

A autorização usa PKCE, `state` aleatório e callback loopback IPv4 em porta efêmera. O StreamKit pede
acesso offline e guarda o refresh token somente no cofre. A API oficial oferece `streamList` por
server-streaming; o runtime desktop atual não inclui transporte gRPC, portanto o adapter usa o
fallback oficial `liveChatMessages.list`, respeitando `pollingIntervalMillis`. Erros de quota,
permissão e chat encerrado aparecem no card da conexão. A escrita só fica disponível com autorização,
capacidade `chat.write`, conexão ativa e live chat ainda aberto.

Referências oficiais consultadas em 2026-08-13:

- <https://developers.google.com/identity/protocols/oauth2/native-app>
- <https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/list>
- <https://developers.google.com/youtube/v3/live/docs/liveChatMessages/streamList>
- <https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list>
- <https://developers.google.com/youtube/v3/live/docs/liveChatMessages/insert>

## Diagnóstico

Em **Configurações > Diagnóstico**, use **Exportar diagnóstico** para gerar um JSON local com o
estado sanitizado do aplicativo e as linhas recentes de log. O arquivo não inclui access tokens,
refresh tokens nem cabeçalhos de autorização. Revise-o antes de compartilhar, pois nomes locais de
recursos e códigos operacionais ainda podem ser relevantes para a privacidade do streamer.

Depois de perda de rede ou suspensão do Windows, o StreamKit reinicia as conexões que estavam ativas.
Se uma conexão continuar com erro, desconecte e autorize o provider novamente. TODO, sorteios e
campeonatos manuais não dependem dos providers e permanecem disponíveis offline.

- `INTEGRATION_AUTH_REVOKED`: reconecte o provider.
- `YOUTUBE_QUOTA_OR_PERMISSION_ERROR`: verifique a quota, API habilitada e escopo autorizado.
- `YOUTUBE_CHAT_ENDED`: selecione outra transmissão ativa.
- `INTEGRATION_CONNECTION_UNAVAILABLE`: inicie/reconecte o chat antes de responder.

## Kick

A API pública atual da Kick oferece OAuth 2.1 com PKCE, subscriptions oficiais por webhook HTTPS,
envio e exclusão de mensagens, além de endpoints de moderação. O StreamKit utiliza o túnel HTTPS
temporário local para cumprir o requisito de webhook público sem criar um backend hospedado.

O `client_secret` é informado pelo usuário no guia da Kick e armazenado apenas no cofre seguro do
sistema operacional. Nenhum endpoint privado, engenharia reversa ou transporte não documentado é
utilizado.

Quando o túnel estiver indisponível, a conexão ficará degradada e as capacidades dependentes de
eventos externos não serão anunciadas como disponíveis.

Referências oficiais consultadas:

- <https://docs.kick.com/getting-started/generating-tokens-oauth2-flow>
- <https://docs.kick.com/events/subscribe-to-events>
- <https://docs.kick.com/events/event-types>
- <https://docs.kick.com/apis/chat>
