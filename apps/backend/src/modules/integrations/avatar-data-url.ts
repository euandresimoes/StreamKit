const MAX_AVATAR_BYTES = 1_000_000
const ALLOWED_AVATAR_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export async function downloadAvatarDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5_000) })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type')?.split(';')[0]?.toLowerCase() ?? ''
    if (!ALLOWED_AVATAR_TYPES.has(contentType)) return null
    const declaredLength = Number(response.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_AVATAR_BYTES) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (!bytes.length || bytes.length > MAX_AVATAR_BYTES) return null
    return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`
  } catch {
    return null
  }
}
