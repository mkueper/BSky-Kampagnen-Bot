import { BskyAgent } from '@atproto/api'
import { getActiveBskyAgentClient } from './bskyAgentClient.js'
import { getMentionsReasons, getNotificationItemId, isMentionNotification } from '@bsky-kampagnen-bot/shared-logic'

const OFFICIAL_FEED_GENERATORS = {
  discover: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
  mutuals: 'at://did:plc:tenurhgjptubkk5zf5qhi3og/app.bsky.feed.generator/mutuals',
  'friends-popular': 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/with-friends',
  'best-of-follows': 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/best-of-follows'
}
const OFFICIAL_FEEDS = [
  { id: 'following', label: 'Following', type: 'timeline', value: 'following', feedUri: null },
  { id: 'discover', label: 'Discover', type: 'feed', value: OFFICIAL_FEED_GENERATORS.discover, feedUri: OFFICIAL_FEED_GENERATORS.discover },
  { id: 'friends-popular', label: 'Popular with Friends', type: 'feed', value: OFFICIAL_FEED_GENERATORS['friends-popular'], feedUri: OFFICIAL_FEED_GENERATORS['friends-popular'] },
  { id: 'mutuals', label: 'Mutuals', type: 'feed', value: OFFICIAL_FEED_GENERATORS.mutuals, feedUri: OFFICIAL_FEED_GENERATORS.mutuals },
  { id: 'best-of-follows', label: 'Best of Follows', type: 'feed', value: OFFICIAL_FEED_GENERATORS['best-of-follows'], feedUri: OFFICIAL_FEED_GENERATORS['best-of-follows'] }
]
const TIMELINE_FOLLOWING_VALUE = 'following'

const TIMELINE_TAB_CONFIG = {
  following: { type: 'timeline' },
  discover: { type: 'feed', feedUri: OFFICIAL_FEED_GENERATORS.discover },
  'friends-popular': { type: 'feed', feedUri: OFFICIAL_FEED_GENERATORS['friends-popular'] },
  mutuals: { type: 'feed', feedUri: OFFICIAL_FEED_GENERATORS.mutuals },
  'best-of-follows': { type: 'feed', feedUri: OFFICIAL_FEED_GENERATORS['best-of-follows'] }
}

const GROUPABLE_NOTIFICATION_REASONS = new Set(['like', 'repost', 'like-via-repost', 'repost-via-repost'])
const TIMELINE_LABELS = { following: 'Following' }
const NOTIFICATION_SNAPSHOT_DEFAULT_LIMIT = 5
const FEED_META_CACHE_TTL_MS = 5 * 60 * 1000
const FEED_META_ERROR_TTL_MS = 60 * 1000
const FEED_META_BATCH_SIZE = 4
const PROFILE_BATCH_SIZE = 25
const feedMetaGlobalCache = new Map()
const listMetaGlobalCache = new Map()

const GLOBAL_SCOPE = (typeof globalThis === 'object' && globalThis) ? globalThis : undefined
const DEFAULT_BSKY_SERVICE = 'https://bsky.social'
const DEFAULT_CHAT_PROXY_DID = 'did:web:api.bsky.chat'
const DEFAULT_CHAT_SERVICE_URL = 'https://api.bsky.chat'
const CHAT_PROXY_SERVICE_SUFFIX = '#bsky_chat'
const CHAT_PROXY_HEADER_VALUE = resolveChatProxyHeader()
const CHAT_SERVICE_HEADERS = Object.freeze({ 'atproto-proxy': CHAT_PROXY_HEADER_VALUE })
let chatProxyFailed = false
let cachedChatServiceBaseUrl = null
let chatUnreadPollingDisabled = false

function clampNumber (value, min, max, fallback) {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    if (numeric < min) return min
    if (numeric > max) return max
    return numeric
  }
  return fallback
}

function randomId () {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `id-${Math.random().toString(16).slice(2)}`
}

function createListEntryId (base = '', context = '') {
  const normalizedBase = String(base || '')
  const normalizedContext = String(context || 'ctx')
  if (!normalizedBase && !normalizedContext) {
    return randomId()
  }
  return `${normalizedBase || randomId()}::${normalizedContext}`
}

function resolveChatProxyHeader () {
  const overrideHeader = normalizeStringConfigValue(GLOBAL_SCOPE?.__BSKY_CHAT_PROXY_HEADER__)
  const overrideDid = normalizeStringConfigValue(GLOBAL_SCOPE?.__BSKY_CHAT_PROXY_DID__)
  const candidate = overrideHeader || overrideDid
  const normalized = normalizeChatProxyHeader(candidate)
  if (normalized) return normalized
  return `${DEFAULT_CHAT_PROXY_DID}${CHAT_PROXY_SERVICE_SUFFIX}`
}

function normalizeChatProxyHeader (value) {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  if (trimmed.includes('#')) return trimmed
  return `${trimmed}${CHAT_PROXY_SERVICE_SUFFIX}`
}

function normalizeStringConfigValue (value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed || ''
}

function resolveChatServiceBaseUrl () {
  if (cachedChatServiceBaseUrl) return cachedChatServiceBaseUrl
  const override = normalizeStringConfigValue(GLOBAL_SCOPE?.__BSKY_CHAT_SERVICE_URL__)
  const candidates = [override, DEFAULT_CHAT_SERVICE_URL].filter(Boolean)
  for (const entry of candidates) {
    try {
      const url = new URL(entry)
      cachedChatServiceBaseUrl = url
      return cachedChatServiceBaseUrl
    } catch {
      continue
    }
  }
  throw new Error('Keine gültige Chat-Service-URL gefunden.')
}

function shouldFallbackToDirectChat (error) {
  if (!error) return false
  const status = Number(error?.status ?? error?.statusCode)
  if (status === 404) return true
  const errorCode = (error?.error || error?.data?.error || '').toLowerCase()
  if (errorCode === 'xrpcnotsupported') return true
  const message = (error?.message || '').toLowerCase()
  if (message.includes('xrpcnotsupported')) return true
  return false
}

function transformChatApiError (error) {
  const errorCode = (error?.error || error?.data?.error || '').toLowerCase()
  const message = (error?.message || '').toLowerCase()
  if (errorCode === 'invalidtoken' || message.includes('bad token method')) {
    return new Error('Chat-API derzeit nicht verfügbar (Bluesky rollt Chats noch aus).')
  }
  return error
}

function isChatFeatureUnavailableError (error) {
  if (!error) return false
  const status = Number(error?.status ?? error?.statusCode)
  if ([400, 401, 403, 404].includes(status)) return true
  const code = (error?.error || error?.data?.error || '').toLowerCase()
  if (code === 'xrpcnotsupported' || code === 'featuredisabled') return true
  const message = (error?.message || '').toLowerCase()
  if (!message) return false
  return (
    message.includes('chat-api derzeit nicht verfügbar') ||
    message.includes('chat api currently unavailable') ||
    message.includes('chat-api')
  )
}

function buildChatServiceUrl (nsid, params) {
  const baseUrl = resolveChatServiceBaseUrl()
  const url = new URL(`/xrpc/${nsid}`, baseUrl)
  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue
      const serialized = typeof value === 'string' ? value : String(value)
      if (serialized) url.searchParams.set(key, serialized)
    }
  }
  return url
}

