import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
/**
 * Testgruppe: useThread.test.jsx
 *
 * Diese Tests überprüfen:
 * - Laden eines Threads und Setzen von threadState inkl. Metadaten
 * - Vermeidung doppelter Loads, wenn derselbe Thread erneut ausgewählt wird
 * - History-Handling und Rücksprung mit closeThread
 * - Reload des aktuellen Threads ohne History-Push
 * - Aktualisierung der threadViewVariant per setThreadViewVariant
 *
 * Kontext:
 * Teil der vereinheitlichten Thread-Handling-Logik des bsky-client.
 * Stellt sicher, dass der Hook stabil mit AppContext und API zusammenarbeitet.
 */
import { AppProvider, useAppState } from '../../src/context/AppContext.jsx'
import { useThread } from '../../src/hooks/useThread.js'

const { fetchThreadMock } = vi.hoisted(() => ({
  fetchThreadMock: vi.fn()
}))

vi.mock('../../src/modules/shared', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    fetchThread: (...args) => fetchThreadMock(...args)
  }
})

const wrapper = ({ children }) => (
  <AppProvider>{children}</AppProvider>
)

function renderUseThread () {
  return renderHook(() => {
    const thread = useThread()
    const state = useAppState()
    return { thread, state }
  }, { wrapper })
}

describe('useThread', () => {
  beforeEach(() => {
    fetchThreadMock.mockReset()
  })

  it('lädt Thread-Daten und setzt threadState inkl. Metadaten', async () => {
    const focusAuthorDid = 'did:example:author'
    const data = {
      focus: { author: { did: focusAuthorDid } },
      parents: [{ author: { did: focusAuthorDid } }]
    }
    fetchThreadMock.mockResolvedValueOnce(data)

    const { result } = renderUseThread()

    await act(async () => {
      await result.current.thread.loadThread('at://example/thread/1')
    })

    expect(fetchThreadMock).toHaveBeenCalledWith('at://example/thread/1')

    const threadState = result.current.thread.threadState
    expect(threadState.active).toBe(true)
    expect(threadState.loading).toBe(false)
    expect(threadState.data).toBe(data)
    expect(threadState.uri).toBe('at://example/thread/1')
    expect(threadState.isAuthorThread).toBe(true)
    expect(threadState.rootAuthorDid).toBe(focusAuthorDid)
    expect(threadState.focusAuthorDid).toBe(focusAuthorDid)
  })

  it('selectThreadFromItem lädt nur einmal, wenn derselbe Thread erneut ausgewählt wird', async () => {
    const data = { focus: { author: { did: 'did:example:author' } }, parents: [] }
    fetchThreadMock.mockResolvedValue(data)

    const { result } = renderUseThread()
    const item = { uri: 'at://example/thread/2' }

    await act(async () => {
      await result.current.thread.selectThreadFromItem(item)
    })

    await act(async () => {
      await result.current.thread.selectThreadFromItem(item)
    })

    expect(fetchThreadMock).toHaveBeenCalledTimes(1)
    expect(result.current.thread.threadState.uri).toBe('at://example/thread/2')
  })

  it('closeThread springt bei vorhandener History zum vorherigen Thread zurück', async () => {
    const dataA = { focus: { author: { did: 'did:example:a' } }, parents: [] }
    const dataB = { focus: { author: { did: 'did:example:b' } }, parents: [] }
    fetchThreadMock
      .mockResolvedValueOnce(dataA)
      .mockResolvedValueOnce(dataB)

    const { result } = renderUseThread()

    await act(async () => {
      await result.current.thread.loadThread('at://example/thread/A')
    })

    await act(async () => {
      await result.current.thread.loadThread('at://example/thread/B')
    })

    expect(result.current.thread.threadState.uri).toBe('at://example/thread/B')
    expect(result.current.thread.threadHistoryRef.current.length).toBe(1)

    await act(async () => {
      result.current.thread.closeThread()
    })

    expect(result.current.thread.threadState.uri).toBe('at://example/thread/A')
    expect(result.current.thread.threadHistoryRef.current.length).toBe(0)
  })

  it('reloadThread lädt den aktuellen Thread ohne History-Push', async () => {
    const initialData = { focus: { author: { did: 'did:example:author' } }, parents: [] }
    const reloadedData = { focus: { author: { did: 'did:example:author2' } }, parents: [] }
    fetchThreadMock
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(reloadedData)

    const { result } = renderUseThread()

    await act(async () => {
      await result.current.thread.loadThread('at://example/thread/3')
    })

    expect(result.current.thread.threadState.data).toBe(initialData)

    await act(async () => {
      await result.current.thread.reloadThread()
    })

    expect(fetchThreadMock).toHaveBeenCalledTimes(2)
    expect(result.current.thread.threadState.data).toBe(reloadedData)
    expect(result.current.thread.threadHistoryRef.current.length).toBe(0)
  })

  it('setThreadViewVariant aktualisiert threadViewVariant im AppState', () => {
    const { result } = renderUseThread()

    expect(result.current.state.threadViewVariant).toBe('modal-cards')

    act(() => {
      result.current.thread.setThreadViewVariant('inline')
    })

    expect(result.current.state.threadViewVariant).toBe('inline')

    act(() => {
      result.current.thread.setThreadViewVariant(123)
    })

    expect(result.current.state.threadViewVariant).toBe('inline')
  })
})
