import { ChatMessageReceivedSchema } from '@streamkit/contracts'

import { downloadAvatarDataUrl } from '../src/modules/integrations/avatar-data-url'

describe('provider avatar persistence', () => {
  afterEach(() => jest.restoreAllMocks())

  it('downloads a bounded image as a self-contained data URL', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { 'content-type': 'image/png' },
        status: 200,
      }),
    )

    const avatarUrl = await downloadAvatarDataUrl('https://example.com/avatar.png')
    expect(avatarUrl).toBe('data:image/png;base64,iVBORw==')
    expect(() =>
      ChatMessageReceivedSchema.shape.author.parse({
        avatarUrl,
        displayName: 'Viewer',
        handle: 'viewer',
        provider: 'twitch',
        providerUserId: 'viewer-id',
      }),
    ).not.toThrow()
  })

  it('rejects non-images and oversized avatars', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('not an image', { headers: { 'content-type': 'text/html' }, status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1]), {
          headers: { 'content-length': '1000001', 'content-type': 'image/png' },
          status: 200,
        }),
      )

    await expect(downloadAvatarDataUrl('https://example.com/not-image')).resolves.toBeNull()
    await expect(downloadAvatarDataUrl('https://example.com/too-large')).resolves.toBeNull()
  })
})
