import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

function loadController () {
  const key = require.resolve('@api/controllers/bskyController')
  delete require.cache[key]
  return require('@api/controllers/bskyController')
}

describe('bsky API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET /api/bsky/reactions counts likes/reposts', async () => {
    const bsky = require('@core/services/blueskyClient')
    vi.spyOn(bsky, 'getReactions').mockResolvedValue({ likes: [1,2], reposts: [1] })
    const req = { query: { uri: 'at://post' } }
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    const ctrl = loadController()
    await ctrl.getReactions(req, res)
    expect(payload?.likes).toBe(2)
    expect(payload?.reposts).toBe(1)
  })

  it('POST /api/bsky/reply validates input', async () => {
    const ctrl = loadController()
    let statusCode = 200
    const res = { status: (c) => { statusCode = c; return { json: () => {} } }, json: () => {} }
    await ctrl.postReply({ body: {} }, res)
    expect(statusCode).toBe(400)
  })

  it('POST /api/bsky/reply sends with media', async () => {
    const platform = require('@core/services/platformContext')
    vi.spyOn(platform, 'ensurePlatforms').mockReturnValue()
    vi.spyOn(platform, 'resolvePlatformEnv').mockReturnValue({ serverUrl: 'x', identifier: 'y', appPassword: 'z' })
    vi.spyOn(platform, 'validatePlatformEnv').mockReturnValue(null)
    const post = require('@core/services/postService')
    const sendSpy = vi.spyOn(post, 'sendPost').mockResolvedValue({ ok: true, uri: 'at://new', postedAt: new Date().toISOString() })
    // fs stubs via require cache monkeypatch not necessary: code guards errors
    const ctrl = loadController()
    const req = { body: { text: 'hi', root: { uri: 'u', cid: 'c' }, parent: { uri: 'u', cid: 'c' }, media: [{ tempId: 't1', mime: 'image/png' }] } }
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    await ctrl.postReply(req, res)
    expect(payload?.ok).toBe(true)
    expect(sendSpy).toHaveBeenCalled()
  })
})

