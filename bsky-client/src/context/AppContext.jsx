import React from 'react'
import { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthContext } from '../modules/auth/AuthContext.jsx'
import { applyEngagementPatch } from '@bsky-kampagnen-bot/shared-logic'
import {
  composerInitialState,
  composerReducer,
  feedInitialState,
  feedReducer,
  mediaLightboxInitialState,
  mediaLightboxReducer,
  notificationsInitialState,
  notificationsReducer,
  profileInitialState,
  profileReducer,
  defaultProfileViewerState,
  threadInitialState,
  threadReducer,
  listViewInitialState,
  listViewReducer
} from './reducers/index.js';

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

const defaultChatViewerState = {
  open: false,
  convoId: null,
  conversation: null
};

const initialState = {
  section: 'home',
  ...listViewInitialState,
  ...composerInitialState,
  ...notificationsInitialState,
  ...profileInitialState,

  mediaLightbox: mediaLightboxInitialState,
  ...feedInitialState,
  threadState: threadInitialState,
  threadViewVariant: 'modal-cards',
  quoteReposts: loadLocalStorageJson(QUOTE_REPOST_STORAGE_KEY, {}),
  threadUnroll: {
    open: false
  },
  hashtagSearch: {
    open: false,
    label: '',
    description: '',
    query: '',
    tab: 'top'
  },
  chatViewer: { ...defaultChatViewerState },
  chatUnreadCount: 0,
  clientSettingsOpen: false
};

function patchObjectIfMatches (obj, targetUri, patch) {
  if (!obj || typeof obj !== 'object') return obj
  if (!targetUri) return obj

  const uri = obj?.uri || obj?.raw?.post?.uri || obj?.raw?.item?.uri || null
  if (uri !== targetUri) return obj

  let changed = false
  const next = { ...obj }

  if (obj?.stats || obj?.viewer) {
    const { viewer, stats } = applyEngagementPatch(
      { viewer: obj?.viewer || null, stats: obj?.stats || null },
      patch
    )
    if (viewer && viewer !== obj.viewer) {
      next.viewer = viewer
      changed = true
    }
    if (stats && stats !== obj.stats) {
      next.stats = stats
      changed = true
    }
  }

  if (obj?.record && typeof obj.record === 'object') {
    const recordStats = obj.record?.stats || null
    const recordViewer = obj.record?.viewer || null
    const { viewer, stats } = applyEngagementPatch({ viewer: recordViewer, stats: recordStats }, patch)
    if (viewer !== recordViewer || stats !== recordStats) {
      next.record = { ...obj.record, ...(viewer !== recordViewer ? { viewer } : {}), ...(stats !== recordStats ? { stats } : {}) }
      changed = true
    }
  }

  const rawPost = obj?.raw?.post
  if (rawPost && typeof rawPost === 'object') {
    const rawViewer = rawPost.viewer || null
    const rawStats = {
      likeCount: rawPost.likeCount,
      repostCount: rawPost.repostCount,
      replyCount: rawPost.replyCount
    }
    const { viewer, stats } = applyEngagementPatch({ viewer: rawViewer, stats: rawStats }, patch)
    const nextRawPost = { ...rawPost }
    let rawChanged = false
    if (viewer !== rawViewer) {
      nextRawPost.viewer = viewer
      rawChanged = true
    }
    if (stats.likeCount !== rawPost.likeCount) {
      nextRawPost.likeCount = stats.likeCount
      rawChanged = true
    }
    if (stats.repostCount !== rawPost.repostCount) {
      nextRawPost.repostCount = stats.repostCount
      rawChanged = true
    }
    if (stats.replyCount !== rawPost.replyCount) {
      nextRawPost.replyCount = stats.replyCount
      rawChanged = true
    }
    if (rawChanged) {
      next.raw = { ...(obj.raw || {}), post: nextRawPost }
      changed = true
    }
  }

  return changed ? next : obj
}

function patchThreadNode (node, targetUri, patch) {
  if (!node || typeof node !== 'object') return node
  const patchedNode = patchObjectIfMatches(node, targetUri, patch)
  const replies = Array.isArray(patchedNode?.replies) ? patchedNode.replies : null
  if (!replies) return patchedNode
  let repliesChanged = false
  const nextReplies = replies.map((reply) => {
    const nextReply = patchThreadNode(reply, targetUri, patch)
    if (nextReply !== reply) repliesChanged = true
    return nextReply
  })
  if (!repliesChanged) return patchedNode
  return { ...patchedNode, replies: nextReplies }
}

