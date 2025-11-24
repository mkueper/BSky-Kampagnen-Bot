export const threadInitialState = {
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

export function threadReducer(state, action) {
  switch (action.type) {
    case 'SET_THREAD_STATE':
      // The payload is expected to be the complete new thread state object.
      return action.payload;
    default:
      return state;
  }
}
