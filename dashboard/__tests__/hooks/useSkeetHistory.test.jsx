/**
 * Testgruppe: useSkeetHistory.test.jsx
 *
 * Diese Tests prüfen:
 * - dass der Hook bei fehlendem skeetId/enabled nicht lädt
 * - dass erfolgreiche Antworten korrekt gemappt werden
 * - dass Fehlerzustände gemeldet und geloggt werden
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSkeetHistory } from '../../src/hooks/useSkeetHistory.js'

describe('useSkeetHistory', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.spyOn(global, 'fetch').mockImplementation(fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('führt keinen Request aus wenn disabled oder ohne skeetId', () => {
    const { result } = renderHook(() =>
      useSkeetHistory(null, { enabled: false })
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.data).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('liefert Daten nach erfolgreichem Request', async () => {
    const payload = [
      { id: 1, status: 'success', postedAt: '2024-01-01T12:00:00Z' }
    ]
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(payload)
    })

    const { result } = renderHook(() => useSkeetHistory(42))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/skeets/42/history',
      expect.objectContaining({})
    )
    expect(result.current.data).toEqual(payload)
    expect(result.current.isError).toBe(false)
  })

  it('setzt isError bei fehlgeschlagenem Request', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'kaputt' })
    })

    const { result } = renderHook(() => useSkeetHistory(99))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(true)
    expect(result.current.data).toEqual([])
    warnSpy.mockRestore()
  })
})
