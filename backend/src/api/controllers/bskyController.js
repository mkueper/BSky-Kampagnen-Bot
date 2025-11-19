const { createLogger } = require('@utils/logging')
const log = createLogger('api:bsky')
const bsky = require('@core/services/blueskyClient')
const path = require('path')
const fsp = require('fs/promises')

const TIMELINE_TABS = {
  following: { type: 'timeline' },
  discover: { type: 'feed', feedUri: bsky.FEED_GENERATORS.discover },
  'friends-popular': { type: 'feed', feedUri: bsky.FEED_GENERATORS['friends-popular'] },
  mutuals: { type: 'feed', feedUri: bsky.FEED_GENERATORS.mutuals },
  'best-of-follows': { type: 'feed', feedUri: bsky.FEED_GENERATORS['best-of-follows'] }
}
const OFFICIAL_FEEDS = [
  { id: 'following', label: 'Following', type: 'timeline', value: 'following', feedUri: null },
  { id: 'discover', label: 'Discover', type: 'feed', value: bsky.FEED_GENERATORS.discover, feedUri: bsky.FEED_GENERATORS.discover },
  { id: 'friends-popular', label: 'Popular with Friends', type: 'feed', value: bsky.FEED_GENERATORS['friends-popular'], feedUri: bsky.FEED_GENERATORS['friends-popular'] },
  { id: 'mutuals', label: 'Mutuals', type: 'feed', value: bsky.FEED_GENERATORS.mutuals, feedUri: bsky.FEED_GENERATORS.mutuals },
  { id: 'best-of-follows', label: 'Best of Follows', type: 'feed', value: bsky.FEED_GENERATORS['best-of-follows'], feedUri: bsky.FEED_GENERATORS['best-of-follows'] }
]
const TIMELINE_LABELS = { following: 'Following' }

const ALLOWED_IMAGE_TYPES = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const FEED_META_CACHE_TTL_MS = Number(process.env.BSKY_FEED_META_TTL_MS) || (5 * 60 * 1000)
const FEED_META_ERROR_TTL_MS = Number(process.env.BSKY_FEED_META_ERROR_TTL_MS) || (60 * 1000)
const FEED_META_BATCH_SIZE = Math.max(1, Number(process.env.BSKY_FEED_META_BATCH_SIZE) || 4)
const feedMetaGlobalCache = new Map()

const THREAD_NODE_TYPE = 'app.bsky.feed.defs#threadViewPost'
const GROUPABLE_NOTIFICATION_REASONS = new Set(['like', 'repost', 'like-via-repost', 'repost-via-repost'])
const AUTHOR_FEED_ALLOWED_FILTERS = new Set(['posts_with_replies', 'posts_no_replies', 'posts_with_media'])
const PUSH_REQUEST_KEYS = ['serviceDid', 'token', 'platform', 'appId']

const POST_RECORD_COLLECTION = 'app.bsky.feed.post'

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
      did: author.did || '',
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
      did: author.did || '',
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

function aggregateNotificationEntries (notifications = []) {
  const grouped = []
  const groupMap = new Map()
  for (const entry of notifications) {
    if (!entry || typeof entry !== 'object') continue
    const reason = entry.reason || ''
    const subjectUri = entry.reasonSubject || entry?.record?.subject?.uri || null
    const canGroup = subjectUri && GROUPABLE_NOTIFICATION_REASONS.has(reason)
    const key = canGroup ? `${reason}__${subjectUri}` : null
    if (key && groupMap.has(key)) {
      const bucket = groupMap.get(key)
      bucket.additionalCount += 1
      continue
    }
    const bucket = { entry, additionalCount: 0 }
    grouped.push(bucket)
    if (key) groupMap.set(key, bucket)
  }
  return grouped
}

function sanitizePushRequestPayload (raw) {
  const payload = {}
  if (!raw || typeof raw !== 'object') return payload
  for (const key of PUSH_REQUEST_KEYS) {
    if (raw[key] === undefined) continue
    const value = raw[key]
    payload[key] = typeof value === 'string' ? value.trim() : value
  }
  if (raw.ageRestricted !== undefined) payload.ageRestricted = raw.ageRestricted
  return payload
}

