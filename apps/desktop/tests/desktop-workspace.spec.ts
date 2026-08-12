import { createSecureWebPreferences, isAllowedExternalUrl } from '../src/main/security-policy'

describe('desktop workspace', () => {
  it('uses isolation, sandbox and no Node integration', () => {
    expect(createSecureWebPreferences('preload.js')).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    })
  })

  it('only allows validated HTTPS external links', () => {
    expect(isAllowedExternalUrl('https://streamkit.example/docs')).toBe(true)
    expect(isAllowedExternalUrl('http://streamkit.example/docs')).toBe(false)
    expect(isAllowedExternalUrl('file:///C:/secret.txt')).toBe(false)
  })
})
