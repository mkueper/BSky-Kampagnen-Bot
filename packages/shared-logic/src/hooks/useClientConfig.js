import { useEffect, useState } from 'react'

export function useClientConfig () {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/client-config')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(
            data && typeof data.error === 'string'
              ? data.error
              : 'Fehler beim Laden der Client-Konfiguration.'
          )
        }
        const data = await res.json()
        if (!cancelled) setConfig(data)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tick])

  useEffect(() => {
    const onRefresh = () => setTick(x => x + 1)
    window.addEventListener('client-config:refresh', onRefresh)
    return () => window.removeEventListener('client-config:refresh', onRefresh)
  }, [])

  return { config, loading, error }
}

