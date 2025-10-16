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

async function getReactions(req, res) {
  try {
    const uri = String(req.query?.uri || req.body?.uri || '').trim()
    if (!uri) return res.status(400).json({ error: 'uri erforderlich' })
    const r = await bsky.getReactions(uri)
    const likes = Array.isArray(r?.likes) ? r.likes.length : 0
    const reposts = Array.isArray(r?.reposts) ? r.reposts.length : 0
    res.json({ likes, reposts })
  } catch (error) {
    log.error('reactions failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Reaktionen.' })
  }
}

async function postReply(req, res) {
  try {
    const text = String(req.body?.text || '').trim()
    const root = req.body?.root || {}
    const parent = req.body?.parent || {}
    if (!text) return res.status(400).json({ error: 'text erforderlich' })
    if (!root?.uri || !root?.cid || !parent?.uri || !parent?.cid) {
      return res.status(400).json({ error: 'root/parent (uri,cid) erforderlich' })
    }
    const { ensurePlatforms, resolvePlatformEnv, validatePlatformEnv } = require('@core/services/platformContext')
    const { sendPost } = require('@core/services/postService')
    ensurePlatforms()
    const env = resolvePlatformEnv('bluesky')
    const envErr = validatePlatformEnv('bluesky', env)
    if (envErr) return res.status(500).json({ error: envErr })
    const result = await sendPost({ content: text, reply: { root, parent } }, 'bluesky', env)
    if (!result?.ok) {
      return res.status(500).json({ error: result?.error || 'Senden fehlgeschlagen' })
    }
    res.json({ ok: true, uri: result.uri, cid: result.cid, postedAt: result.postedAt })
  } catch (error) {
    log.error('postReply failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Senden der Antwort.' })
  }
}

module.exports = { getTimeline, getReactions, postReply }
