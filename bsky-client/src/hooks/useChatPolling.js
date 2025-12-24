import { useEffect, useRef } from 'react'
import { fetchChatLogs, fetchChatUnreadSnapshot } from '../modules/shared'
import { BLUESKY_CHAT_LOG_POLL_MS } from '../config/blueskyIntervals.js'

export function useChatPolling (dispatch, enabled = true, options = {}) {
  const cursorRef = useRef(null)
  const disabledRef = useRef(false)
  const badgeOnly = Boolean(options?.badgeOnly)

  useEffect(() => {
    if (!enabled) {
      return undefined
    }
    let cancelled = false
    let pollHandle

    const applyUnreadSnapshot = async () => {
      try {
        const snapshot = await fetchChatUnreadSnapshot()
        if (cancelled) return
        if (snapshot?.disabled) {
          disabledRef.current = true
          dispatch({
            type: 'SET_CHAT_UNREAD',
            payload: 0
          })
          return
        }
        if (typeof snapshot?.unreadCount === 'number') {
          dispatch({
            type: 'SET_CHAT_UNREAD',
            payload: Math.max(0, snapshot.unreadCount)
          })
        }
      } catch (error) {
        console.warn('Chat unread snapshot failed', error)
      }
    }

    const pollLogs = async () => {
      if (cancelled || disabledRef.current || badgeOnly) return
      try {
        const { logs, cursor, disabled } = await fetchChatLogs({ cursor: cursorRef.current })
        if (cancelled) return
        if (disabled) {
          disabledRef.current = true
          dispatch({
            type: 'SET_CHAT_UNREAD',
            payload: 0
          })
          return
        }
        if (cursor) {
          cursorRef.current = cursor
        }
        if (Array.isArray(logs) && logs.length > 0) {
          await applyUnreadSnapshot()
        }
      } catch (error) {
        console.warn('Chat log polling failed', error)
      }
    }

    const pollLoop = async () => {
      if (cancelled) return
      await applyUnreadSnapshot()
      if (cancelled) return
      await pollLogs()
    }

    const start = async () => {
      await pollLoop()
      pollHandle = setInterval(pollLoop, BLUESKY_CHAT_LOG_POLL_MS)
    }

    start()

    return () => {
      cancelled = true
      if (pollHandle) clearInterval(pollHandle)
    }
  }, [dispatch, enabled, badgeOnly])
}
