import type { SecureCredentialRepository, SecureCredentialStatus } from '../src/main'
import { get } from 'node:http'
import { YouTubeAuthService } from '../src/modules/integrations/youtube/youtube-auth.service'
import { YouTubeBroadcastService } from '../src/modules/integrations/youtube/youtube-broadcast.service'
import {
  normalizeYouTubeChatMessage,
  YouTubeChatAdapter,
} from '../src/modules/integrations/youtube/youtube-chat.adapter'

class MemoryCredentials implements SecureCredentialRepository {
  public value: string | null = null
  public async read() {
    return this.value
  }
  public async remove() {
    this.value = null
  }
  public async save(_name: string, value: string) {
    this.value = value
  }
  public async status(): Promise<SecureCredentialStatus> {
    return { available: true, configured: this.value !== null, provider: 'memory' }
  }
}

describe('YouTube integration', () => {
  afterEach(() => jest.restoreAllMocks())

  it('creates a desktop PKCE authorization using an IPv4 loopback callback and no client secret', async () => {
    const service = new YouTubeAuthService(
      { twitchClientId: null, youtubeClientId: 'youtube-client-id', youtubeClientSecret: null },
      new MemoryCredentials(),
      { updateProviderState: jest.fn() } as never,
    )
    const flow = await service.begin()
    const url = new URL(flow.authorizationUrl)

    expect(url.hostname).toBe('accounts.google.com')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBeTruthy()
    expect(url.searchParams.get('redirect_uri')).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//)
    expect(url.searchParams.has('client_secret')).toBe(false)
    expect(url.searchParams.get('access_type')).toBe('offline')
    service.onModuleDestroy()
  })

  it('validates the loopback state and stores tokens without returning them to the renderer', async () => {
    const credentials = new MemoryCredentials()
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'private-youtube-access-token',
          expires_in: 3600,
          refresh_token: 'private-youtube-refresh-token',
          scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
        }),
        { status: 200 },
      ),
    )
    const service = new YouTubeAuthService(
      { twitchClientId: null, youtubeClientId: 'youtube-client-id', youtubeClientSecret: null },
      credentials,
      { updateProviderState: jest.fn() } as never,
    )
    const flow = await service.begin()
    const authorizationUrl = new URL(flow.authorizationUrl)
    const callback = new URL(authorizationUrl.searchParams.get('redirect_uri')!)
    callback.searchParams.set('code', 'private-authorization-code')
    callback.searchParams.set('state', authorizationUrl.searchParams.get('state')!)
    await new Promise<void>((resolve, reject) => {
      get(callback, (response) => {
        response.resume()
        response.on('end', resolve)
      }).on('error', reject)
    })
    const result = await service.poll(flow.flowId)

    expect(result.status).toBe('authorized')
    expect(JSON.stringify(result)).not.toContain('private-youtube-access-token')
    expect(credentials.value).toContain('private-youtube-refresh-token')
    const tokenBody = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(tokenBody.get('code_verifier')).toBeTruthy()
    expect(tokenBody.has('client_secret')).toBe(false)
  })

  it('authenticates the token exchange when a desktop client secret is configured', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'private-access-token',
          expires_in: 3600,
          refresh_token: 'private-refresh-token',
          scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
        }),
        { status: 200 },
      ),
    )
    const service = new YouTubeAuthService(
      {
        twitchClientId: null,
        youtubeClientId: 'youtube-client-id',
        youtubeClientSecret: 'private-desktop-client-secret',
      },
      new MemoryCredentials(),
      { updateProviderState: jest.fn() } as never,
    )
    const flow = await service.begin()
    const authorizationUrl = new URL(flow.authorizationUrl)
    const callback = new URL(authorizationUrl.searchParams.get('redirect_uri')!)
    callback.searchParams.set('code', 'private-authorization-code')
    callback.searchParams.set('state', authorizationUrl.searchParams.get('state')!)
    await new Promise<void>((resolve, reject) => {
      get(callback, (response) => {
        response.resume()
        response.on('end', resolve)
      }).on('error', reject)
    })
    expect(await service.poll(flow.flowId)).toMatchObject({ status: 'authorized' })
    const tokenBody = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(tokenBody.get('client_secret')).toBe('private-desktop-client-secret')
    expect(authorizationUrl.searchParams.has('client_secret')).toBe(false)
  })

  it('returns the safe provider error without exposing the authorization code', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'invalid_client',
          error_description: 'The OAuth client was not authenticated',
        }),
        { status: 401 },
      ),
    )
    const service = new YouTubeAuthService(
      { twitchClientId: null, youtubeClientId: 'youtube-client-id', youtubeClientSecret: null },
      new MemoryCredentials(),
      { updateProviderState: jest.fn() } as never,
    )
    const flow = await service.begin()
    const authorizationUrl = new URL(flow.authorizationUrl)
    const callback = new URL(authorizationUrl.searchParams.get('redirect_uri')!)
    callback.searchParams.set('code', 'private-authorization-code')
    callback.searchParams.set('state', authorizationUrl.searchParams.get('state')!)
    const callbackBody = await new Promise<string>((resolve, reject) => {
      get(callback, (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => (body += chunk))
        response.on('end', () => resolve(body))
      }).on('error', reject)
    })
    expect(callbackBody).toContain('invalid_client')
    expect(callbackBody).not.toContain('private-authorization-code')
    expect(await service.poll(flow.flowId)).toMatchObject({
      error: expect.stringContaining('invalid_client'),
      status: 'failed',
    })
  })

  it('normalizes stable channel identity, member and moderator roles', () => {
    expect(
      normalizeYouTubeChatMessage('live-chat-id', {
        authorDetails: {
          channelId: 'author-channel-id',
          displayName: '@andre',
          isChatModerator: true,
          isChatOwner: false,
          isChatSponsor: true,
          profileImageUrl: 'https://example.com/avatar.png',
        },
        id: 'youtube-message-id',
        snippet: {
          displayMessage: '!participar',
          publishedAt: '2026-08-13T12:00:00.000Z',
          type: 'textMessageEvent',
        },
      }),
    ).toMatchObject({
      author: { providerUserId: 'author-channel-id' },
      channelId: 'live-chat-id',
      externalEventId: 'youtube-message-id',
      roles: { isMember: true, isModerator: true },
    })
  })

  it('ignores YouTube system events that have no capturable author', () => {
    expect(
      normalizeYouTubeChatMessage('live-chat-id', {
        authorDetails: undefined,
        id: 'system-event-id',
        snippet: { type: 'messageDeletedEvent' },
      }),
    ).toBeNull()
  })

  it('maps a closed live chat to a stable terminal error code', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 403,
            errors: [{ reason: 'liveChatEnded' }],
            message: 'The live chat is no longer live.',
          },
        }),
        { status: 403 },
      ),
    )
    const adapter = new YouTubeChatAdapter(
      { getAccessToken: jest.fn().mockResolvedValue({ accessToken: 'token' }) } as never,
      { register: jest.fn(() => jest.fn()) } as never,
    )
    const session = await adapter.connect({
      channelId: 'ended-live-chat-id',
      cursor: null,
      onCursor: jest.fn(),
      onEvent: jest.fn(),
      signal: new AbortController().signal,
    })
    await expect(session.closed).rejects.toThrow('YOUTUBE_CHAT_ENDED')
  })

  it('accepts the provider polling interval and high precision timestamp', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              authorDetails: {
                channelId: 'author-id',
                displayName: '@viewer',
                isChatModerator: false,
                isChatOwner: false,
                isChatSponsor: false,
                profileImageUrl: null,
              },
              id: 'message-id',
              snippet: {
                displayMessage: '!entrar',
                publishedAt: '2026-08-13T22:09:51.123456789Z',
                type: 'textMessageEvent',
              },
            },
          ],
          nextPageToken: 'next-page',
          pollingIntervalMillis: 0,
        }),
        { status: 200 },
      ),
    )
    const adapter = new YouTubeChatAdapter(
      { getAccessToken: jest.fn().mockResolvedValue({ accessToken: 'token' }) } as never,
      { register: jest.fn(() => jest.fn()) } as never,
    )
    const abort = new AbortController()
    const onEvent = jest.fn(async () => abort.abort())
    const session = await adapter.connect({
      channelId: 'live-chat-id',
      cursor: null,
      onCursor: jest.fn(),
      onEvent,
      signal: abort.signal,
    })
    await session.closed
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ message: '!entrar', occurredAt: '2026-08-13T22:09:51.123Z' }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('discovers active broadcasts and stores the selected live chat without technical input', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'video-id',
              snippet: {
                channelId: 'channel-id',
                liveChatId: 'live-chat-id',
                scheduledStartTime: '2026-08-13T12:00:00.000Z',
                title: 'Live agora',
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )
    const integrations = { saveConnection: jest.fn().mockResolvedValue({ id: 'connection' }) }
    const service = new YouTubeBroadcastService(
      { getAccessToken: jest.fn().mockResolvedValue({ accessToken: 'token' }) } as never,
      integrations as never,
    )

    const broadcasts = await service.list()
    const requestUrl = new URL(String((globalThis.fetch as jest.Mock).mock.calls[0]?.[0]))
    expect(requestUrl.searchParams.get('broadcastStatus')).toBe('active')
    expect(requestUrl.searchParams.has('mine')).toBe(false)
    expect(broadcasts).toEqual([
      expect.objectContaining({ liveChatId: 'live-chat-id', title: 'Live agora' }),
    ])
    await service.select(broadcasts[0]!)
    expect(integrations.saveConnection).toHaveBeenCalledWith({
      capabilities: [
        'chat.read',
        'chat.write',
        'live.metadata.write',
        'live.read',
        'user.identity',
      ],
      channelDisplayName: 'Live agora',
      channelId: 'live-chat-id',
      provider: 'youtube',
    })
  })

  it('refreshes an expired token in the vault without exposing it', async () => {
    const credentials = new MemoryCredentials()
    credentials.value = JSON.stringify({
      accessToken: 'expired-access-token',
      expiresAt: '2020-01-01T00:00:00.000Z',
      refreshToken: 'private-refresh-token',
      scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],
    })
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'refreshed-private-token',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
        }),
        { status: 200 },
      ),
    )
    const service = new YouTubeAuthService(
      { twitchClientId: null, youtubeClientId: 'youtube-client-id', youtubeClientSecret: null },
      credentials,
      { updateProviderState: jest.fn() } as never,
    )

    const token = await service.getAccessToken()
    expect(token.accessToken).toBe('refreshed-private-token')
    expect(credentials.value).toContain('refreshed-private-token')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      body: expect.any(URLSearchParams),
      method: 'POST',
    })
  })

  it('polls at the provider interval, persists the cursor and writes through the official API', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                authorDetails: {
                  channelId: 'author-id',
                  displayName: '@viewer',
                  isChatModerator: false,
                  isChatOwner: false,
                  isChatSponsor: false,
                  profileImageUrl: null,
                },
                id: 'message-id',
                snippet: {
                  displayMessage: '!join',
                  publishedAt: '2026-08-13T12:00:00.000Z',
                  type: 'textMessageEvent',
                },
              },
            ],
            nextPageToken: 'next-page',
            pollingIntervalMillis: 1000,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    const adapter = new YouTubeChatAdapter(
      { getAccessToken: jest.fn().mockResolvedValue({ accessToken: 'token' }) } as never,
      { register: jest.fn(() => jest.fn()) } as never,
    )
    const abort = new AbortController()
    const onEvent = jest.fn(async () => abort.abort())
    const onCursor = jest.fn()
    const session = await adapter.connect({
      channelId: 'live-chat-id',
      cursor: null,
      onCursor,
      onEvent,
      signal: abort.signal,
    })
    await session.closed
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ externalEventId: 'message-id' }))
    expect(onCursor).toHaveBeenCalledWith('next-page')
    await adapter.sendMessage('live-chat-id', 'Olá')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: expect.stringContaining('Olá'),
      method: 'POST',
    })
  })
})
