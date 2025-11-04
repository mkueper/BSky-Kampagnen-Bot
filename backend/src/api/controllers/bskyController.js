const { createLogger } = require('@utils/logging')
const log = createLogger('api:bsky')
const bsky = require('@core/services/blueskyClient')
const fs = require('fs')
const path = require('path')

const TIMELINE_TABS = {
  following: { type: 'timeline' },
  discover: { type: 'feed', feedUri: bsky.FEED_GENERATORS.discover },
  'friends-popular': { type: 'feed', feedUri: bsky.FEED_GENERATORS['friends-popular'] },
  mutuals: { type: 'feed', feedUri: bsky.FEED_GENERATORS.mutuals },
  'best-of-follows': { type: 'feed', feedUri: bsky.FEED_GENERATORS['best-of-follows'] }
}

const THREAD_NODE_TYPE = 'app.bsky.feed.defs#threadViewPost'

function toTimestamp (value) {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

function sortThreadReplies (nodes = []) {
  return nodes.slice().sort((a, b) => {
    const aTs = toTimestamp(a?.createdAt) || toTimestamp(a?.raw?.post?.indexedAt)
    const bTs = toTimestamp(b?.createdAt) || toTimestamp(b?.raw?.post?.indexedAt)
    return aTs - bTs
  })
}

function mapThreadNode (node) {
  if (!node || node.$type !== THREAD_NODE_TYPE) return null
  const post = node.post || {}
  const author = post.author || {}
  const record = post.record || {}
  const replies = Array.isArray(node.replies)
    ? sortThreadReplies(node.replies.map(mapThreadNode).filter(Boolean))
    : []
  return {
    uri: post.uri || null,
    cid: post.cid || null,
    text: record.text || '',
    createdAt: record.createdAt || post.indexedAt || null,
    author: {
      handle: author.handle || '',
      displayName: author.displayName || author.handle || '',
      avatar: author.avatar || null
    },
    stats: {
      likeCount: post.likeCount ?? 0,
      repostCount: post.repostCount ?? 0,
      replyCount: post.replyCount ?? 0
    },
    raw: { post },
    replies
  }
}

function extractParentChain (node) {
  const parents = []
  let current = node?.parent
  while (current && current.$type === THREAD_NODE_TYPE) {
    const mapped = mapThreadNode(current)
    if (mapped) parents.unshift(mapped)
    current = current.parent
  }
  return parents
}

function mapPostView (post) {
  if (!post) return null
  const author = post.author || {}
  const record = post.record || {}
  return {
    uri: post.uri || null,
    cid: post.cid || null,
    text: record.text || '',
    createdAt: record.createdAt || post.indexedAt || null,
    author: {
      handle: author.handle || '',
      displayName: author.displayName || author.handle || '',
      avatar: author.avatar || null
    },
    stats: {
      likeCount: post.likeCount ?? 0,
      repostCount: post.repostCount ?? 0,
      replyCount: post.replyCount ?? 0
    },
    raw: { post }
  }
}

function mapNotificationEntry (entry, subjectMap) {
  if (!entry) return null
  const author = entry.author || {}
  const record = entry.record || {}
  const reasonSubject = entry.reasonSubject || null
  const subject = reasonSubject && subjectMap instanceof Map
    ? subjectMap.get(reasonSubject) || null
    : null
  return {
    uri: entry.uri || null,
    cid: entry.cid || null,
    reason: entry.reason || 'unknown',
    reasonSubject,
    indexedAt: entry.indexedAt || null,
    isRead: Boolean(entry.isRead),
    author: {
      handle: author.handle || '',
      displayName: author.displayName || author.handle || '',
      avatar: author.avatar || null
    },
    record: {
      type: record.$type || null,
      text: typeof record.text === 'string' ? record.text : '',
      reply: record.reply || null,
      embed: record.embed || null
    },
    subject,
    raw: entry
  }
}

/**
 * GET /api/bsky/timeline?tab=discover|following&limit=..&cursor=..
 * Liefert je nach Tab entweder die persönliche Timeline oder einen offiziellen Feed-Generator.
 */
async function getTimeline(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10) || 30, 1), 100)
    const cursor = req.query.cursor || undefined
    const requestedTab = String(req.query.tab || 'following').toLowerCase()
    const tabConfig = TIMELINE_TABS[requestedTab] || TIMELINE_TABS.following

    let data = null
    if (tabConfig.type === 'feed' && tabConfig.feedUri) {
      data = await bsky.getFeedGenerator(tabConfig.feedUri, { limit, cursor })
    } else {
      data = await bsky.getTimeline({ limit, cursor })
    }

    if (!data || !Array.isArray(data.feed)) {
      return res.json({ feed: [], cursor: null, tab: requestedTab })
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

    res.json({ feed: items, cursor: data.cursor || null, tab: requestedTab })
  } catch (error) {
    log.error('timeline failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Bluesky-Timeline.' })
  }
}

