import { createContext, useContext, useReducer } from 'react'
import {
  listViewInitialState,
  listViewReducer
} from './reducers/listView.js'
import {
  feedInitialState,
  feedReducer
} from './reducers/feed.js'
import { patchObjectIfMatches } from './timelineUtils.js'

const TimelineStateContext = createContext(null)
const TimelineDispatchContext = createContext(null)

const initialTimelineState = {
  ...listViewInitialState,
  ...feedInitialState
}

function patchTimelineLists(lists, targetUri, patch) {
  if (!lists || typeof lists !== 'object') return null
  let listsChanged = false
  const nextLists = {}

  for (const [key, list] of Object.entries(lists)) {
    const items = Array.isArray(list?.items) ? list.items : null
    if (!items) {
      nextLists[key] = list
      continue
    }
    let itemsChanged = false
    const nextItems = items.map((item) => {
      const nextItem = patchObjectIfMatches(item, targetUri, patch)
      if (nextItem !== item) itemsChanged = true
      return nextItem
    })
    if (itemsChanged) {
      listsChanged = true
      nextLists[key] = { ...list, items: nextItems }
    } else {
      nextLists[key] = list
    }
  }

  return listsChanged ? nextLists : null
}

function removePostFromTimelineLists(lists, targetUri) {
  if (!lists || typeof lists !== 'object') return null
  let listsChanged = false
  const nextLists = {}

  for (const [key, list] of Object.entries(lists)) {
    const items = Array.isArray(list?.items) ? list.items : null
    if (!items) {
      nextLists[key] = list
      continue
    }
    const filtered = items.filter(item => (item?.uri || item?.raw?.post?.uri) !== targetUri)
    if (filtered.length !== items.length) {
      listsChanged = true
      nextLists[key] = { ...list, items: filtered }
    } else {
      nextLists[key] = list
    }
  }

  return listsChanged ? nextLists : null
}

function timelineReducer(state, action) {
  let nextState = state
  const listParams = { activeListKey: state.activeListKey, lists: state.lists }
  const listResult = listViewReducer(listParams, action)
  if (listResult !== listParams) {
    nextState = { ...nextState, ...listResult }
  }

  const feedParams = { feedPicker: state.feedPicker, feedManagerOpen: state.feedManagerOpen }
  const feedResult = feedReducer(feedParams, action)
  if (feedResult !== feedParams) {
    nextState = { ...nextState, ...feedResult }
  }

  switch (action.type) {
    case 'PATCH_POST_ENGAGEMENT': {
      const payload = action.payload || {}
      const targetUri = typeof payload.uri === 'string' ? payload.uri : null
      const patch = payload.patch && typeof payload.patch === 'object' ? payload.patch : null
      if (!targetUri || !patch) return nextState

      const nextLists = patchTimelineLists(nextState.lists, targetUri, patch)
      if (!nextLists) return nextState
      return { ...nextState, lists: nextLists }
    }
    case 'REMOVE_POST': {
      const targetUri = typeof action.payload === 'string' ? action.payload : null
      if (!targetUri) return nextState
      const nextLists = removePostFromTimelineLists(nextState.lists, targetUri)
      if (!nextLists) return nextState
      return { ...nextState, lists: nextLists }
    }
    default:
      return nextState
  }
}

export function TimelineProvider ({ children }) {
  const [state, dispatch] = useReducer(timelineReducer, initialTimelineState)
  return (
    <TimelineStateContext.Provider value={state}>
      <TimelineDispatchContext.Provider value={dispatch}>
        {children}
      </TimelineDispatchContext.Provider>
    </TimelineStateContext.Provider>
  )
}

export function useTimelineState () {
  const context = useContext(TimelineStateContext)
  if (context === null) {
    throw new Error('useTimelineState must be used within a TimelineProvider')
  }
  return context
}

export function useTimelineDispatch () {
  const context = useContext(TimelineDispatchContext)
  if (context === null) {
    throw new Error('useTimelineDispatch must be used within a TimelineProvider')
  }
  return context
}
