import React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer
} from 'react'
import { AuthContext } from '../modules/auth/AuthContext.jsx'
import { TimelineProvider, useTimelineDispatch } from './TimelineContext.jsx'
import { ComposerProvider, useComposerDispatch } from './ComposerContext.jsx'
import { ThreadProvider, useThreadDispatch } from './ThreadContext.jsx'
import { UIProvider, useUIDispatch } from './UIContext.jsx'

const AppStateContext = createContext()
const AppDispatchContext = createContext()
let renderPhaseActive = false
const RENDER_DISPATCH_LOG_KEY = 'bsky-debug:dispatch-during-render'
const MAX_RENDER_DISPATCH_LOGS = 50

const initialState = {
  section: 'home'
}

const DEFAULT_DISPATCH_CONTEXTS = ['timeline', 'composer', 'thread', 'ui']
const TIMELINE_ACTION_PREFIXES = ['LIST_', 'SET_FEED_']
const composerActionSet = new Set([
  'SET_COMPOSE_OPEN',
  'SET_COMPOSE_MODE',
  'SET_THREAD_SOURCE',
  'SET_THREAD_APPEND_NUMBERING',
  'SET_REPLY_TARGET',
  'SET_QUOTE_TARGET',
  'RESET_COMPOSER_TARGETS',
  'SET_CONFIRM_DISCARD',
  'SET_INTERACTION_MODAL_OPEN',
  'SET_INTERACTION_SETTINGS_LOADING',
  'SET_INTERACTION_SETTINGS_DATA',
  'SET_INTERACTION_SETTINGS_ERROR',
  'SET_INTERACTION_SETTINGS_DRAFT',
  'SET_INTERACTION_SETTINGS_SAVING',
  'SET_INTERACTION_LISTS_LOADING',
  'SET_INTERACTION_LISTS',
  'SET_INTERACTION_LISTS_ERROR'
])
const threadActionSet = new Set([
  'SET_THREAD_STATE',
  'SET_THREAD_VIEW_VARIANT',
  'OPEN_THREAD_UNROLL',
  'CLOSE_THREAD_UNROLL',
  'PATCH_POST_ENGAGEMENT'
])
const uiActionSet = new Set([
  'SET_QUOTE_REPOST',
  'CLEAR_QUOTE_REPOST',
  'OPEN_HASHTAG_SEARCH',
  'CLOSE_HASHTAG_SEARCH',
  'OPEN_PROFILE_VIEWER',
  'OPEN_CHAT_VIEWER',
  'CLOSE_CHAT_VIEWER',
  'PATCH_CHAT_VIEWER_SNAPSHOT',
  'SET_CHAT_UNREAD',
  'SET_CLIENT_SETTINGS_OPEN',
  'SET_NOTIFICATIONS_UNREAD',
  'SET_NOTIFICATIONS_SETTINGS_OPEN',
  'SET_SECTION',
  'SET_ME'
])
const timelineActionSet = new Set([
  'SET_ACTIVE_LIST',
  'RESET_LISTS',
  'PATCH_POST_ENGAGEMENT',
  'REMOVE_POST',
  'SET_FEED_PICKER_STATE',
  'SET_FEED_MANAGER_OPEN'
])

function matchesPrefix (type, prefixes = []) {
  if (!type) return false
  return prefixes.some((prefix) => type.startsWith(prefix))
}

function getDispatchTargets (type) {
  if (!type) return DEFAULT_DISPATCH_CONTEXTS
  const normalizedType = String(type)
  const targets = new Set()
  if (timelineActionSet.has(normalizedType) || matchesPrefix(normalizedType, TIMELINE_ACTION_PREFIXES)) {
    targets.add('timeline')
  }
  if (composerActionSet.has(normalizedType) || normalizedType.startsWith('SET_COMPOSE')) {
    targets.add('composer')
  }
  if (threadActionSet.has(normalizedType)) {
    targets.add('thread')
  }
  if (uiActionSet.has(normalizedType)) {
    targets.add('ui')
  }
  if (targets.size === 0) {
    return DEFAULT_DISPATCH_CONTEXTS
  }
  return Array.from(targets)
}

function appReducer(state, action) {
  if (action?.type === 'SET_SECTION') {
    const nextSection = action.payload || state.section
    return {
      ...state,
      section: nextSection
    }
  }
  return state
}

function AppProviderContent ({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const auth = useContext(AuthContext)
  const isDev = Boolean(import.meta?.env?.DEV)
  const timelineDispatch = useTimelineDispatch()
  const composerDispatch = useComposerDispatch()
  const threadDispatch = useThreadDispatch()
  const uiDispatch = useUIDispatch()

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
    const targets = getDispatchTargets(action?.type)
    if (targets.includes('timeline') && typeof timelineDispatch === 'function') {
      timelineDispatch(action)
    }
    if (targets.includes('composer') && typeof composerDispatch === 'function') {
      composerDispatch(action)
    }
    if (targets.includes('thread') && typeof threadDispatch === 'function') {
      threadDispatch(action)
    }
    if (targets.includes('ui') && typeof uiDispatch === 'function') {
      uiDispatch(action)
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
  }, [dispatch, isDev, storeRenderDispatchLog, timelineDispatch, composerDispatch, threadDispatch, uiDispatch])

  useEffect(() => {
    if (!auth) return
    if (auth.status === 'authenticated') {
      if (auth.profile) {
        guardedDispatch({ type: 'SET_ME', payload: auth.profile })
      }
      return
    }
    if (auth.status === 'unauthenticated') {
      guardedDispatch({ type: 'SET_ME', payload: null })
    }
  }, [auth?.status, auth?.profile, guardedDispatch])

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={guardedDispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

export const AppProvider = ({ children }) => (
  <TimelineProvider>
    <ComposerProvider>
      <ThreadProvider>
        <UIProvider>
          <AppProviderContent>{children}</AppProviderContent>
        </UIProvider>
      </ThreadProvider>
    </ComposerProvider>
  </TimelineProvider>
)

export const useAppState = () => {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider')
  }
  return context
}

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext)
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within an AppProvider')
  }
  return context
}

export const useOptionalAppDispatch = () => {
  return useContext(AppDispatchContext) || null
}
