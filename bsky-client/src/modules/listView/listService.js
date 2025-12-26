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
import {
  getListItemId,
  mergeItemsAppend,
  resolveDefaultPageSize,
  resolveDescriptor,
  resolveUnreadIds
} from './listStateHelpers.js'

function scheduleDispatch (dispatch, action) {
  if (typeof dispatch !== 'function' || !action) return
  const runDispatch = () => { dispatch(action) }
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(runDispatch)
    return
  }
  if (typeof Promise === 'function') {
    Promise.resolve().then(runDispatch)
    return
  }
  setTimeout(runDispatch, 0)
}

async function fetchTimelinePage(list, { cursor = null, limit } = {}) {
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

async function fetchNotificationsPage(list, { cursor = null, limit, markSeen } = {}) {
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

export async function runListRefresh({ list, dispatch, meta, limit } = {}) {
  if (!list?.key) throw new Error('Missing list key for refresh')
  const descriptor = resolveDescriptor(list)
  const effectiveLimit = typeof limit === 'number' ? limit : resolveDefaultPageSize(descriptor)
  const shouldMarkSeen = descriptor.kind === 'notifications'
    ? (list?.markSeen === true)
    : undefined
  const previousUnreadIds = Array.isArray(list?.unreadIds) ? list.unreadIds : []
  const previousTopId = list?.topId || null
  const clearUnreadOnRefresh = Boolean(list?.clearUnreadOnRefresh)
  scheduleDispatch(dispatch, {
    type: 'LIST_SET_REFRESHING',
    payload: { key: list.key, value: true, meta }
  })
  try {
    const page = descriptor.kind === 'notifications'
      ? await fetchNotificationsPage(list, { limit: effectiveLimit, markSeen: shouldMarkSeen })
      : await fetchTimelinePage(list, { limit: effectiveLimit })
    const nextItems = Array.isArray(page?.items) ? page.items : []
    const unreadIds = resolveUnreadIds({
      previousUnreadIds,
      nextItems,
      previousTopId,
      clearUnreadOnRefresh
    })
    scheduleDispatch(dispatch, {
      type: 'LIST_LOADED',
      payload: {
        key: list.key,
        items: nextItems,
        cursor: page.cursor || null,
        topId: nextItems[0] ? getListItemId(nextItems[0]) : null,
        meta: meta ? { ...meta, data: meta.data || list.data } : { data: list.data },
        unreadIds
      }
    })
    return { ...page, items: nextItems }
  } finally {
    scheduleDispatch(dispatch, {
      type: 'LIST_SET_REFRESHING',
      payload: { key: list.key, value: false }
    })
  }
}

export async function runListLoadMore({ list, dispatch, limit } = {}) {
  if (!list?.key) throw new Error('Missing list key for load more')
  if (!list.cursor) return list.items || []
  const descriptor = resolveDescriptor(list)
  const effectiveLimit = typeof limit === 'number' ? limit : resolveDefaultPageSize(descriptor)
  scheduleDispatch(dispatch, {
    type: 'LIST_SET_LOADING_MORE',
    payload: { key: list.key, value: true }
  })
  try {
    const beforeCursor = list.cursor || null
    const page = descriptor.kind === 'notifications'
      ? await fetchNotificationsPage(list, { cursor: list.cursor, limit: effectiveLimit })
      : await fetchTimelinePage(list, { cursor: list.cursor, limit: effectiveLimit })
    const nextItems = Array.isArray(page?.items) ? page.items : []
    const previousItems = Array.isArray(list.items) ? list.items : []
    const mergedItems = mergeItemsAppend(previousItems, nextItems)
    const nextCursor = page?.cursor || null
    const cursorUnchanged = Boolean(nextCursor && beforeCursor && nextCursor === beforeCursor)
    const madeProgress = mergedItems.length > previousItems.length
    const stopPaging = Boolean(
      cursorUnchanged ||
      !nextCursor ||
      nextItems.length === 0 ||
      !madeProgress
    )
    scheduleDispatch(dispatch, {
      type: 'LIST_LOADED',
      payload: {
        key: list.key,
        items: mergedItems,
        cursor: stopPaging ? null : nextCursor,
        topId: mergedItems[0] ? getListItemId(mergedItems[0]) : list.topId || null,
        meta: { data: list.data }
      }
    })
    return { ...page, items: mergedItems, cursor: stopPaging ? null : nextCursor }
  } finally {
    scheduleDispatch(dispatch, {
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
  return topItem ? getListItemId(topItem) : null
}

export { getListItemId } from './listStateHelpers.js'
