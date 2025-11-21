export const mediaLightboxInitialState = {
  open: false,
  images: [],
  index: 0
};

export function mediaLightboxReducer(state, action) {
  switch (action.type) {
    case 'OPEN_MEDIA_LIGHTBOX':
      return { ...state, open: true, ...action.payload };
    case 'CLOSE_MEDIA_LIGHTBOX':
      return { ...state, open: false };
    case 'NAVIGATE_MEDIA_LIGHTBOX': {
      if (!state.open || state.images.length === 0) return state;
      const delta = action.payload === 'prev' ? -1 : 1;
      const nextIndex = (state.index + delta + state.images.length) % state.images.length;
      return { ...state, index: nextIndex };
    }
    default:
      return state;
  }
}
