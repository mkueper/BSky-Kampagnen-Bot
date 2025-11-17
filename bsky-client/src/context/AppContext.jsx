// This file defines the AppContext for the BskyClient application.
import { createContext, useContext, useReducer, useEffect } from 'react';

const AppStateContext = createContext();
const AppDispatchContext = createContext();

const DEFAULT_TIMELINE_SOURCE = {
  id: 'discover',
  kind: 'official',
  label: 'Discover',
  feedUri: null,
  origin: 'official'
};

const initialFeedPickerState = {
  loading: false,
  error: '',
  pinned: [],
  saved: [],
  errors: [],
  lastUpdatedAt: 0,
  action: {
    pinning: '',
    unpinning: '',
    savingOrder: false,
    refreshing: false
  }
};

const defaultProfileViewerState = {
  open: false,
  actor: null,
  originSection: null,
  anchor: null
}

const initialState = {
  section: 'home',
  profileActor: null,
  me: null,
  composeOpen: false,
  timelineTab: 'discover',
  timelineSource: DEFAULT_TIMELINE_SOURCE,
  replyTarget: null,
  quoteTarget: null,
  confirmDiscard: false,
  refreshTick: 0,
  notificationsRefreshTick: 0,
  timelineTopUri: '',
  timelineHasNew: false,
  timelineLoading: true,
  timelineReady: false,
  feedPicker: initialFeedPickerState,
  feedManagerOpen: false,
  mediaLightbox: { open: false, images: [], index: 0 },
  threadState: { active: false, loading: false, error: '', data: null, uri: null },
  notificationsUnread: 0,
  profileViewer: { ...defaultProfileViewerState }
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_SECTION':
      return {
        ...state,
        section: action.payload,
        profileActor: action.payload === 'profile' ? (action.actor || null) : state.profileActor,
        profileViewer: { ...defaultProfileViewerState }
      };
    case 'SET_ME':
      return { ...state, me: action.payload };
    case 'SET_COMPOSE_OPEN':
      return { ...state, composeOpen: action.payload };
    case 'SET_TIMELINE_TAB':
      return { ...state, timelineTab: action.payload };
    case 'SET_TIMELINE_SOURCE': {
      const nextSource = action.payload || DEFAULT_TIMELINE_SOURCE;
      const shouldUpdateTab = nextSource?.origin !== 'pinned';
      return {
        ...state,
        timelineSource: nextSource,
        timelineTab: shouldUpdateTab ? (nextSource?.id || state.timelineTab) : state.timelineTab
      };
    }
    case 'SET_REPLY_TARGET':
      return { ...state, replyTarget: action.payload };
    case 'SET_QUOTE_TARGET':
      return { ...state, quoteTarget: action.payload };
    case 'RESET_COMPOSER_TARGETS':
      return { ...state, replyTarget: null, quoteTarget: null };
    case 'SET_CONFIRM_DISCARD':
      return { ...state, confirmDiscard: action.payload };
    case 'REFRESH_TIMELINE':
      return { ...state, refreshTick: state.refreshTick + 1, timelineHasNew: false, timelineReady: false };
    case 'REFRESH_NOTIFICATIONS':
      return { ...state, notificationsRefreshTick: state.notificationsRefreshTick + 1 };
    case 'SET_TIMELINE_TOP_URI':
      return { ...state, timelineTopUri: action.payload, timelineHasNew: false, timelineReady: true };
    case 'SET_TIMELINE_HAS_NEW':
      return { ...state, timelineHasNew: action.payload };
    case 'SET_TIMELINE_LOADING':
      return { ...state, timelineLoading: action.payload };
    case 'SET_TIMELINE_READY':
        return { ...state, timelineReady: action.payload };
    case 'OPEN_MEDIA_LIGHTBOX':
      return { ...state, mediaLightbox: { open: true, ...action.payload } };
    case 'CLOSE_MEDIA_LIGHTBOX':
      return { ...state, mediaLightbox: { ...state.mediaLightbox, open: false } };
    case 'NAVIGATE_MEDIA_LIGHTBOX': {
      if (!state.mediaLightbox.open || state.mediaLightbox.images.length === 0) return state;
      const delta = action.payload === 'prev' ? -1 : 1;
      const nextIndex = (state.mediaLightbox.index + delta + state.mediaLightbox.images.length) % state.mediaLightbox.images.length;
      return { ...state, mediaLightbox: { ...state.mediaLightbox, index: nextIndex } };
    }
    case 'SET_THREAD_STATE':
      return { ...state, threadState: action.payload };
    case 'SET_NOTIFICATIONS_UNREAD':
      return { ...state, notificationsUnread: action.payload };
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
    case 'SET_FEED_MANAGER_OPEN':
      return { ...state, feedManagerOpen: Boolean(action.payload) };
    case 'OPEN_PROFILE_VIEWER': {
      const actor = String(action.actor || '').trim() || null
      const anchor = action.anchor || null
      return {
        ...state,
        profileViewer: {
          open: Boolean(actor),
          actor,
          originSection: state.section,
          anchor
        }
      }
    }
    case 'CLOSE_PROFILE_VIEWER':
      return { ...state, profileViewer: { ...defaultProfileViewerState } }
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    let ignore = false
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'same-origin' })
        if (!res.ok) return
        const body = await res.json().catch(() => null)
        const me = body?.profile || body || null
        if (!ignore && me) {
          dispatch({ type: 'SET_ME', payload: me })
        }
      } catch (err) {
        console.error('Failed to fetch session', err)
      }
    }
    fetchMe()
    return () => { ignore = true }
  }, [])

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
