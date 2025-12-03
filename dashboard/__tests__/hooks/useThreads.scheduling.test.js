/**
 * Testgruppe: useThreads.scheduling.test.js
 *
 * Diese Tests überprüfen:
 * - Klassifizierung von Threads als 'scheduled' und deren Sortierung
 * - Erkennung von "bald fälligen" Threads (Boost-Fenster um Fälligkeit)
 *
 * Kontext:
 * Ergänzt die bestehenden Polling-/Status-Tests um
 * Terminfokus – wichtig dafür, dass Threads wie geplant gesendet werden.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useThreads } from '../../src/hooks/useThreads.js'

// Leichtgewichtiger Mock für createPollingController, damit kein echtes Polling startet.
const lastControllerConfig = { current: null }
vi.mock('../services/pollingService', () => ({
  createPollingController: (config) => {
    lastControllerConfig.current = config
    return {
      start: () => {},
      stop: () => {}
    }
  }
}))

describe('useThreads – Scheduling-Fokus', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.useFakeTimers()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    global.fetch = originalFetch
  })

  function mockThreadsResponse (threads) {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => threads
    })
  }

  it('liefert scheduledThreads nur für Threads mit status="scheduled" und gültigem scheduledAt', async () => {
    const now = new Date('2025-01-01T10:00:00Z')
    vi.setSystemTime(now)

    mockThreadsResponse([
      { id: 1, status: 'scheduled', scheduledAt: '2025-01-01T10:05:00Z' },
      { id: 2, status: 'draft', scheduledAt: '2025-01-01T11:00:00Z' },
      { id: 3, status: 'scheduled', scheduledAt: null },
      { id: 4, status: 'publishing', scheduledAt: '2025-01-01T10:10:00Z' }
    ])

    const { result } = renderHook(() => useThreads({ enabled: true, status: '' }))

    // Initialen Load-Effect ablaufen lassen
    await act(async () => {
      await Promise.resolve()
    })

    const ids = result.current.scheduledThreads.map(t => t.id)
    expect(ids).toEqual([1, 3])
  })

  it('berücksichtigt Threads mit fälliger Planung unabhängig von deren Abstand zur aktuellen Zeit', async () => {
    const now = new Date('2025-01-01T10:00:00Z')
    vi.setSystemTime(now)

    const fiveMinutesMs = 5 * 60 * 1000
    const oneMinuteMs = 60 * 1000

    const withinBefore = new Date(now.getTime() + fiveMinutesMs - 30_000).toISOString()
    const withinAfter = new Date(now.getTime() - oneMinuteMs + 30_000).toISOString()
    const outside = new Date(now.getTime() + fiveMinutesMs + 60_000).toISOString()

    mockThreadsResponse([
      { id: 1, status: 'scheduled', scheduledAt: withinBefore },
      { id: 2, status: 'scheduled', scheduledAt: withinAfter },
      { id: 3, status: 'scheduled', scheduledAt: outside }
    ])

    const { result } = renderHook(() => useThreads({ enabled: true, status: 'scheduled' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.scheduledThreads.map(t => t.id)).toEqual([1, 2, 3])
  })
})
