import { useCallback, useEffect, useState } from 'react'

const LAST_VIEW_KEY = 'dashboard:lastView'

function resolveViewFromLocation (validViews, fallback) {
  if (typeof window === 'undefined') return fallback

  // URL-Parameter hat Vorrang
  try {
    const params = new URLSearchParams(window.location.search)
    const paramView = params.get('view')

    if (!paramView) {
      try {
        window.localStorage.setItem(LAST_VIEW_KEY, 'overview')
      } catch {
        /* ignore storage errors */
      }
    } else if (validViews.has(paramView)) {
      try {
        window.localStorage.setItem(LAST_VIEW_KEY, paramView)
      } catch {
        /* ignore storage errors */
      }
      return paramView
    }
    // optional: Hash (#overview) als zweite URL-Quelle
    const hash = window.location.hash?.replace('#', '') || ''
    if (hash && validViews.has(hash)) {
      return hash
    }
  } catch {
    // ignore invalid URLs
  }

  // erst jetzt: gespeicherte letzte View
  try {
    const stored = window.localStorage.getItem(LAST_VIEW_KEY)
    if (stored && validViews.has(stored)) {
      return stored
    }
  } catch (err) {
    console.error('Fehler in resolveViewFromLocation aufgetreten', err)
    // ignore storage errors
  }

  // Fallback
  return fallback
}

export function useViewState ({
  defaultView = 'overview',
  validViews,
  needsCredentials = false
}) {
  const [credsOkOverride, setCredsOkOverride] = useState(false)
  const [activeView, setActiveView] = useState(() =>
    resolveViewFromLocation(validViews, defaultView)
  )

  const gatedNeedsCreds = needsCredentials && !credsOkOverride

  const syncUrl = useCallback(view => {
    if (typeof window === 'undefined') return
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get('view') === view) return
      url.searchParams.set('view', view)
      window.history.replaceState({}, '', url)
    } catch {
      /* ignore history errors */
    }
  }, [])

  const navigate = useCallback(
    (view, { force = false } = {}) => {
      if (!view || !validViews?.has(view)) return
      if (!force && gatedNeedsCreds && view !== 'config') {
        setActiveView('config')
        return
      }
      if (force && view !== 'config') {
        setCredsOkOverride(true)
      }
      setActiveView(prev => (prev === view ? prev : view))
    },
    [gatedNeedsCreds, validViews]
  )

  useEffect(() => {
    if (!gatedNeedsCreds) return
    setActiveView('config')
  }, [gatedNeedsCreds])

  useEffect(() => {
    syncUrl(activeView)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LAST_VIEW_KEY, activeView)
      } catch {
        /* ignore storage errors */
      }
    }
  }, [activeView, syncUrl])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handler = () => {
      const next = resolveViewFromLocation(validViews, defaultView)
      setActiveView(prev => (prev === next ? prev : next))
    }
    window.addEventListener('popstate', handler)
    window.addEventListener('hashchange', handler)
    return () => {
      window.removeEventListener('popstate', handler)
      window.removeEventListener('hashchange', handler)
    }
  }, [defaultView, validViews])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleNavigate = ev => {
      const view = ev?.detail?.view
      const force = Boolean(ev?.detail?.force)
      if (!view) return
      navigate(view, { force })
    }
    const handleCredsOk = () => setCredsOkOverride(true)
    window.addEventListener('app:navigate', handleNavigate)
    window.addEventListener('app:credentials-ok', handleCredsOk)
    return () => {
      window.removeEventListener('app:navigate', handleNavigate)
      window.removeEventListener('app:credentials-ok', handleCredsOk)
    }
  }, [navigate])

  useEffect(() => {
    if (!validViews?.has(activeView)) {
      setActiveView(defaultView)
    }
  }, [activeView, defaultView, validViews])

  return {
    activeView,
    gatedNeedsCreds,
    navigate
  }
}
