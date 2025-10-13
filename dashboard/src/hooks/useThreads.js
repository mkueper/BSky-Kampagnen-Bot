/**
 * @file useThreads.js
 * @description Lädt Threads & Segmente, beobachtet Statuswechsel und liefert Dashboard-Helfer.
 * @exports useThreads
 * @dependencies React Hooks, fetch(/api/threads)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPollingController } from '../services/pollingService'
import { useClientConfig } from './useClientConfig'

// Utility: Backend-Felder akzeptieren Strings oder native Objekte; dieser
// Helfer stellt sicher, dass das Ergebnis immer bearbeitbar ist.
function parseJson (value, fallback) {
  if (value == null) {
    return fallback
  }

  if (typeof value === 'object') {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed ?? fallback
    } catch (error) {
      console.warn('Konnte JSON nicht parsen:', error)
      return fallback
    }
  }

  return fallback
}

function normalizeThread (raw) {
  const targetPlatformsRaw = parseJson(raw?.targetPlatforms, [])
  const metadataRaw = parseJson(raw?.metadata, {})

  const targetPlatforms = Array.isArray(targetPlatformsRaw)
    ? targetPlatformsRaw
    : []
  const metadata =
    metadataRaw &&
    typeof metadataRaw === 'object' &&
    !Array.isArray(metadataRaw)
      ? metadataRaw
      : {}

  const segments = Array.isArray(raw?.segments)
    ? raw.segments.map(segment => ({
        ...segment,
        reactions: Array.isArray(segment?.reactions) ? segment.reactions : []
      }))
    : []

  return {
    id: raw?.id,
    title: raw?.title || '',
    scheduledAt: raw?.scheduledAt || null,
    status: raw?.status || 'draft',
    targetPlatforms,
    appendNumbering: Boolean(raw?.appendNumbering ?? true),
    metadata,
    segments,
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null
  }
}

// Ermittelt ein sinnvolles Retry-After (ms) aus Response-Headern
function extractRetryAfterMs (res) {
  try {
    const ra = res.headers.get('retry-after')
    if (ra) {
      const asNumber = Number(ra)
      if (Number.isFinite(asNumber) && asNumber >= 0) {
        return Math.max(0, Math.round(asNumber * 1000))
      }
      const asDate = Date.parse(ra)
      if (!Number.isNaN(asDate)) {
        const delta = asDate - Date.now()
        if (delta > 0) return delta
      }
    }
    const reset =
      res.headers.get('x-ratelimit-reset') ||
      res.headers.get('x-rate-limit-reset')
    if (reset) {
      const epochSec = Number(reset)
      if (Number.isFinite(epochSec)) {
        const delta = epochSec * 1000 - Date.now()
        if (delta > 0) return delta
      }
    }
  } catch (e) {
    console.warn('Fehler beim Parsen von Retry-After-Headern:', e)
  }
  return null
}

/**
 * Liefert Thread-Daten inklusive Segmenten und erkennt Statuswechsel von
 * `publishing` zu `published`, um einen finalen Reload auszulösen.
 *
 * @param {{ status?: string }} [options]
 * @returns {{
 *   threads: any[],
 *   loading: boolean,
 *   error: Error | null,
 *   reload: () => Promise<void>,
 *   draftThreads: any[],
 *   scheduledThreads: any[],
 *   publishedThreads: any[]
 * }}
 */
