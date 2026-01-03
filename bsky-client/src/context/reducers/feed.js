export const feedInitialState = {
  feedPicker: {
    loading: false,
    error: '',
    pinned: [],
    saved: [],
    discover: [],
    discoverCursor: null,
    discoverHasMore: true,
    discoverLoadingMore: false,
    errors: [],
    lastUpdatedAt: 0,
    draft: {
      pinned: [],
      saved: [],
      dirty: false
    },
    action: {
      pinning: '',
      unpinning: '',
      savingOrder: false,
      refreshing: false
    }
  },
  feedManagerOpen: false,
};

export function feedReducer(state, action) {
  switch (action.type) {
    case 'SET_FEED_PICKER_STATE': {
      const payload = action.payload || {};
      const { action: actionPatch, draft: draftPatch, ...rest } = payload;
      const nextFeedPicker = {
        ...state.feedPicker,
        ...rest,
        draft: {
          ...state.feedPicker.draft,
          ...(draftPatch || {})
        },
        action: {
          ...state.feedPicker.action,
          ...(actionPatch || {})
        }
      };
      return { ...state, feedPicker: nextFeedPicker };
    }
    case 'SET_FEED_MANAGER_OPEN':
      return { ...state, feedManagerOpen: Boolean(action.payload) };
    default:
      return state;
  }
}
