import React from 'react'
import { createContext, useContext, useReducer, useEffect, useLayoutEffect, useCallback } from 'react';
import { AuthContext } from '../modules/auth/AuthContext.jsx'
import {
  mediaLightboxInitialState,
  mediaLightboxReducer,
  notificationsInitialState,
  notificationsReducer,
  profileInitialState,
  profileReducer,
  defaultProfileViewerState
} from './reducers/index.js';
import { TimelineProvider, useTimelineState, useTimelineDispatch } from './TimelineContext.jsx'
import { ComposerProvider, useComposerState, useComposerDispatch } from './ComposerContext.jsx'
import { ThreadProvider, useThreadDispatch } from './ThreadContext.jsx'

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

const QUOTE_REPOST_STORAGE_KEY = 'bsky.quoteReposts'

const AppStateContext = createContext();
const AppDispatchContext = createContext();
let renderPhaseActive = false
const RENDER_DISPATCH_LOG_KEY = 'bsky-debug:dispatch-during-render'
const MAX_RENDER_DISPATCH_LOGS = 50

const defaultChatViewerState = {
  open: false,
  convoId: null,
  conversation: null
};

const initialState = {
  section: 'home',
  ...notificationsInitialState,
  ...profileInitialState,

  mediaLightbox: mediaLightboxInitialState,
  quoteReposts: loadLocalStorageJson(QUOTE_REPOST_STORAGE_KEY, {}),
  hashtagSearch: {
    open: false,
    label: '',
    description: '',
    query: '',
    tab: 'top'
  },
  chatViewer: { ...defaultChatViewerState },
  chatUnreadCount: 0,
  clientSettingsOpen: false,
  notificationsSettingsOpen: false
};

function appReducer(state, action) {
  // Handle cross-slice actions first
  switch (action.type) {
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
      const { payload: section, actor } = action;
      return {
        ...state,
        section,
        profileActor: section === 'profile' ? (actor || null) : state.profileActor,
        profileViewer: { ...defaultProfileViewerState }
      };
    }
    case 'OPEN_HASHTAG_SEARCH': {
      const payload = action.payload || {};
      const query = String(payload.query || '').trim();
      if (!query) return state;
      const nextTab = payload.tab === 'latest' ? 'latest' : 'top';
      return {
        ...state,
        hashtagSearch: {
          open: true,
          label: payload.label || query,
          description: payload.description || '',
          query,
          tab: nextTab
        }
      };
    }
    case 'CLOSE_HASHTAG_SEARCH': {
      return {
        ...state,
        hashtagSearch: {
          ...state.hashtagSearch,
          open: false
        }
      };
    }
    case 'OPEN_PROFILE_VIEWER': {
      const actor = String(action.actor || '').trim() || null;
      if (!actor) return state;
      return {
        ...state,
        profileViewer: {
          ...state.profileViewer,
          open: true,
          actor,
          originSection: state.section,
          anchor: action.anchor || null,
        },
        hashtagSearch: {
          ...state.hashtagSearch,
          open: false
        }
      };
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
        chatViewer: { ...defaultChatViewerState }
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
  }

  // For other actions, combine results from sliced reducers.
  // Note: The 'unknown action' error from the original reducer is removed for simplicity,
  // as each action is now passed to multiple reducer slices.
  const notifications = notificationsReducer({
    notificationsRefreshTick: state.notificationsRefreshTick,
    notificationsUnread: state.notificationsUnread,
    notificationsSettingsOpen: state.notificationsSettingsOpen
  }, action);

  const profile = profileReducer({
    me: state.me,
    profileActor: state.profileActor,
    profileViewer: state.profileViewer,
  }, action);

  const finalState = {
    ...state,
    ...notifications,
    ...profile,
    mediaLightbox: mediaLightboxReducer(state.mediaLightbox, action),
  };

  if (Object.keys(finalState).every(key => finalState[key] === state[key])) {
    // If no slice reducer changed the state, and it wasn't a cross-slice action,
    // it's an unknown action.
    if (!['SET_SECTION', 'OPEN_PROFILE_VIEWER', 'OPEN_HASHTAG_SEARCH', 'CLOSE_HASHTAG_SEARCH', 'OPEN_CHAT_VIEWER', 'CLOSE_CHAT_VIEWER', 'PATCH_CHAT_VIEWER_SNAPSHOT', 'SET_CHAT_UNREAD', 'SET_CLIENT_SETTINGS_OPEN'].includes(action.type)) {
      // Uncomment to restore original behavior for unknown actions
      // throw new Error(`Unknown action: ${action.type}`);
    }
  }

  return finalState;
}