async function callChatServiceDirect ({ nsid, httpMethod = 'GET', params, body }) {
  if (typeof fetch !== 'function') {
    throw new Error('Chat-API erfordert eine Fetch-Implementierung.')
  }
  const agent = assertActiveAgent()
  const accessToken = agent.session?.accessJwt
  if (!accessToken) {
    throw new Error('Chat-API erfordert eine authentifizierte Session.')
  }
  const url = buildChatServiceUrl(nsid, params)
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`
  }
  let payload
  if (body && Object.keys(body).length > 0) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const response = await fetch(url.toString(), {
    method: httpMethod,
    headers,
    body: payload
  })
  const responseText = await response.text()
  let data = null
  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      data = null
    }
  }
  if (!response.ok) {
    const error = new Error(data?.message || `Chat-API-Aufruf ${nsid} fehlgeschlagen (${response.status})`)
    error.status = response.status
    error.error = data?.error
    throw error
  }
  return data || {}
}

async function executeChatRequest (operation, fallbackRequest) {
  if (!chatProxyFailed && typeof operation === 'function') {
    try {
      const res = await operation()
      return res?.data ?? res ?? {}
    } catch (error) {
      if (!shouldFallbackToDirectChat(error)) {
        throw error
      }
      chatProxyFailed = true
      console.info('Chat-Proxy via Hauptservice nicht verfügbar, nutze direkten Chat-Service.', error)
    }
  }
  if (!fallbackRequest) {
    throw new Error('Kein Chat-Fallback verfügbar.')
  }
  return callChatServiceDirect(fallbackRequest)
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

function mapFeedEntry (entry, { context = 'timeline' } = {}) {
  if (!entry) return null
  const post = entry.post || entry
  const record = post?.record || {}
  const author = post?.author || {}
  const baseIdentifier = post?.uri || post?.cid || context
  const reasonContext = entry?.reason?.indexedAt || entry?.reason?.$type || context
  return {
    uri: post?.uri || null,
    cid: post?.cid || null,
    text: record?.text || '',
    createdAt: record?.createdAt || post?.indexedAt || null,
    listEntryId: createListEntryId(baseIdentifier, reasonContext),
    author: {
      handle: author?.handle || '',
      did: author?.did || '',
      displayName: author?.displayName || author?.handle || '',
      avatar: author?.avatar || null
    },
    stats: {
      likeCount: post?.likeCount ?? 0,
      repostCount: post?.repostCount ?? 0,
      replyCount: post?.replyCount ?? 0
    },
    viewer: post?.viewer || null,
    raw: entry
  }
}

function mapBookmarkEntry (bookmarkEntry, { context = 'bookmark' } = {}) {
  if (!bookmarkEntry || !bookmarkEntry.item) return null
  const item = bookmarkEntry.item
  const itemType = String(item?.$type || '')
  if (itemType.endsWith('#blockedPost') || itemType.endsWith('#notFoundPost')) {
    return null
  }
  const feedEntry = item?.post ? item : { post: item }
  const mapped = mapFeedEntry(feedEntry, { context })
  if (!mapped) return null
  const viewer = { ...(mapped.viewer || {}) }
  viewer.bookmarked = true
  mapped.viewer = viewer
  mapped.raw = { ...(mapped.raw || {}), bookmark: bookmarkEntry, item }
  mapped.listEntryId = mapped.listEntryId || createListEntryId(bookmarkEntry?.subject?.uri || mapped.uri || '', context)
  return mapped
}

function mapBlockedProfile (entry, { context = 'block-list' } = {}) {
  if (!entry) return null
  const subject = entry.subject || entry.profile || entry
  const did = subject?.did || ''
  const handle = subject?.handle || ''
  const listEntryId = createListEntryId(did || handle || randomId(), context)
  return {
    did,
    handle,
    displayName: subject?.displayName || handle || did,
    avatar: subject?.avatar || null,
    description: subject?.description || '',
    indexedAt: entry.indexedAt || subject?.indexedAt || null,
    createdAt: subject?.createdAt || null,
    listEntryId,
    blockUri: entry?.uri || null,
    viewer: subject?.viewer ? { ...subject.viewer } : null
  }
}

function mapChatProfile (profile, { context = 'chat-member' } = {}) {
  if (!profile) return null
  const did = profile.did || ''
  const handle = profile.handle || ''
  const label = profile.displayName || handle || did || ''
  return {
    id: did || handle || createListEntryId('member', context),
    did,
    handle,
    displayName: profile.displayName || '',
    avatar: profile.avatar || null,
    chatDisabled: Boolean(profile.chatDisabled),
    viewer: profile.viewer || null,
    labels: profile.labels || null,
    associated: profile.associated || null,
    label
  }
}

function mapChatMessageView (message) {
  if (!message) return null
  const base = {
    id: message.id || null,
    rev: message.rev || null,
    sentAt: message.sentAt || null,
    senderDid: message.sender?.did || null
  }
  const type = message.$type || ''
  if (type === 'chat.bsky.convo.defs#deletedMessageView') {
    return {
      ...base,
      type: 'deleted'
    }
  }
  const text = typeof message.text === 'string' ? message.text : ''
  return {
    ...base,
    type: 'message',
    text,
    facets: Array.isArray(message.facets) ? message.facets : null,
    hasEmbed: Boolean(message.embed),
    reactions: Array.isArray(message.reactions) ? message.reactions : null
  }
}

function mapChatReactionView (reactionEntry) {
  if (!reactionEntry) return null
  const message = mapChatMessageView(reactionEntry.message)
  const reaction = reactionEntry.reaction || {}
  return {
    message,
    reaction: {
      value: reaction.value || '',
      createdAt: reaction.createdAt || null,
      senderDid: reaction.sender?.did || null
    }
  }
}

function mapConversationEntry (convo, { context = 'chat', currentDid } = {}) {
  if (!convo) return null
  const members = Array.isArray(convo.members) ? convo.members.map((member, index) => (
    mapChatProfile(member, { context: `${context}:member:${index}` })
  )).filter(Boolean) : []
  const lastMessage = mapChatMessageView(convo.lastMessage)
  const lastReaction = mapChatReactionView(convo.lastReaction)
  const lastActivityAt = lastMessage?.sentAt || lastReaction?.reaction?.createdAt || null
  return {
    id: convo.id || createListEntryId('chat', context),
    rev: convo.rev || null,
    members,
    muted: Boolean(convo.muted),
    status: convo.status || 'accepted',
    unreadCount: Number(convo.unreadCount) || 0,
    lastMessage,
    lastReaction,
    lastActivityAt,
    currentDid: currentDid || null
  }
}

function buildOfficialFeedList () {
  return OFFICIAL_FEEDS.map((feed) => ({
    id: feed.id,
    label: feed.label,
    type: feed.type,
    value: feed.value,
    feedUri: feed.feedUri || null,
    origin: 'official'
  }))
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
  if (entry.promise) return entry.promise
  feedMetaGlobalCache.delete(cacheKey)
  return null
}

function storeGlobalFeedMeta (cacheKey, data, ttlMs) {
  if (!cacheKey) return
  feedMetaGlobalCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + Math.max(0, Number(ttlMs) || 0)
  })
}

function readGlobalListMeta (cacheKey) {
  if (!cacheKey) return null
  const entry = listMetaGlobalCache.get(cacheKey)
  if (!entry) return null
  if (entry.data) {
    if (!entry.expiresAt || entry.expiresAt > Date.now()) {
      return entry.data
    }
    listMetaGlobalCache.delete(cacheKey)
    return null
  }
  if (entry.promise) return entry.promise
  listMetaGlobalCache.delete(cacheKey)
  return null
}

function storeGlobalListMeta (cacheKey, data, ttlMs) {
  if (!cacheKey) return
  listMetaGlobalCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + Math.max(0, Number(ttlMs) || 0)
  })
}

async function loadFeedMetadata (agent, feedUri, metaCache) {
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
    const res = await agent.app.bsky.feed.getFeedGenerator({ feed: feedUri })
    const data = res?.data ?? res ?? {}
    const view = data.view || {}
    return {
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
      isOnline: !data?.isOffline,
      isValid: Boolean(view),
      status: data?.isValid === false ? 'invalid' : 'ok'
    }
  })()
  if (cacheKey) {
    feedMetaGlobalCache.set(cacheKey, { promise: fetchPromise })
  }
  try {
    const meta = await fetchPromise
    metaCache.set(cacheKey, meta)
    if (cacheKey) storeGlobalFeedMeta(cacheKey, meta, FEED_META_CACHE_TTL_MS)
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
      status: error?.status === 404 || error?.statusCode === 404 ? 'not-found' : 'error'
    }
    metaCache.set(cacheKey, fallback)
    if (cacheKey) storeGlobalFeedMeta(cacheKey, fallback, FEED_META_ERROR_TTL_MS)
    // Error-Details vorerst nicht in die UI pushen.
    return fallback
  }
}

async function loadListMetadata (agent, listUri, metaCache) {
  const cacheKey = listUri || ''
  if (cacheKey && metaCache.has(cacheKey)) {
    return metaCache.get(cacheKey)
  }
  if (cacheKey) {
    const globalEntry = readGlobalListMeta(cacheKey)
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
  if (!listUri) {
    return {
      displayName: 'Liste',
      description: '',
      avatar: null,
      creator: null,
      isValid: false,
      status: 'unknown'
    }
  }
  const fetchPromise = (async () => {
    const res = await agent.app.bsky.graph.getList({ list: listUri, limit: 1 })
    const data = res?.data ?? res ?? {}
    const list = data.list || {}
    return {
      displayName: list.name || 'Liste',
      description: list.description || '',
      avatar: list.avatar || null,
      creator: list.creator
        ? {
            did: list.creator.did || '',
            handle: list.creator.handle || '',
            displayName: list.creator.displayName || list.creator.handle || ''
          }
        : null,
      isValid: Boolean(list),
      status: list?.name ? 'ok' : 'unknown'
    }
  })()
  if (cacheKey) {
    listMetaGlobalCache.set(cacheKey, { promise: fetchPromise })
  }
  try {
    const meta = await fetchPromise
    metaCache.set(cacheKey, meta)
    if (cacheKey) storeGlobalListMeta(cacheKey, meta, FEED_META_CACHE_TTL_MS)
    return meta
  } catch (error) {
    const fallback = {
      displayName: 'Liste',
      description: '',
      avatar: null,
      creator: null,
      isValid: false,
      status: error?.status === 404 || error?.statusCode === 404 ? 'not-found' : 'error'
    }
    metaCache.set(cacheKey, fallback)
    if (cacheKey) storeGlobalListMeta(cacheKey, fallback, FEED_META_ERROR_TTL_MS)
    // Error-Details vorerst nicht in die UI pushen.
    return fallback
  }
}

async function hydrateSavedFeedList (entries = [], { agent, metaCache }) {
  if (!Array.isArray(entries) || entries.length === 0) return []
  const result = []
  for (let i = 0; i < entries.length; i += FEED_META_BATCH_SIZE) {
    const chunk = entries.slice(i, i + FEED_META_BATCH_SIZE)
    const chunkResults = await Promise.all(
      chunk.map((entry) => hydrateSavedFeed(entry, { agent, metaCache }))
    )
    result.push(...chunkResults)
  }
  return result
}

async function hydrateSavedFeed (entry, { agent, metaCache }) {
  if (!entry) return null
  if (entry.type === 'timeline') {
    const label = entry.displayName || entry.name || TIMELINE_LABELS[entry.value] || entry.value || 'Timeline'
    return {
      id: entry.id,
      type: entry.type,
      value: entry.value,
      feedUri: null,
      pinned: Boolean(entry.pinned),
      displayName: label,
      description: '',
      avatar: entry.avatar || null,
      creator: null,
      likeCount: null,
      isOnline: true,
      isValid: true,
      status: 'ok'
    }
  }
  if (entry.type === 'feed') {
    const meta = await loadFeedMetadata(agent, entry.value, metaCache)
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
  if (entry.type === 'list') {
    const meta = await loadListMetadata(agent, entry.value, metaCache)
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
      likeCount: null,
      isOnline: true,
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
    displayName: entry.name || entry.displayName || entry.value || entry.uri || 'Unbekannter Feed',
    description: '',
    avatar: null,
    creator: null,
    likeCount: null,
    isOnline: false,
    isValid: false,
    status: 'unknown'
  }
}

async function buildFeedListsFromSavedFeeds (savedFeeds = [], { agent }) {
  const metaCache = new Map()
  const errors = []
  const pinnedEntries = await hydrateSavedFeedList(savedFeeds.filter((entry) => entry?.pinned), {
    agent,
    metaCache
  })
  const savedEntries = await hydrateSavedFeedList(savedFeeds.filter((entry) => !entry?.pinned), {
    agent,
    metaCache
  })
  return {
    pinned: pinnedEntries.filter(Boolean),
    saved: savedEntries.filter(Boolean),
    errors
  }
}

function findSavedFeed (savedFeeds = [], type, value) {
  return savedFeeds.find((entry) => entry?.type === type && entry?.value === value) || null
}

function orderSavedFeeds (savedFeeds = [], pinnedOrder = []) {
  const list = Array.isArray(savedFeeds) ? savedFeeds.slice() : []
  const pinned = list.filter((entry) => entry?.pinned)
  const others = list.filter((entry) => !entry?.pinned)
  const pinnedMap = new Map()
  pinned.forEach((entry) => {
    if (entry?.id) pinnedMap.set(entry.id, entry)
  })
  const seen = new Set()
  const orderedPinned = []
  const addPinned = (entry) => {
    if (!entry || !entry.id || seen.has(entry.id)) return
    orderedPinned.push(entry)
    seen.add(entry.id)
  }
  const following = pinned.find((entry) => entry.type === 'timeline' && entry.value === TIMELINE_FOLLOWING_VALUE)
  addPinned(following)
  pinnedOrder.forEach((id) => {
    const entry = typeof id === 'string' ? pinnedMap.get(id) : null
    if (entry) addPinned(entry)
  })
  pinned.forEach((entry) => addPinned(entry))
  return orderedPinned.concat(others)
}

async function persistOrderedFeeds (agent, savedFeeds = [], pinnedOrder = []) {
  const ordered = orderSavedFeeds(savedFeeds, pinnedOrder)
  return agent.overwriteSavedFeeds(ordered)
}

function normalizeFeedUri (value) {
  return String(value || '').trim()
}

async function getSavedFeedsPreference (agent) {
  const prefs = await resolveAgentPreferences(agent)
  if (Array.isArray(prefs?.savedFeeds)) return prefs.savedFeeds
  const list = Array.isArray(prefs?.preferences) ? prefs.preferences : []
  const savedPref = list.find((entry) => (
    entry?.$type === 'app.bsky.actor.defs#savedFeedsPref' ||
    entry?.$type === 'app.bsky.actor.defs#savedFeedsV2' ||
    entry?.type === 'savedFeeds'
  ))
  return Array.isArray(savedPref?.savedFeeds) ? savedPref.savedFeeds : []
}

async function buildFeedResponseFromSavedFeeds (agent, savedFeeds) {
  const lists = await buildFeedListsFromSavedFeeds(savedFeeds, { agent })
  return {
    official: buildOfficialFeedList(),
    pinned: lists.pinned,
    saved: lists.saved,
    errors: lists.errors
  }
}

async function fetchFeedsDirect () {
  const agent = assertActiveAgent()
  const savedFeeds = await getSavedFeedsPreference(agent)
  return buildFeedResponseFromSavedFeeds(agent, savedFeeds)
}

async function pinFeedDirect ({ feedUri }) {
  const normalized = normalizeFeedUri(feedUri)
  if (!normalized) {
    throw new Error('feedUri erforderlich')
  }
  const agent = assertActiveAgent()
  let savedFeeds = await getSavedFeedsPreference(agent)
  const target = findSavedFeed(savedFeeds, 'feed', normalized)
  if (!target) {
    savedFeeds = await agent.addSavedFeeds([{ type: 'feed', value: normalized, pinned: true }])
  } else if (!target.pinned) {
    savedFeeds = await agent.updateSavedFeeds([{ ...target, pinned: true }])
  } else {
    return buildFeedResponseFromSavedFeeds(agent, savedFeeds)
  }
  const ordered = await persistOrderedFeeds(agent, savedFeeds)
  return buildFeedResponseFromSavedFeeds(agent, ordered)
}

async function unpinFeedDirect ({ feedUri }) {
  const normalized = normalizeFeedUri(feedUri)
  if (!normalized) {
    throw new Error('feedUri erforderlich')
  }
  const agent = assertActiveAgent()
  const savedFeeds = await getSavedFeedsPreference(agent)
  const target = findSavedFeed(savedFeeds, 'feed', normalized)
  if (!target) {
    throw new Error('Feed nicht gefunden.')
  }
  if (!target.pinned) {
    return buildFeedResponseFromSavedFeeds(agent, savedFeeds)
  }
  const updated = await agent.updateSavedFeeds([{ ...target, pinned: false }])
  const ordered = await persistOrderedFeeds(agent, updated)
  return buildFeedResponseFromSavedFeeds(agent, ordered)
}

async function reorderPinnedFeedsDirect ({ order }) {
  if (!Array.isArray(order) || order.length === 0) {
    throw new Error('order erforderlich')
  }
  const agent = assertActiveAgent()
  const savedFeeds = await getSavedFeedsPreference(agent)
  const ordered = await persistOrderedFeeds(agent, savedFeeds, order)
  return buildFeedResponseFromSavedFeeds(agent, ordered)
}

async function loadBlockedByStates (agent, blocks = []) {
  if (!agent || !Array.isArray(blocks) || blocks.length === 0) {
    return null
  }
  const dids = Array.from(new Set(
    blocks
      .map((entry) => entry?.did)
      .filter((did) => typeof did === 'string' && did.length > 0)
  ))
  if (dids.length === 0) {
    return null
  }
  const blockedByMap = new Map()
  for (let index = 0; index < dids.length; index += PROFILE_BATCH_SIZE) {
    const batch = dids.slice(index, index + PROFILE_BATCH_SIZE)
    try {
      const res = await agent.app.bsky.actor.getProfiles({ actors: batch })
      const profiles = Array.isArray(res?.data?.profiles) ? res.data.profiles : []
      for (const profile of profiles) {
        if (profile?.viewer?.blockedBy && profile?.did) {
          blockedByMap.set(profile.did, true)
        }
      }
    } catch (error) {
      console.warn('loadBlockedByStates: getProfiles fehlgeschlagen', error)
    }
  }
  return blockedByMap
}

async function fetchBlocksDirect ({ cursor, limit } = {}) {
  const agent = assertActiveAgent()
  const safeLimit = clampNumber(limit, 1, 100, 50)
  const params = { limit: safeLimit }
  if (cursor) params.cursor = cursor
  const res = await agent.app.bsky.graph.getBlocks(params)
  const data = res?.data ?? res ?? {}
  const entries = Array.isArray(data?.blocks) ? data.blocks : []
  const blocks = entries
    .map((entry, index) => mapBlockedProfile(entry, { context: `blocks:${index}` }))
    .filter(Boolean)
  if (blocks.length) {
    try {
      const blockedByMap = await loadBlockedByStates(agent, blocks)
      if (blockedByMap?.size) {
        for (const entry of blocks) {
          const did = entry?.did
          if (!did || !blockedByMap.has(did)) continue
          entry.viewer = { ...(entry.viewer || {}), blockedBy: true }
        }
      }
    } catch (error) {
      console.warn('fetchBlocksDirect: BlockedBy-Fallback fehlgeschlagen', error)
    }
  }
  return {
    blocks,
    cursor: data?.cursor || null
  }
}

async function fetchChatConversationsDirect ({ cursor, limit, readState, status } = {}) {
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  const safeLimit = clampNumber(limit, 1, 50, 25)
  const params = { limit: safeLimit }
  if (cursor) params.cursor = cursor
  if (readState) params.readState = readState
  if (status) params.status = status
  let data
  try {
    data = await executeChatRequest(
      convoApi?.listConvos ? () => convoApi.listConvos(params, { headers: CHAT_SERVICE_HEADERS }) : null,
      { nsid: 'chat.bsky.convo.listConvos', httpMethod: 'GET', params }
    )
  } catch (error) {
    throw transformChatApiError(error)
  }
  const convos = Array.isArray(data?.convos) ? data.convos : []
  const currentDid = agent.session?.did || null
  const conversations = convos
    .map((convo, index) => mapConversationEntry(convo, { context: `chat:${index}`, currentDid }))
    .filter(Boolean)
  return {
    conversations,
    cursor: data?.cursor || null
  }
}

async function fetchChatLogsDirect ({ cursor } = {}) {
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  let data
  try {
    data = await executeChatRequest(
      convoApi?.getLog ? () => convoApi.getLog(cursor ? { cursor } : {}, { headers: CHAT_SERVICE_HEADERS }) : null,
      { nsid: 'chat.bsky.convo.getLog', httpMethod: 'GET', params: cursor ? { cursor } : {} }
    )
  } catch (error) {
    throw transformChatApiError(error)
  }
  return {
    logs: Array.isArray(data?.logs) ? data.logs : [],
    cursor: data?.cursor || null
  }
}

async function fetchChatConversationDirect ({ convoId } = {}) {
  if (!convoId) {
    throw new Error('conversationId ist erforderlich.')
  }
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  let data
  try {
    data = await executeChatRequest(
      convoApi?.getConvo ? () => convoApi.getConvo({ convoId }, { headers: CHAT_SERVICE_HEADERS }) : null,
      { nsid: 'chat.bsky.convo.getConvo', httpMethod: 'GET', params: { convoId } }
    )
  } catch (error) {
    throw transformChatApiError(error)
  }
  const convo = data?.convo ? mapConversationEntry(data.convo, { context: `chat:${convoId}`, currentDid: agent.session?.did }) : null
  return { conversation: convo }
}

async function fetchChatMessagesDirect ({ convoId, cursor, limit } = {}) {
  if (!convoId) {
    throw new Error('conversationId ist erforderlich.')
  }
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  const safeLimit = clampNumber(limit, 1, 50, 30)
  const params = { convoId, limit: safeLimit }
  if (cursor) params.cursor = cursor
  let data
  try {
    data = await executeChatRequest(
      convoApi?.getMessages ? () => convoApi.getMessages(params, { headers: CHAT_SERVICE_HEADERS }) : null,
      { nsid: 'chat.bsky.convo.getMessages', httpMethod: 'GET', params }
    )
  } catch (error) {
    throw transformChatApiError(error)
  }
  const messagesRaw = Array.isArray(data?.messages) ? data.messages : []
  const messages = messagesRaw.map((entry) => mapChatMessageView(entry)).filter(Boolean)
  return {
    messages,
    cursor: data?.cursor || null
  }
}

async function sendChatMessageDirect ({ convoId, text }) {
  if (!convoId) {
    throw new Error('conversationId ist erforderlich.')
  }
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) {
    throw new Error('Der Nachrichtentext darf nicht leer sein.')
  }
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  const payload = {
    convoId,
    message: {
      text: trimmed
    }
  }
  try {
    const data = await executeChatRequest(
      convoApi?.sendMessage ? () => convoApi.sendMessage(payload, { headers: CHAT_SERVICE_HEADERS, encoding: 'application/json' }) : null,
      { nsid: 'chat.bsky.convo.sendMessage', httpMethod: 'POST', body: payload }
    )
    const message = mapChatMessageView(data)
    return { message }
  } catch (error) {
    throw transformChatApiError(error)
  }
}

async function updateChatReadStateDirect ({ convoId, messageId } = {}) {
  if (!convoId) {
    throw new Error('conversationId ist erforderlich.')
  }
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  const payload = { convoId }
  if (messageId) payload.messageId = messageId
  try {
    const data = await executeChatRequest(
      convoApi?.updateRead ? () => convoApi.updateRead(payload, { headers: CHAT_SERVICE_HEADERS, encoding: 'application/json' }) : null,
      { nsid: 'chat.bsky.convo.updateRead', httpMethod: 'POST', body: payload }
    )
    const convo = data?.convo
    return {
      conversation: convo ? mapConversationEntry(convo, { context: `chat:${convoId}`, currentDid: agent.session?.did }) : null
    }
  } catch (error) {
    throw transformChatApiError(error)
  }
}

async function addChatReactionDirect ({ convoId, messageId, value } = {}) {
  if (!convoId) {
    throw new Error('conversationId ist erforderlich.')
  }
  if (!messageId) {
    throw new Error('messageId ist erforderlich.')
  }
  const reaction = typeof value === 'string' ? value.trim() : ''
  if (!reaction) {
    throw new Error('Reaktion darf nicht leer sein.')
  }
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  const payload = { convoId, messageId, value: reaction }
  try {
    const data = await executeChatRequest(
      convoApi?.addReaction ? () => convoApi.addReaction(payload, { headers: CHAT_SERVICE_HEADERS, encoding: 'application/json' }) : null,
      { nsid: 'chat.bsky.convo.addReaction', httpMethod: 'POST', body: payload }
    )
    return { message: mapChatMessageView(data?.message) }
  } catch (error) {
    throw transformChatApiError(error)
  }
}

async function removeChatReactionDirect ({ convoId, messageId, value } = {}) {
  if (!convoId) {
    throw new Error('conversationId ist erforderlich.')
  }
  if (!messageId) {
    throw new Error('messageId ist erforderlich.')
  }
  const reaction = typeof value === 'string' ? value.trim() : ''
  if (!reaction) {
    throw new Error('Reaktion darf nicht leer sein.')
  }
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  const payload = { convoId, messageId, value: reaction }
  try {
    const data = await executeChatRequest(
      convoApi?.removeReaction ? () => convoApi.removeReaction(payload, { headers: CHAT_SERVICE_HEADERS, encoding: 'application/json' }) : null,
      { nsid: 'chat.bsky.convo.removeReaction', httpMethod: 'POST', body: payload }
    )
    return { message: mapChatMessageView(data?.message) }
  } catch (error) {
    throw transformChatApiError(error)
  }
}

async function fetchChatUnreadSnapshotDirect () {
  const agent = assertActiveAgent()
  const convoApi = agent.chat?.bsky?.convo
  let cursor = null
  let totalUnread = 0
  let loops = 0
  const MAX_LOOPS = 5
  do {
    const params = { limit: 50 }
    if (cursor) params.cursor = cursor
    let data
    try {
      data = await executeChatRequest(
        convoApi?.listConvos ? () => convoApi.listConvos(params, { headers: CHAT_SERVICE_HEADERS }) : null,
        { nsid: 'chat.bsky.convo.listConvos', httpMethod: 'GET', params }
      )
    } catch (error) {
      throw transformChatApiError(error)
    }
    const convos = Array.isArray(data?.convos) ? data.convos : []
    for (const convo of convos) {
      totalUnread += Number(convo?.unreadCount) || 0
    }
    cursor = data?.cursor || null
    loops += 1
  } while (cursor && loops < MAX_LOOPS)
  return { unreadCount: totalUnread }
}

async function fetchBookmarksDirect ({ cursor, limit } = {}) {
  const agent = assertActiveAgent()
  const safeLimit = clampNumber(limit, 1, 50, 50)
  const params = { limit: safeLimit }
  if (cursor) params.cursor = cursor
  const res = await agent.app.bsky.bookmark.getBookmarks(params)
  const data = res?.data ?? res ?? {}
  const entries = Array.isArray(data?.bookmarks) ? data.bookmarks : []
  const items = entries
    .map((entry, index) => mapBookmarkEntry(entry, { context: `bookmark:${index}` }))
    .filter(Boolean)
  return {
    items,
    cursor: data?.cursor || null
  }
}

function normalizeNotificationActor (entry) {
  if (!entry || typeof entry !== 'object') return null
  const author = entry.author || {}
  const handle = author.handle || ''
  const did = author.did || ''
  const displayName = author.displayName || handle || ''
  const avatar = author.avatar || null
  if (!handle && !did && !displayName && !avatar) return null
  return { handle, did, displayName, avatar }
}

function getNotificationActorKey (actor) {
  if (!actor || typeof actor !== 'object') return ''
  return actor.did || actor.handle || actor.displayName || ''
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
    const actor = normalizeNotificationActor(entry)
    if (key && groupMap.has(key)) {
      const bucket = groupMap.get(key)
      bucket.additionalCount += 1
      if (actor) {
        const actorKey = getNotificationActorKey(actor)
        if (!bucket.actorIds) bucket.actorIds = new Set()
        if (!actorKey || !bucket.actorIds.has(actorKey)) {
          if (actorKey) bucket.actorIds.add(actorKey)
          bucket.actors.push(actor)
        }
      }
      continue
    }
    const bucket = {
      entry,
      additionalCount: 0,
      actors: actor ? [actor] : []
    }
    if (actor) {
      const actorKey = getNotificationActorKey(actor)
      if (actorKey) bucket.actorIds = new Set([actorKey])
    }
    grouped.push(bucket)
    if (key) groupMap.set(key, bucket)
  }
  return grouped
}

function mapNotificationEntry (entry, subjectMap, { additionalCount = 0, actors = null } = {}) {
  if (!entry) return null
  const author = entry.author || {}
  const record = entry.record || {}
  const reasonSubject = entry.reasonSubject || null
  let subject = null
  if (subjectMap instanceof Map) {
    if (reasonSubject && subjectMap.has(reasonSubject)) {
      subject = subjectMap.get(reasonSubject)
    }
    if (!subject) {
      const recordSubjectUri = record?.subject?.uri
      if (recordSubjectUri && subjectMap.has(recordSubjectUri)) {
        subject = subjectMap.get(recordSubjectUri)
      }
    }
  }
  const entryActor = normalizeNotificationActor(entry)
  const normalizedActors = Array.isArray(actors) && actors.length
    ? actors
    : (entryActor ? [entryActor] : [])
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
    actors: normalizedActors,
    additionalCount
  }
  const baseIdentifier = entry.uri || entry.cid || entry.groupKey || `${entry.reason || 'notification'}:${reasonSubject || ''}`
  const contextIdentifier = entry.indexedAt || reasonSubject || record?.subject?.uri || `notification:${author?.did || ''}`
  baseEntry.listEntryId = createListEntryId(baseIdentifier, contextIdentifier)

  if (additionalCount > 0) {
    baseEntry.groupKey = `group:${baseEntry.reason}:${baseEntry.reasonSubject}`
    baseEntry.uri = null
    baseEntry.cid = null
    baseEntry.listEntryId = createListEntryId(baseEntry.groupKey, `${baseEntry.reason || 'group'}:${baseEntry.reasonSubject || ''}:${baseEntry.indexedAt || ''}`)
  }

  return baseEntry
}

function isPostUri (value) {
  return typeof value === 'string' && value.startsWith('at://')
}

function collectNotificationSubjectUris (notifications = []) {
  const set = new Set()
  notifications.forEach((entry) => {
    if (!entry) return
    const rs = entry.reasonSubject
    if (isPostUri(rs)) set.add(rs)
    const recordSubjectUri = entry?.record?.subject?.uri
    if (isPostUri(recordSubjectUri)) set.add(recordSubjectUri)
  })
  return Array.from(set)
}

async function fetchNotificationSubjects (agent, notifications = []) {
  const subjectUris = collectNotificationSubjectUris(notifications)
  if (!subjectUris.length || !agent?.app?.bsky?.feed?.getPosts) {
    return new Map()
  }
  const chunkSize = 25
  const mapped = new Map()
  for (let i = 0; i < subjectUris.length; i += chunkSize) {
    const chunk = subjectUris.slice(i, i + chunkSize)
    try {
      const res = await agent.app.bsky.feed.getPosts({ uris: chunk })
      const posts = Array.isArray(res?.data?.posts) ? res.data.posts : []
      posts
        .map(mapPostView)
        .filter((entry) => entry?.uri)
        .forEach((entry) => {
          mapped.set(entry.uri, entry)
        })
    } catch (error) {
      console.warn('Failed to fetch notification subjects', error)
    }
  }
  return mapped
}

async function fetchReplyReactions (agent, notifications = []) {
  if (!agent?.app?.bsky?.feed?.getPostThread) return new Map()
  const targets = Array.from(
    new Set(
      notifications
        .filter((entry) => entry?.reason === 'reply' && entry?.uri)
        .map((entry) => entry.uri)
    )
  )
  if (!targets.length) return new Map()
  const map = new Map()
  await Promise.all(targets.map(async (uri) => {
    try {
      const res = await agent.app.bsky.feed.getPostThread({ uri, depth: 0, parentHeight: 0 })
      const threadNode = res?.data?.thread
      if (!threadNode || threadNode.$type === 'app.bsky.feed.defs#notFoundPost') return
      const post = threadNode?.post || threadNode
      map.set(uri, {
        stats: {
          likeCount: post?.likeCount ?? 0,
          repostCount: post?.repostCount ?? 0,
          replyCount: post?.replyCount ?? 0
        },
        viewer: post?.viewer || null
      })
    } catch (error) {
      console.warn('Failed to fetch reactions for notification', error)
    }
  }))
  return map
}

function getActiveAgentInstance () {
  const client = getActiveBskyAgentClient()
  return client?.getAgent?.() || null
}

function assertActiveAgent () {
  const agent = getActiveAgentInstance()
  if (!agent) {
    throw new Error('Keine aktive Bluesky-Session verfügbar. Bitte erneut anmelden.')
  }
  return agent
}

function ensureAtUri (value, label = 'uri') {
  const normalized = String(value || '').trim()
  if (!normalized) {
    throw new Error(`${label} erforderlich`)
  }
  return normalized
}

function ensureCid (value) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    throw new Error('cid erforderlich')
  }
  return normalized
}

function normalizeActor (value) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error('actor erforderlich')
  return normalized
}

async function resolveAgentPreferences (agent) {
  if (!agent) {
    throw new Error('Keine aktive Bluesky-Session verfügbar. Bitte erneut anmelden.')
  }
  if (typeof agent.getPreferences === 'function') {
    return agent.getPreferences()
  }
  const res = await agent.app.bsky.actor.getPreferences()
  return res?.data || res
}

async function fetchNotificationPreferencesDirect () {
  const agent = assertActiveAgent()
  if (!agent?.app?.bsky?.notification?.getPreferences) {
    throw new Error('Notification-Preferences API nicht verfügbar.')
  }
  const res = await agent.app.bsky.notification.getPreferences()
  return res?.data || res
}

async function updateNotificationPreferencesDirect (patch = {}) {
  const agent = assertActiveAgent()
  if (!agent?.app?.bsky?.notification?.putPreferencesV2) {
    throw new Error('Notification-Preferences API nicht verfügbar.')
  }
  const res = await agent.app.bsky.notification.putPreferencesV2(patch)
  return res?.data || res
}

async function fetchActivitySubscriptionsDirect ({ limit = 50, cursor } = {}) {
  const agent = assertActiveAgent()
  if (!agent?.app?.bsky?.notification?.listActivitySubscriptions) {
    throw new Error('Activity-Subscriptions API nicht verfügbar.')
  }
  const res = await agent.app.bsky.notification.listActivitySubscriptions({ limit, cursor })
  return res?.data || res
}

async function updateActivitySubscriptionDirect ({ subject, activitySubscription } = {}) {
  const agent = assertActiveAgent()
  if (!agent?.app?.bsky?.notification?.putActivitySubscription) {
    throw new Error('Activity-Subscription API nicht verfügbar.')
  }
  const payload = {
    subject,
    activitySubscription
  }
  const res = await agent.app.bsky.notification.putActivitySubscription(payload)
  return res?.data || res
}

function cloneRules (rules = []) {
  return rules.map((rule) => ({ ...rule }))
}

function extractRecordKey (recordUri = '') {
  const parts = String(recordUri || '').split('/')
  return parts[parts.length - 1] || ''
}

function unwrapRepoWriteResult (result) {
  if (!result) return { uri: null, cid: null }
  const uri = result?.uri || result?.data?.uri || null
  const cid = result?.cid || result?.data?.cid || null
  return { uri, cid }
}

async function fetchReactionsDirect ({ uri }, { agent: providedAgent } = {}) {
  const agent = providedAgent || getActiveAgentInstance()
  if (!agent?.app?.bsky?.feed?.getPostThread) return null
  const targetUri = ensureAtUri(uri, 'uri')
  try {
    const res = await agent.app.bsky.feed.getPostThread({ uri: targetUri, depth: 0, parentHeight: 0 })
    const threadNode = res?.data?.thread
    if (!threadNode || threadNode.$type === 'app.bsky.feed.defs#notFoundPost') {
      const error = new Error('Thread nicht gefunden.')
      error.data = { code: 'BLSKY_REACTIONS_NOT_FOUND' }
      throw error
    }
    const post = threadNode?.post || threadNode
    return {
      likeCount: Number(post?.likeCount) || 0,
      repostCount: Number(post?.repostCount) || 0,
      replyCount: Number(post?.replyCount) || 0,
      viewer: post?.viewer || {}
    }
  } catch (error) {
    const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status)
    let code = 'BLSKY_REACTIONS_FAILED'
    if (status === 404) {
      code = 'BLSKY_REACTIONS_NOT_FOUND'
    } else if (status === 429) {
      code = 'BLSKY_REACTIONS_RATE_LIMITED'
    } else if (status === 401 || status === 403) {
      code = 'BLSKY_REACTIONS_UNAUTHORIZED'
    } else if (status === 400) {
      code = 'BLSKY_REACTIONS_URI_REQUIRED'
    }
    if (!error?.data) {
      error.data = { code }
    } else if (!error.data.code) {
      error.data.code = code
    }
    throw error
  }
}

function mapThreadNodeDirect (node) {
  if (!node || node.$type !== 'app.bsky.feed.defs#threadViewPost') return null
  const post = node.post || {}
  const author = post.author || {}
  const record = post.record || {}
  const listEntryId = createListEntryId(post.uri || post.cid || randomId(), record.createdAt || post.indexedAt || 'thread')
  const replies = Array.isArray(node.replies)
    ? node.replies
      .map(mapThreadNodeDirect)
      .filter(Boolean)
      .sort((a, b) => {
        const aTs = Date.parse(a?.createdAt || a?.raw?.post?.indexedAt || 0) || 0
        const bTs = Date.parse(b?.createdAt || b?.raw?.post?.indexedAt || 0) || 0
        return aTs - bTs
      })
    : []
  return {
    uri: post.uri || null,
    cid: post.cid || null,
    text: record.text || '',
    createdAt: record.createdAt || post.indexedAt || null,
    listEntryId,
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
    viewer: post.viewer || null,
    raw: { post },
    replies
  }
}

function extractParentChainDirect (node) {
  const parents = []
  let current = node?.parent
  while (current && current.$type === 'app.bsky.feed.defs#threadViewPost') {
    const mapped = mapThreadNodeDirect(current)
    if (mapped) parents.unshift(mapped)
    current = current.parent
  }
  return parents
}

async function fetchThreadDirect (uri, { depth = 40, parentHeight = 40 } = {}) {
  const agent = getActiveAgentInstance()
  if (!agent?.app?.bsky?.feed?.getPostThread) return null
  const targetUri = ensureAtUri(uri, 'uri')
  const res = await agent.app.bsky.feed.getPostThread({ uri: targetUri, depth, parentHeight })
  const threadNode = res?.data?.thread
  if (!threadNode || threadNode.$type !== 'app.bsky.feed.defs#threadViewPost') {
    const error = new Error('Thread nicht gefunden.')
    error.data = { code: 'BLSKY_THREAD_NOT_FOUND' }
    throw error
  }
  const focus = mapThreadNodeDirect(threadNode)
  if (!focus) {
    const error = new Error('Thread nicht gefunden.')
    error.data = { code: 'BLSKY_THREAD_NOT_FOUND' }
    throw error
  }
  const parents = extractParentChainDirect(threadNode)
  return { focus, parents }
}

async function fetchTimelineDirect ({ tab, feedUri, cursor, limit } = {}) {
  const client = getActiveBskyAgentClient()
  const agent = client?.getAgent?.()
  if (!agent) return null
  const safeLimit = clampNumber(limit, 1, 100, 30)
  const tabKey = String(tab || 'following').toLowerCase()
  const descriptor = TIMELINE_TAB_CONFIG[tabKey] || TIMELINE_TAB_CONFIG.following
  let data = null
  const targetFeed = feedUri || descriptor?.feedUri || null
  if (targetFeed && agent?.app?.bsky?.feed?.getFeed) {
    try {
      const res = await agent.app.bsky.feed.getFeed({ feed: targetFeed, limit: safeLimit, cursor })
      data = res?.data ?? res ?? null
    } catch (error) {
      console.warn('Feed generator failed, fallback to timeline', error)
    }
  }
  if (!data && agent?.app?.bsky?.feed?.getTimeline) {
    const res = await agent.app.bsky.feed.getTimeline({ limit: safeLimit, cursor })
    data = res?.data ?? res ?? null
  }
  if (!data) return null
  const feedEntries = Array.isArray(data?.feed) ? data.feed : []
  const items = feedEntries
    .map((entry, index) => mapFeedEntry(entry, { context: `timeline:${tabKey}:${index}` }))
    .filter(Boolean)
  return {
    items,
    cursor: data?.cursor || null
  }
}

async function listNotificationsRawDirect ({ cursor, filter, limit } = {}) {
  const client = getActiveBskyAgentClient()
  const agent = client?.getAgent?.()
  if (!agent) return null
  const safeLimit = clampNumber(limit, 1, 100, 40)
  const normalizedFilter = filter === 'mentions' ? 'mentions' : 'all'
  const request = { limit: safeLimit, cursor }
  let res = null

  if (normalizedFilter === 'mentions') {
    const reasons = getMentionsReasons()
    try {
      res = await agent.app.bsky.notification.listNotifications({ ...request, reasons })
    } catch (error) {
      const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status)
      if (status !== 400) throw error
      res = await agent.app.bsky.notification.listNotifications(request)
    }
  } else {
    res = await agent.app.bsky.notification.listNotifications(request)
  }

  const data = res?.data ?? res ?? {}
  let notifications = Array.isArray(data?.notifications) ? data.notifications : []
  const fallbackUnread = notifications.reduce((sum, entry) => sum + (entry?.isRead ? 0 : 1), 0)
  const unreadCount = Number(data?.unreadCount) || fallbackUnread

  if (normalizedFilter === 'mentions') {
    notifications = notifications.filter(isMentionNotification)
  }

  return {
    notifications,
    cursor: data?.cursor || null,
    unreadCount,
    seenAt: data?.seenAt || null
  }
}

async function fetchNotificationsDirect ({ cursor, markSeen, filter, limit } = {}) {
  const client = getActiveBskyAgentClient()
  const agent = client?.getAgent?.()
  if (!agent) return null
  const normalizedFilter = filter === 'mentions' ? 'mentions' : 'all'
  const raw = await listNotificationsRawDirect({ cursor, filter: normalizedFilter, limit })
  const notifications = Array.isArray(raw?.notifications) ? raw.notifications : []
  const [subjectMap, reactionMap] = await Promise.all([
    fetchNotificationSubjects(agent, notifications),
    fetchReplyReactions(agent, notifications)
  ])
  const aggregated = aggregateNotificationEntries(notifications)
  const items = aggregated
    .map(({ entry, additionalCount, actors }) => mapNotificationEntry(entry, subjectMap, { additionalCount, actors }))
    .filter(Boolean)

  for (const item of items) {
    if (item.reason === 'reply' && item.uri && reactionMap.has(item.uri)) {
      const reactionData = reactionMap.get(item.uri)
      if (reactionData?.stats) {
        item.record.stats = { ...(item.record.stats || {}), ...reactionData.stats }
      }
      if (reactionData?.viewer) {
        item.record.viewer = { ...(item.record.viewer || {}), ...reactionData.viewer }
      }
    }
  }

  if (markSeen && normalizedFilter === 'all' && agent?.app?.bsky?.notification?.updateSeen) {
    try {
      await agent.app.bsky.notification.updateSeen({ seenAt: new Date().toISOString() })
    } catch (error) {
      console.warn('markNotificationsSeen failed', error)
    }
  }

  return {
    items,
    cursor: raw?.cursor || null,
    unreadCount: raw?.unreadCount ?? 0,
    seenAt: raw?.seenAt || null
  }
}

async function fetchNotificationsUnreadCountDirect () {
  const client = getActiveBskyAgentClient()
  const agent = client?.getAgent?.()
  if (!agent?.app?.bsky?.notification?.getUnreadCount) return null
  try {
    const res = await agent.app.bsky.notification.getUnreadCount({})
    const count = Number(res?.data?.count ?? res?.count ?? res?.data?.unreadCount ?? 0)
    if (Number.isFinite(count)) {
      return Math.max(0, count)
    }
  } catch (error) {
    console.warn('getUnreadCount failed', error)
  }
  return null
}

async function uploadBlobFromFile (file) {
  if (!file) return null
  const agent = assertActiveAgent()
  const res = await agent.com.atproto.repo.uploadBlob(file)
  return res?.data?.blob || res?.blob || null
}

async function buildImagesEmbed (mediaEntries = []) {
  if (!Array.isArray(mediaEntries) || mediaEntries.length === 0) return null
  const uploads = []
  for (const entry of mediaEntries.slice(0, 4)) {
    const blob = await uploadBlobFromFile(entry?.file || entry?.blob)
    if (!blob) continue
    uploads.push({
      image: blob,
      alt: entry?.altText || ''
    })
  }
  if (!uploads.length) return null
  return {
    $type: 'app.bsky.embed.images',
    images: uploads
  }
}

function buildExternalEmbed (payload) {
  if (!payload?.uri) return null
  return {
    $type: 'app.bsky.embed.external',
    external: {
      uri: payload.uri,
      title: payload.title?.slice(0, 300) || payload.uri,
      description: payload.description?.slice(0, 300) || ''
    }
  }
}

function buildRecordEmbed (quote) {
  if (!quote?.uri || !quote?.cid) return null
  return {
    $type: 'app.bsky.embed.record',
    record: { uri: quote.uri, cid: quote.cid }
  }
}

async function buildEmbed ({ mediaEntries = [], quote = null, external = null }) {
  const recordEmbed = buildRecordEmbed(quote)
  const mediaEmbed = mediaEntries.length ? await buildImagesEmbed(mediaEntries) : null
  const externalEmbed = external ? buildExternalEmbed(external) : null

  if (recordEmbed && (mediaEmbed || externalEmbed)) {
    return {
      $type: 'app.bsky.embed.recordWithMedia',
      record: recordEmbed.record,
      media: mediaEmbed || externalEmbed
    }
  }
  if (recordEmbed) return recordEmbed
  if (mediaEmbed) return mediaEmbed
  if (externalEmbed) return externalEmbed
  return null
}

async function applyPostInteractionSettings ({ agent, postUri, threadgateAllowRules, postgateEmbeddingRules }) {
  if (!agent || !postUri) return
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  const recordKey = extractRecordKey(postUri)
  const tasks = []
  if (Array.isArray(threadgateAllowRules)) {
    tasks.push(
      agent.com.atproto.repo.createRecord({
        repo,
        collection: 'app.bsky.feed.threadgate',
        rkey: recordKey,
        record: {
          post: postUri,
          allow: threadgateAllowRules,
          createdAt: new Date().toISOString()
        }
      })
    )
  }
  if (Array.isArray(postgateEmbeddingRules) && postgateEmbeddingRules.length > 0) {
    tasks.push(
      agent.com.atproto.repo.createRecord({
        repo,
        collection: 'app.bsky.feed.postgate',
        rkey: recordKey,
        record: {
          post: postUri,
          embeddingRules: postgateEmbeddingRules,
          createdAt: new Date().toISOString()
        }
      })
    )
  }
  if (tasks.length) {
    await Promise.all(tasks)
  }
}

export async function publishPost ({ text, mediaEntries = [], quote = null, external = null, reply = null, interactions = null }) {
  const agent = assertActiveAgent()
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString()
  }
  const embed = await buildEmbed({ mediaEntries, quote, external })
  if (embed) record.embed = embed
  if (reply?.root && reply?.parent) {
    record.reply = {
      root: reply.root,
      parent: reply.parent
    }
  }
  let created = null
  try {
    const res = await agent.com.atproto.repo.createRecord({
      repo,
      collection: 'app.bsky.feed.post',
      record
    })
    created = unwrapRepoWriteResult(res)
    const hasThreadgate = Array.isArray(interactions?.threadgateAllowRules)
    const hasPostgate = Array.isArray(interactions?.postgateEmbeddingRules) && interactions.postgateEmbeddingRules.length > 0
    if (created?.uri && !reply && (hasThreadgate || hasPostgate)) {
      await applyPostInteractionSettings({
        agent,
        postUri: created.uri,
        threadgateAllowRules: hasThreadgate ? interactions.threadgateAllowRules : undefined,
        postgateEmbeddingRules: hasPostgate ? interactions.postgateEmbeddingRules : undefined
      })
    }
    return {
      uri: created?.uri,
      cid: created?.cid,
      record
    }
  } catch (error) {
    if (created?.uri) {
      try {
        await agent.com.atproto.repo.deleteRecord({
          repo,
          collection: 'app.bsky.feed.post',
          rkey: extractRecordKey(created.uri)
        })
      } catch {
        /* cleanup best-effort */
      }
    }
    throw error
  }
}

export async function deletePost ({ uri }) {
  const agent = assertActiveAgent()
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  const recordKey = extractRecordKey(ensureAtUri(uri, 'uri'))
  await agent.com.atproto.repo.deleteRecord({
    repo,
    collection: 'app.bsky.feed.post',
    rkey: recordKey
  })
  return { success: true }
}

const noopPushTransport = {
  async register () {
    return { success: false, skipped: true, reason: 'push_transport_disabled' };
  },
  async unregister () {
    return { success: false, skipped: true, reason: 'push_transport_disabled' };
  }
};

function isValidPushTransport (transport) {
  if (!transport || typeof transport !== 'object') return false;
  return typeof transport.register === 'function' && typeof transport.unregister === 'function';
}

let configuredPushTransport = null;
let cachedDirectTransport = null;
let cachedDirectSignature = '';

export function configurePushTransport (transport) {
  if (!transport) {
    configuredPushTransport = null;
    return;
  }
  if (!isValidPushTransport(transport)) {
    throw new Error('push transport muss register/unregister bereitstellen');
  }
  configuredPushTransport = transport;
}

export async function fetchPostInteractionSettings () {
  const agent = assertActiveAgent()
  const prefs = await resolveAgentPreferences(agent)
  const settings = prefs?.postInteractionSettings || {}
  return {
    threadgateAllowRules: Array.isArray(settings.threadgateAllowRules)
      ? cloneRules(settings.threadgateAllowRules)
      : undefined,
    postgateEmbeddingRules: Array.isArray(settings.postgateEmbeddingRules)
      ? cloneRules(settings.postgateEmbeddingRules)
      : undefined
  }
}

export async function savePostInteractionSettings (settings = {}) {
  const agent = assertActiveAgent()
  if (typeof agent.setPostInteractionSettings !== 'function') {
    throw new Error('Diese Bluesky-Version unterstützt das Speichern der Interaktionseinstellungen noch nicht.')
  }
  await agent.setPostInteractionSettings({
    threadgateAllowRules: Array.isArray(settings.threadgateAllowRules)
      ? settings.threadgateAllowRules
      : settings.threadgateAllowRules ?? undefined,
    postgateEmbeddingRules: Array.isArray(settings.postgateEmbeddingRules)
      ? settings.postgateEmbeddingRules
      : settings.postgateEmbeddingRules ?? undefined
  })
  return settings
}

export async function fetchOwnLists ({ cursor } = {}) {
  const agent = assertActiveAgent()
  const actor = agent?.session?.did
  if (!actor) {
    throw new Error('Keine aktive Session vorhanden, um Listen zu laden.')
  }
  const params = { actor, limit: 50 }
  if (cursor) params.cursor = cursor
  const res = await agent.app.bsky.graph.getLists(params)
  const lists = Array.isArray(res?.data?.lists) ? res.data.lists : res?.lists || []
  return {
    items: lists
    .filter((entry) => entry?.uri)
    .map((entry) => ({
      uri: entry.uri,
      name: entry.name || entry.displayName || '',
      purpose: entry.purpose || '',
      indexedAt: entry.indexedAt || '',
      avatar: entry.avatar || null,
      viewer: entry.viewer || null,
      description: entry.description || ''
    })),
    cursor: res?.data?.cursor || res?.cursor || null
  }
}

function normalizeConfigEntry (value) {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value).trim();
}

function resolveDirectPushConfig () {
  const globalConfig = GLOBAL_SCOPE && GLOBAL_SCOPE.__BSKY_DIRECT_PUSH_CONFIG__;
  if (globalConfig && typeof globalConfig === 'object') {
    const service = normalizeConfigEntry(globalConfig.service || DEFAULT_BSKY_SERVICE) || DEFAULT_BSKY_SERVICE;
    const identifier = normalizeConfigEntry(globalConfig.identifier || '');
    const appPassword = normalizeConfigEntry(globalConfig.appPassword || '');
    if (identifier && appPassword) {
      return { service, identifier, appPassword };
    }
  }
  return null;
}

function createDirectSignature (config) {
  if (!config) return '';
  return `${config.service}::${config.identifier}`;
}

function createBskyAgentPushTransport ({ service = DEFAULT_BSKY_SERVICE, identifier, appPassword }) {
  const normalizedService = normalizeConfigEntry(service) || DEFAULT_BSKY_SERVICE;
  const normalizedIdentifier = normalizeConfigEntry(identifier);
  const normalizedPassword = normalizeConfigEntry(appPassword);
  if (!normalizedIdentifier || !normalizedPassword) {
    throw new Error('identifier und appPassword sind für den direkten Push-Transport erforderlich');
  }
  const agent = new BskyAgent({ service: normalizedService });
  let loginPromise = null;
  const ensureLoggedIn = async () => {
    if (agent?.session?.did) return;
    if (!loginPromise) {
      loginPromise = agent.login({ identifier: normalizedIdentifier, password: normalizedPassword })
        .catch((error) => {
          loginPromise = null;
          throw error;
        });
    }
    await loginPromise;
  };
  return {
    async register (payload) {
      await ensureLoggedIn();
      const res = await agent.app.bsky.notification.registerPush(payload);
      return { success: res?.success ?? true };
    },
    async unregister (payload) {
      await ensureLoggedIn();
      const res = await agent.app.bsky.notification.unregisterPush(payload);
      return { success: res?.success ?? true };
    }
  };
}

function getOrCreateDirectTransport () {
  const config = resolveDirectPushConfig();
  if (!config) return null;
  const signature = createDirectSignature(config);
  if (cachedDirectTransport && cachedDirectSignature === signature) {
    return cachedDirectTransport;
  }
  try {
    cachedDirectTransport = createBskyAgentPushTransport(config);
    cachedDirectSignature = signature;
    return cachedDirectTransport;
  } catch (error) {
    const logger = typeof globalThis !== 'undefined' ? globalThis.console : undefined;
    logger?.warn?.('[push] direkter Transport konnte nicht initialisiert werden:', error);
    cachedDirectTransport = null;
    cachedDirectSignature = '';
    return null;
  }
}

function resolvePushTransport () {
  if (configuredPushTransport) return configuredPushTransport;
  const globalTransport = GLOBAL_SCOPE?.__BSKY_PUSH_TRANSPORT__;
  if (isValidPushTransport(globalTransport)) return globalTransport;
  const direct = getOrCreateDirectTransport();
  if (direct) return direct;
  return noopPushTransport;
}

export function getActivePushTransportName () {
  const transport = resolvePushTransport();
  if (transport === configuredPushTransport) return 'custom';
  if (transport === cachedDirectTransport) return 'direct';
  if (transport === noopPushTransport) return 'noop';
  if (transport && GLOBAL_SCOPE?.__BSKY_PUSH_TRANSPORT__ === transport) return 'global';
  return 'custom';
}

export async function fetchTimeline({ tab, feedUri, cursor, limit } = {}) {
  const direct = await fetchTimelineDirect({ tab, feedUri, cursor, limit })
  if (direct) return direct
  throw new Error('Keine Bluesky-Session verfügbar.')
}

export async function fetchNotifications({ cursor, markSeen, filter, limit } = {}) {
  const direct = await fetchNotificationsDirect({ cursor, markSeen, filter, limit })
  if (direct) return direct
  throw new Error('Keine Bluesky-Session verfügbar.')
}

export async function fetchUnreadNotificationsCount () {
  const directCount = await fetchNotificationsUnreadCountDirect()
  if (typeof directCount === 'number') {
    return { unreadCount: directCount }
  }
  const snapshot = await fetchNotificationPollingSnapshot({ limit: 1 })
  return { unreadCount: Number(snapshot?.unreadCount) || 0 }
}

export async function fetchNotificationPollingSnapshot ({ limit = NOTIFICATION_SNAPSHOT_DEFAULT_LIMIT } = {}) {
  const safeLimit = clampNumber(limit, 1, 40, NOTIFICATION_SNAPSHOT_DEFAULT_LIMIT)
  const allRaw = await listNotificationsRawDirect({ limit: safeLimit, filter: 'all' })
  if (!allRaw) {
    return { unreadCount: 0, allTopId: null, mentionsTopId: null }
  }
  const mentionsRaw = await listNotificationsRawDirect({ limit: safeLimit, filter: 'mentions' })

  const subjectMap = new Map()
  const toAggregatedItems = (notifications = []) => {
    const aggregated = aggregateNotificationEntries(notifications)
    return aggregated
      .map(({ entry, additionalCount, actors }) => mapNotificationEntry(entry, subjectMap, { additionalCount, actors }))
      .filter(Boolean)
  }

  const allItems = toAggregatedItems(allRaw.notifications)
  const mentionsItems = toAggregatedItems(mentionsRaw?.notifications || [])
  return {
    unreadCount: Number(allRaw?.unreadCount) || 0,
    allTopId: allItems.length > 0 ? getNotificationItemId(allItems[0]) : null,
    mentionsTopId: mentionsItems.length > 0 ? getNotificationItemId(mentionsItems[0]) : null
  }
}

export async function fetchNotificationPreferences () {
  return fetchNotificationPreferencesDirect()
}

export async function updateNotificationPreferences (patch = {}) {
  return updateNotificationPreferencesDirect(patch)
}

export async function fetchActivitySubscriptions ({ limit = 50, cursor } = {}) {
  return fetchActivitySubscriptionsDirect({ limit, cursor })
}

export async function updateActivitySubscription ({ subject, activitySubscription } = {}) {
  return updateActivitySubscriptionDirect({ subject, activitySubscription })
}

export async function fetchThread(uri) {
  const direct = await fetchThreadDirect(uri)
  if (direct) return direct
  throw new Error('Keine Bluesky-Session verfügbar.')
}

export async function fetchBlocks ({ cursor, limit } = {}) {
  return fetchBlocksDirect({ cursor, limit })
}

export async function fetchChatConversations ({ cursor, limit, readState, status } = {}) {
  return fetchChatConversationsDirect({ cursor, limit, readState, status })
}

export async function fetchChatConversation ({ convoId } = {}) {
  return fetchChatConversationDirect({ convoId })
}

export async function fetchChatMessages ({ convoId, cursor, limit } = {}) {
  return fetchChatMessagesDirect({ convoId, cursor, limit })
}

export async function sendChatMessage ({ convoId, text }) {
  return sendChatMessageDirect({ convoId, text })
}

export async function updateChatReadState ({ convoId, messageId } = {}) {
  return updateChatReadStateDirect({ convoId, messageId })
}

export async function addChatReaction ({ convoId, messageId, value } = {}) {
  return addChatReactionDirect({ convoId, messageId, value })
}

export async function removeChatReaction ({ convoId, messageId, value } = {}) {
  return removeChatReactionDirect({ convoId, messageId, value })
}

export async function fetchChatLogs ({ cursor } = {}) {
  if (chatUnreadPollingDisabled) {
    return { logs: [], cursor: null, disabled: true }
  }
  try {
    return await fetchChatLogsDirect({ cursor })
  } catch (error) {
    if (isChatFeatureUnavailableError(error)) {
      chatUnreadPollingDisabled = true
      console.info('[chat] Chat-Polling deaktiviert (nicht verfügbar).', error)
      return { logs: [], cursor: null, disabled: true }
    }
    throw error
  }
}

export async function fetchChatUnreadSnapshot () {
  if (chatUnreadPollingDisabled) {
    return { unreadCount: 0, disabled: true }
  }
  try {
    return await fetchChatUnreadSnapshotDirect()
  } catch (error) {
    if (isChatFeatureUnavailableError(error)) {
      chatUnreadPollingDisabled = true
      console.info('[chat] Chat-Polling deaktiviert (nicht verfügbar).', error)
      return { unreadCount: 0, disabled: true }
    }
    throw error
  }
}

export async function muteActor (did) {
  const normalized = String(did || '').trim()
  if (!normalized) throw new Error('did erforderlich')
  const agent = assertActiveAgent()
  if (typeof agent.mute === 'function') {
    return agent.mute(normalized)
  }
  const graph = agent.app?.bsky?.graph
  if (graph?.muteActor) {
    return graph.muteActor({ actor: normalized })
  }
  throw new Error('Stummschalten nicht unterstützt')
}

export async function unmuteActor (did) {
  const normalized = String(did || '').trim()
  if (!normalized) throw new Error('did erforderlich')
  const agent = assertActiveAgent()
  if (typeof agent.unmute === 'function') {
    return agent.unmute(normalized)
  }
  const graph = agent.app?.bsky?.graph
  if (graph?.unmuteActor) {
    return graph.unmuteActor({ actor: normalized })
  }
  throw new Error('Stummschaltung aufheben nicht unterstützt')
}

async function findBlockRecordUriByDid (agent, did) {
  const blockNamespace = agent.app?.bsky?.graph?.block
  if (!blockNamespace?.list) return null
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  let cursor = null
  do {
    const res = await blockNamespace.list({ repo, limit: 100, cursor: cursor || undefined })
    const records = Array.isArray(res?.records) ? res.records : []
    const match = records.find((record) => record?.value?.subject === did)
    if (match?.uri) return match.uri
    cursor = res?.cursor || null
  } while (cursor)
  return null
}

export async function blockActor (did) {
  const normalized = normalizeActor(did)
  const agent = assertActiveAgent()
  const blockNamespace = agent.app?.bsky?.graph?.block
  if (!blockNamespace?.create) {
    throw new Error('Blockieren nicht unterstützt')
  }
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  return blockNamespace.create(
    { repo },
    { subject: normalized, createdAt: new Date().toISOString() }
  )
}

export async function unblockActor (did, { blockUri } = {}) {
  const normalized = normalizeActor(did)
  const agent = assertActiveAgent()
  const blockNamespace = agent.app?.bsky?.graph?.block
  if (!blockNamespace?.delete) {
    throw new Error('Blockierung aufheben nicht unterstützt')
  }
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  let targetUri = String(blockUri || '').trim()
  if (!targetUri) {
    targetUri = await findBlockRecordUriByDid(agent, normalized)
  }
  if (!targetUri) {
    throw new Error('Block-Eintrag konnte nicht gefunden werden.')
  }
  const rkey = extractRecordKey(targetUri)
  return blockNamespace.delete({ repo, rkey })
}

export async function likePost({ uri, cid }) {
  const agent = assertActiveAgent()
  const targetUri = ensureAtUri(uri, 'uri')
  const targetCid = ensureCid(cid)
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  const result = await agent.com.atproto.repo.createRecord({
    repo,
    collection: 'app.bsky.feed.like',
    record: {
      subject: { uri: targetUri, cid: targetCid },
      createdAt: new Date().toISOString()
    }
  })
  const reactions = await fetchReactionsDirect({ uri: targetUri }, { agent })
  const recordUri = unwrapRepoWriteResult(result).uri
  if (reactions) {
    reactions.viewer = { ...(reactions.viewer || {}), like: recordUri }
    return { ...reactions, recordUri }
  }
  return { recordUri, viewer: { like: recordUri }, likeCount: 0, repostCount: 0, replyCount: 0 }
}

export async function unlikePost({ likeUri, postUri }) {
  const agent = assertActiveAgent()
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  const recordKey = extractRecordKey(ensureAtUri(likeUri, 'likeUri'))
  await agent.com.atproto.repo.deleteRecord({
    repo,
    collection: 'app.bsky.feed.like',
    rkey: recordKey
  })
  if (postUri) {
    const reactions = await fetchReactionsDirect({ uri: postUri }, { agent })
    if (reactions) {
      reactions.viewer = { ...(reactions.viewer || {}), like: null }
      return reactions
    }
  }
  return { likeCount: 0, repostCount: 0, replyCount: 0, viewer: { like: null } }
}

export async function repostPost({ uri, cid }) {
  const agent = assertActiveAgent()
  const targetUri = ensureAtUri(uri, 'uri')
  const targetCid = ensureCid(cid)
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  const result = await agent.com.atproto.repo.createRecord({
    repo,
    collection: 'app.bsky.feed.repost',
    record: {
      subject: { uri: targetUri, cid: targetCid },
      createdAt: new Date().toISOString()
    }
  })
  const reactions = await fetchReactionsDirect({ uri: targetUri }, { agent })
  const recordUri = unwrapRepoWriteResult(result).uri
  if (reactions) {
    reactions.viewer = { ...(reactions.viewer || {}), repost: recordUri }
    return { ...reactions, recordUri }
  }
  return { recordUri, viewer: { repost: recordUri }, likeCount: 0, repostCount: 0, replyCount: 0 }
}

export async function unrepostPost({ repostUri, postUri }) {
  const agent = assertActiveAgent()
  const repo = ensureAtUri(agent?.session?.did, 'repo')
  const recordKey = extractRecordKey(ensureAtUri(repostUri, 'repostUri'))
  await agent.com.atproto.repo.deleteRecord({
    repo,
    collection: 'app.bsky.feed.repost',
    rkey: recordKey
  })
  if (postUri) {
    const reactions = await fetchReactionsDirect({ uri: postUri }, { agent })
    if (reactions) {
      reactions.viewer = { ...(reactions.viewer || {}), repost: null }
      return reactions
    }
  }
  return { likeCount: 0, repostCount: 0, replyCount: 0, viewer: { repost: null } }
}

export async function bookmarkPost({ uri, cid }) {
  const agent = assertActiveAgent()
  const targetUri = ensureAtUri(uri, 'uri')
  const targetCid = ensureCid(cid)
  await agent.app.bsky.bookmark.createBookmark({ uri: targetUri, cid: targetCid })
  return { viewer: { bookmarked: true } }
}

export async function unbookmarkPost({ uri }) {
  const agent = assertActiveAgent()
  const targetUri = ensureAtUri(uri, 'uri')
  await agent.app.bsky.bookmark.deleteBookmark({ uri: targetUri })
  return { viewer: { bookmarked: false } }
}

export async function fetchReactions({ uri }) {
  const direct = await fetchReactionsDirect({ uri })
  if (direct) return direct
  throw new Error('Keine Bluesky-Session verfügbar.')
}

export async function fetchBookmarks({ cursor, limit } = {}) {
  return fetchBookmarksDirect({ cursor, limit })
}

async function searchPostsDirect ({ query, cursor, limit, sort = 'top', language } = {}) {
  const normalizedQuery = String(query || '').trim()
  if (!normalizedQuery) return { items: [], cursor: null, type: sort }
  const agent = assertActiveAgent()
  const safeLimit = clampNumber(limit, 1, 100, 25)
  const params = { q: normalizedQuery, limit: safeLimit, sort }
  if (cursor) params.cursor = cursor
  if (typeof language === 'string' && language.trim()) {
    params.lang = language.trim().toLowerCase()
  }
  const res = await agent.app.bsky.feed.searchPosts(params)
  const data = res?.data ?? res ?? {}
  const posts = Array.isArray(data?.posts) ? data.posts : []
  const items = posts
    .map((post, index) => mapFeedEntry({ post }, { context: `search:${sort}:${index}` }))
    .filter(Boolean)
  return {
    items,
    cursor: data?.cursor || null,
    type: sort
  }
}

async function searchActorsDirect ({ query, cursor, limit } = {}) {
  const normalizedQuery = String(query || '').trim()
  if (!normalizedQuery) return { items: [], cursor: null, type: 'people' }
  const agent = assertActiveAgent()
  const safeLimit = clampNumber(limit, 1, 100, 25)
  const params = { q: normalizedQuery, limit: safeLimit }
  if (cursor) params.cursor = cursor
  const res = await agent.app.bsky.actor.searchActors(params)
  const data = res?.data ?? res ?? {}
  const actors = Array.isArray(data?.actors) ? data.actors : []
  const items = actors
    .map((actor) => ({
      did: actor?.did || '',
      handle: actor?.handle || '',
      displayName: actor?.displayName || actor?.handle || '',
      avatar: actor?.avatar || null,
      description: actor?.description || ''
    }))
    .filter((entry) => entry.did || entry.handle)
  return {
    items,
    cursor: data?.cursor || null,
    type: 'people'
  }
}

export async function searchBsky({ query, type, cursor, limit, language } = {}) {
  const normalizedType = typeof type === 'string' ? type.trim().toLowerCase() : ''
  if (normalizedType === 'people') {
    return searchActorsDirect({ query, cursor, limit })
  }
  if (normalizedType === 'latest') {
    return searchPostsDirect({ query, cursor, limit, sort: 'latest', language })
  }
  return searchPostsDirect({ query, cursor, limit, sort: 'top', language })
}

export async function fetchProfile (actor) {
  const normalized = normalizeActor(actor)
  const agent = assertActiveAgent()
  try {
    const res = await agent.app.bsky.actor.getProfile({ actor: normalized })
    const data = res?.data ?? res ?? null
    if (!data) throw new Error('Profil konnte nicht geladen werden.')
    return data
  } catch (error) {
    console.warn('fetchProfile failed', error)
    throw error
  }
}

export async function fetchProfileFeed ({ actor, cursor, limit, filter } = {}) {
  const normalized = normalizeActor(actor)
  const agent = assertActiveAgent()
  const safeLimit = clampNumber(limit, 1, 100, 30)
  const params = {
    actor: normalized,
    limit: safeLimit
  }
  if (cursor) params.cursor = cursor
  if (filter) params.filter = filter
  try {
    const res = await agent.app.bsky.feed.getAuthorFeed(params)
    const data = res?.data ?? res ?? {}
    const feedEntries = Array.isArray(data?.feed) ? data.feed : []
    const items = feedEntries
      .map((entry, index) => mapFeedEntry(entry, { context: `profile:${normalized}:${index}` }))
      .filter(Boolean)
    return {
      items,
      cursor: data?.cursor || null
    }
  } catch (error) {
    console.warn('fetchProfileFeed failed', error)
    throw error
  }
}

export async function fetchProfileLikes ({ actor, cursor, limit } = {}) {
  const normalized = normalizeActor(actor)
  const agent = assertActiveAgent()
  const safeLimit = clampNumber(limit, 1, 100, 30)
  const params = {
    actor: normalized,
    limit: safeLimit
  }
  if (cursor) params.cursor = cursor
  try {
    const res = await agent.app.bsky.feed.getActorLikes(params)
    const data = res?.data ?? res ?? {}
    const feedEntries = Array.isArray(data?.feed) ? data.feed : []
    const items = feedEntries
      .map((entry, index) => mapFeedEntry(entry, { context: `likes:${normalized}:${index}` }))
      .filter(Boolean)
    return {
      items,
      cursor: data?.cursor || null
    }
  } catch (error) {
    console.warn('fetchProfileLikes failed', error)
    throw error
  }
}

export async function fetchFeeds () {
  return fetchFeedsDirect()
}

export async function pinFeed ({ feedUri }) {
  if (!feedUri) throw new Error('feedUri erforderlich')
  return pinFeedDirect({ feedUri })
}

export async function unpinFeed ({ feedUri }) {
  if (!feedUri) throw new Error('feedUri erforderlich')
  return unpinFeedDirect({ feedUri })
}

export async function reorderPinnedFeeds ({ order }) {
  if (!Array.isArray(order) || order.length === 0) {
    throw new Error('order erforderlich');
  }
  return reorderPinnedFeedsDirect({ order })
}

function ensurePushPayload({ serviceDid, token, platform, appId }) {
  const payload = {
    serviceDid: typeof serviceDid === 'string' ? serviceDid.trim() : '',
    token: typeof token === 'string' ? token.trim() : '',
    platform: typeof platform === 'string' ? platform.trim() : '',
    appId: typeof appId === 'string' ? appId.trim() : ''
  };
  if (!payload.serviceDid || !payload.token || !payload.platform || !payload.appId) {
    throw new Error('serviceDid, token, platform und appId erforderlich');
  }
  return payload;
}

function parseBooleanFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return undefined;
}

export async function registerPushSubscription({ serviceDid, token, platform, appId, ageRestricted } = {}) {
  const payload = ensurePushPayload({ serviceDid, token, platform, appId });
  const flag = parseBooleanFlag(ageRestricted);
  if (flag !== undefined) payload.ageRestricted = flag;
  const transport = resolvePushTransport();
  return transport.register(payload, { action: 'register' });
}

export async function unregisterPushSubscription({ serviceDid, token, platform, appId } = {}) {
  const payload = ensurePushPayload({ serviceDid, token, platform, appId });
  const transport = resolvePushTransport();
  return transport.unregister(payload, { action: 'unregister' });
}

export { createBskyAgentPushTransport };
