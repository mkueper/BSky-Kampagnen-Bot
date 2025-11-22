import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import Notifications, { NotificationCard } from './Notifications.jsx'
import { AppProvider } from '../../context/AppContext.jsx'

const renderWithProviders = (ui, options) => {
  return render(ui, {
    wrapper: AppProvider,
    ...options
  })
}

const { fetchNotificationsMock, mockDispatch, engagementOverrides } = vi.hoisted(() => ({
  fetchNotificationsMock: vi.fn(),
  mockDispatch: vi.fn(),
  engagementOverrides: { current: null }
}))

vi.mock('../../context/AppContext', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    useAppDispatch: () => mockDispatch
  }
})
vi.mock('../../context/CardConfigContext.jsx', () => ({
  useCardConfig: () => ({
    config: { singleMax: 256 }
  })
}))

vi.mock('../shared', () => {
  const buildEngagement = () => ({
    likeCount: 0,
    repostCount: 0,
    hasLiked: false,
    hasReposted: false,
    busy: false,
    refreshing: false,
    error: '',
    toggleLike: () => {},
    toggleRepost: () => {},
    refresh: () => {},
    clearError: () => {}
  })

  const Card = ({ as: Component = 'div', children, ...rest }) => {
    const { padding, hover, ...domProps } = rest
    const Tag = Component || 'div'
    return <Tag {...domProps}>{children}</Tag>
  }

  const RepostMenuButton = ({ onRepost, onQuote }) => (
    <div>
      <button type='button' onClick={onRepost}>Repost</button>
      {onQuote ? <button type='button' onClick={onQuote}>Quote</button> : null}
    </div>
  )

  return {
    Button: ({ children, ...props }) => <button {...props}>{children}</button>,
    Card,
    RichText: ({ text, ...props }) => <span {...props}>{text}</span>,
    RepostMenuButton,
    useBskyEngagement: () => ({
      ...buildEngagement(),
      ...(engagementOverrides.current || {})
    }),
    fetchNotifications: fetchNotificationsMock
  }
})

const ISO_DATE = '2024-01-01T00:00:00.000Z'

const createNotification = ({ id, reason = 'like', text = `Record ${id}`, author: authorOverride, subject: subjectOverride }) => ({
  uri: `at://did:example/app.bsky.feed.post/${id}`,
  cid: `cid-${id}`,
  indexedAt: ISO_DATE,
  author: authorOverride || { displayName: `Author ${id}`, handle: `author-${id}`, did: `did:author-${id}` },
  reason,
  record: { text, cid: `record-cid-${id}`, uri: `at://did:example/app.bsky.feed.post/${id}` },
  subject: subjectOverride || {
    createdAt: ISO_DATE,
    author: { displayName: `Subject ${id}`, handle: `subject-${id}` },
    text: `Subject text ${id}`,
    raw: {
      post: {
        uri: `at://did:subject/app.bsky.feed.post/${id}`,
        record: { text: `Subject text ${id}` },
        embed: {}
      }
    }
  },
  stats: { likeCount: 0, repostCount: 0 },
  viewer: {}
})

class IntersectionObserverMock {
  observe () {}
  unobserve () {}
  disconnect () {}
}

beforeAll(() => {
  global.IntersectionObserver = IntersectionObserverMock
})

beforeEach(() => {
  fetchNotificationsMock.mockReset()
  mockDispatch.mockReset()
  engagementOverrides.current = null
  vi.spyOn(window, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ profile: { did: 'did:example:me' } })
  })
})