export function useThreads (options = {}) {
  const { status, enabled = true } = options
  const { config: clientConfig } = useClientConfig()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingFollowUp, setPendingFollowUp] = useState(false)
  const previousStatusesRef = useRef(new Map())
  const pollingRef = useRef(null)
  const DEFAULTS = {
    threads: {
      activeMs: 8000,
      idleMs: 40000,
      hiddenMs: 180000,
      minimalHidden: false
    },
    backoffStartMs: 10000,
    backoffMaxMs: 300000,
    jitterRatio: 0.15,
    heartbeatMs: 2000
  }

  const loadThreads = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (status) {
        params.set('status', status)
      }

      const res = await fetch(
        `/api/threads${params.toString() ? `?${params}` : ''}`
      )
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Laden der Threads.')
      }

      const data = await res.json()
      const normalized = Array.isArray(data) ? data.map(normalizeThread) : []
      setThreads(normalized)
      //setAutoRefresh(normalized.some(shouldKeepPolling))

      let needsFollowUpReload = false
      const nextStatuses = new Map()
      for (const thread of normalized) {
        const previousStatus = previousStatusesRef.current.get(thread.id)
        if (previousStatus === 'publishing' && thread.status === 'published') {
          needsFollowUpReload = true
        }
        nextStatuses.set(thread.id, thread.status)
      }
      previousStatusesRef.current = nextStatuses

      if (needsFollowUpReload) {
        setPendingFollowUp(true)
      }
    } catch (err) {
      console.error('Thread-Ladevorgang fehlgeschlagen:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Booster: Wenn ein Thread in Kürze fällig ist, Polling kurzzeitig beschleunigen
  const nextDueSoonActiveMs = 2000 // 2s rund um fällige Termine
  const boostWindowBeforeMs = 5 * 60 * 1000 // 5 Minuten vor Fälligkeit
  const boostWindowAfterMs = 60 * 1000 // 1 Minute nach Fälligkeit
  const hasDueSoon = useMemo(() => {
    const now = Date.now()
    for (const t of threads) {
      if (!t || t.status !== 'scheduled' || !t.scheduledAt) continue
      const ts = new Date(t.scheduledAt).getTime()
      if (!Number.isFinite(ts)) continue
      const delta = ts - now
      if (delta <= boostWindowBeforeMs && delta >= -boostWindowAfterMs) return true
    }
    return false
  }, [threads])

  // Smart-Polling via createPollingController (ersetzt das alte Intervall)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const parseMs = (v, def) => {
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 ? n : def
    }
    const parseBool = (v, def = false) => {
      if (v == null) return def
      const s = String(v).toLowerCase().trim()
      return s === '1' || s === 'true' || s === 'yes'
    }

    const controller = createPollingController({
      fetchBluesky: async () => {
        const params = new URLSearchParams()
        if (status) params.set('status', status)
        const res = await fetch(
          `/api/threads${params.toString() ? `?${params}` : ''}`
        )
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          if (res.status === 429 || res.status === 503) {
            const retryAfterMs = extractRetryAfterMs(res) ?? 60_000
            const err = new Error(
              errorData.error ||
                'Rate Limit erreicht – später erneut versuchen.'
            )
            err.retryAfterMs = retryAfterMs
            throw err
          }
          throw new Error(errorData.error || 'Fehler beim Laden der Threads.')
        }
        const data = await res.json()
        return { items: Array.isArray(data) ? data : [] }
      },
      onData: (_source, payload) => {
        const raw = payload?.items || []
        const normalized = raw.map(normalizeThread)
        setThreads(normalized)
        //setAutoRefresh(normalized.some(shouldKeepPolling))

        // Statusübergang publishing -> published erkennen und Follow-up-Reload auslösen
        let needsFollowUpReload = false
        const nextStatuses = new Map()
        for (const thread of normalized) {
          const previousStatus = previousStatusesRef.current.get(thread.id)
          if (
            previousStatus === 'publishing' &&
            thread.status === 'published'
          ) {
            needsFollowUpReload = true
          }
          nextStatuses.set(thread.id, thread.status)
        }
        previousStatusesRef.current = nextStatuses
        if (needsFollowUpReload) {
          setPendingFollowUp(true)
        }
      },
      isRelevantView: () => enabled,
      activeIntervalMs: (() => {
        const cfg = parseMs(clientConfig?.polling?.threads?.activeMs, DEFAULTS.threads.activeMs)
        return hasDueSoon ? Math.min(cfg, nextDueSoonActiveMs) : cfg
      })(),
      idleIntervalMs: parseMs(
        clientConfig?.polling?.threads?.idleMs,
        DEFAULTS.threads.idleMs
      ),
      hiddenIntervalMs: parseMs(
        clientConfig?.polling?.threads?.hiddenMs,
        DEFAULTS.threads.hiddenMs
      ),
      minimalPingWhenHidden: parseBool(
        clientConfig?.polling?.threads?.minimalHidden,
        DEFAULTS.threads.minimalHidden
      ),
      backoffStartMs: parseMs(
        clientConfig?.polling?.backoffStartMs,
        DEFAULTS.backoffStartMs
      ),
      backoffMaxMs: parseMs(
        clientConfig?.polling?.backoffMaxMs,
        DEFAULTS.backoffMaxMs
      ),
      jitterRatio: (() => {
        const n = Number(clientConfig?.polling?.jitterRatio)
        return Number.isFinite(n) && n >= 0 && n <= 1 ? n : DEFAULTS.jitterRatio
      })(),
      heartbeatMs: parseMs(
        clientConfig?.polling?.heartbeatMs,
        DEFAULTS.heartbeatMs
      )
    })

    pollingRef.current = controller
    controller.start()
    return () => {
      try {
        controller.stop()
      } catch (e) {
        console.error(e)
      }
      pollingRef.current = null
    }
  }, [status, clientConfig, enabled, hasDueSoon])

  const refreshNow = useCallback(
    async opts => {
      if (
        pollingRef.current &&
        typeof pollingRef.current.triggerNow === 'function'
      ) {
        return pollingRef.current.triggerNow(opts)
      }
      return loadThreads()
    },
    [loadThreads]
  )

  useEffect(() => {
    if (!pendingFollowUp) {
      return undefined
    }

    let cancelled = false
    ;(async () => {
      try {
        await loadThreads()
      } finally {
        if (!cancelled) {
          setPendingFollowUp(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pendingFollowUp, loadThreads])

  return {
    threads,
    loading,
    error,
    reload: loadThreads,
    refreshNow,
    draftThreads: useMemo(
      () => threads.filter(thread => thread.status === 'draft'),
      [threads]
    ),
    scheduledThreads: useMemo(
      () => threads.filter(thread => thread.status === 'scheduled'),
      [threads]
    ),
    publishedThreads: useMemo(
      () => threads.filter(thread => thread.status === 'published'),
      [threads]
    )
  }
}

export function useThreadDetail (id, { autoLoad = true } = {}) {
  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadThread = useCallback(async () => {
    if (!id) {
      setThread(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/threads/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Laden des Threads.')
      }

      const data = await res.json()
      setThread(normalizeThread(data))
    } catch (err) {
      console.error(`Thread ${id} konnte nicht geladen werden:`, err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (autoLoad) {
      loadThread()
    }
  }, [autoLoad, loadThread])

  return {
    thread,
    loading,
    error,
    reload: loadThread
  }
}
