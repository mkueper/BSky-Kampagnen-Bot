const DEFAULT_TIMELINE_PAGE_SIZE = 20
const DEFAULT_NOTIFICATIONS_PAGE_SIZE = 40

function getItemId(item) {
  if (!item) return null
  return item.listEntryId || item.uri || item.cid || item.id || null
}

export function getListItemId(item) {
  return getItemId(item)
}

export function resolveDefaultPageSize(descriptor) {
  return descriptor?.kind === 'notifications'
    ? DEFAULT_NOTIFICATIONS_PAGE_SIZE
    : DEFAULT_TIMELINE_PAGE_SIZE
}

export function resolveDescriptor(list = {}) {
  return {
    key: list.key,
    kind: list.kind || 'custom',
    data: list.data || {},
    label: list.label || list.key || '',
    supportsRefresh: list.supportsRefresh !== false,
    supportsPolling: Boolean(list.supportsPolling)
  }
}

export function resolveUnreadIds({
  previousUnreadIds = [],
  nextItems = [],
  previousTopId = null,
  clearUnreadOnRefresh = false
} = {}) {
  const preservedUnreadIds = clearUnreadOnRefresh ? [] : previousUnreadIds
  const nextIds = nextItems.map((item) => getItemId(item)).filter(Boolean)
  if (!nextIds.length) return []
  const nextIdSet = new Set(nextIds)
  const unreadSet = new Set()
  preservedUnreadIds.forEach((id) => {
    if (nextIdSet.has(id)) {
      unreadSet.add(id)
    }
  })
  if (previousTopId) {
    for (const item of nextItems) {
      const id = getItemId(item)
      if (!id) continue
      if (id === previousTopId) break
      unreadSet.add(id)
    }
  }
  return Array.from(unreadSet)
}

export function mergeItemsPrepend(newItems = [], existingItems = []) {
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

export function mergeItemsAppend(existingItems = [], newItems = []) {
  const seen = new Set()
  const result = []
  existingItems.forEach((item) => {
    const id = getItemId(item)
    if (id) seen.add(id)
    result.push(item)
  })
  newItems.forEach((item) => {
    const id = getItemId(item)
    if (id && seen.has(id)) return
    if (id) seen.add(id)
    result.push(item)
  })
  return result
}