describe('Notifications', () => {
  it('rendert Mitteilungen der ersten Seite wenn activeTab="all"', async () => {
    fetchNotificationsMock.mockResolvedValueOnce({
      items: [
        createNotification({ id: '1', text: 'Alpha Text' }),
        createNotification({ id: '2', reason: 'repost', text: 'Bravo Text' })
      ],
      cursor: null,
      unreadCount: 2
    })

    const { container } = renderWithProviders(<Notifications activeTab='all' />)

    await waitFor(() => {
      expect(container.querySelectorAll('[data-component="BskyNotificationCard"]').length).toBe(2)
    })
    expect(fetchNotificationsMock).toHaveBeenCalledWith({ cursor: undefined, markSeen: true, filter: 'all' })
    expect(screen.getByText('Alpha Text')).toBeVisible()
    expect(screen.getByText('Bravo Text')).toBeVisible()
  })

  it('lädt Erwähnungen und füllt den Puffer auf, wenn der Mentions-Tab aktiv ist', async () => {
    // First fetch returns only one mention, which is less than the buffer
    fetchNotificationsMock
      .mockResolvedValueOnce({
        items: [
          createNotification({ id: 'm1', reason: 'mention', text: 'Mention Body' })
        ],
        cursor: 'cursor-1',
        unreadCount: 1
      })
      // Second fetch is triggered to fill the buffer
      .mockResolvedValueOnce({
        items: Array.from({ length: 5 }, (_, idx) => createNotification({
          id: `more-${idx}`,
          reason: 'mention',
          text: `More mention ${idx}`
        })),
        cursor: null,
        unreadCount: 0
      })

    const { container } = renderWithProviders(<Notifications activeTab='mentions' />)

    // Wait for both fetches to complete
    await waitFor(() => expect(fetchNotificationsMock).toHaveBeenCalledTimes(2), { timeout: 2000 })

    // Check the calls
    expect(fetchNotificationsMock.mock.calls[0][0]).toEqual({ cursor: undefined, markSeen: true, filter: 'mentions' })
    expect(fetchNotificationsMock.mock.calls[1][0]).toEqual({ cursor: 'cursor-1', markSeen: false, filter: 'mentions' })

    // Check the rendered output
    await waitFor(() => {
      expect(container.querySelectorAll('[data-component="BskyNotificationCard"]').length).toBe(6)
    })
    expect(screen.getByText('Mention Body')).toBeVisible()
    expect(screen.getByText('More mention 0')).toBeVisible()
  })
})

