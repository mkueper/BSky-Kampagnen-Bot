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

  it('GET /api/bsky/feeds liefert Listen', async () => {
    const bsky = require('@core/services/blueskyClient')
    vi.spyOn(bsky, 'getSavedFeedsPreference').mockResolvedValue([
      { id: 'a', type: 'timeline', value: 'following', pinned: true },
      { id: 'b', type: 'feed', value: 'at://foo/app.feed', pinned: true },
      { id: 'c', type: 'feed', value: 'at://bar/app.feed', pinned: false }
    ])
    vi.spyOn(bsky, 'getFeedGeneratorInfo').mockImplementation(async () => ({
      view: {
        displayName: 'Foo Feed',
        description: 'Desc',
        avatar: 'https://example.com/a.png',
        likeCount: 3,
        creator: { handle: 'alice', displayName: 'Alice' }
      },
      isOnline: true,
      isValid: true
    }))
    const ctrl = loadController()
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    await ctrl.getFeeds({ body: {}, query: {} }, res)
    expect(payload?.pinned).toHaveLength(2)
    expect(payload?.saved).toHaveLength(1)
    expect(payload?.official).toBeTruthy()
    expect(bsky.getFeedGeneratorInfo).toHaveBeenCalledTimes(2)
  })

  it('POST /api/bsky/feeds/pin setzt Pin', async () => {
    const bsky = require('@core/services/blueskyClient')
    const savedFeeds = [
      { id: 'a', type: 'timeline', value: 'following', pinned: true },
      { id: 'b', type: 'feed', value: 'at://foo/app.feed', pinned: true }
    ]
    vi.spyOn(bsky, 'pinSavedFeed').mockResolvedValue(savedFeeds)
    vi.spyOn(bsky, 'getFeedGeneratorInfo').mockResolvedValue({
      view: { displayName: 'Foo Feed', creator: { handle: 'alice' } },
      isOnline: true,
      isValid: true
    })
    const ctrl = loadController()
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    await ctrl.pinFeed({ body: { feedUri: 'at://foo/app.feed' }, query: {} }, res)
    expect(bsky.pinSavedFeed).toHaveBeenCalledWith('at://foo/app.feed')
    expect(payload?.pinned).toHaveLength(2)
  })

  it('DELETE /api/bsky/feeds/pin gibt Fehler weiter', async () => {
    const bsky = require('@core/services/blueskyClient')
    const err = new Error('nicht gefunden')
    err.statusCode = 404
    vi.spyOn(bsky, 'unpinSavedFeed').mockRejectedValue(err)
    const ctrl = loadController()
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    await ctrl.unpinFeed({ body: { feedUri: 'at://missing/feed' }, query: {} }, res)
    expect(payload?.code).toBe(404)
    expect(payload?.error).toMatch(/nicht gefunden/i)
  })

  it('PATCH /api/bsky/feeds/pin-order ruft reorder auf', async () => {
    const bsky = require('@core/services/blueskyClient')
    const savedFeeds = [
      { id: 'x', type: 'timeline', value: 'following', pinned: true },
      { id: 'y', type: 'feed', value: 'at://foo', pinned: true }
    ]
    vi.spyOn(bsky, 'reorderPinnedFeeds').mockResolvedValue(savedFeeds)
    vi.spyOn(bsky, 'getFeedGeneratorInfo').mockResolvedValue({
      view: { displayName: 'Foo' },
      isOnline: true,
      isValid: true
    })
    const ctrl = loadController()
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    await ctrl.reorderPinnedFeeds({ body: { order: ['y'] }, query: {} }, res)
    expect(bsky.reorderPinnedFeeds).toHaveBeenCalledWith(['y'])
    expect(payload?.pinned).toHaveLength(2)
  })

  it('POST /api/bsky/notifications/register-push ruft Service mit Payload auf', async () => {
    const bsky = require('@core/services/blueskyClient')
    const spy = vi.spyOn(bsky, 'registerPushSubscription').mockResolvedValue(true)
    const ctrl = loadController()
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    await ctrl.registerPushSubscription({
      body: {
        serviceDid: ' did:web:push.example ',
        token: ' token123 ',
        platform: 'WEB',
        appId: 'client-app',
        ageRestricted: false
      }
    }, res)
    expect(spy).toHaveBeenCalledWith({
      serviceDid: 'did:web:push.example',
      token: 'token123',
      platform: 'WEB',
      appId: 'client-app',
      ageRestricted: false
    })
    expect(payload?.success).toBe(true)
  })

  it('POST /api/bsky/notifications/unregister-push gibt Fehlercode weiter', async () => {
    const bsky = require('@core/services/blueskyClient')
    const err = new Error('invalid token')
    err.statusCode = 422
    vi.spyOn(bsky, 'unregisterPushSubscription').mockRejectedValue(err)
    const ctrl = loadController()
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    await ctrl.unregisterPushSubscription({
      body: {
        serviceDid: 'did:web:push',
        token: 'abc',
        platform: 'web',
        appId: 'client-app'
      }
    }, res)
    expect(bsky.unregisterPushSubscription).toHaveBeenCalledWith({
      serviceDid: 'did:web:push',
      token: 'abc',
      platform: 'web',
      appId: 'client-app'
    })
    expect(payload?.code).toBe(422)
    expect(payload?.error).toMatch(/invalid token/i)
  })
})
