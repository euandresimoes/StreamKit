import { KickSupportService } from '../src/modules/integrations/kick/kick-support.service'

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
