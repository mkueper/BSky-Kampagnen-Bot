import { describe, it, expect } from 'vitest'

/**
 * Testgruppe: listViewReducer.test.js
 *
 * Diese Tests überprüfen:
 * - SET_ACTIVE_LIST für vorhandene und neue Listen
 * - LIST_LOADED inkl. topId, cursor, loaded/hasNew-Flags und Meta-Merge
 * - LIST_MARK_HAS_NEW und Verhalten bei bereits gesetztem Flag
 * - LIST_SET_REFRESHING / LIST_SET_LOADING_MORE mit Idempotenz
 *
 * Kontext:
 * Teil der globalen App-State-Maschine. Stellt sicher, dass
 * Listenstatus und Metadaten stabil verwaltet werden.
 */

import { listViewInitialState, listViewReducer } from '../../src/context/reducers/listView.js'

describe('listViewReducer', () => {
  it('SET_ACTIVE_LIST setzt activeListKey für vorhandene Liste', () => {
    const state = { ...listViewInitialState }

    const next = listViewReducer(state, { type: 'SET_ACTIVE_LIST', payload: 'following' })

    expect(next.activeListKey).toBe('following')
    expect(Object.keys(next.lists)).toEqual(Object.keys(state.lists))
  })

  it('SET_ACTIVE_LIST erzeugt neue Liste, wenn Key unbekannt ist', () => {
    const state = { ...listViewInitialState }

    const next = listViewReducer(state, { type: 'SET_ACTIVE_LIST', payload: 'custom:list' })

    expect(next.activeListKey).toBe('custom:list')
    expect(next.lists['custom:list']).toBeDefined()
    expect(next.lists['custom:list'].key).toBe('custom:list')
    expect(next.lists['custom:list'].items).toEqual([])
  })

  it('LIST_LOADED setzt Items, Cursor und Meta und berechnet topId', () => {
    const base = {
      ...listViewInitialState,
      activeListKey: 'discover'
    }
    const items = [
      { id: 1, uri: 'at://example/one' },
      { id: 2, uri: 'at://example/two' }
    ]

    const next = listViewReducer(base, {
      type: 'LIST_LOADED',
      payload: {
        key: 'discover',
        items,
        cursor: 'cursor-1',
        meta: { label: 'Discover Neu', supportsRefresh: false }
      }
    })

    const list = next.lists.discover
    expect(list.loaded).toBe(true)
    expect(list.items).toHaveLength(2)
    expect(list.cursor).toBe('cursor-1')
    expect(list.topId).toBe('at://example/one')
    expect(list.label).toBe('Discover Neu')
    expect(list.supportsRefresh).toBe(false)
    expect(list.hasNew).toBe(false)
  })

  it('LIST_LOADED respektiert keepHasNew und behält bestehendes hasNew-Flag', () => {
    const baseList = {
      ...listViewInitialState.lists['discover'],
      hasNew: true,
      loaded: true
    }
    const base = {
      ...listViewInitialState,
      lists: {
        ...listViewInitialState.lists,
        discover: baseList
      }
    }

    const next = listViewReducer(base, {
      type: 'LIST_LOADED',
      payload: {
        key: 'discover',
        items: [],
        keepHasNew: true
      }
    })

    expect(next.lists.discover.hasNew).toBe(true)
  })

  it('LIST_MARK_HAS_NEW setzt hasNew nur einmal', () => {
    const base = { ...listViewInitialState }

    const first = listViewReducer(base, { type: 'LIST_MARK_HAS_NEW', payload: 'discover' })
    expect(first.lists.discover.hasNew).toBe(true)

    const second = listViewReducer(first, { type: 'LIST_MARK_HAS_NEW', payload: 'discover' })
    expect(second.lists.discover.hasNew).toBe(true)
  })

  it('LIST_SET_REFRESHING toggelt isRefreshing und ist idempotent', () => {
    const base = { ...listViewInitialState }

    const refreshing = listViewReducer(base, {
      type: 'LIST_SET_REFRESHING',
      payload: { key: 'discover', value: true }
    })
    expect(refreshing.lists.discover.isRefreshing).toBe(true)

    const again = listViewReducer(refreshing, {
      type: 'LIST_SET_REFRESHING',
      payload: { key: 'discover', value: true }
    })
    expect(again).toBe(refreshing)
  })

  it('LIST_SET_LOADING_MORE toggelt isLoadingMore und ist idempotent', () => {
    const base = { ...listViewInitialState }

    const loadingMore = listViewReducer(base, {
      type: 'LIST_SET_LOADING_MORE',
      payload: { key: 'discover', value: true }
    })
    expect(loadingMore.lists.discover.isLoadingMore).toBe(true)

    const again = listViewReducer(loadingMore, {
      type: 'LIST_SET_LOADING_MORE',
      payload: { key: 'discover', value: true }
    })
    expect(again).toBe(loadingMore)
  })
})