async function getNotifications (req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '40', 10) || 40, 1), 100)
    const cursor = req.query.cursor || undefined
    const markSeen = String(req.query.markSeen || '').toLowerCase() === 'true'
    const data = await bsky.getNotifications({ limit, cursor })
    const notifications = Array.isArray(data?.notifications) ? data.notifications : []
    const subjectUris = Array.from(
      new Set(
        notifications
          .map((entry) => entry?.reasonSubject)
          .filter((uri) => typeof uri === 'string' && uri.startsWith('at://'))
      )
    )
    let subjectMap = new Map()
    if (subjectUris.length > 0) {
      const posts = await bsky.getPostsByUri(subjectUris)
      const mappedPosts = posts
        .map(mapPostView)
        .filter((item) => item?.uri)
      subjectMap = new Map(mappedPosts.map((item) => [item.uri, item]))
    }
    const items = notifications
      .map((entry) => mapNotificationEntry(entry, subjectMap))
      .filter(Boolean)
    if (markSeen) {
      try {
        await bsky.markNotificationsSeen()
      } catch (error) {
        log.warn('markNotificationsSeen failed', { error: error?.message || String(error) })
      }
    }
    const unreadCount = notifications.reduce((sum, entry) => sum + (entry?.isRead ? 0 : 1), 0)
    res.json({
      notifications: items,
      cursor: data?.cursor || null,
      seenAt: data?.seenAt || null,
      unreadCount
    })
  } catch (error) {
    log.error('notifications failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Mitteilungen.' })
  }
}

async function getThread(req, res) {
  try {
    const uri = String(req.query?.uri || '').trim()
    if (!uri) return res.status(400).json({ error: 'uri erforderlich' })
    const thread = await bsky.getReplies(uri)
    if (!thread || thread.$type !== THREAD_NODE_TYPE) {
      return res.status(404).json({ error: 'Thread nicht gefunden.' })
    }
    const focus = mapThreadNode(thread)
    if (!focus) return res.status(404).json({ error: 'Thread nicht gefunden.' })
    const parents = extractParentChain(thread)
    res.json({ focus, parents })
  } catch (error) {
    log.error('thread failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Laden des Threads.' })
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
    // Medien (optional) aus temp uebernehmen und an sendPost uebergeben
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
          log.warn('Medien konnten nicht uebernommen werden (Reply)', {
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
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
    const quoteUri = typeof req.body?.quote?.uri === 'string' ? req.body.quote.uri.trim() : ''
    const quoteCid = typeof req.body?.quote?.cid === 'string' ? req.body.quote.cid.trim() : ''
    const hasQuote = Boolean(quoteUri && quoteCid)
    if (!text && !hasQuote) return res.status(400).json({ error: 'text oder quote erforderlich' })
    const { ensurePlatforms, resolvePlatformEnv, validatePlatformEnv } = require('@core/services/platformContext')
    const { sendPost } = require('@core/services/postService')
    ensurePlatforms()
    const env = resolvePlatformEnv('bluesky')
    const envErr = validatePlatformEnv('bluesky', env)
    if (envErr) return res.status(500).json({ error: envErr })

    // Optionale Medien aus temp uebernehmen
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
          log.warn('Medien konnten nicht uebernommen werden (postNow)', {
            tempId: m?.tempId,
            error: error?.message || String(error)
          })
        }
      }
    }

    const payload = { content: text }
    if (media.length > 0) payload.media = media
    if (hasQuote) payload.quote = { uri: quoteUri, cid: quoteCid }
    const result = await sendPost(payload, 'bluesky', env)
    if (!result?.ok) return res.status(500).json({ error: result?.error || 'Senden fehlgeschlagen' })
    res.json({ ok: true, uri: result.uri, cid: result.cid, postedAt: result.postedAt })
  } catch (error) {
    log.error('postNow failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Senden.' })
  }
}

module.exports = { getTimeline, getNotifications, getThread, getReactions, postReply, postNow }
