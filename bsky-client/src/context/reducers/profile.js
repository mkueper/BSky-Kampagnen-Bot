export const defaultProfileViewerState = {
  open: false,
  actor: null,
  originSection: null,
  anchor: null
};

export const profileInitialState = {
  profileActor: null,
  me: null,
  profileViewer: { ...defaultProfileViewerState },
};

export function profileReducer(state, action) {
  switch (action.type) {
    case 'SET_ME':
      return { ...state, me: action.payload };
    case 'CLOSE_PROFILE_VIEWER':
      return { ...state, profileViewer: { ...defaultProfileViewerState } }
    default:
      return state;
  }
}
