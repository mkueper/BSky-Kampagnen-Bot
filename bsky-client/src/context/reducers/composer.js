export const composerInitialState = {
  composeOpen: false,
  replyTarget: null,
  quoteTarget: null,
  confirmDiscard: false,
};

export function composerReducer(state, action) {
  switch (action.type) {
    case 'SET_COMPOSE_OPEN':
      return { ...state, composeOpen: action.payload };
    case 'SET_REPLY_TARGET':
      return { ...state, replyTarget: action.payload };
    case 'SET_QUOTE_TARGET':
      return { ...state, quoteTarget: action.payload };
    case 'RESET_COMPOSER_TARGETS':
      return { ...state, replyTarget: null, quoteTarget: null };
    case 'SET_CONFIRM_DISCARD':
      return { ...state, confirmDiscard: action.payload };
    default:
      return state;
  }
}
