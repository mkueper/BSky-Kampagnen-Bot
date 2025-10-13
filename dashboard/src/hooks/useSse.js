/**
 * @file useSse.js
 * Abonniert Server-Sent Events vom Backend und triggert gezielte Refreshes.
 */
import { useEffect, useRef } from 'react'

export function useSse({ onSkeetEvent, onThreadEvent } = {}) {
  const srcRef = useRef(null)
  const lastSkeetTsRef = useRef(0)
  const lastThreadTsRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    try {
      const src = new EventSource('/api/events', { withCredentials: false })
      srcRef.current = src

      const safeParse = (e) => {
        try { return JSON.parse(e.data || '{}') } catch { return {} }
      }

      const debounceMs = 800

      src.addEventListener('skeet:updated', (e) => {
        const now = Date.now()
        if (now - lastSkeetTsRef.current < debounceMs) return
        lastSkeetTsRef.current = now
        const payload = safeParse(e)
        onSkeetEvent && onSkeetEvent(payload)
      })

      src.addEventListener('thread:updated', (e) => {
        const now = Date.now()
        if (now - lastThreadTsRef.current < debounceMs) return
        lastThreadTsRef.current = now
        const payload = safeParse(e)
        onThreadEvent && onThreadEvent(payload)
      })

      // Optional: pings ignorieren
      // src.addEventListener('ping', () => {})

      src.onerror = () => {
        // Browser EventSource macht Auto-Reconnect; hier nur ruhig bleiben
      }

      return () => {
        try { src.close() } catch {}
        srcRef.current = null
      }
    } catch (e) {
      // kein SSE verfügbar – ignorieren
      return () => {}
    }
  }, [onSkeetEvent, onThreadEvent])

  return {}
}

