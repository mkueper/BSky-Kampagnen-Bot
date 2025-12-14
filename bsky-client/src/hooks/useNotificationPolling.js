import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { fetchNotificationPollingSnapshot } from '../modules/shared'

const NOTIFICATION_POLL_SWR_KEY = 'bsky:notification-poll'

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

export function useNotificationPolling (lists, dispatch) {
  const listsRef = useRef(lists)
  const debugEnabledRef = useRef(false)
  const lastLogRef = useRef({ unreadCount: null, allTopId: null, mentionsTopId: null })

  useEffect(() => {
    listsRef.current = lists
  }, [lists])

  useEffect(() => {
    debugEnabledRef.current = isNotificationsDebugEnabled()
  }, [])

  const { data } = useSWR(NOTIFICATION_POLL_SWR_KEY, fetchNotificationPollingSnapshot, {
    refreshInterval: 60000,
    onError: (error) => {
      if (!debugEnabledRef.current) return
      console.warn('[notifications][poll] failed', error)
    }
  })

  useEffect(() => {
    if (typeof data?.unreadCount === 'number') {
      dispatch({
        type: 'SET_NOTIFICATIONS_UNREAD',
        payload: Math.max(0, data.unreadCount)
      })
    }
    const currentLists = listsRef.current || {}
    const allList = currentLists['notifs:all']
    const mentionsList = currentLists['notifs:mentions']

    const shouldMarkAllHasNew = Boolean(
      data?.allTopId &&
      allList?.loaded &&
      allList?.topId &&
      data.allTopId !== allList.topId
    )
    const shouldMarkMentionsHasNew = Boolean(
      data?.mentionsTopId &&
      mentionsList?.loaded &&
      mentionsList?.topId &&
      data.mentionsTopId !== mentionsList.topId
    )

    if (debugEnabledRef.current) {
      const previous = lastLogRef.current
      const changed = (
        previous.unreadCount !== data?.unreadCount ||
        previous.allTopId !== data?.allTopId ||
        previous.mentionsTopId !== data?.mentionsTopId
      )
      if (changed) {
        lastLogRef.current = {
          unreadCount: typeof data?.unreadCount === 'number' ? data.unreadCount : null,
          allTopId: data?.allTopId || null,
          mentionsTopId: data?.mentionsTopId || null
        }
        console.info('[notifications][poll]', {
          unreadCount: Number(data?.unreadCount) || 0,
          all: {
            serverTopId: data?.allTopId || null,
            localTopId: allList?.topId || null,
            loaded: Boolean(allList?.loaded),
            hasNew: Boolean(allList?.hasNew),
            shouldMarkHasNew: shouldMarkAllHasNew
          },
          mentions: {
            serverTopId: data?.mentionsTopId || null,
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
  }, [data, dispatch])
}
