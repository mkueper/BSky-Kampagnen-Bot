import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
/**
 * Testgruppe: hashtagSearch.test.jsx
 *
 * Diese Tests überprüfen:
 * - OPEN_HASHTAG_SEARCH (Initialisierung und Normalisierung des Hashtag-Suchzustands)
 * - CLOSE_HASHTAG_SEARCH (Schließen der Suche ohne Verlust der Metadaten)
 * - Interaktion mit OPEN_PROFILE_VIEWER (Hashtag-Suche wird geschlossen)
 *
 * Kontext:
 * Teil des globalen App-State (AppContext.jsx). Stellt sicher, dass
 * die Hashtag-Suche konsistent über Actions gesteuert wird.
 */
import { AppProvider, useAppState, useAppDispatch } from '../../src/context/AppContext.jsx'

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>

function useStateAndDispatch () {
  const state = useAppState()
  const dispatch = useAppDispatch()
  return { state, dispatch }
}

describe('AppContext – hashtagSearch', () => {
  beforeEach(() => {
    // /api/me Fetch im AppProvider stubben, damit die Tests kein echtes Fetch auslösen
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: null })
    })
  })

  it('OPEN_HASHTAG_SEARCH öffnet die Suche mit normalisiertem Query und Standardwerten', () => {
    const { result } = renderHook(useStateAndDispatch, { wrapper })

    act(() => {
      result.current.dispatch({
        type: 'OPEN_HASHTAG_SEARCH',
        payload: {
          query: '  #bluesky  ',
          label: 'Bluesky',
          description: 'Bluesky Hashtag',
          tab: 'top'
        }
      })
    })

    const { hashtagSearch } = result.current.state
    expect(hashtagSearch.open).toBe(true)
    expect(hashtagSearch.query).toBe('#bluesky')
    expect(hashtagSearch.label).toBe('Bluesky')
    expect(hashtagSearch.description).toBe('Bluesky Hashtag')
    expect(hashtagSearch.tab).toBe('top')
  })

  it('OPEN_HASHTAG_SEARCH verwendet Query als Fallback-Label und setzt tab-Default', () => {
    const { result } = renderHook(useStateAndDispatch, { wrapper })

    act(() => {
      result.current.dispatch({
        type: 'OPEN_HASHTAG_SEARCH',
        payload: {
          query: '  #latest  ',
          tab: 'latest'
        }
      })
    })

    const { hashtagSearch } = result.current.state
    expect(hashtagSearch.open).toBe(true)
    expect(hashtagSearch.query).toBe('#latest')
    expect(hashtagSearch.label).toBe('#latest')
    expect(hashtagSearch.description).toBe('')
    expect(hashtagSearch.tab).toBe('latest')
  })

  it('OPEN_HASHTAG_SEARCH ignoriert leere Queries', () => {
    const { result } = renderHook(useStateAndDispatch, { wrapper })
    const initial = result.current.state.hashtagSearch

    act(() => {
      result.current.dispatch({
        type: 'OPEN_HASHTAG_SEARCH',
        payload: { query: '   ' }
      })
    })

    expect(result.current.state.hashtagSearch).toEqual(initial)
  })

  it('CLOSE_HASHTAG_SEARCH schließt nur die Suche und behält Metadaten bei', () => {
    const { result } = renderHook(useStateAndDispatch, { wrapper })

    act(() => {
      result.current.dispatch({
        type: 'OPEN_HASHTAG_SEARCH',
        payload: {
          query: '#bluesky',
          label: 'Bluesky',
          description: 'Bluesky Hashtag',
          tab: 'top'
        }
      })
    })

    act(() => {
      result.current.dispatch({ type: 'CLOSE_HASHTAG_SEARCH' })
    })

    const { hashtagSearch } = result.current.state
    expect(hashtagSearch.open).toBe(false)
    expect(hashtagSearch.query).toBe('#bluesky')
    expect(hashtagSearch.label).toBe('Bluesky')
    expect(hashtagSearch.description).toBe('Bluesky Hashtag')
    expect(hashtagSearch.tab).toBe('top')
  })

  it('OPEN_PROFILE_VIEWER schließt eine offene Hashtag-Suche', () => {
    const { result } = renderHook(useStateAndDispatch, { wrapper })

    act(() => {
      result.current.dispatch({
        type: 'OPEN_HASHTAG_SEARCH',
        payload: { query: '#bluesky' }
      })
    })

    act(() => {
      result.current.dispatch({
        type: 'OPEN_PROFILE_VIEWER',
        actor: 'did:example:alice'
      })
    })

    const { hashtagSearch, profileViewer } = result.current.state
    expect(hashtagSearch.open).toBe(false)
    expect(profileViewer.open).toBe(true)
    expect(profileViewer.actor).toBe('did:example:alice')
  })
})
