import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ProfilePosts from './ProfilePosts.jsx'

vi.mock('../timeline/SkeetItem.jsx', () => ({
  default: () => <div data-testid='skeet-item'>item</div>
}))

function createIntersectionObserverMock () {
  return class {
    observe () {}
    unobserve () {}
    disconnect () {}
  }
}

describe('ProfilePosts', () => {
  const defaultProps = {
    actor: 'did:example:alice',
    activeTab: 'posts',
    setFeeds: vi.fn(),
    scrollContainerRef: { current: null },
    feedData: { items: [], cursor: null, status: 'idle', error: '' },
    onSelectPost: undefined,
    onReply: undefined,
    onQuote: undefined,
    onViewMedia: undefined
  }

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', createIntersectionObserverMock())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows skeleton placeholders while loading', () => {
    render(
      <ProfilePosts
        {...defaultProps}
        feedData={{ items: [], cursor: null, status: 'loading', error: '' }}
      />
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders empty message for tabs without entries', () => {
    render(
      <ProfilePosts
        {...defaultProps}
        activeTab='replies'
        feedData={{ items: [], cursor: null, status: 'success', error: '' }}
      />
    )
    expect(screen.getByText('Noch keine Antworten.')).toBeInTheDocument()
  })

  it('shows inline error block with retry button when pagination fails after data', () => {
    render(
      <ProfilePosts
        {...defaultProps}
        feedData={{ items: [{ uri: 'at://example/post' }], cursor: null, status: 'success', error: 'Mehr laden fehlgeschlagen.' }}
      />
    )
    expect(screen.getByText('Mehr laden fehlgeschlagen.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
  })
})
