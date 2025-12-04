/**
 * ListView-Quick-Reminder:
 * - Neuer Feed = neuer key + Meta in getTimelineListMeta/getNotificationListMeta.
 * - kind/label/route/supportsPolling/supportsRefresh sauber setzen.
 * - listService: data.type/mode/filter so auswerten, dass Fetch klar definiert ist.
 * - Initial-Load: Beim ersten Aktivieren (!list || !list.loaded) -> refreshListByKey(key, { scrollAfter: true }).
 * - Kein Auto-Reload beim Tab-Wechsel, nur bei Refresh/Home/LoadMore.
 * - Polling setzt nur hasNew, lädt aber nichts automatisch nach.
 * - ScrollToTop/Home: refresh + harter Scroll nach oben, wenn supportsRefresh === true.
 */
import { fetchTimeline, fetchNotifications } from '../shared/index.js'

const DEFAULT_PAGE_SIZE = 20

function resolveDescriptor(list = {}) {
  return {
    key: list.key,
    kind: list.kind || 'custom',
    data: list.data || {},
    label: list.label || list.key || '',
    supportsRefresh: list.supportsRefresh !== false,
    supportsPolling: Boolean(list.supportsPolling)
  }
}

function getItemId(item) {
  if (!item) return null
  return item.listEntryId || item.uri || item.cid || item.id || null
}

function prependUnique(newItems = [], existingItems = []) {
  const seen = new Set()
  const result = []
  newItems.forEach((item) => {
    const id = getItemId(item)
    if (id) seen.add(id)
    result.push(item)
  })
  existingItems.forEach((item) => {
    const id = getItemId(item)
    if (id && seen.has(id)) return
    if (id) seen.add(id)
    result.push(item)
  })
  return result
}

function appendUnique(existingItems = [], nextItems = []) {
  const seen = new Set()
  const result = []
  existingItems.forEach((item) => {
    const id = getItemId(item)
    if (id) seen.add(id)
    result.push(item)
  })
  nextItems.forEach((item) => {
    const id = getItemId(item)
    if (id && seen.has(id)) return
    if (id) seen.add(id)
    result.push(item)
  })
  return result
}

async function fetchTimelinePage(list, { cursor = null, limit = DEFAULT_PAGE_SIZE } = {}) {
  const descriptor = resolveDescriptor(list)
  const data = descriptor.data || {}
  const params = {
    cursor: cursor || undefined,
    limit
  }
  if (data.feedUri) params.feedUri = data.feedUri
  else params.tab = data.tab || descriptor.key
  return fetchTimeline(params)
}

async function fetchNotificationsPage(list, { cursor = null, limit = DEFAULT_PAGE_SIZE, markSeen } = {}) {
  const descriptor = resolveDescriptor(list)
  const data = descriptor.data || {}
  const shouldMarkSeen = typeof markSeen === 'boolean'
    ? markSeen
    : (!cursor && (data.filter || 'all') === 'all')
  return fetchNotifications({
    cursor: cursor || undefined,
    limit,
    filter: data.filter || undefined,
    markSeen: shouldMarkSeen
  })
}

export async function runListRefresh({ list, dispatch, meta, limit = DEFAULT_PAGE_SIZE }) {
  if (!list?.key) throw new Error('Missing list key for refresh')
  const descriptor = resolveDescriptor(list)
  dispatch({
    type: 'LIST_SET_REFRESHING',
    payload: { key: list.key, value: true, meta }
  })
  try {
    const page = descriptor.kind === 'notifications'
      ? await fetchNotificationsPage(list, { limit })
      : await fetchTimelinePage(list, { limit })
    const mergedItems = prependUnique(page.items, list.items || [])
    dispatch({
      type: 'LIST_LOADED',
      payload: {
        key: list.key,
        items: mergedItems,
        cursor: page.cursor || null,
        topId: mergedItems[0] ? getItemId(mergedItems[0]) : null,
        meta: meta ? { ...meta, data: meta.data || list.data } : { data: list.data }
      }
    })
    return { ...page, items: mergedItems }
  } finally {
    dispatch({
      type: 'LIST_SET_REFRESHING',
      payload: { key: list.key, value: false }
    })
  }
}

export async function runListLoadMore({ list, dispatch, limit = DEFAULT_PAGE_SIZE }) {
  if (!list?.key) throw new Error('Missing list key for load more')
  if (!list.cursor) return list.items || []
  dispatch({
    type: 'LIST_SET_LOADING_MORE',
    payload: { key: list.key, value: true }
  })
  try {
    const page = list.kind === 'notifications'
      ? await fetchNotificationsPage(list, { cursor: list.cursor, limit })
      : await fetchTimelinePage(list, { cursor: list.cursor, limit })
    const mergedItems = appendUnique(list.items || [], page.items)
    dispatch({
      type: 'LIST_LOADED',
      payload: {
        key: list.key,
        items: mergedItems,
        cursor: page.cursor || null,
        topId: mergedItems[0] ? getItemId(mergedItems[0]) : list.topId || null,
        meta: { data: list.data }
      }
    })
    return { ...page, items: mergedItems }
  } finally {
    dispatch({
      type: 'LIST_SET_LOADING_MORE',
      payload: { key: list.key, value: false }
    })
  }
}

export async function fetchServerTopId(list, limit = 1) {
  if (!list?.key) return null
  const descriptor = resolveDescriptor(list)
  const page = descriptor.kind === 'notifications'
    ? await fetchNotificationsPage(list, { limit, markSeen: false })
    : await fetchTimelinePage(list, { limit })
  const topItem = Array.isArray(page?.items) ? page.items[0] : null
  return topItem ? getItemId(topItem) : null
}

export function mergeItemsPrepend(newItems, existingItems) {
  return prependUnique(newItems, existingItems)
}

export function mergeItemsAppend(existingItems, newItems) {
  return appendUnique(existingItems, newItems)
}

export function getListItemId(item) {
  return getItemId(item)
}