function mapNotificationEntry (entry, subjectMap, { additionalCount = 0 } = {}) {
  if (!entry) return null
  const author = entry.author || {}
  const record = entry.record || {}
  const reasonSubject = entry.reasonSubject || null
  let subject = null
  if (subjectMap instanceof Map) {
    if (reasonSubject) {
      subject = subjectMap.get(reasonSubject) || null
    }
    if (!subject) {
      const recordSubjectUri = record?.subject?.uri
      if (typeof recordSubjectUri === 'string') {
        subject = subjectMap.get(recordSubjectUri) || null
      }
    }
  }

  const baseEntry = {
    uri: entry.uri || null,
    cid: entry.cid || null,
    reason: entry.reason || 'unknown',
    reasonSubject,
    indexedAt: entry.indexedAt || null,
    isRead: Boolean(entry.isRead),
    author: {
      handle: author.handle || '',
      did: author.did || '',
      displayName: author.displayName || author.handle || '',
      avatar: author.avatar || null
    },
    record: {
      type: record.$type || null,
      text: typeof record.text === 'string' ? record.text : '',
      reply: record.reply || null,
      embed: record.embed || null,
      stats: record.stats || null,
      viewer: record.viewer || null
    },
    subject,
    raw: entry,
    additionalCount
  };

  if (additionalCount > 0) {
    baseEntry.groupKey = `group:${baseEntry.reason}:${baseEntry.reasonSubject}`;
    baseEntry.uri = null; // Wichtig, um Key-Konflikte zu vermeiden
    baseEntry.cid = null; // Wichtig, um Key-Konflikte zu vermeiden
  }

  return baseEntry;
}

function mapSearchPost (post) {
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
      did: author.did || '',
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

function mapSearchActor (actor) {
  if (!actor) return null
  return {
    did: actor.did || null,
    handle: actor.handle || '',
    displayName: actor.displayName || actor.handle || '',
    description: actor.description || '',
    avatar: actor.avatar || null,
    indexedAt: actor.indexedAt || actor.createdAt || null,
    viewer: actor.viewer || null,
    labels: actor.labels || []
  }
}

function mapSearchFeed (feed) {
  if (!feed) return null
  const creator = feed.creator || {}
  return {
    uri: feed.uri || null,
    cid: feed.cid || null,
    displayName: feed.displayName || '',
    description: feed.description || '',
    likeCount: feed.likeCount ?? feed.likes ?? 0,
    avatar: feed.avatar || null,
    creator: {
      handle: creator.handle || '',
      displayName: creator.displayName || creator.handle || '',
      avatar: creator.avatar || null
    }
  }
}

async function collectMediaFromTemp (mediaInput = [], contextLabel = 'post') {
  if (!Array.isArray(mediaInput) || mediaInput.length === 0) return []
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')
  const tempDir = process.env.TEMP_UPLOAD_DIR || path.join(process.cwd(), 'data', 'temp')

  try {
    await fsp.mkdir(uploadDir, { recursive: true })
  } catch (error) {
    log.warn('Upload-Verzeichnis konnte nicht erstellt werden', {
      scope: contextLabel,
      uploadDir,
      error: error?.message || String(error)
    })
  }

  const collected = []
  for (const m of mediaInput.slice(0, 4)) {
    try {
      const mime = m?.mime || 'image/jpeg'
      if (!ALLOWED_IMAGE_TYPES.includes(mime)) continue
      if (!m?.tempId) continue
      const tempPath = path.join(tempDir, String(m.tempId))
      const stat = await fsp.stat(tempPath).catch(() => null)
      if (!stat || stat.size <= 0) continue
      const safeName = String(m.filename || m.tempId).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120)
      const finalBase = `${Date.now()}-${safeName}`
      const finalPath = path.join(uploadDir, finalBase)
      await fsp.rename(tempPath, finalPath)
      collected.push({
        path: finalPath,
        mime,
        altText: typeof m.altText === 'string' ? m.altText : ''
      })
    } catch (error) {
      log.warn('Medien konnten nicht übernommen werden', {
        scope: contextLabel,
        tempId: m?.tempId,
        error: error?.message || String(error)
      })
    }
  }
  return collected
}

