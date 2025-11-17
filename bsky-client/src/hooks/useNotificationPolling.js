import { useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '../lib/fetcher'

export function useNotificationPolling (dispatch) {
  const { data } = useSWR('/api/bsky/notifications', fetcher, {
    refreshInterval: 60000
  })

  useEffect(() => {
    if (data?.unreadCount !== undefined) {
      dispatch({ type: 'SET_NOTIFICATIONS_UNREAD', payload: data.unreadCount })
    }
  }, [data, dispatch])
}
