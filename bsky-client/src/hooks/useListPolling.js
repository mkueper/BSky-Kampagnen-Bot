import { useEffect, useRef } from 'react'
import { fetchServerTopId } from '../modules/listView/listService.js'
import { BLUESKY_LIST_POLL_MS } from '../config/blueskyIntervals.js'
import { useTimelineState, useTimelineDispatch } from '../context/TimelineContext.jsx'

export function useListPolling(enabled = true) {
  const { lists } = useTimelineState()
  const dispatch = useTimelineDispatch()
  const listsRef = useRef(lists)
  const dispatchRef = useRef(dispatch)

  useEffect(() => {
    listsRef.current = lists
  }, [lists])

  useEffect(() => {
    dispatchRef.current = dispatch
  }, [dispatch])

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false

    const poll = async () => {
      const currentLists = listsRef.current || {}
      const entries = Object.values(currentLists).filter(
        (list) => list && list.kind !== 'notifications' && list.supportsPolling && list.loaded && list.topId
      )
      if (!entries.length) return
      for (const list of entries) {
        if (cancelled) return
        try {
          const serverTopId = await fetchServerTopId(list, 1)
          if (cancelled) return
          if (!serverTopId) continue
          if (list.topId && serverTopId !== list.topId) {
            dispatchRef.current?.({ type: 'LIST_MARK_HAS_NEW', payload: list.key })
          }
        } catch (error) {
          console.error('List polling failed', list.key, error)
        }
      }
    }

    poll()
    const handle = setInterval(poll, BLUESKY_LIST_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(handle)
    }
  }, [enabled])
}
