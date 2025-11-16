/**
 * @file useSse.js
 * Abonniert Server-Sent Events vom Backend und triggert gezielte Refreshes.
 */
import { useEffect, useRef, useState } from 'react'

export function useSse({ onSkeetEvent, onThreadEvent } = {}) {
  const srcRef = useRef(null)
  const lastSkeetTsRef = useRef(0)
  const lastThreadTsRef = useRef(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    try {
      const base = import.meta.env.VITE_API_BASE || ''
      const src = new EventSource(`${base}/api/events`, { withCredentials: true })
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

      // Engagement-Updates: gleich behandeln, da wir ohnehin einen gezielten Refresh auslösen
      src.addEventListener('skeet:engagement', (e) => {
        const now = Date.now()
        if (now - lastSkeetTsRef.current < debounceMs) return
        lastSkeetTsRef.current = now
        const payload = safeParse(e)
        onSkeetEvent && onSkeetEvent(payload)
      })

      src.addEventListener('thread:engagement', (e) => {
        const now = Date.now()
        if (now - lastThreadTsRef.current < debounceMs) return
        lastThreadTsRef.current = now
        const payload = safeParse(e)
        onThreadEvent && onThreadEvent(payload)
      })

      // Optional: Ping als Keep-Alive verwenden
      src.addEventListener('ping', () => setConnected(true))

      src.onerror = () => { setConnected(false) }

      return () => {
        try { src.close() } catch { /* ignore */ }
        srcRef.current = null
      }
    } catch {
      // kein SSE verfügbar – ignorieren
      setConnected(false)
      return () => {}
    }
  }, [onSkeetEvent, onThreadEvent])

  return { connected }
}