async function cleanupMediaFiles (files = [], contextLabel = 'post') {
  if (!Array.isArray(files) || files.length === 0) return
  await Promise.all(files.map(async (filePath) => {
    if (!filePath) return
    try {
      await fsp.unlink(filePath)
    } catch (error) {
      log.warn('Upload konnte nicht bereinigt werden', {
        scope: contextLabel,
        filePath,
        error: error?.message || String(error)
      })
    }
  }))
}

function sanitizeExternalPreview (input) {
  if (!input || typeof input !== 'object') return null
  const rawUri = typeof input.uri === 'string' ? input.uri.trim() : ''
  if (!rawUri) return null
  let parsed
  try {
    parsed = new URL(rawUri)
  } catch {
    return null
  }
  if (!/^https?:$/.test(parsed.protocol)) return null
  const trimAndLimit = (value, max) => {
    if (!value) return ''
    return String(value).replace(/\s+/g, ' ').trim().slice(0, max)
  }
  const safe = {
    uri: parsed.toString()
  }
  const title = trimAndLimit(input.title || '', 300)
  if (title) safe.title = title
  const description = trimAndLimit(input.description || '', 1000)
  if (description) safe.description = description
  const image = typeof input.image === 'string' ? input.image.trim() : ''
  if (image) safe.image = image
  const domain = trimAndLimit(input.domain || parsed.hostname.replace(/^www\./, ''), 120)
  if (domain) safe.domain = domain
  return safe
}

/**
 * GET /api/bsky/timeline?tab=discover|following&limit=..&cursor=..
 * Liefert je nach Tab entweder die persönliche Timeline oder einen offiziellen Feed-Generator.
 */
