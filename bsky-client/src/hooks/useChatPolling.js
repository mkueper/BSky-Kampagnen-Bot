import { useEffect } from 'react'
import useSWR from 'swr'
import { fetchChatUnreadSnapshot } from '../modules/shared'

const CHAT_POLL_SWR_KEY = 'bsky:chat-unread'

export function useChatPolling (dispatch) {
  const { data } = useSWR(
    CHAT_POLL_SWR_KEY,
    fetchChatUnreadSnapshot,
    {
      refreshInterval: 45000,
      onError: () => {}
    }
  )

  useEffect(() => {
    if (typeof data?.unreadCount === 'number') {
      dispatch({
        type: 'SET_CHAT_UNREAD',
        payload: Math.max(0, data.unreadCount)
      })
    }
  }, [data, dispatch])
}
