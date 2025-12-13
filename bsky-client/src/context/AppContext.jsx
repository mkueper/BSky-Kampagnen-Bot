import React from 'react'
import { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthContext } from '../modules/auth/AuthContext.jsx'
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


const AppStateContext = createContext();
const AppDispatchContext = createContext();

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
  threadUnroll: {
    open: false
  },
  hashtagSearch: {
    open: false,
    label: '',
    description: '',
    query: '',
    tab: 'top'
  }
};

function appReducer(state, action) {
  // Handle cross-slice actions first
  switch (action.type) {
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
    if (!['SET_SECTION', 'OPEN_PROFILE_VIEWER', 'SET_FEED_PICKER_STATE', 'OPEN_HASHTAG_SEARCH', 'CLOSE_HASHTAG_SEARCH'].includes(action.type)) {
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