async function getTimeline(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10) || 30, 1), 100)
    const cursor = req.query.cursor || undefined
    const feedUri = typeof req.query.feedUri === 'string' ? req.query.feedUri.trim() : ''
    const requestedTab = String(req.query.tab || 'following').toLowerCase()
    const tabConfig = TIMELINE_TABS[requestedTab] || TIMELINE_TABS.following

    let data = null
    if (feedUri) {
      data = await bsky.getFeedGenerator(feedUri, { limit, cursor })
    } else if (tabConfig.type === 'feed' && tabConfig.feedUri) {
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

    // Zähler für Antworten parallel abrufen
    const notifications = Array.isArray(data?.notifications) ? data.notifications : []
    const replyNotifications = notifications.filter(n => n.reason === 'reply' && n.uri)
    const reactionPromises = replyNotifications.map(n =>
      bsky.getReactions(n.uri)
        .then(stats => ({ uri: n.uri, stats }))
        .catch(error => {
          log.warn('Konnte Reaktionen für Antwort-Benachrichtigung nicht laden', { uri: n.uri, error: error.message })
          return { uri: n.uri, stats: null }
        })
    )
    const reactionResults = await Promise.all(reactionPromises)
    const reactionMap = new Map(reactionResults.map(r => [r.uri, r.stats]))

    const subjectUris = Array.from(
      new Set(
        notifications.flatMap((entry) => {
          const list = []
          const reasonSubject = entry?.reasonSubject
          if (isPostUri(reasonSubject)) {
            list.push(reasonSubject)
          }
          const recordSubjectUri = entry?.record?.subject?.uri
          if (isPostUri(recordSubjectUri)) {
            list.push(recordSubjectUri)
          }
          return list
        })
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
    const aggregated = aggregateNotificationEntries(notifications)
    const items = aggregated
      .map(({ entry, additionalCount }) => mapNotificationEntry(entry, subjectMap, { additionalCount }))
      .filter(Boolean)

    // Zähler in die finalen Elemente einfügen
    for (const item of items) {
      if (item.reason === 'reply' && item.uri && reactionMap.has(item.uri)) {
        const reactionData = reactionMap.get(item.uri)
        if (reactionData) {
          const { viewer, ...stats } = reactionData
          item.record.stats = stats
          if (viewer) item.record.viewer = viewer
        }
      }
    }
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

async function getNotificationsUnreadCount (req, res) {
  try {
    const data = await bsky.getNotifications({ limit: 1 })
    const unreadCount = Number(data?.unreadCount) || 0
    res.json({ unreadCount })
  } catch (error) {
    log.error('notifications unread count failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Laden des Mitteilungsstatus.' })
  }
}

async function getThread(req, res) {
  try {
    const uri = String(req.query?.uri || '').trim()
    if (!uri) return res.status(400).json({ error: 'uri erforderlich' })
    const depth = Math.min(Math.max(parseInt(req.query?.depth || '', 10) || 40, 1), 100)
    const parentHeight = Math.min(Math.max(parseInt(req.query?.parentHeight || '', 10) || 40, 1), 100)
    const thread = await bsky.getReplies(uri, { depth, parentHeight })
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
    const likesCount = typeof r?.likesCount === 'number' ? r.likesCount : 0
    const repostsCount = typeof r?.repostsCount === 'number' ? r.repostsCount : 0
    res.json({ likesCount, repostsCount })
  } catch (error) {
    log.error('reactions failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Reaktionen.' })
  }
}

async function registerPushSubscription (req, res) {
  try {
    const payload = sanitizePushRequestPayload(req?.body)
    await bsky.registerPushSubscription(payload)
    res.json({ success: true })
  } catch (error) {
    const statusCode = typeof error?.statusCode === 'number'
      ? error.statusCode
      : (typeof error?.status === 'number' ? error.status : 500)
    log.error('registerPushSubscription failed', { error: error?.message || String(error) })
    res.status(statusCode).json({ error: error?.message || 'Fehler bei der Push-Registrierung.' })
  }
}

async function unregisterPushSubscription (req, res) {
  try {
    const payload = sanitizePushRequestPayload(req?.body)
    await bsky.unregisterPushSubscription(payload)
    res.json({ success: true })
  } catch (error) {
    const statusCode = typeof error?.statusCode === 'number'
      ? error.statusCode
      : (typeof error?.status === 'number' ? error.status : 500)
    log.error('unregisterPushSubscription failed', { error: error?.message || String(error) })
    res.status(statusCode).json({ error: error?.message || 'Fehler beim Entfernen der Push-Registrierung.' })
  }
}

async function search (req, res) {
  try {
    const type = String(req.query?.type || 'top').toLowerCase()
    const q = String(req.query?.q || '').trim()
    if (!q) return res.status(400).json({ error: 'q erforderlich' })
    const limit = Math.min(Math.max(parseInt(req.query?.limit || '25', 10) || 25, 1), 50)
    const cursor = req.query?.cursor || undefined

    if (type === 'people') {
      const data = await bsky.searchProfiles({ q, limit, cursor })
      const items = Array.isArray(data?.actors) ? data.actors.map(mapSearchActor).filter(Boolean) : []
      return res.json({ items, cursor: data?.cursor || null, type: 'people' })
    }

    if (type === 'feeds') {
      const data = await bsky.searchFeeds({ q, limit, cursor })
      const items = Array.isArray(data?.feeds) ? data.feeds.map(mapSearchFeed).filter(Boolean) : []
      return res.json({ items, cursor: data?.cursor || null, type: 'feeds' })
    }

    const sort = type === 'latest' ? 'latest' : 'top'
    const data = await bsky.searchPosts({ q, limit, cursor, sort })
    const posts = Array.isArray(data?.posts) ? data.posts.map(mapSearchPost).filter(Boolean) : []
    return res.json({ items: posts, cursor: data?.cursor || null, type: sort })
  } catch (error) {
    log.error('search failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Suche fehlgeschlagen.' })
  }
}

async function getProfile (req, res) {
  const actor = String(req.query?.actor || '').trim()
  if (!actor) return res.status(400).json({ error: 'actor erforderlich' })
  try {
    const data = await bsky.getProfile(actor)
    if (!data) return res.status(404).json({ error: 'Profil wurde nicht gefunden.' })
    const profile = {
      did: data.did || null,
      handle: data.handle || '',
      displayName: data.displayName || data.handle || '',
      avatar: data.avatar || null,
      banner: data.banner || null,
      description: data.description || '',
      followersCount: data.followersCount ?? 0,
      followsCount: data.followsCount ?? 0,
      postsCount: data.postsCount ?? 0,
      viewer: data.viewer || null,
      labels: data.labels || [],
      associated: data.associated || null
    }
    return res.json({ profile })
  } catch (error) {
    log.error('getProfile failed', { error: error?.message || String(error), actor })
    return res.status(500).json({ error: error?.message || 'Profil konnte nicht geladen werden.' })
  }
}

