const initialThreadState = {
  active: false,
  loading: false,
  error: '',
  data: null,
  uri: null,
  viewMode: 'full',
  isAuthorThread: false,
  rootAuthorDid: null,
  focusAuthorDid: null
};

export const threadInitialState = initialThreadState;

export function threadReducer(state = initialThreadState, action) {
  switch (action.type) {
    case 'SET_THREAD_STATE':
      if (process.env.NODE_ENV !== 'production') {
        const payloadValue = (action && typeof action.payload === 'object' && action.payload !== null)
          ? action.payload
          : {};
        const expectedKeys = Object.keys(initialThreadState).sort();
        const payloadKeys = Object.keys(payloadValue).sort();
        const shapeMismatch =
          expectedKeys.length !== payloadKeys.length ||
          expectedKeys.some((key, idx) => key !== payloadKeys[idx]);
        if (shapeMismatch) {
          console.warn(
            `[threadReducer] SET_THREAD_STATE payload hat nicht den vollen Shape. Erwartet: ${expectedKeys.join(', ')} Bekommen: ${payloadKeys.join(', ')}`
          );
        }
      }
      // The payload is expected to be the complete new thread state object.
      return action.payload;
    default:
      return state;
  }
}
