import { useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '../lib/fetcher'

export function useTimelineAutoRefresh (section, timelineTopUri, timelineQueryParams, dispatch) {
  const swrKey = section === 'home'
    ? ['/api/bsky/timeline', { ...timelineQueryParams, limit: 1 }]
    : null

  const { data } = useSWR(swrKey, fetcher, {
    refreshInterval: 60000
  })

  useEffect(() => {
    if (!data) return

    const topUri = data.items?.[0]?.uri || ''
    if (topUri && timelineTopUri && topUri !== timelineTopUri) {
      dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: true })
    }
  }, [data, timelineTopUri, dispatch])
}
