import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchWithCsrf, setCsrfCookieName } from '../utils/apiClient.js'

export function useSession () {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Sitzung konnte nicht geladen werden.')
      }
      const data = await res.json()
      setSession(data)
      if (data?.csrfCookieName) {
        setCsrfCookieName(data.csrfCookieName)
      }
    } catch (err) {
      setSession(null)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handler = () => refresh()
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [refresh])

  const renew = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchWithCsrf('/api/auth/renew', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          await refresh()
        }
        return { ok: false, status: res.status, error: data }
      }
      setSession(current => ({
        ...(current || sessionRef.current || {}),
        authenticated: true,
        configured: true,
        expiresAt: data.expiresAt ?? current?.expiresAt ?? sessionRef.current?.expiresAt ?? null
      }))
      return { ok: true, status: res.status, data }
    } catch (err) {
      setError(err)
      return { ok: false, status: 0, error: { message: err?.message || String(err) } }
    }
  }, [refresh])

  return { session, loading, error, refresh, renew }
}
