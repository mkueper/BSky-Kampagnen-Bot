import { useCallback, useState } from 'react'

export function useClientConfig () {
  // Standalone-Client: kein Backend-/api client-config.
  // Stattdessen: lokale Defaults + Persistenz per localStorage.
  const STORAGE_KEY = 'bsky-client-config:v1'
  const DEFAULT_CONFIG = {
    gifs: { tenorAvailable: false, tenorApiKey: '' },
    search: { advancedPrefixes: null }
  }

  const readConfig = () => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return DEFAULT_CONFIG
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG
      const next = {
        ...DEFAULT_CONFIG,
        ...(parsed || {}),
        gifs: { ...DEFAULT_CONFIG.gifs, ...(parsed.gifs || {}) },
        search: { ...DEFAULT_CONFIG.search, ...(parsed.search || {}) }
      }
      if (next.search.advancedPrefixes && !Array.isArray(next.search.advancedPrefixes)) {
        next.search.advancedPrefixes = null
      }
      next.gifs.tenorAvailable = Boolean(next.gifs.tenorAvailable)
      next.gifs.tenorApiKey = typeof next.gifs.tenorApiKey === 'string' ? next.gifs.tenorApiKey.trim() : ''
      return next
    } catch {
      return DEFAULT_CONFIG
    }
  }

  const [clientConfig, setClientConfigState] = useState(readConfig)

  const setClientConfig = useCallback((patch = {}) => {
    setClientConfigState((prev) => {
      const next = {
        ...prev,
        ...(patch || {}),
        gifs: { ...(prev.gifs || {}), ...(patch?.gifs || {}) },
        search: { ...(prev.search || {}), ...(patch?.search || {}) }
      }
      if (next.search.advancedPrefixes && !Array.isArray(next.search.advancedPrefixes)) {
        next.search.advancedPrefixes = null
      }
      next.gifs = next.gifs || {}
      next.gifs.tenorAvailable = Boolean(next.gifs.tenorAvailable)
      next.gifs.tenorApiKey = typeof next.gifs.tenorApiKey === 'string' ? next.gifs.tenorApiKey.trim() : ''
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  return { clientConfig, setClientConfig, loading: false, error: null }
}