describe('NotificationCard interactions', () => {
  it('markiert Eintrag als gelesen und öffnet den Thread beim Klick', async () => {
    const user = userEvent.setup()
    const item = createNotification({ id: 'card-1', reason: 'like', text: 'Card text' })
    const handleSelect = vi.fn()
    const handleMarkRead = vi.fn()

    render(
      <NotificationCard
        item={item}
        onSelectItem={handleSelect}
        onMarkRead={handleMarkRead}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Thread öffnen' }))

    expect(handleMarkRead).toHaveBeenCalledWith(item)
    expect(handleSelect).toHaveBeenCalledTimes(1)
    const selected = handleSelect.mock.calls[0][0]
    expect(selected?.uri).toBe(item.subject?.raw?.post?.uri ?? item.uri)
  })

  it('löst Reply- und Quote-Aktionen für Antwort-Benachrichtigungen aus', async () => {
    const user = userEvent.setup()
    const item = createNotification({ id: 'reply-1', reason: 'reply', text: 'Reply record' })
    const handleReply = vi.fn()
    const handleQuote = vi.fn()

    render(
      <NotificationCard
        item={item}
        onReply={handleReply}
        onQuote={handleQuote}
      />
    )

    await user.click(screen.getByTitle('Antworten'))
    expect(handleReply).toHaveBeenCalledWith({ uri: item.uri, cid: item.cid })

    await user.click(screen.getByRole('button', { name: 'Quote' }))
    expect(handleQuote).toHaveBeenCalledWith(item)
  })

  it('öffnet den Profilviewer über den Autoren-Button', async () => {
    const user = userEvent.setup()
    const author = { displayName: 'Custom Author', handle: 'custom', did: 'did:custom' }
    const item = createNotification({ id: 'profile-1', author })

    render(<NotificationCard item={item} />)

    await user.click(screen.getByRole('button', { name: author.displayName }))

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_PROFILE_VIEWER', actor: author.did })
  })

  it('öffnet die Medien-Lightbox über das Vorschaubild', async () => {
    const user = userEvent.setup()
    const subjectWithImage = {
      createdAt: ISO_DATE,
      author: { displayName: 'Subject Media', handle: 'subject-media' },
      text: 'subject media',
      raw: {
        post: {
          uri: 'at://did:subject/app.bsky.feed.post/media-1',
          record: { text: 'subject media' },
          embed: {
            images: [
              { fullsize: 'https://example.com/full.jpg', thumb: 'https://example.com/thumb.jpg', alt: 'Preview Alt' }
            ]
          }
        }
      }
    }
    const item = createNotification({ id: 'media-1', subject: subjectWithImage })
    const handleViewMedia = vi.fn()

    render(<NotificationCard item={item} onViewMedia={handleViewMedia} />)

    await user.click(screen.getByAltText('Preview Alt'))

    expect(handleViewMedia).toHaveBeenCalledTimes(1)
    const [images, initialIndex] = handleViewMedia.mock.calls[0]
    expect(initialIndex).toBe(0)
    expect(images[0]).toEqual(expect.objectContaining({ src: 'https://example.com/full.jpg', type: 'image' }))
  })

  it('öffnet die Medien-Lightbox über die Video-Vorschau', async () => {
    const user = userEvent.setup()
    const subjectWithVideo = {
      createdAt: ISO_DATE,
      author: { displayName: 'Video Subject', handle: 'video-subject' },
      text: 'Video body',
      raw: {
        post: {
          uri: 'at://did:subject/app.bsky.feed.post/video-1',
          record: { text: 'Video body' },
          embed: {
            $type: 'app.bsky.embed.video#view',
            playlist: 'https://example.com/video.m3u8',
            thumbnail: 'https://example.com/video-thumb.jpg',
            alt: 'Video description'
          }
        }
      }
    }
    const item = createNotification({ id: 'media-video', subject: subjectWithVideo })
    const handleViewMedia = vi.fn()

    render(<NotificationCard item={item} onViewMedia={handleViewMedia} />)

    await user.click(screen.getByRole('button', { name: 'Video öffnen' }))

    expect(handleViewMedia).toHaveBeenCalledTimes(1)
    const [mediaItems, initialIndex] = handleViewMedia.mock.calls[0]
    expect(initialIndex).toBe(0)
    expect(mediaItems[0]).toEqual(expect.objectContaining({ src: 'https://example.com/video.m3u8', type: 'video' }))
  })

  it('öffnet die Medien-Lightbox für Medien in einer Antwort', async () => {
    const user = userEvent.setup()
    const replyWithImage = {
      ...createNotification({ id: 'reply-media-1', reason: 'reply', author: { did: 'did:author:123' } }),
      record: {
        text: 'Antwort mit Bild',
        embed: {
          images: [
            {
              alt: 'Reply Alt',
              image: {
                $type: 'blob',
                ref: { $link: 'bafkrei-test-cid' }
              }
            }
          ]
        }
      }
    }
    const handleViewMedia = vi.fn()

    render(
      <NotificationCard
        item={replyWithImage}
        onViewMedia={handleViewMedia}
      />
    )

    await user.click(screen.getByAltText('Reply Alt'))

    expect(handleViewMedia).toHaveBeenCalledTimes(1)
    const [images, initialIndex] = handleViewMedia.mock.calls[0]
    expect(images[0]).toEqual(expect.objectContaining({ src: 'https://cdn.bsky.app/img/feed_fullsize/plain/did:author:123/bafkrei-test-cid@jpeg' }))
  })

  it('zeigt System-Hinweise für app.bsky.notification Gründe an', () => {
    const item = createNotification({ id: 'system-1', reason: 'app.bsky.notification.moderation#alert' })
    render(<NotificationCard item={item} />)
    expect(screen.getByText('System (moderation alert)')).toBeVisible()
    expect(screen.getByText('Systembenachrichtigung von Bluesky.')).toBeVisible()
  })

  it('zeigt Fehlerhinweise aus dem Engagement-Hook an', () => {
    engagementOverrides.current = {
      error: 'Aktion fehlgeschlagen'
    }
    const item = {
      ...createNotification({ id: 'reply-error', reason: 'reply', text: 'Reply text' }),
      reason: 'reply'
    }
    render(<NotificationCard item={item} />)
    expect(screen.getByText('Aktion fehlgeschlagen')).toBeVisible()
  })
})