async function getProfileFeed (req, res) {
  const actor = String(req.query?.actor || '').trim()
  if (!actor) return res.status(400).json({ error: 'actor erforderlich' })
  const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10) || 30, 1), 100)
  const cursor = req.query.cursor || undefined
  const rawFilter = typeof req.query.filter === 'string' ? req.query.filter.trim() : ''
  const filter = AUTHOR_FEED_ALLOWED_FILTERS.has(rawFilter) ? rawFilter : undefined
  try {
    const data = await bsky.getAuthorFeed(actor, { limit, cursor, filter })
    const feed = Array.isArray(data?.feed) ? data.feed : []
    const items = feed.map(entry => {
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
          avatar: author?.avatar || null
        },
        stats: {
          likeCount: post?.likeCount ?? 0,
          repostCount: post?.repostCount ?? 0,
          replyCount: post?.replyCount ?? 0
        },
        raw: entry
      }
    })
    return res.json({ items, cursor: data?.cursor || null })
  } catch (error) {
    log.error('getProfileFeed failed', { error: error?.message || String(error), actor })
    return res.status(500).json({ error: error?.message || 'Beiträge konnten nicht geladen werden.' })
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
    const mediaInput = Array.isArray(req.body?.media) ? req.body.media : []
    const media = await collectMediaFromTemp(mediaInput, 'postReply')

    const payload = { content: text, reply: { root, parent } }
    const externalPreview = sanitizeExternalPreview(req.body?.external)
    if (externalPreview) payload.external = externalPreview
    if (media.length > 0) payload.media = media

    const mediaPaths = media.map((item) => item?.path).filter(Boolean)
    try {
      const result = await sendPost(payload, 'bluesky', env)
      if (!result?.ok) {
        return res.status(500).json({ error: result?.error || 'Senden fehlgeschlagen' })
      }
      res.json({ ok: true, uri: result.uri, cid: result.cid, postedAt: result.postedAt })
    } finally {
      await cleanupMediaFiles(mediaPaths, 'postReply')
    }
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

    // Optionale Medien aus temp übernehmen
    const mediaInput = Array.isArray(req.body?.media) ? req.body.media : []
    const media = await collectMediaFromTemp(mediaInput, 'postNow')

    const payload = { content: text }
    if (media.length > 0) payload.media = media
    const externalPreview = sanitizeExternalPreview(req.body?.external)
    if (externalPreview) payload.external = externalPreview
    if (hasQuote) payload.quote = { uri: quoteUri, cid: quoteCid }

    const mediaPaths = media.map((item) => item?.path).filter(Boolean)
    try {
      const result = await sendPost(payload, 'bluesky', env)
      if (!result?.ok) return res.status(500).json({ error: result?.error || 'Senden fehlgeschlagen' })
      res.json({ ok: true, uri: result.uri, cid: result.cid, postedAt: result.postedAt })
    } finally {
      await cleanupMediaFiles(mediaPaths, 'postNow')
    }
  } catch (error) {
    log.error('postNow failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Fehler beim Senden.' })
  }
}

async function getFeeds (req, res) {
  try {
    const savedFeeds = await bsky.getSavedFeedsPreference()
    const lists = await buildFeedLists(savedFeeds)
    res.json({
      official: buildOfficialFeedList(),
      pinned: lists.pinned,
      saved: lists.saved,
      errors: lists.errors
    })
  } catch (error) {
    log.error('feeds failed', { error: error?.message || String(error) })
    res.status(500).json({ error: error?.message || 'Feeds konnten nicht geladen werden.' })
  }
}

async function pinFeed (req, res) {
  const feedUri = getFeedUriFromRequest(req)
  if (!feedUri) return res.status(400).json({ error: 'feedUri erforderlich' })
  try {
    const savedFeeds = await bsky.pinSavedFeed(feedUri)
    const lists = await buildFeedLists(savedFeeds)
    res.json({ pinned: lists.pinned, saved: lists.saved, errors: lists.errors })
  } catch (error) {
    return handleFeedError(res, error, 'Feed konnte nicht angepinnt werden.', 'pinFeed failed')
  }
}

