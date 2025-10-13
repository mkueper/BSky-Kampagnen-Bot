/**
 * @file useSkeets.js
 * @description Stellt geplante/veröffentlichte Skeets inkl. Reply- und Reaktionsstatus bereit.
 * @exports useSkeets
 * @dependencies React Hooks, fetch(/api/skeets|/api/replies/:id|/api/reactions/:id)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPollingController } from '../services/pollingService'
import { useClientConfig } from './useClientConfig'

// Utility: Zielplattformen unabhängig davon normalisieren, ob sie als JSON-String
// oder Array vom Backend geliefert werden.
function parseTargetPlatforms (value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.warn('Konnte targetPlatforms nicht parsen:', error)
    }
  }

  return []
}

// Utility: Plattform-spezifische Ergebnisse (URI, Status, Fehler) in ein
// bearbeitbares Objekt überführen.
function parsePlatformResults (value) {
  if (!value) {
    return {}
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {}
    } catch (error) {
      console.warn('Konnte platformResults nicht parsen:', error)
      return {}
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  return {}
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
    console.error(e)
  }
  return null
}

/**
 * Zentrale Datenquelle für Skeets: lädt Einträge, trackt Reply- und
 * Reaktionszustände und liefert Helfer zum Umschalten der Detailansicht.
 *
 * @returns {{
 *   skeets: any[],
 *   plannedSkeets: any[],
 *   publishedSkeets: any[],
 *   deletedSkeets: any[],
 *   loadSkeets: () => Promise<void>,
 *   fetchReactions: (id: number | string) => Promise<void>,
 *   showSkeetContent: (id: number | string) => void,
 *   showRepliesContent: (id: number | string) => Promise<void>,
 *   activeCardTabs: Record<string, string>,
 *   repliesBySkeet: Record<string, any[]>,
 *   loadingReplies: Record<string, boolean>,
 *   loadingReactions: Record<string, boolean>,
 *   reactionStats: Record<string, any>,
 *   replyErrors: Record<string, any>
 * }}
 */
