export const notificationsInitialState = {
  notificationsRefreshTick: 0,
  notificationsUnread: 0,
  notificationsSettingsOpen: false
};

export function notificationsReducer(state, action) {
  switch (action.type) {
    case 'REFRESH_NOTIFICATIONS':
      return { ...state, notificationsRefreshTick: state.notificationsRefreshTick + 1 };
    case 'SET_NOTIFICATIONS_UNREAD':
      return { ...state, notificationsUnread: action.payload };
    case 'SET_NOTIFICATIONS_SETTINGS_OPEN':
      return { ...state, notificationsSettingsOpen: Boolean(action.payload) };
    default:
      return state;
  }
}