async function unpinFeed (req, res) {
  const feedUri = getFeedUriFromRequest(req)
  if (!feedUri) return res.status(400).json({ error: 'feedUri erforderlich' })
  try {
    const savedFeeds = await bsky.unpinSavedFeed(feedUri)
    const lists = await buildFeedLists(savedFeeds)
    res.json({ pinned: lists.pinned, saved: lists.saved, errors: lists.errors })
  } catch (error) {
    return handleFeedError(res, error, 'Feed konnte nicht entfernt werden.', 'unpinFeed failed')
  }
}

async function reorderPinnedFeeds (req, res) {
  const orderInput = Array.isArray(req.body?.order) ? req.body.order : []
  const order = orderInput
    .map((id) => (typeof id === 'string' ? id.trim() : String(id || '').trim()))
    .filter(Boolean)
  if (!order.length) return res.status(400).json({ error: 'order erforderlich' })
  try {
    const savedFeeds = await bsky.reorderPinnedFeeds(order)
    const lists = await buildFeedLists(savedFeeds)
    res.json({ pinned: lists.pinned, saved: lists.saved, errors: lists.errors })
  } catch (error) {
    return handleFeedError(res, error, 'Reihenfolge konnte nicht gespeichert werden.', 'reorderPinnedFeeds failed')
  }
}

async function buildFeedLists (savedFeeds = []) {
  const metaCache = new Map()
  const errors = []
  const pinnedEntries = await hydrateSavedFeedList(savedFeeds.filter((entry) => entry?.pinned), metaCache, errors)
  const savedEntries = await hydrateSavedFeedList(savedFeeds.filter((entry) => !entry?.pinned), metaCache, errors)
  return {
    pinned: pinnedEntries.filter(Boolean),
    saved: savedEntries.filter(Boolean),
    errors
  }
}

function readGlobalFeedMeta (cacheKey) {
  if (!cacheKey) return null
  const entry = feedMetaGlobalCache.get(cacheKey)
  if (!entry) return null
  if (entry.data) {
    if (!entry.expiresAt || entry.expiresAt > Date.now()) {
      return entry.data
    }
    feedMetaGlobalCache.delete(cacheKey)
    return null
  }
  if (entry.promise) {
    return entry.promise
  }
  feedMetaGlobalCache.delete(cacheKey)
  return null
}

function storeGlobalFeedMeta (cacheKey, data, ttlMs) {
  if (!cacheKey) return
  feedMetaGlobalCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + Math.max(0, ttlMs)
  })
}

function buildOfficialFeedList () {
  return OFFICIAL_FEEDS.map((feed) => ({
    id: feed.id,
    label: feed.label,
    type: feed.type,
    feedUri: feed.feedUri,
    value: feed.value,
    origin: 'official'
  }))
}

async function hydrateSavedFeedList (entries = [], metaCache, errors) {
  if (!Array.isArray(entries) || entries.length === 0) return []
  const results = []
  for (let i = 0; i < entries.length; i += FEED_META_BATCH_SIZE) {
    const chunk = entries.slice(i, i + FEED_META_BATCH_SIZE)
    // Verarbeite in kleinen Batches, um Bluesky nicht mit parallelen Requests zu überfluten
    // (Rate-Limit-Schutz, spürbar wenn >10 Feeds gespeichert sind).
    const chunkResults = await Promise.all(chunk.map((entry) => hydrateSavedFeed(entry, metaCache, errors)))
    results.push(...chunkResults)
  }
  return results
}

async function hydrateSavedFeed (entry, metaCache, errors) {
  if (!entry) return null
  if (entry.type === 'timeline') {
    const label = TIMELINE_LABELS[entry.value] || 'Timeline'
    return {
      id: entry.id,
      type: entry.type,
      value: entry.value,
      feedUri: null,
      pinned: Boolean(entry.pinned),
      displayName: label,
      description: '',
      avatar: null,
      creator: null,
      likeCount: null,
      isOnline: true,
      isValid: true,
      status: 'ok'
    }
  }
  if (entry.type === 'feed') {
    const meta = await loadFeedMetadata(entry.value, metaCache, errors)
    return {
      id: entry.id,
      type: entry.type,
      value: entry.value,
      feedUri: entry.value || null,
      pinned: Boolean(entry.pinned),
      displayName: meta.displayName,
      description: meta.description,
      avatar: meta.avatar,
      creator: meta.creator,
      likeCount: meta.likeCount,
      isOnline: meta.isOnline,
      isValid: meta.isValid,
      status: meta.status
    }
  }
  return {
    id: entry.id,
    type: entry.type || 'unknown',
    value: entry.value || '',
    feedUri: entry.value || null,
    pinned: Boolean(entry.pinned),
    displayName: 'Unbekannter Feed',
    description: '',
    avatar: null,
    creator: null,
    likeCount: null,
    isOnline: false,
    isValid: false,
    status: 'unknown'
  }
}

