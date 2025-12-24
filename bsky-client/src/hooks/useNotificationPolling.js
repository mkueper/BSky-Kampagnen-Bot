import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { fetchNotificationPollingSnapshot, fetchUnreadNotificationsCount } from '../modules/shared'
import { BLUESKY_NOTIFICATION_POLL_MS } from '../config/blueskyIntervals.js'
import { useTimelineState, useTimelineDispatch } from '../context/TimelineContext.jsx'

const NOTIFICATION_POLL_SWR_KEY = 'bsky:notification-poll'
export const NOTIFICATION_UNREAD_SWR_KEY = 'bsky:notification-unread'

function isNotificationsDebugEnabled () {
  const globalScope = typeof globalThis === 'object' && globalThis ? globalThis : null
  const isDev = Boolean(import.meta?.env?.DEV)
  if (!isDev) return false

  try {
    const url = globalScope?.location?.search ? new URLSearchParams(globalScope.location.search) : null
    if (url?.get('debugNotifs') === '1') return true
  } catch {
    /* ignore URL parsing issues */
  }

  try {
    const value = globalScope?.localStorage?.getItem('bsky.debug.notifications')
    return value === '1' || value === 'true'
  } catch {
    return false
  }
}

export function useNotificationPolling (enabled = true) {
  const { lists } = useTimelineState()
  const dispatch = useTimelineDispatch()
  const listsRef = useRef(lists)
  const debugEnabledRef = useRef(false)
  const lastLogRef = useRef({ unreadCount: null, allTopId: null, mentionsTopId: null })

  useEffect(() => {
    listsRef.current = lists
  }, [lists])

  useEffect(() => {
    debugEnabledRef.current = isNotificationsDebugEnabled()
  }, [])

  const { data: unreadData } = useSWR(NOTIFICATION_UNREAD_SWR_KEY, fetchUnreadNotificationsCount, {
    refreshInterval: BLUESKY_NOTIFICATION_POLL_MS,
    enabled,
    onError: (error) => {
      if (!debugEnabledRef.current) return
      console.warn('[notifications][unread] failed', error)
    }
  })

  const { data: snapshotData } = useSWR(NOTIFICATION_POLL_SWR_KEY, fetchNotificationPollingSnapshot, {
    refreshInterval: BLUESKY_NOTIFICATION_POLL_MS,
    enabled,
    onError: (error) => {
      if (!debugEnabledRef.current) return
      console.warn('[notifications][poll] failed', error)
    }
  })

  useEffect(() => {
    if (!enabled) return
    if (typeof unreadData?.unreadCount === 'number') {
      dispatch({
        type: 'SET_NOTIFICATIONS_UNREAD',
        payload: Math.max(0, unreadData.unreadCount)
      })
    }
  }, [dispatch, unreadData, enabled])

  useEffect(() => {
    if (!enabled) return undefined
    const currentLists = listsRef.current || {}
    const allList = currentLists['notifs:all']
    const mentionsList = currentLists['notifs:mentions']

    const shouldMarkAllHasNew = Boolean(
      snapshotData?.allTopId &&
      allList?.loaded &&
      allList?.topId &&
      snapshotData.allTopId !== allList.topId
    )
    const shouldMarkMentionsHasNew = Boolean(
      snapshotData?.mentionsTopId &&
      mentionsList?.loaded &&
      mentionsList?.topId &&
      snapshotData.mentionsTopId !== mentionsList.topId
    )

    const resolvedUnreadCount = typeof unreadData?.unreadCount === 'number'
      ? unreadData.unreadCount
      : typeof snapshotData?.unreadCount === 'number'
        ? snapshotData.unreadCount
        : null

    if (debugEnabledRef.current) {
      const previous = lastLogRef.current
      const changed = (
        previous.unreadCount !== resolvedUnreadCount ||
        previous.allTopId !== snapshotData?.allTopId ||
        previous.mentionsTopId !== snapshotData?.mentionsTopId
      )
      if (changed) {
        lastLogRef.current = {
          unreadCount: typeof resolvedUnreadCount === 'number' ? resolvedUnreadCount : null,
          allTopId: snapshotData?.allTopId || null,
          mentionsTopId: snapshotData?.mentionsTopId || null
        }
        console.info('[notifications][poll]', {
          unreadCount: Number(resolvedUnreadCount) || 0,
          all: {
            serverTopId: snapshotData?.allTopId || null,
            localTopId: allList?.topId || null,
            loaded: Boolean(allList?.loaded),
            hasNew: Boolean(allList?.hasNew),
            shouldMarkHasNew: shouldMarkAllHasNew
          },
          mentions: {
            serverTopId: snapshotData?.mentionsTopId || null,
            localTopId: mentionsList?.topId || null,
            loaded: Boolean(mentionsList?.loaded),
            hasNew: Boolean(mentionsList?.hasNew),
            shouldMarkHasNew: shouldMarkMentionsHasNew
          }
        })
      }
    }

    if (shouldMarkAllHasNew) {
      dispatch({ type: 'LIST_MARK_HAS_NEW', payload: 'notifs:all' })
    }
    if (shouldMarkMentionsHasNew) {
      dispatch({ type: 'LIST_MARK_HAS_NEW', payload: 'notifs:mentions' })
    }
  }, [dispatch, snapshotData, unreadData, enabled])
}