function AppProviderContent ({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const auth = useContext(AuthContext)
  const isDev = Boolean(import.meta?.env?.DEV)
  const timelineState = useTimelineState()
  const timelineDispatch = useTimelineDispatch()
  const composerState = useComposerState()
  const composerDispatch = useComposerDispatch()
  const threadDispatch = useThreadDispatch()

  renderPhaseActive = true
  useLayoutEffect(() => {
    renderPhaseActive = false
  })

  const storeRenderDispatchLog = useCallback((payload) => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(RENDER_DISPATCH_LOG_KEY)
      const existing = raw ? JSON.parse(raw) : []
      const nextLogs = Array.isArray(existing) ? existing : []
      nextLogs.push(payload)
      if (nextLogs.length > MAX_RENDER_DISPATCH_LOGS) {
        nextLogs.splice(0, nextLogs.length - MAX_RENDER_DISPATCH_LOGS)
      }
      window.localStorage.setItem(RENDER_DISPATCH_LOG_KEY, JSON.stringify(nextLogs))
    } catch (error) {
      console.warn('[AppProvider] Render-dispatch log could not be stored.', error)
    }
  }, [])

  const guardedDispatch = useCallback((action) => {
    if (typeof timelineDispatch === 'function') {
      timelineDispatch(action)
    }
    if (typeof composerDispatch === 'function') {
      composerDispatch(action)
    }
    if (typeof threadDispatch === 'function') {
      threadDispatch(action)
    }
    if (isDev && renderPhaseActive) {
      const timestamp = new Date().toISOString()
      const stack = new Error('Dispatch during render').stack || ''
      storeRenderDispatchLog({
        timestamp,
        action,
        stack
      })
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('bsky:debug:dispatch-during-render', {
            detail: { timestamp }
          }))
        } catch {
          /* ignore event errors */
        }
      }
      console.warn('[AppProvider] Dispatch during render detected.', action)
      console.trace()
    }
    return dispatch(action)
  }, [dispatch, isDev, storeRenderDispatchLog, timelineDispatch, composerDispatch, threadDispatch])

  useEffect(() => {
    try {
      globalThis?.localStorage?.setItem?.(QUOTE_REPOST_STORAGE_KEY, JSON.stringify(state.quoteReposts || {}))
    } catch {
      /* ignore storage errors */
    }
  }, [state.quoteReposts])

  useEffect(() => {
    if (!auth) return
    if (auth.status === 'authenticated') {
      if (auth.profile) {
        dispatch({ type: 'SET_ME', payload: auth.profile })
      }
      return
    }
    if (auth.status === 'unauthenticated') {
      dispatch({ type: 'SET_ME', payload: null })
    }
  }, [auth?.status, auth?.profile, dispatch])

  const mergedState = { ...state, ...timelineState, ...composerState }

  return (
    <AppStateContext.Provider value={mergedState}>
      <AppDispatchContext.Provider value={guardedDispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export const AppProvider = ({ children }) => (
  <TimelineProvider>
    <ComposerProvider>
      <ThreadProvider>
        <AppProviderContent>{children}</AppProviderContent>
      </ThreadProvider>
    </ComposerProvider>
  </TimelineProvider>
);

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
};

export const useOptionalAppDispatch = () => {
  return useContext(AppDispatchContext) || null;
};
