import { get } from 'node:http'

import type { SecureCredentialRepository, SecureCredentialStatus } from '../src/main'
import { KickAuthService } from '../src/modules/integrations/kick/kick-auth.service'
import { KickChatAdapter } from '../src/modules/integrations/kick/kick-chat.adapter'
import { KickSupportService } from '../src/modules/integrations/kick/kick-support.service'

class MemoryCredentials implements SecureCredentialRepository {
  public values = new Map<string, string>()

  public async read(name: string) {
    return this.values.get(name) ?? null
  }

  public async remove(name: string) {
    this.values.delete(name)
  }

  public async save(name: string, value: string) {
    this.values.set(name, value)
  }

  public async status(name: string): Promise<SecureCredentialStatus> {
    return { available: true, configured: this.values.has(name), provider: 'memory' }
  }
}

describe('Kick integration capability map', () => {
  it('exposes only documented local chat capabilities and the temporary tunnel limitation', () => {
    const support = new KickSupportService().status()

    expect(support).toMatchObject({
      available: true,
      capabilities: expect.arrayContaining([
        'chat.read',
        'chat.write',
        'chat.message.delete',
        'chat.user.ban',
        'chat.user.unban',
      ]),
      provider: 'kick',
    })
    expect(support.limitations.join(' ')).toContain('local HTTPS tunnel')
    expect(support.limitations.join(' ')).toContain('Pinning messages')
  })
})

describe('Kick OAuth', () => {
  afterEach(() => jest.restoreAllMocks())

  it('uses the loopback workaround and persists the token after callback polling', async () => {
    const credentials = new MemoryCredentials()
    await credentials.save('kick.client-id', 'kick-client-id')
    await credentials.save('kick.client-secret', 'kick-client-secret')
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'kick-access-token',
            expires_in: 3600,
            refresh_token: 'kick-refresh-token',
            scope: 'user:read channel:read',
            token_type: 'bearer',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ user_id: 123, name: 'Streamlet User' }] }), {
          status: 200,
        }),
      )
    const service = new KickAuthService(
      credentials,
      {
        register: jest.fn().mockResolvedValue({
          callbackPath: '/api/v1/external-events/kick/test',
          callbackUrl: 'https://temporary.example/api/v1/external-events/kick/test',
          secret: 'test-secret',
        }),
        unregister: jest.fn(),
      } as never,
      { saveConnection: jest.fn() } as never,
    )

    const flow = await service.begin()
    const authorizationUrl = new URL(flow.authorizationUrl)
    const callback = new URL(authorizationUrl.searchParams.get('redirect_uri')!)
    callback.searchParams.set('code', 'kick-authorization-code')
    callback.searchParams.set('state', authorizationUrl.searchParams.get('state')!)

    expect(authorizationUrl.searchParams.get('redirect')).toBe('127.0.0.1')
    await new Promise<void>((resolve, reject) => {
      get(callback, (response) => {
        response.resume()
        response.on('end', resolve)
      }).on('error', reject)
    })
    await new Promise<void>((resolve, reject) => {
      get(callback, (response) => {
        expect(response.statusCode).toBe(200)
        response.resume()
        response.on('end', resolve)
      }).on('error', reject)
    })

    const result = await service.poll(flow.flowId)

    expect(result.status).toBe('authorized')
    expect(credentials.values.get('kick.oauth')).toContain('kick-refresh-token')
    service.onModuleDestroy()
  }, 15_000)
})

describe('Kick chat sending', () => {
  afterEach(() => jest.restoreAllMocks())

  it('sends as the connected user through the official chat endpoint', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ data: { is_sent: true } }), { status: 200 }))
    const adapter = new KickChatAdapter(
      { getAccessToken: jest.fn().mockResolvedValue({ accessToken: 'kick-token' }) } as never,
      { register: jest.fn() } as never,
      { register: jest.fn() } as never,
      { subscribe: jest.fn() } as never,
    )

    await adapter.sendMessage('123', 'Hello from Streamlet')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.kick.com/public/v1/chat',
      expect.objectContaining({
        body: JSON.stringify({
          broadcaster_user_id: 123,
          content: 'Hello from Streamlet',
          type: 'user',
        }),
      }),
    )
  })
})
