import { useEffect } from 'react'
import useSWR from 'swr'
import { fetchUnreadNotificationsCount } from '../modules/shared'

const UNREAD_COUNT_SWR_KEY = 'bsky:notifications-unread-count'

export function useNotificationPolling (dispatch) {
  const { data } = useSWR(UNREAD_COUNT_SWR_KEY, fetchUnreadNotificationsCount, {
    refreshInterval: 60000
  })

  useEffect(() => {
    if (typeof data?.unreadCount === 'number') {
      dispatch({ type: 'SET_NOTIFICATIONS_UNREAD', payload: data.unreadCount })
    }
  }, [data, dispatch])
}
