export const notificationsInitialState = {
  notificationsRefreshTick: 0,
  notificationsUnread: 0,
};

export function notificationsReducer(state, action) {
  switch (action.type) {
    case 'REFRESH_NOTIFICATIONS':
      return { ...state, notificationsRefreshTick: state.notificationsRefreshTick + 1 };
    case 'SET_NOTIFICATIONS_UNREAD':
      return { ...state, notificationsUnread: action.payload };
    default:
      return state;
  }
}
