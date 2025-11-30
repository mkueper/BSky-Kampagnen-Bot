import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
/**
 * Testgruppe: ProfilePosts.test.jsx
 *
 * Diese Tests überprüfen:
 * - Rendering der Profil-Posts mit Skeletons und Fehlermeldungen
 * - Tabwechsel (Posts, Replies, Likes) und API-Aufrufe
 * - IntersectionObserver-Trigger zum Nachladen weiterer Items
 *
 * Kontext:
 * Teil der vereinheitlichten Teststruktur des bsky-client.
 * Stellt sicher, dass Komponenten, Hooks, Contexts und Flows stabil funktionieren.
 */
import { SWRConfig } from 'swr'
import ProfilePosts from '../../src/modules/profile/ProfilePosts.jsx'
import { AppProvider } from '../../src/context/AppContext.jsx'

const renderWithProviders = (ui, options) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }}>
        <AppProvider>{children}</AppProvider>
      </SWRConfig>
    ),
    ...options
  })
}

const { fetchProfileFeedMock, fetchProfileLikesMock } = vi.hoisted(() => ({
  fetchProfileFeedMock: vi.fn(),
  fetchProfileLikesMock: vi.fn()
}))

vi.mock('../../src/modules/timeline/SkeetItem.jsx', () => ({
  default: () => <div data-testid='skeet-item'>item</div>
}))

vi.mock('../../src/modules/shared/api/bsky', () => ({
  fetchProfileFeed: (...args) => fetchProfileFeedMock(...args),
  fetchProfileLikes: (...args) => fetchProfileLikesMock(...args),
  fetchProfile: vi.fn()
}))

describe('ProfilePosts', () => {
  const defaultProps = {
    actor: 'did:example:alice',
    actorHandle: 'alice.example',
    activeTab: 'posts',
    scrollContainerRef: { current: null }
  }

  let observerCallbacks = []

  beforeEach(() => {
    observerCallbacks = []
    class MockIntersectionObserver {
      constructor (callback) {
        observerCallbacks.push(callback)
      }
      observe () {}
      unobserve () {}
      disconnect () {}
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    fetchProfileFeedMock.mockReset()
    fetchProfileLikesMock.mockReset()
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: { did: 'did:example:me' } })
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows skeleton placeholders while loading', async () => {
    fetchProfileFeedMock.mockReturnValue(new Promise(() => {}))
    await act(async () => {
      renderWithProviders(<ProfilePosts {...defaultProps} />)
    })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders empty message for tabs ohne Ergebnisse', async () => {
    fetchProfileFeedMock.mockResolvedValueOnce({ items: [], cursor: null })
    await act(async () => {
      renderWithProviders(<ProfilePosts {...defaultProps} activeTab='replies' />)
    })
    await waitFor(() => {
      expect(screen.getByText('Noch keine Antworten.')).toBeInTheDocument()
    })
  })

  it('zeigt Inline-Fehler, wenn Nachladen fehlschlägt', async () => {
    fetchProfileFeedMock
      .mockResolvedValueOnce({
        items: [{ uri: 'at://example/post' }],
        cursor: 'cursor-1'
      })
      .mockRejectedValueOnce(new Error('Mehr laden fehlgeschlagen.'))

    await act(async () => {
      renderWithProviders(<ProfilePosts {...defaultProps} />)
    })

    await waitFor(() => {
      expect(screen.getAllByTestId('skeet-item')).toHaveLength(1)
    })

    const observer = observerCallbacks[0]
    expect(observer).toBeTruthy()
    act(() => {
      observer([{ isIntersecting: true }])
    })

    await waitFor(() => {
      expect(screen.getByText('Mehr laden fehlgeschlagen.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
  })
})
