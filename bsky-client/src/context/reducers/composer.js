import {
  createDefaultInteractionData,
  createDefaultInteractionDraft,
  deriveDraftFromData
} from '../../modules/composer/interactionSettingsUtils.js';

export const composerInitialState = {
  composeOpen: false,
  replyTarget: null,
  quoteTarget: null,
  confirmDiscard: false,
  composeMode: 'single', // 'single' | 'thread'
  threadSource: '',
  threadAppendNumbering: true,
  interactionSettings: {
    modalOpen: false,
    loading: false,
    saving: false,
    initialized: false,
    error: null,
    data: createDefaultInteractionData(),
    draft: createDefaultInteractionDraft(),
    lists: {
      loading: false,
      error: null,
      items: [],
      loaded: false
    }
  }
};

export function composerReducer(state, action) {
  switch (action.type) {
    case 'SET_COMPOSE_OPEN':
      return { ...state, composeOpen: action.payload };
    case 'SET_COMPOSE_MODE':
      return { ...state, composeMode: action.payload === 'thread' ? 'thread' : 'single' };
    case 'SET_THREAD_SOURCE':
      return { ...state, threadSource: String(action.payload || '') };
    case 'SET_THREAD_APPEND_NUMBERING':
      return { ...state, threadAppendNumbering: Boolean(action.payload) };
    case 'SET_REPLY_TARGET':
      return { ...state, replyTarget: action.payload };
    case 'SET_QUOTE_TARGET':
      return { ...state, quoteTarget: action.payload };
    case 'RESET_COMPOSER_TARGETS':
      return { ...state, replyTarget: null, quoteTarget: null, composeMode: 'single' };
    case 'SET_CONFIRM_DISCARD':
      return { ...state, confirmDiscard: action.payload };
    case 'SET_INTERACTION_MODAL_OPEN':
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          modalOpen: Boolean(action.payload),
          error: action.error ?? state.interactionSettings.error
        }
      };
    case 'SET_INTERACTION_SETTINGS_LOADING':
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          loading: Boolean(action.payload),
          error: action.error ?? null
        }
      };
    case 'SET_INTERACTION_SETTINGS_DATA': {
      const data = action.payload || createDefaultInteractionData();
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          loading: false,
          saving: false,
          initialized: true,
          error: null,
          data,
          draft: deriveDraftFromData(data)
        }
      };
    }
    case 'SET_INTERACTION_SETTINGS_ERROR':
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          loading: false,
          saving: false,
          initialized: true,
          error: action.payload || 'Unbekannter Fehler'
        }
      };
    case 'SET_INTERACTION_SETTINGS_DRAFT':
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          draft: {
            ...state.interactionSettings.draft,
            ...(action.payload || {})
          }
        }
      };
    case 'SET_INTERACTION_SETTINGS_SAVING':
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          saving: Boolean(action.payload),
          error: action.error ?? null
        }
      };
    case 'SET_INTERACTION_LISTS_LOADING':
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          lists: {
            ...state.interactionSettings.lists,
            loading: Boolean(action.payload),
            error: action.error ?? null
          }
        }
      };
    case 'SET_INTERACTION_LISTS':
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          lists: {
            loading: false,
            error: null,
            loaded: true,
            items: Array.isArray(action.payload?.items) ? action.payload.items : []
          }
        }
      };
    case 'SET_INTERACTION_LISTS_ERROR':
      return {
        ...state,
        interactionSettings: {
          ...state.interactionSettings,
          lists: {
            ...state.interactionSettings.lists,
            loading: false,
            loaded: true,
            error: action.payload || 'Listen konnten nicht geladen werden.'
          }
        }
      };
    default:
      return state;
  }
}
