import { createContext, useContext, useReducer } from 'react'
import { threadInitialState, threadReducer } from './reducers/thread.js'
import { patchThreadNode } from './timelineUtils.js'

const ThreadStateContext = createContext(null)
const ThreadDispatchContext = createContext(null)

const DEFAULT_THREAD_UNROLL = {
  open: false
}

const initialThreadContextState = {
  threadState: threadInitialState,
  threadViewVariant: 'modal-cards',
  threadUnroll: { ...DEFAULT_THREAD_UNROLL }
}

function threadContextReducer(state, action) {
  switch (action.type) {
    case 'SET_THREAD_STATE':
      return {
        ...state,
        threadState: threadReducer(state.threadState, action)
      }
    case 'SET_THREAD_VIEW_VARIANT': {
      const variant = typeof action.payload === 'string' ? action.payload : state.threadViewVariant
      return {
        ...state,
        threadViewVariant: variant || state.threadViewVariant
      }
    }
    case 'OPEN_THREAD_UNROLL':
      return {
        ...state,
        threadUnroll: { open: true }
      }
    case 'CLOSE_THREAD_UNROLL':
      return {
        ...state,
        threadUnroll: { open: false }
      }
    case 'PATCH_POST_ENGAGEMENT': {
      const payload = action.payload || {}
      const targetUri = typeof payload.uri === 'string' ? payload.uri : null
      const patch = payload.patch && typeof payload.patch === 'object' ? payload.patch : null
      if (!targetUri || !patch) return state

      const threadState = state.threadState || null
      if (!threadState?.active || !threadState?.data) return state
      const data = threadState.data
      const nextFocus = data?.focus ? patchThreadNode(data.focus, targetUri, patch) : data?.focus
      const parents = Array.isArray(data?.parents) ? data.parents : null
      let parentsChanged = false
      const nextParents = parents
        ? parents.map((parent) => {
            const nextParent = patchThreadNode(parent, targetUri, patch)
            if (nextParent !== parent) parentsChanged = true
            return nextParent
          })
        : parents

      const threadDataChanged = nextFocus !== data?.focus || parentsChanged
      if (!threadDataChanged) return state

      return {
        ...state,
        threadState: {
          ...threadState,
          data: { ...data, focus: nextFocus, ...(parents ? { parents: nextParents } : {}) }
        }
      }
    }
    default:
      return state
  }
}

export function ThreadProvider ({ children }) {
  const [state, dispatch] = useReducer(threadContextReducer, initialThreadContextState)
  return (
    <ThreadStateContext.Provider value={state}>
      <ThreadDispatchContext.Provider value={dispatch}>
        {children}
      </ThreadDispatchContext.Provider>
    </ThreadStateContext.Provider>
  )
}

export function useThreadState () {
  const context = useContext(ThreadStateContext)
  if (context === null) {
    throw new Error('useThreadState must be used within a ThreadProvider')
  }
  return context
}

export function useThreadDispatch () {
  const context = useContext(ThreadDispatchContext)
  if (context === null) {
    throw new Error('useThreadDispatch must be used within a ThreadProvider')
  }
  return context
}
