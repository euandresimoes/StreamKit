import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

describe('renderer Content Security Policy', () => {
  it('blocks arbitrary scripts, frames, objects and form submissions', async () => {
    const html = await readFile(join(__dirname, '../../frontend/index.html'), 'utf8')

    expect(html).toContain("default-src 'self'")
    expect(html).toContain("script-src 'self'")
    expect(html).toContain("object-src 'none'")
    expect(html).toContain(
      'frame-src https://player.twitch.tv https://www.youtube.com https://www.youtube-nocookie.com',
    )
    expect(html).toContain("form-action 'none'")
    expect(html).not.toContain("script-src 'self' 'unsafe-inline'")
  })
})
