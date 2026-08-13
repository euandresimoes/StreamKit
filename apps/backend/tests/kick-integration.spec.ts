import { KickSupportService } from '../src/modules/integrations/kick/kick-support.service'

describe('Kick integration capability map', () => {
  it('does not claim unsupported local chat capabilities or private transports', () => {
    const support = new KickSupportService().status()

    expect(support).toMatchObject({ available: false, capabilities: [], provider: 'kick' })
    expect(support.limitations.join(' ')).toContain('client_secret')
    expect(support.limitations.join(' ')).toContain('webhook público HTTPS')
    expect(support.limitations.join(' ')).toContain('Nenhum endpoint privado')
  })
})
