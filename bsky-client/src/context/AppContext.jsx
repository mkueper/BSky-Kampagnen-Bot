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
import { TimelineProvider, useTimelineState, useTimelineDispatch } from './TimelineContext.jsx'
import { ComposerProvider, useComposerState, useComposerDispatch } from './ComposerContext.jsx'
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
  const timelineState = useTimelineState()
  const timelineDispatch = useTimelineDispatch()
  const composerState = useComposerState()
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
    if (typeof timelineDispatch === 'function') {
      timelineDispatch(action)
    }
    if (typeof composerDispatch === 'function') {
      composerDispatch(action)
    }
    if (typeof threadDispatch === 'function') {
      threadDispatch(action)
    }
    if (typeof uiDispatch === 'function') {
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

  const mergedState = { ...state, ...timelineState, ...composerState }

  return (
    <AppStateContext.Provider value={mergedState}>
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