async function loadFeedMetadata (feedUri, metaCache, errors) {
  const cacheKey = feedUri || ''
  if (cacheKey && metaCache.has(cacheKey)) {
    return metaCache.get(cacheKey)
  }
  if (cacheKey) {
    const globalEntry = readGlobalFeedMeta(cacheKey)
    if (globalEntry) {
      if (typeof globalEntry.then === 'function') {
        const meta = await globalEntry
        metaCache.set(cacheKey, meta)
        return meta
      }
      metaCache.set(cacheKey, globalEntry)
      return globalEntry
    }
  }
  if (!feedUri) {
    return {
      displayName: 'Feed',
      description: '',
      avatar: null,
      creator: null,
      likeCount: null,
      isOnline: false,
      isValid: false,
      status: 'unknown'
    }
  }
  const fetchPromise = (async () => {
    const info = await bsky.getFeedGeneratorInfo(feedUri)
    const view = info?.view || {}
    const meta = {
      displayName: view.displayName || view.name || 'Feed',
      description: view.description || '',
      avatar: view.avatar || null,
      creator: view.creator
        ? {
            did: view.creator.did || '',
            handle: view.creator.handle || '',
            displayName: view.creator.displayName || view.creator.handle || ''
          }
        : null,
      likeCount: view.likeCount ?? null,
      isOnline: Boolean(info?.isOnline),
      isValid: Boolean(info?.isValid),
      status: info?.isValid ? 'ok' : 'invalid'
    }
    return meta
  })()
  if (cacheKey) {
    feedMetaGlobalCache.set(cacheKey, { promise: fetchPromise })
  }
  try {
    const meta = await fetchPromise
    metaCache.set(cacheKey, meta)
    if (cacheKey) {
      storeGlobalFeedMeta(cacheKey, meta, FEED_META_CACHE_TTL_MS)
    }
    return meta
  } catch (error) {
    const fallback = {
      displayName: 'Feed',
      description: '',
      avatar: null,
      creator: null,
      likeCount: null,
      isOnline: false,
      isValid: false,
      status: error?.statusCode === 404 ? 'not-found' : 'error'
    }
    metaCache.set(cacheKey, fallback)
    if (cacheKey) {
      storeGlobalFeedMeta(cacheKey, fallback, FEED_META_ERROR_TTL_MS)
    }
    if (error?.statusCode !== 404) {
      const reason = error?.message || 'Feed konnte nicht geladen werden.'
      const alreadyPresent = errors.some(entry => entry?.feedUri === feedUri && entry?.message === reason)
      if (!alreadyPresent) {
        errors.push({ feedUri, message: reason })
      }
    }
    return fallback
  }
}

function getFeedUriFromRequest (req) {
  const bodyValue = typeof req.body?.feedUri === 'string' ? req.body.feedUri.trim() : ''
  const queryValue = typeof req.query?.feedUri === 'string' ? req.query.feedUri.trim() : ''
  return bodyValue || queryValue || ''
}

function handleFeedError (res, error, fallback, scope) {
  const statusCode = error?.statusCode || 500
  const logPayload = { error: error?.message || String(error) }
  if (statusCode >= 500) log.error(scope, logPayload)
  else log.warn(scope, logPayload)
  return res.status(statusCode).json({ error: error?.message || fallback })
}

module.exports = {
  getTimeline,
  getNotifications,
  getNotificationsUnreadCount,
  getThread,
  getReactions,
  registerPushSubscription,
  unregisterPushSubscription,
  postReply,
  postNow,
  search,
  getProfile,
  getProfileFeed,
  getFeeds,
  pinFeed,
  unpinFeed,
  reorderPinnedFeeds
}
function isPostUri (value) {
  return typeof value === 'string' && value.includes(`/${POST_RECORD_COLLECTION}/`)
}
