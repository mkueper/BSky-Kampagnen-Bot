function createListState(meta = {}) {
  return {
    key: meta.key || '',
    kind: meta.kind || 'custom',
    label: meta.label || meta.key || 'Liste',
    route: meta.route ?? null,
    items: meta.items ? [...meta.items] : [],
    topId: meta.topId || null,
    cursor: meta.cursor || null,
    loaded: Boolean(meta.loaded),
    hasNew: Boolean(meta.hasNew),
    unreadIds: Array.isArray(meta.unreadIds) ? [...meta.unreadIds] : [],
    supportsPolling: meta.supportsPolling ?? false,
    supportsRefresh: meta.supportsRefresh ?? false,
    isRefreshing: Boolean(meta.isRefreshing),
    isLoadingMore: Boolean(meta.isLoadingMore),
    data: meta.data || null
  }
}

function buildDefaultLists () {
  return {
    discover: createListState({
      key: 'discover',
      kind: 'timeline',
      label: 'Discover',
      route: '/',
      supportsPolling: true,
      supportsRefresh: true,
      data: { type: 'timeline', tab: 'discover', feedUri: null }
    }),
    following: createListState({
      key: 'following',
      kind: 'timeline',
      label: 'Following',
      route: '/',
      supportsPolling: true,
      supportsRefresh: true,
      data: { type: 'timeline', tab: 'following', feedUri: null }
    }),
    'notifs:all': createListState({
      key: 'notifs:all',
      kind: 'notifications',
      label: 'Alle Mitteilungen',
      route: '/notifications',
      supportsPolling: true,
      supportsRefresh: true,
      data: { type: 'notifications', filter: 'all' }
    }),
    'notifs:mentions': createListState({
      key: 'notifs:mentions',
      kind: 'notifications',
      label: 'Erwähnungen',
      route: '/notifications',
      supportsPolling: true,
      supportsRefresh: true,
      data: { type: 'notifications', filter: 'mentions' }
    })
  }
}

const DEFAULT_LISTS = buildDefaultLists()

export const listViewInitialState = {
  activeListKey: 'discover',
  lists: DEFAULT_LISTS
}

function ensureList(state, key, meta) {
  const existing = state.lists[key]
  if (existing) {
    if (meta) return mergeMeta(existing, meta)
    return existing
  }
  const next = createListState({ key, ...(meta || {}) })
  return next
}

function mergeMeta(list, meta = {}) {
  if (!meta) return list
  return {
    ...list,
    ...(meta.kind ? { kind: meta.kind } : {}),
    ...(meta.label ? { label: meta.label } : {}),
    ...(meta.route !== undefined ? { route: meta.route } : {}),
    ...(meta.supportsPolling != null ? { supportsPolling: meta.supportsPolling } : {}),
    ...(meta.supportsRefresh != null ? { supportsRefresh: meta.supportsRefresh } : {}),
    ...(meta.data ? { data: meta.data } : {})
  }
}

export function listViewReducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_LIST': {
      const key = action.payload
      if (!key || key === state.activeListKey) return state
      if (!state.lists[key]) {
        return {
          ...state,
          activeListKey: key,
          lists: {
            ...state.lists,
            [key]: createListState({ key })
          }
        }
      }
      return { ...state, activeListKey: key }
    }
    case 'LIST_LOADED': {
      const payload = action.payload || {}
      const { key } = payload
      if (!key) return state
      const prevList = ensureList(state, key, payload.meta)
      const nextItems = Array.isArray(payload.items) ? payload.items : prevList.items
      const topItem = nextItems[0] || null
      const nextTopId = payload.topId ?? (topItem ? resolveItemId(topItem) : prevList.topId || null)
      const keepHasNew = Boolean(payload.keepHasNew)
      const nextList = {
        ...mergeMeta(prevList, payload.meta),
        items: nextItems,
        cursor: payload.cursor ?? prevList.cursor ?? null,
        topId: nextTopId,
        loaded: true,
        hasNew: keepHasNew ? prevList.hasNew : false,
        unreadIds: Array.isArray(payload.unreadIds) ? payload.unreadIds : prevList.unreadIds || [],
        isRefreshing: false,
        isLoadingMore: false
      }
      return {
        ...state,
        lists: {
          ...state.lists,
          [key]: nextList
        }
      }
    }
    case 'LIST_MARK_HAS_NEW': {
      const key = action.payload
      if (!key) return state
      const list = state.lists[key]
      if (!list || list.hasNew) return state
      return {
        ...state,
        lists: {
          ...state.lists,
          [key]: { ...list, hasNew: true }
        }
      }
    }
    case 'LIST_CLEAR_UNREAD': {
      const payload = action.payload || {}
      const key = payload.key
      if (!key) return state
      const list = state.lists[key]
      if (!list) return state
      if (!Array.isArray(list.unreadIds) || list.unreadIds.length === 0) return state
      const ids = Array.isArray(payload.ids) ? payload.ids : null
      const nextUnreadIds = ids
        ? list.unreadIds.filter((id) => !ids.includes(id))
        : []
      if (nextUnreadIds.length === list.unreadIds.length) return state
      return {
        ...state,
        lists: {
          ...state.lists,
          [key]: {
            ...list,
            unreadIds: nextUnreadIds
          }
        }
      }
    }
    case 'LIST_SET_REFRESHING': {
      const payload = action.payload || {}
      const key = payload.key || payload.listKey
      if (!key) return state
      const prev = ensureList(state, key, payload.meta)
      if (prev.isRefreshing === Boolean(payload.value)) return state
      return {
        ...state,
        lists: {
          ...state.lists,
          [key]: {
            ...mergeMeta(prev, payload.meta),
            isRefreshing: Boolean(payload.value)
          }
        }
      }
    }
    case 'LIST_SET_LOADING_MORE': {
      const payload = action.payload || {}
      const key = payload.key || payload.listKey
      if (!key) return state
      const prev = ensureList(state, key, payload.meta)
      if (prev.isLoadingMore === Boolean(payload.value)) return state
      return {
        ...state,
        lists: {
          ...state.lists,
          [key]: {
            ...mergeMeta(prev, payload.meta),
            isLoadingMore: Boolean(payload.value)
          }
        }
      }
    }
    case 'RESET_LISTS': {
      return {
        activeListKey: 'discover',
        lists: buildDefaultLists()
      }
    }
    default:
      return state
  }
}

function resolveItemId(item) {
  if (!item) return null
  return item.listEntryId || item.uri || item.cid || item.id || null
}
