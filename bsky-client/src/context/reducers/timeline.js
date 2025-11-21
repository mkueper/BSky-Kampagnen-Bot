export const timelineInitialState = {
  timelineTab: 'discover',
  timelineSource: {
    id: 'discover',
    kind: 'official',
    label: 'Discover',
    feedUri: null,
    origin: 'official'
  },
  refreshTick: 0,
  timelineTopUri: '',
  timelineHasNew: false,
  timelineLoading: true,
  timelineReady: false,
};

export function timelineReducer(state, action) {
  switch (action.type) {
    case 'SET_TIMELINE_TAB':
      return { ...state, timelineTab: action.payload };
    case 'SET_TIMELINE_SOURCE': {
      const nextSource = action.payload || {
        id: 'discover',
        kind: 'official',
        label: 'Discover',
        feedUri: null,
        origin: 'official'
      };
      const shouldUpdateTab = nextSource?.origin !== 'pinned';
      return {
        ...state,
        timelineSource: nextSource,
        timelineTab: shouldUpdateTab ? (nextSource?.id || state.timelineTab) : state.timelineTab
      };
    }
    case 'REFRESH_TIMELINE':
      return { ...state, refreshTick: state.refreshTick + 1, timelineHasNew: false, timelineReady: false };
    case 'SET_TIMELINE_TOP_URI':
      return { ...state, timelineTopUri: action.payload, timelineHasNew: false, timelineReady: true };
    case 'SET_TIMELINE_HAS_NEW':
      return { ...state, timelineHasNew: action.payload };
    case 'SET_TIMELINE_LOADING':
      return { ...state, timelineLoading: action.payload };
    case 'SET_TIMELINE_READY':
        return { ...state, timelineReady: action.payload };
    default:
      return state;
  }
}
