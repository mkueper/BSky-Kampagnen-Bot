import { createContext, useContext, useReducer, useEffect } from 'react'
import { notificationsInitialState, notificationsReducer } from './reducers/notifications.js'
import { profileInitialState, profileReducer, defaultProfileViewerState } from './reducers/profile.js'
import { mediaLightboxInitialState, mediaLightboxReducer } from './reducers/mediaLightbox.js'

const UIStateContext = createContext(null)
const UIDispatchContext = createContext(null)

const DEFAULT_HASHTAG_STATE = {
  open: false,
  label: '',
  description: '',
  query: '',
  tab: 'top'
}

const DEFAULT_CHAT_VIEWER = {
  open: false,
  convoId: null,
  conversation: null
}

const QUOTE_REPOST_STORAGE_KEY = 'bsky.quoteReposts'

function loadLocalStorageJson (key, fallback) {
  if (typeof globalThis === 'undefined') return fallback
  try {
    const raw = globalThis?.localStorage?.getItem?.(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

const initialUIState = {
  ...notificationsInitialState,
  ...profileInitialState,
  mediaLightbox: mediaLightboxInitialState,
  quoteReposts: loadLocalStorageJson(QUOTE_REPOST_STORAGE_KEY, {}),
  hashtagSearch: { ...DEFAULT_HASHTAG_STATE },
  chatViewer: { ...DEFAULT_CHAT_VIEWER },
  chatUnreadCount: 0,
  clientSettingsOpen: false
}

function uiReducer(state, action) {
  switch (action?.type) {
    case 'SET_QUOTE_REPOST': {
      const payload = action.payload || {}
      const targetUri = typeof payload.targetUri === 'string' ? payload.targetUri : null
      const quoteUri = typeof payload.quoteUri === 'string' ? payload.quoteUri : null
      if (!targetUri || !quoteUri) return state
      const nextMap = { ...(state.quoteReposts || {}) }
      nextMap[targetUri] = quoteUri
      return { ...state, quoteReposts: nextMap }
    }
    case 'CLEAR_QUOTE_REPOST': {
      const targetUri = typeof action.payload === 'string' ? action.payload : (action.payload?.targetUri || null)
      if (!targetUri) return state
      const current = state.quoteReposts || {}
      if (!Object.prototype.hasOwnProperty.call(current, targetUri)) return state
      const nextMap = { ...current }
      delete nextMap[targetUri]
      return { ...state, quoteReposts: nextMap }
    }
    case 'REMOVE_POST': {
      const targetUri = typeof action.payload === 'string' ? action.payload : null
      if (!targetUri) return state
      const nextQuoteMap = { ...(state.quoteReposts || {}) }
      delete nextQuoteMap[targetUri]
      return {
        ...state,
        quoteReposts: nextQuoteMap
      }
    }
    case 'SET_SECTION': {
      const { payload: section, actor } = action
      return {
        ...state,
        profileActor: section === 'profile' ? (actor || null) : state.profileActor,
        profileViewer: { ...defaultProfileViewerState }
      }
    }
    case 'OPEN_HASHTAG_SEARCH': {
      const payload = action.payload || {}
      const query = String(payload.query || '').trim()
      if (!query) return state
      const nextTab = payload.tab === 'latest' ? 'latest' : 'top'
      return {
        ...state,
        hashtagSearch: {
          open: true,
          label: payload.label || query,
          description: payload.description || '',
          query,
          tab: nextTab
        }
      }
    }
    case 'CLOSE_HASHTAG_SEARCH': {
      return {
        ...state,
        hashtagSearch: {
          ...state.hashtagSearch,
          open: false
        }
      }
    }
    case 'OPEN_PROFILE_VIEWER': {
      const actor = String(action.actor || '').trim() || null
      if (!actor) return state
      return {
        ...state,
        profileViewer: {
          ...state.profileViewer,
          open: true,
          actor,
          originSection: action.originSection || null,
          anchor: action.anchor || null
        },
        hashtagSearch: {
          ...state.hashtagSearch,
          open: false
        }
      }
    }
    case 'OPEN_CHAT_VIEWER': {
      const payload = action || {}
      const conversation = payload.conversation && typeof payload.conversation === 'object' ? payload.conversation : null
      const convoId = typeof payload.conversationId === 'string'
        ? payload.conversationId
        : (conversation?.id || null)
      if (!convoId) return state
      return {
        ...state,
        chatViewer: {
          open: true,
          convoId,
          conversation
        },
        profileViewer: state.profileViewer?.open ? { ...defaultProfileViewerState } : state.profileViewer,
        hashtagSearch: {
          ...state.hashtagSearch,
          open: false
        }
      }
    }
    case 'CLOSE_CHAT_VIEWER': {
      return {
        ...state,
        chatViewer: { ...DEFAULT_CHAT_VIEWER }
      }
    }
    case 'PATCH_CHAT_VIEWER_SNAPSHOT': {
      if (!state.chatViewer?.open || !state.chatViewer?.convoId) return state
      const targetId = action.conversationId || state.chatViewer.convoId
      if (targetId !== state.chatViewer.convoId) return state
      const snapshot = action.snapshot && typeof action.snapshot === 'object' ? action.snapshot : null
      if (!snapshot) return state
      return {
        ...state,
        chatViewer: {
          ...state.chatViewer,
          conversation: {
            ...(state.chatViewer.conversation || {}),
            ...snapshot
          }
        }
      }
    }
    case 'SET_CHAT_UNREAD': {
      const nextCount = Number.isFinite(action.payload) ? Math.max(0, action.payload) : 0
      if (nextCount === state.chatUnreadCount) return state
      return {
        ...state,
        chatUnreadCount: nextCount
      }
    }
    case 'SET_CLIENT_SETTINGS_OPEN': {
      return {
        ...state,
        clientSettingsOpen: Boolean(action.payload)
      }
    }
    default:
      break
  }

  const notifications = notificationsReducer({
    notificationsRefreshTick: state.notificationsRefreshTick,
    notificationsUnread: state.notificationsUnread,
    notificationsSettingsOpen: state.notificationsSettingsOpen
  }, action)

  const profile = profileReducer({
    me: state.me,
    profileActor: state.profileActor,
    profileViewer: state.profileViewer
  }, action)

  const mediaLightbox = mediaLightboxReducer(state.mediaLightbox, action)

  return {
    ...state,
    ...notifications,
    ...profile,
    mediaLightbox
  }
}

export function UIProvider ({ children }) {
  const [state, dispatch] = useReducer(uiReducer, initialUIState)

  useEffect(() => {
    try {
      globalThis?.localStorage?.setItem?.(QUOTE_REPOST_STORAGE_KEY, JSON.stringify(state.quoteReposts || {}))
    } catch {
      /* ignore storage errors */
    }
  }, [state.quoteReposts])

  return (
    <UIStateContext.Provider value={state}>
      <UIDispatchContext.Provider value={dispatch}>
        {children}
      </UIDispatchContext.Provider>
    </UIStateContext.Provider>
  )
}

export function useUIState () {
  const context = useContext(UIStateContext)
  if (context === null) {
    throw new Error('useUIState must be used within a UIProvider')
  }
  return context
}

export function useUIDispatch () {
  const context = useContext(UIDispatchContext)
  if (context === null) {
    throw new Error('useUIDispatch must be used within a UIProvider')
  }
  return context
}
