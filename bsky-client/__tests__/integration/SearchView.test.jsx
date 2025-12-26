import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
/**
 * Testgruppe: SearchView.test.jsx
 *
 * Diese Tests überprüfen:
 * - Suchvorgänge mit Header + Result-Liste
 * - Auswahl eines Resultats und Thread-Selection
 * - Laden weiterer Seiten inkl. IntersectionObserver
 *
 * Kontext:
 * Teil der vereinheitlichten Teststruktur des bsky-client.
 * Stellt sicher, dass Komponenten, Hooks, Contexts und Flows stabil funktionieren.
 */
import SearchView from '../../src/modules/search/SearchView.jsx'
import SearchHeader from '../../src/modules/search/SearchHeader.jsx'
import { SearchProvider } from '../../src/modules/search/SearchContext.jsx'
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'

const { searchBskyMock, selectThreadFromItemMock } = vi.hoisted(() => ({
  searchBskyMock: vi.fn(),
  selectThreadFromItemMock: vi.fn()
}))

vi.mock('../../src/modules/shared', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  ProfilePreviewTrigger: ({ children }) => <>{children}</>,
  RichText: ({ text }) => <span>{text}</span>,
  InlineMenu: ({ children }) => <div>{children}</div>,
  InlineMenuTrigger: ({ children }) => <>{children}</>,
  InlineMenuContent: ({ children }) => <div>{children}</div>,
  searchBsky: searchBskyMock
}))

vi.mock('../../src/modules/timeline/SkeetItem.jsx', () => ({
  __esModule: true,
  default: ({ item, onSelect }) => {
    const hasCustomPayload = Object.prototype.hasOwnProperty.call(item, '__mockSelectPayload')
    const payload = hasCustomPayload ? item.__mockSelectPayload : item
    return (
      <div
        data-testid={`search-result-${item.cid || item.uri}`}
        role='button'
        onClick={() => onSelect?.(payload)}
      >
        {item.text}
      </div>
    )
  }
}))

vi.mock('../../src/hooks/useThread', () => ({
  useThread: () => ({
    selectThreadFromItem: selectThreadFromItemMock
  })
}))

vi.mock('../../src/hooks/useComposer', () => ({
  useComposer: () => ({
    openReplyComposer: vi.fn(),
    openQuoteComposer: vi.fn()
  })
}))

vi.mock('../../src/hooks/useMediaLightbox', () => ({
  useMediaLightbox: () => ({
    openMediaPreview: vi.fn()
  })
}))

vi.mock('../../src/hooks/useClientConfig', () => ({
  useClientConfig: () => ({ clientConfig: null })
}))

const renderSearchView = () => render(
  <I18nProvider initialLocale='de'>
    <SearchProvider>
      <SearchHeader />
      <SearchView />
    </SearchProvider>
  </I18nProvider>
)

class IntersectionObserverMock {
  observe () {}
  unobserve () {}
  disconnect () {}
}

beforeAll(() => {
  global.IntersectionObserver = IntersectionObserverMock
})

beforeEach(() => {
  searchBskyMock.mockReset()
  selectThreadFromItemMock.mockReset()
  window.localStorage.clear()
})

const createPost = ({ id = '1', overrides = {} } = {}) => {
  const uri = `at://did:example/app.bsky.feed.post/${id}`
  return {
    uri,
    cid: `cid-${id}`,
    text: `Skeet ${id}`,
    author: { handle: `user-${id}`, displayName: `User ${id}` },
    stats: {},
    raw: { post: { uri } },
    ...overrides
  }
}

describe('SearchView', () => {
  it('öffnet beim Klick auf ein Suchergebnis das Thread-Lesefenster', async () => {
    searchBskyMock.mockResolvedValueOnce({
      items: [createPost({ id: 'root' })],
      cursor: null
    })

    const user = userEvent.setup()
    renderSearchView()

    await user.type(
      screen.getByPlaceholderText('Nach Posts oder Personen suchen…'),
      'root skeet'
    )
    await user.click(screen.getByRole('button', { name: 'Suchen' }))

    await waitFor(() => {
      expect(searchBskyMock).toHaveBeenCalled()
    })

    await user.click(screen.getByTestId('search-result-cid-root'))

    expect(selectThreadFromItemMock).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'at://did:example/app.bsky.feed.post/root' })
    )
  })

  it('verwendet das ursprüngliche Item als Fallback, falls kein Ziel übergeben wird', async () => {
    searchBskyMock.mockResolvedValueOnce({
      items: [
        createPost({
          id: 'fallback',
          overrides: { __mockSelectPayload: undefined }
        })
      ],
      cursor: null
    })
    const user = userEvent.setup()
    renderSearchView()

    await user.type(
      screen.getByPlaceholderText('Nach Posts oder Personen suchen…'),
      'fallback skeet'
    )
    await user.click(screen.getByRole('button', { name: 'Suchen' }))

    await waitFor(() => {
      expect(searchBskyMock).toHaveBeenCalled()
    })

    await user.click(screen.getByTestId('search-result-cid-fallback'))

    expect(selectThreadFromItemMock).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'at://did:example/app.bsky.feed.post/fallback' })
    )
  })
})
