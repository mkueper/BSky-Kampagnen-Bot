import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

function loadService () {
  const key = require.resolve('@core/services/threadEngagementService')
  delete require.cache[key]
  return require('@core/services/threadEngagementService')
}

describe('engagement filters (mastodon skip without ids)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('skips mastodon when no ids exist', async () => {
    const models = require('@data/models')
    // Minimal thread with two segments; only bluesky remoteId present
    vi.spyOn(models.Thread, 'findByPk').mockResolvedValue({
      id: 1,
      metadata: { platformResults: { } },
      segments: [ { id: 10, sequence: 0, remoteId: 'at://did:example/post/xyz' } ]
    })
    // No-op sequelize transaction
    vi.spyOn(models.sequelize, 'transaction').mockImplementation(async (fn) => fn({}))
    // SkeetReaction mutations no-op
    vi.spyOn(models.SkeetReaction, 'destroy').mockResolvedValue(0)
    vi.spyOn(models.SkeetReaction, 'bulkCreate').mockResolvedValue([])
    // Bluesky client stubs
    const bsky = require('@core/services/blueskyClient')
    vi.spyOn(bsky, 'getReactions').mockResolvedValue({ likes: [], reposts: [] })
    vi.spyOn(bsky, 'getReplies').mockResolvedValue([])
    // Mastodon client: ensure not called
    const masto = require('@core/services/mastodonClient')
    const statusSpy = vi.spyOn(masto, 'getStatus').mockResolvedValue({ favourites_count: 0, reblogs_count: 0 })
    const ctxSpy = vi.spyOn(masto, 'getStatusContext').mockResolvedValue({ descendants: [] })
    vi.spyOn(masto, 'hasCredentials').mockReturnValue(true)

    const svc = loadService()
    const result = await svc.refreshThreadEngagement(1, { includeReplies: true })
    expect(result?.ok).toBe(true)
    // Should not have queried mastodon without ids
    expect(statusSpy).not.toHaveBeenCalled()
    expect(ctxSpy).not.toHaveBeenCalled()
  })
})

