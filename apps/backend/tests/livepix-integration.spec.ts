import type {
  SecureCredentialRepository,
  SecureCredentialStatus,
} from '../src/modules/settings/secure-credential.repository'
import { LivePixAuthService } from '../src/modules/payments/providers/livepix/livepix-auth.service'
import { LivePixApiClient } from '../src/modules/payments/providers/livepix/livepix-api.client'
import { LivePixPaymentProvider } from '../src/modules/payments/providers/livepix/livepix-payment.provider'

class MemoryCredentials implements SecureCredentialRepository {
  public readonly values = new Map<string, string>()

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

describe('LivePix integration', () => {
  afterEach(() => jest.restoreAllMocks())

  it('issues one client_credentials token with every required scope and reuses it', async () => {
    const credentials = new MemoryCredentials()
    await credentials.save(
      'livepix',
      JSON.stringify({ clientId: 'livepix-client-id', clientSecret: 'livepix-client-secret' }),
    )
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'livepix-access-token',
          expires_in: 3599,
          scope: 'account:read messages:read payments:read webhooks',
          token_type: 'bearer',
        }),
        { status: 200 },
      ),
    )
    const service = new LivePixAuthService(credentials)

    await expect(service.getAccessToken()).resolves.toBe('livepix-access-token')
    await expect(service.getAccessToken()).resolves.toBe('livepix-access-token')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://oauth.livepix.gg/oauth2/token')
    const request = fetchMock.mock.calls[0]?.[1]
    const body = request?.body as URLSearchParams
    expect(request?.headers).toEqual({ 'content-type': 'application/x-www-form-urlencoded' })
    expect(body.get('grant_type')).toBe('client_credentials')
    expect(body.get('client_id')).toBe('livepix-client-id')
    expect(body.get('client_secret')).toBe('livepix-client-secret')
    expect(body.get('scope')).toBe('account:read messages:read payments:read webhooks')
  })

  it('replaces a cached token that lacks the message and payment read scopes', async () => {
    const credentials = new MemoryCredentials()
    await credentials.save(
      'livepix',
      JSON.stringify({
        accessToken: 'insufficient-access-token',
        clientId: 'livepix-client-id',
        clientSecret: 'livepix-client-secret',
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        scope: 'account:read wallet:read webhooks',
      }),
    )
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'fully-authorized-access-token',
          expires_in: 3599,
          scope: 'account:read messages:read payments:read webhooks',
          token_type: 'bearer',
        }),
        { status: 200 },
      ),
    )
    const service = new LivePixAuthService(credentials)

    await expect(service.getAccessToken()).resolves.toBe('fully-authorized-access-token')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = fetchMock.mock.calls[0]?.[1]
    expect((request?.body as URLSearchParams).get('scope')).toBe(
      'account:read messages:read payments:read webhooks',
    )
  })

  it('invalidates a rejected cached token and retries the provider request once', async () => {
    const auth = {
      getAccessToken: jest
        .fn()
        .mockResolvedValueOnce('rejected-access-token')
        .mockResolvedValueOnce('fresh-access-token'),
      invalidateAccessToken: jest.fn().mockResolvedValue(undefined),
    }
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              amount: 200,
              createdAt: '2026-08-16T12:00:00-03:00',
              currency: 'BRL',
              id: 'message-1',
              message: 'FIFA registration',
              username: 'Vaurvik',
            },
          }),
          { status: 200 },
        ),
      )
    const client = new LivePixApiClient(auth as never)

    await expect(client.message('message-1')).resolves.toEqual(
      expect.objectContaining({ data: expect.objectContaining({ username: 'Vaurvik' }) }),
    )

    expect(auth.invalidateAccessToken).toHaveBeenCalledWith('rejected-access-token')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer fresh-access-token' }),
      }),
    )
  })

  it('authenticates once and relies on the application notification URL', async () => {
    let connection: Record<string, unknown> | null = null
    const repository = {
      connection: jest.fn(async () => connection),
      saveConnection: jest.fn(async (value: Record<string, unknown>) => {
        connection = value
      }),
    }
    const transport = {
      register: jest.fn().mockResolvedValue({
        callbackUrl: 'https://streamlet.example/livepix',
      }),
      snapshot: jest.fn().mockReturnValue({ state: 'ready' }),
    }
    const api = { createWebhook: jest.fn(), deleteWebhook: jest.fn(), webhooks: jest.fn() }
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('livepix-access-token'),
      status: jest.fn().mockResolvedValue({
        accountUsername: null,
        configured: true,
        lastErrorCode: null,
        provider: 'livepix',
        state: 'disconnected',
        webhookGeneration: 0,
        webhookUrl: null,
      }),
    }
    const provider = new LivePixPaymentProvider(
      { subscribe: jest.fn() } as never,
      transport as never,
      api as never,
      auth as never,
      repository as never,
      {} as never,
    )

    await provider.connect()
    await provider.connect()

    expect(auth.getAccessToken).toHaveBeenCalledTimes(1)
    expect(transport.register).toHaveBeenCalledTimes(1)
    expect(api.createWebhook).not.toHaveBeenCalled()
    expect(api.deleteWebhook).not.toHaveBeenCalled()
    expect(api.webhooks).not.toHaveBeenCalled()
    expect(connection).toEqual(expect.objectContaining({ remoteWebhookId: null, state: 'ready' }))
  })

  it('loads named donations from the message endpoint before applying the campaign', async () => {
    const repository = {
      connection: jest.fn().mockResolvedValue(null),
      hasContribution: jest.fn().mockResolvedValue(false),
      markProcessed: jest.fn(),
      saveContribution: jest.fn().mockResolvedValue(true),
    }
    const api = {
      message: jest.fn().mockResolvedValue({
        data: {
          amount: 200,
          createdAt: '2026-08-16T12:00:00-03:00',
          currency: 'BRL',
          id: 'message-1',
          message: 'FIFA registration',
          reference: 'reference-1',
          username: 'Vaurvik',
        },
      }),
      payment: jest.fn(),
    }
    const campaigns = { apply: jest.fn().mockResolvedValue(1) }
    const provider = new LivePixPaymentProvider(
      { subscribe: jest.fn() } as never,
      {} as never,
      api as never,
      { clientId: jest.fn().mockResolvedValue('client-1') } as never,
      repository as never,
      campaigns as never,
    )

    await provider.handleExternalEvent({
      clientId: 'client-1',
      event: 'new',
      resource: { id: 'message-1', reference: 'reference-1', type: 'message' },
      userId: 'account-1',
    })

    expect(api.message).toHaveBeenCalledWith('message-1')
    expect(api.payment).not.toHaveBeenCalled()
    expect(repository.saveContribution).toHaveBeenCalledWith(
      expect.objectContaining({
        amountInCents: 200,
        occurredAt: '2026-08-16T15:00:00.000Z',
        participantHandle: 'Vaurvik',
      }),
    )
    expect(campaigns.apply).toHaveBeenCalledWith(
      expect.objectContaining({ participantHandle: 'Vaurvik' }),
    )
    expect(repository.markProcessed).toHaveBeenCalledWith('message-1')
  })

  it('invalidates a stale ready state after restart without calling LivePix', async () => {
    const repository = {
      connection: jest.fn().mockResolvedValue({
        accountId: null,
        accountUsername: null,
        generation: 1,
        lastErrorCode: null,
        remoteWebhookId: 'old-webhook-id',
        state: 'ready',
        webhookUrl: 'https://expired-tunnel.example/livepix',
      }),
      listPending: jest.fn().mockResolvedValue([]),
      saveConnection: jest.fn(),
    }
    const api = { createWebhook: jest.fn() }
    const provider = new LivePixPaymentProvider(
      { subscribe: jest.fn() } as never,
      { snapshot: jest.fn().mockReturnValue({ state: 'disabled' }) } as never,
      api as never,
      {} as never,
      repository as never,
      { apply: jest.fn() } as never,
    )

    provider.onApplicationBootstrap()
    await new Promise((resolve) => setImmediate(resolve))
    await provider.onModuleDestroy()

    expect(repository.saveConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        lastErrorCode: 'EXTERNAL_TUNNEL_UNAVAILABLE',
        state: 'degraded',
      }),
    )
    expect(api.createWebhook).not.toHaveBeenCalled()
  })
})
