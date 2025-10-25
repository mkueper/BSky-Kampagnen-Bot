const { createLogger } = require('@utils/logging')
const log = createLogger('api:bsky')
const bsky = require('@core/services/blueskyClient')
const fs = require('fs')
const path = require('path')

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
    // Medien (optional) aus temp übernehmen und an sendPost übergeben
    const allowed = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif')
      .split(',').map((s) => s.trim()).filter(Boolean)
    const mediaInput = Array.isArray(req.body?.media) ? req.body.media : []
    const media = []
    if (mediaInput.length > 0) {
      const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')
      const tempDir = process.env.TEMP_UPLOAD_DIR || path.join(process.cwd(), 'data', 'temp')
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true })
        }
      } catch (error) {
        log.warn('Upload-Verzeichnis konnte nicht erstellt werden', {
          uploadDir,
          error: error?.message || String(error)
        })
      }
      for (const m of mediaInput.slice(0, 4)) {
        try {
          const mime = m?.mime || 'image/jpeg'
          if (!allowed.includes(mime)) continue
          if (m?.tempId) {
            const tempPath = path.join(tempDir, String(m.tempId))
            const st = fs.statSync(tempPath)
            if (st && st.size > 0) {
              const finalBase = `${Date.now()}-${String(m.filename || m.tempId).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0,120)}`
              const finalPath = path.join(uploadDir, finalBase)
              fs.renameSync(tempPath, finalPath)
              media.push({ path: finalPath, mime, altText: typeof m.altText === 'string' ? m.altText : '' })
            }
          }
        } catch (error) {
          log.warn('Medien konnten nicht übernommen werden (Reply)', {
            tempId: m?.tempId,
            error: error?.message || String(error)
          })
        }
      }
    }

    const payload = { content: text, reply: { root, parent } }
    if (media.length > 0) payload.media = media

    const result = await sendPost(payload, 'bluesky', env)
    if (!result?.ok) {
      return res.status(500).json({ error: result?.error || 'Senden fehlgeschlagen' })
    }
    res.json({ ok: true, uri: result.uri, cid: result.cid, postedAt: result.postedAt })
  } catch (error) {
    log.error('postReply failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Senden der Antwort.' })
  }
}

async function postNow(req, res) {
  try {
    const text = String(req.body?.text || '').trim()
    if (!text) return res.status(400).json({ error: 'text erforderlich' })
    const { ensurePlatforms, resolvePlatformEnv, validatePlatformEnv } = require('@core/services/platformContext')
    const { sendPost } = require('@core/services/postService')
    ensurePlatforms()
    const env = resolvePlatformEnv('bluesky')
    const envErr = validatePlatformEnv('bluesky', env)
    if (envErr) return res.status(500).json({ error: envErr })

    // Optionale Medien aus temp übernehmen
    const fs = require('fs')
    const path = require('path')
    const allowed = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif')
      .split(',').map((s) => s.trim()).filter(Boolean)
    const mediaInput = Array.isArray(req.body?.media) ? req.body.media : []
    const media = []
    if (mediaInput.length > 0) {
      const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')
      const tempDir = process.env.TEMP_UPLOAD_DIR || path.join(process.cwd(), 'data', 'temp')
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true })
        }
      } catch (error) {
        log.warn('Upload-Verzeichnis konnte nicht erstellt werden (postNow)', {
          uploadDir,
          error: error?.message || String(error)
        })
      }
      for (const m of mediaInput.slice(0, 4)) {
        try {
          const mime = m?.mime || 'image/jpeg'
          if (!allowed.includes(mime)) continue
          if (m?.tempId) {
            const tempPath = path.join(tempDir, String(m.tempId))
            const st = fs.statSync(tempPath)
            if (st && st.size > 0) {
              const finalBase = `${Date.now()}-${String(m.filename || m.tempId).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0,120)}`
              const finalPath = path.join(uploadDir, finalBase)
              fs.renameSync(tempPath, finalPath)
              media.push({ path: finalPath, mime, altText: typeof m.altText === 'string' ? m.altText : '' })
            }
          }
        } catch (error) {
          log.warn('Medien konnten nicht übernommen werden (postNow)', {
            tempId: m?.tempId,
            error: error?.message || String(error)
          })
        }
      }
    }

    const payload = { content: text }
    if (media.length > 0) payload.media = media
    const result = await sendPost(payload, 'bluesky', env)
    if (!result?.ok) return res.status(500).json({ error: result?.error || 'Senden fehlgeschlagen' })
    res.json({ ok: true, uri: result.uri, cid: result.cid, postedAt: result.postedAt })
  } catch (error) {
    log.error('postNow failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Senden.' })
  }
}

module.exports = { getTimeline, getReactions, postReply, postNow }
