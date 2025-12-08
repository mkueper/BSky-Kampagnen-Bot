import { useCallback, useEffect, useState } from 'react'

export function useSession () {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  return { session, loading, error, refresh }
}
