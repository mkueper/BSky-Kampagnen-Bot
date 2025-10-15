const { createLogger } = require('@utils/logging')
const log = createLogger('api:bsky')
const bsky = require('@core/services/blueskyClient')

/**
 * GET /api/bsky/timeline?tab=discover|following&limit=..&cursor=..
 * Aktuell wird unabhängig vom Tab die persönliche Timeline geliefert.
 */
async function getTimeline(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10) || 30, 1), 100)
    const cursor = req.query.cursor || undefined
    const tab = String(req.query.tab || 'following')

    // Derzeit keine Unterscheidung – beide liefern persönliche Timeline
    const data = await bsky.getTimeline({ limit, cursor })
    if (!data || !Array.isArray(data.feed)) {
      return res.json({ feed: [], cursor: null })
    }

    // Schlankes Mapping für das Frontend (optional, raw bleibt verfügbar)
    const items = data.feed.map(entry => {
      const post = entry?.post || {}
      const author = post?.author || {}
      return {
        uri: post?.uri || null,
        cid: post?.cid || null,
        text: post?.record?.text || '',
        createdAt: post?.record?.createdAt || null,
        author: {
          handle: author?.handle || '',
          displayName: author?.displayName || author?.handle || '',
          avatar: author?.avatar || null,
        },
        stats: {
          likeCount: post?.likeCount ?? 0,
          repostCount: post?.repostCount ?? 0,
          replyCount: post?.replyCount ?? 0,
        },
        raw: entry,
      }
    })

    res.json({ feed: items, cursor: data.cursor || null, tab })
  } catch (error) {
    log.error('timeline failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Bluesky-Timeline.' })
  }
}

module.exports = { getTimeline }

