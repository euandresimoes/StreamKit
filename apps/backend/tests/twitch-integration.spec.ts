import type { SecureCredentialRepository, SecureCredentialStatus } from '../src/main'
import { TwitchAuthService } from '../src/modules/integrations/twitch/twitch-auth.service'
import { normalizeTwitchChatNotification } from '../src/modules/integrations/twitch/twitch-chat.adapter'

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

describe('Twitch integration', () => {
  afterEach(() => jest.restoreAllMocks())

  it('normalizes a channel chat notification with stable Twitch identity', () => {
    const message = normalizeTwitchChatNotification({
      metadata: {
        message_id: 'eventsub-1',
        message_timestamp: '2026-08-13T15:00:00.000Z',
        message_type: 'notification',
      },
      payload: {
        subscription: { type: 'channel.chat.message' },
        event: {
          badges: [{ set_id: 'moderator' }],
          broadcaster_user_id: 'channel-1',
          chatter_user_id: 'user-42',
          chatter_user_login: 'andre_live',
          chatter_user_name: 'André',
          message: { text: '!participar' },
          message_id: 'chat-message-1',
        },
      },
    })
    expect(message).toMatchObject({
      author: { handle: 'andre_live', providerUserId: 'user-42' },
      externalEventId: 'eventsub-1',
      message: '!participar',
      provider: 'twitch',
    })
  })

  it('completes device authorization while returning no token to the caller', async () => {
    const credentials = new MemoryCredentials()
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            device_code: 'private-device-code',
            expires_in: 600,
            interval: 1,
            user_code: 'ABCD-EFGH',
            verification_uri: 'https://www.twitch.tv/activate',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'private-access-token',
            expires_in: 14_400,
            refresh_token: 'private-refresh-token',
            scope: ['user:read:chat', 'user:write:chat'],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            client_id: 'client-id',
            expires_in: 14_400,
            login: 'streamer',
            scopes: ['user:read:chat', 'user:write:chat'],
            user_id: 'broadcaster-1',
          }),
          { status: 200 },
        ),
      )
    const integrations = { saveConnection: jest.fn().mockResolvedValue(undefined) }
    const service = new TwitchAuthService(
      { twitchClientId: 'client-id', youtubeClientId: null, youtubeClientSecret: null },
      credentials,
      integrations as never,
    )

    const device = await service.begin()
    const result = await service.poll(device.flowId)

    expect(result.status).toBe('authorized')
    expect(JSON.stringify(result)).not.toContain('private-access-token')
    expect(credentials.value).toContain('private-access-token')
    expect(integrations.saveConnection).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: 'broadcaster-1', provider: 'twitch' }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
