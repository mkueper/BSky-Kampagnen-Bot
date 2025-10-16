import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

function loadService () {
  const key = require.resolve('@core/services/threadEngagementService')
  delete require.cache[key]
  return require('@core/services/threadEngagementService')
}

describe('maintenance cleanup (mastodon)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('removes mastodon platformResults when no valid identifiers', async () => {
    const models = require('@data/models')
    const rows = [
      { id: 1, metadata: { platformResults: { mastodon: { segments: [{ sequence: 0, uri: 'https://masto.example/@user/' }] } } }, update: vi.fn() },
      { id: 2, metadata: { platformResults: { bluesky: { segments: [] } } }, update: vi.fn() },
    ]
    vi.spyOn(models.Thread, 'findAll').mockResolvedValue(rows)
    const svc = loadService()
    const res = await svc.cleanupInvalidMastodonEntries()
    expect(res.cleaned).toBe(1)
    expect(rows[0].update).toHaveBeenCalledOnce()
  })
})