function appReducer(state, action) {
  // Handle cross-slice actions first
  switch (action.type) {
    case 'PATCH_POST_ENGAGEMENT': {
      const payload = action.payload || {}
      const targetUri = typeof payload.uri === 'string' ? payload.uri : null
      const patch = payload.patch && typeof payload.patch === 'object' ? payload.patch : null
      if (!targetUri || !patch) return state

      const currentLists = state.lists || {}
      let listsChanged = false
      const nextLists = {}
      for (const [key, list] of Object.entries(currentLists)) {
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

      const threadState = state.threadState || null
      let nextThreadState = threadState
      if (threadState?.active && threadState?.data) {
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
        if (threadDataChanged) {
          nextThreadState = { ...threadState, data: { ...data, focus: nextFocus, ...(parents ? { parents: nextParents } : {}) } }
        }
      }

      if (!listsChanged && nextThreadState === threadState) return state
      return {
        ...state,
        ...(listsChanged ? { lists: nextLists } : {}),
        ...(nextThreadState !== threadState ? { threadState: nextThreadState } : {})
      }
    }
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
    case 'OPEN_THREAD_UNROLL': {
      return {
        ...state,
        threadUnroll: { open: true }
      }
    }
    case 'CLOSE_THREAD_UNROLL': {
      return {
        ...state,
        threadUnroll: { open: false }
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
    case 'SET_FEED_PICKER_STATE': {
        const payload = action.payload || {};
        const { action: actionPatch, ...rest } = payload;
        const nextFeedPicker = {
            ...state.feedPicker,
            ...rest,
            action: {
                ...state.feedPicker.action,
                ...(actionPatch || {})
            }
        };
        return { ...state, feedPicker: nextFeedPicker };
    }
    case 'SET_THREAD_VIEW_VARIANT': {
      const variant = typeof action.payload === 'string' ? action.payload : state.threadViewVariant;
      return {
        ...state,
        threadViewVariant: variant || state.threadViewVariant
      };
    }
  }

  // For other actions, combine results from sliced reducers.
  // Note: The 'unknown action' error from the original reducer is removed for simplicity,
  // as each action is now passed to multiple reducer slices.
  const listView = listViewReducer({
    activeListKey: state.activeListKey,
    lists: state.lists
  }, action);

  const composer = composerReducer({
    composeOpen: state.composeOpen,
    replyTarget: state.replyTarget,
    quoteTarget: state.quoteTarget,
    confirmDiscard: state.confirmDiscard,
    composeMode: state.composeMode,
    threadSource: state.threadSource,
    threadAppendNumbering: state.threadAppendNumbering,
    interactionSettings: state.interactionSettings
  }, action);

  const notifications = notificationsReducer({
    notificationsRefreshTick: state.notificationsRefreshTick,
    notificationsUnread: state.notificationsUnread,
  }, action);
  
  const feed = feedReducer({
    feedPicker: state.feedPicker,
    feedManagerOpen: state.feedManagerOpen,
  }, action);

  const profile = profileReducer({
    me: state.me,
    profileActor: state.profileActor,
    profileViewer: state.profileViewer,
  }, action);

  const finalState = {
    ...state,
    ...listView,
    ...composer,
    ...notifications,
    ...feed,
    ...profile,
    mediaLightbox: mediaLightboxReducer(state.mediaLightbox, action),
    threadState: threadReducer(state.threadState, action),
  };

  if (Object.keys(finalState).every(key => finalState[key] === state[key])) {
    // If no slice reducer changed the state, and it wasn't a cross-slice action,
    // it's an unknown action.
    if (!['SET_SECTION', 'OPEN_PROFILE_VIEWER', 'SET_FEED_PICKER_STATE', 'OPEN_HASHTAG_SEARCH', 'CLOSE_HASHTAG_SEARCH', 'OPEN_CHAT_VIEWER', 'CLOSE_CHAT_VIEWER', 'PATCH_CHAT_VIEWER_SNAPSHOT', 'SET_CHAT_UNREAD'].includes(action.type)) {
      // Uncomment to restore original behavior for unknown actions
      // throw new Error(`Unknown action: ${action.type}`);
    }
  }

  return finalState;
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const auth = useContext(AuthContext)

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

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

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
