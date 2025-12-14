const THREADGATE_TYPES = {
  mention: 'app.bsky.feed.threadgate#mentionRule',
  follower: 'app.bsky.feed.threadgate#followerRule',
  following: 'app.bsky.feed.threadgate#followingRule',
  list: 'app.bsky.feed.threadgate#listRule'
}

const POSTGATE_DISABLE_TYPE = 'app.bsky.feed.postgate#disableRule'

export function createDefaultInteractionData () {
  return {
    threadgateAllowRules: undefined,
    postgateEmbeddingRules: undefined
  }
}

export function createDefaultInteractionDraft () {
  return {
    replyMode: 'everyone',
    allowFollowers: false,
    allowFollowing: false,
    allowMentioned: false,
    selectedLists: [],
    allowQuotes: true
  }
}

export function deriveDraftFromData (data = createDefaultInteractionData()) {
  const rules = Array.isArray(data?.threadgateAllowRules) ? data.threadgateAllowRules : null
  const replyMode = rules ? 'limited' : 'everyone'
  const allowFollowers = Boolean(rules?.some((rule) => rule?.$type === THREADGATE_TYPES.follower))
  const allowFollowing = Boolean(rules?.some((rule) => rule?.$type === THREADGATE_TYPES.following))
  const allowMentioned = Boolean(rules?.some((rule) => rule?.$type === THREADGATE_TYPES.mention))
  const selectedLists = rules
    ? rules
        .filter((rule) => rule?.$type === THREADGATE_TYPES.list && rule?.list)
        .map((rule) => rule.list)
    : []
  const allowQuotes = !Array.isArray(data?.postgateEmbeddingRules) || data.postgateEmbeddingRules.length === 0
  return {
    replyMode,
    allowFollowers,
    allowFollowing,
    allowMentioned,
    selectedLists,
    allowQuotes
  }
}

export function draftToInteractionData (draft = createDefaultInteractionDraft()) {
  if (!draft || draft.replyMode === 'everyone') {
    return {
      threadgateAllowRules: undefined,
      postgateEmbeddingRules: draft?.allowQuotes ? undefined : [{ $type: POSTGATE_DISABLE_TYPE }]
    }
  }
  const allow = []
  if (draft.allowFollowers) {
    allow.push({ $type: THREADGATE_TYPES.follower })
  }
  if (draft.allowFollowing) {
    allow.push({ $type: THREADGATE_TYPES.following })
  }
  if (draft.allowMentioned) {
    allow.push({ $type: THREADGATE_TYPES.mention })
  }
  if (Array.isArray(draft.selectedLists)) {
    draft.selectedLists
      .filter((uri) => typeof uri === 'string' && uri.trim().length > 0)
      .forEach((uri) => {
        allow.push({ $type: THREADGATE_TYPES.list, list: uri })
      })
  }
  return {
    threadgateAllowRules: allow,
    postgateEmbeddingRules: draft.allowQuotes ? undefined : [{ $type: POSTGATE_DISABLE_TYPE }]
  }
}

export function describeReplySummary (data, t) {
  if (!data || !Array.isArray(data.threadgateAllowRules)) {
    return t?.('compose.interactions.summary.everyone', 'Antworten: Jeder') || 'Antworten: Jeder'
  }
  if (data.threadgateAllowRules.length === 0) {
    return t?.('compose.interactions.summary.none', 'Antworten: Niemand') || 'Antworten: Niemand'
  }
  const parts = []
  if (data.threadgateAllowRules.some((rule) => rule?.$type === THREADGATE_TYPES.follower)) {
    parts.push(t?.('compose.interactions.option.followers', 'Follower') || 'Follower')
  }
  if (data.threadgateAllowRules.some((rule) => rule?.$type === THREADGATE_TYPES.following)) {
    parts.push(t?.('compose.interactions.option.following', 'Leute, denen du folgst') || 'Leute, denen du folgst')
  }
  if (data.threadgateAllowRules.some((rule) => rule?.$type === THREADGATE_TYPES.mention)) {
    parts.push(t?.('compose.interactions.option.mentioned', 'Erwähnte Accounts') || 'Erwähnte Accounts')
  }
  const listCount = data.threadgateAllowRules.filter((rule) => rule?.$type === THREADGATE_TYPES.list).length
  if (listCount > 0) {
    parts.push(
      listCount === 1
        ? t?.('compose.interactions.option.oneList', '1 Liste') || '1 Liste'
        : t?.('compose.interactions.option.multiList', `${listCount} Listen`, { count: listCount }) || `${listCount} Listen`
    )
  }
  const suffix = parts.length ? parts.join(', ') : t?.('compose.interactions.option.none', 'Keine Ausnahmen') || 'Keine Ausnahmen'
  const prefix = t?.('compose.interactions.summary.restricted', 'Antworten: Begrenzt') || 'Antworten: Begrenzt'
  return `${prefix} (${suffix})`
}

export function describeQuoteSummary (data, t) {
  const quotesAllowed = !Array.isArray(data?.postgateEmbeddingRules) || data.postgateEmbeddingRules.length === 0
  return quotesAllowed
    ? t?.('compose.interactions.quotes.allowed', 'Zitate: erlaubt') || 'Zitate: erlaubt'
    : t?.('compose.interactions.quotes.disabled', 'Zitate: deaktiviert') || 'Zitate: deaktiviert'
}

export function summarizeInteractions (data, t) {
  const reply = describeReplySummary(data, t)
  const quotes = describeQuoteSummary(data, t)
  return `${reply} • ${quotes}`
}

export { THREADGATE_TYPES, POSTGATE_DISABLE_TYPE }