export function useSkeets (options = {}) {
  const { enabled = true } = options
  const { config: clientConfig } = useClientConfig()
  const [skeets, setSkeets] = useState([])
  const [repliesBySkeet, setRepliesBySkeet] = useState({})
  const [activeCardTabs, setActiveCardTabs] = useState({})
  const [loadingReplies, setLoadingReplies] = useState({})
  const [loadingReactions, setLoadingReactions] = useState({})
  const [reactionStats, setReactionStats] = useState({})
  const [replyErrors, setReplyErrors] = useState({})
  const pollingRef = useRef(null)
  const DEFAULTS = {
    skeets: {
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

  const loadSkeets = useCallback(async () => {
    try {
      const res = await fetch('/api/skeets?includeDeleted=1')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Laden der Skeets.')
      }

      const data = await res.json()
      const normalized = data.map(item => ({
        ...item,
        targetPlatforms: parseTargetPlatforms(item.targetPlatforms),
        platformResults: parsePlatformResults(item.platformResults)
      }))

      setSkeets(normalized)
      // UI-Zustände konsistent halten (aktive Tabs/Reply-Puffer)
      setActiveCardTabs(current => {
        const next = {}
        normalized
          .filter(entry => !entry.deletedAt)
          .forEach(skeet => {
            next[skeet.id] = current[skeet.id] ?? 'skeet'
          })
        return next
      })
      setRepliesBySkeet(current => {
        const next = {}
        normalized
          .filter(entry => !entry.deletedAt)
          .forEach(skeet => {
            if (current[skeet.id]) {
              next[skeet.id] = current[skeet.id]
            }
          })
        return next
      })
      setReplyErrors(current => {
        const next = {}
        normalized
          .filter(entry => !entry.deletedAt)
          .forEach(skeet => {
            if (current[skeet.id]) {
              next[skeet.id] = current[skeet.id]
            }
          })
        return next
      })
    } catch (error) {
      console.error('Fehler beim Laden der Skeets:', error)
    }
  }, [])

  useEffect(() => {
    loadSkeets()
  }, [loadSkeets])

  // Booster: Wenn ein Termin in Kürze fällig ist, Polling kurzzeitig beschleunigen
  const nextDueSoonActiveMs = 2000 // 2s rund um fällige Termine
  const boostWindowBeforeMs = 5 * 60 * 1000 // 5 Minuten vor Fälligkeit
  const boostWindowAfterMs = 60 * 1000 // 1 Minute nach Fälligkeit
  const hasDueSoon = (() => {
    const now = Date.now()
    for (const s of skeets) {
      if (s.deletedAt) continue
      const isRecurring = typeof s.repeat === 'string' && s.repeat !== 'none'
      // sowohl einmalige als auch wiederkehrende Einträge berücksichtigen
      const dueAt = s.scheduledAt ? new Date(s.scheduledAt).getTime() : null
      if (!Number.isFinite(dueAt)) continue
      const delta = dueAt - now
      // noch nicht veröffentlicht (postUri leer) oder wiederkehrend
      const notSentYet = isRecurring || !s.postUri
      if (notSentYet && delta <= boostWindowBeforeMs && delta >= -boostWindowAfterMs) {
        return true
      }
    }
    return false
  })()

  // Smart-Polling via createPollingController
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
        const res = await fetch('/api/skeets?includeDeleted=1')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (res.status === 429 || res.status === 503) {
            const retryAfterMs = extractRetryAfterMs(res) ?? 60_000
            const err = new Error(
              data.error || 'Rate Limit erreicht – später erneut versuchen.'
            )
            err.retryAfterMs = retryAfterMs
            throw err
          }
          const err = new Error(data.error || 'Fehler beim Laden der Skeets.')
          throw err
        }
        const data = await res.json()
        return { items: Array.isArray(data) ? data : [] }
      },
      onData: (_source, payload) => {
        const raw = payload?.items || []
        const normalized = raw.map(item => ({
          ...item,
          targetPlatforms: parseTargetPlatforms(item.targetPlatforms),
          platformResults: parsePlatformResults(item.platformResults)
        }))
        setSkeets(normalized)
        // Konsistenz der UI-Zustände wahren
        setActiveCardTabs(current => {
          const next = {}
          normalized
            .filter(entry => !entry.deletedAt)
            .forEach(skeet => {
              next[skeet.id] = current[skeet.id] ?? 'skeet'
            })
          return next
        })
        setRepliesBySkeet(current => {
          const next = {}
          normalized
            .filter(entry => !entry.deletedAt)
            .forEach(skeet => {
              if (current[skeet.id]) {
                next[skeet.id] = current[skeet.id]
              }
            })
          return next
        })
        setReplyErrors(current => {
          const next = {}
          normalized
            .filter(entry => !entry.deletedAt)
            .forEach(skeet => {
              if (current[skeet.id]) {
                next[skeet.id] = current[skeet.id]
              }
            })
          return next
        })
      },
      isRelevantView: () => enabled,
      activeIntervalMs: (() => {
        const cfg = parseMs(clientConfig?.polling?.skeets?.activeMs, DEFAULTS.skeets.activeMs)
        return hasDueSoon ? Math.min(cfg, nextDueSoonActiveMs) : cfg
      })(),
      idleIntervalMs: parseMs(
        clientConfig?.polling?.skeets?.idleMs,
        DEFAULTS.skeets.idleMs
      ),
      hiddenIntervalMs: parseMs(
        clientConfig?.polling?.skeets?.hiddenMs,
        DEFAULTS.skeets.hiddenMs
      ),
      minimalPingWhenHidden: parseBool(
        clientConfig?.polling?.skeets?.minimalHidden,
        DEFAULTS.skeets.minimalHidden
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
        console.error (e)
      }

      pollingRef.current = null
    }
  }, [clientConfig, enabled, hasDueSoon])

  const refreshNow = useCallback(
    async opts => {
      if (
        pollingRef.current &&
        typeof pollingRef.current.triggerNow === 'function'
      ) {
        return pollingRef.current.triggerNow(opts)
      }
      return loadSkeets()
    },
    [loadSkeets]
  )

  const showSkeetContent = useCallback(id => {
    setActiveCardTabs(current => ({ ...current, [id]: 'skeet' }))
  }, [])

  const showRepliesContent = useCallback(
    async id => {
      setActiveCardTabs(current => ({ ...current, [id]: 'replies' }))

      if (Object.prototype.hasOwnProperty.call(repliesBySkeet, id)) {
        return
      }

      setLoadingReplies(current => ({ ...current, [id]: true }))

      try {
        const res = await fetch(`/api/replies/${id}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          console.error(
            'Fehler beim Laden der Replies:',
            data.error || 'Unbekannter Fehler'
          )
          return
        }
        const data = await res.json()
        const items = Array.isArray(data) ? data : data?.items || []
        const errors = Array.isArray(data) ? null : data?.errors || null

        setRepliesBySkeet(current => ({ ...current, [id]: items }))
        setReplyErrors(current => {
          const next = { ...current }
          if (errors && Object.keys(errors).length > 0) {
            next[id] = errors
          } else {
            delete next[id]
          }
          return next
        })
      } catch (error) {
        console.error('Fehler beim Laden der Replies:', error)
        setReplyErrors(current => ({
          ...current,
          [id]: { general: error.message || 'Unbekannter Fehler' }
        }))
      } finally {
        setLoadingReplies(current => ({ ...current, [id]: false }))
      }
    },
    [repliesBySkeet]
  )

  const fetchReactions = useCallback(
    async id => {
      setLoadingReactions(current => ({ ...current, [id]: true }))

      try {
        const res = await fetch(`/api/reactions/${id}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Fehler beim Laden der Reaktionen.')
        }

        const data = await res.json()
        setReactionStats(current => ({ ...current, [id]: data }))

        const total = data?.total ?? {}
        const totalLikes = typeof total.likes === 'number' ? total.likes : '?'
        const totalReposts =
          typeof total.reposts === 'number' ? total.reposts : '?'
        console.info(
          `Reaktionen für ${id}: Likes ${totalLikes}, Reposts ${totalReposts}`,
          data
        )
        if (data?.errors) {
          console.warn(
            `Fehler beim Abrufen einzelner Plattformen für ${id}:`,
            data.errors
          )
        }

        // Werte direkt im lokalen Zustand aktualisieren, ohne das komplette Listing neu zu laden.
        setSkeets(current =>
          current.map(s =>
            s.id === id
              ? {
                  ...s,
                  likesCount:
                    typeof total.likes === 'number'
                      ? total.likes
                      : s.likesCount,
                  repostsCount:
                    typeof total.reposts === 'number'
                      ? total.reposts
                      : s.repostsCount
                }
              : s
          )
        )
      } catch (error) {
        console.error('Fehler beim Laden der Reaktionen:', error)
      } finally {
        setLoadingReactions(current => {
          const next = { ...current }
          delete next[id]
          return next
        })
      }
    },
    [loadSkeets, refreshNow]
  )

  return {
    skeets,
    plannedSkeets: skeets.filter(s => {
      if (s.deletedAt) return false
      const isRecurring = typeof s.repeat === 'string' && s.repeat !== 'none'
      if (isRecurring) return true
      return !s.postUri
    }),
    publishedSkeets: skeets.filter(s => {
      if (s.deletedAt) return false
      const isRecurring = typeof s.repeat === 'string' && s.repeat !== 'none'
      if (isRecurring) {
        return Boolean(s.postUri)
      }
      return Boolean(s.postUri)
    }),
    deletedSkeets: skeets.filter(s => Boolean(s.deletedAt)),
    loadSkeets,
    refreshNow,
    fetchReactions,
    showSkeetContent,
    showRepliesContent,
    activeCardTabs,
    repliesBySkeet,
    loadingReplies,
    loadingReactions,
    reactionStats,
    replyErrors
  }
}
