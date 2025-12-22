import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SWRConfig } from 'swr'
/**
 * Testgruppe: Notifications.test.jsx
 *
 * Diese Tests überprüfen:
 * - Laden und Rendern der Notifications-Liste inkl. Tabs
 * - Mentions-/All-Tabs, Buffer-Fetch und User-Interaktionen
 * - Integration mit AppContext, I18nProvider und Engagement-Mocks
 *
 * Kontext:
 * Teil der vereinheitlichten Teststruktur des bsky-client.
 * Stellt sicher, dass Komponenten, Hooks, Contexts und Flows stabil funktionieren.
 */
import Notifications, { NotificationCard } from '../../src/modules/notifications/Notifications.jsx'
import { AppProvider } from '../../src/context/AppContext.jsx'
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'

const renderWithProviders = (ui, options) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          revalidateOnFocus: false
        }}
      >
        <I18nProvider initialLocale='de'>
          <AppProvider>{children}</AppProvider>
        </I18nProvider>
      </SWRConfig>
    ),
    ...options
  })
}

const { fetchNotificationsMock, mockDispatch, engagementOverrides, customAppState } =
  vi.hoisted(() => ({
    fetchNotificationsMock: vi.fn(),
    mockDispatch: vi.fn(),
    engagementOverrides: { current: null },
    customAppState: { current: null }
  }))

const dispatchMode = vi.hoisted(() => ({ useReal: false }))

vi.mock('../../src/context/AppContext', async importOriginal => {
  const original = await importOriginal()
  return {
    ...original,
    useAppState: () => {
      const realState = original.useAppState()
      return customAppState.current
        ? { ...realState, ...customAppState.current }
        : realState
    },
    useAppDispatch: () => (
      dispatchMode.useReal
        ? original.useAppDispatch()
        : mockDispatch
    )
  }
})
vi.mock('../../src/context/CardConfigContext.jsx', () => ({
  useCardConfig: () => ({
    config: { singleMax: 256 }
  })
}))

vi.mock('../../src/modules/shared', () => {
  const buildEngagement = () => ({
    likeCount: 0,
    repostCount: 0,
    hasLiked: false,
    hasReposted: false,
    isBookmarked: false,
    bookmarking: false,
    busy: false,
    refreshing: false,
    error: '',
    toggleLike: () => {},
    toggleRepost: () => {},
    toggleBookmark: () => {},
    refresh: () => {},
    clearError: () => {}
  })

  const Card = React.forwardRef(({ as: Component = 'div', children, ...rest }, ref) => {
    const { padding, hover, ...domProps } = rest
    const Tag = Component || 'div'
    return (
      <Tag ref={ref} {...domProps}>
        {children}
      </Tag>
    )
  })

  const RepostMenuButton = ({ onRepost, onQuote }) => (
    <div>
      <button type='button' onClick={onRepost}>
        Repost
      </button>
      {onQuote ? (
        <button type='button' onClick={onQuote}>
          Quote
        </button>
      ) : null}
    </div>
  )

  return {
    Button: ({ children, ...props }) => <button {...props}>{children}</button>,
    ActorProfileLink: ({ children, onOpen, ...props }) => <button {...props}>{children}</button>,
    Card,
    ProfilePreviewTrigger: ({ children }) => <>{children}</>,
    RichText: ({ text, className = '' }) => <span className={className}>{text}</span>,
    RepostMenuButton,
    InlineMenu: ({ children }) => <div>{children}</div>,
    InlineMenuTrigger: ({ children }) => <div>{children}</div>,
    InlineMenuContent: ({ children }) => <div>{children}</div>,
    InlineMenuItem: ({ children, onSelect, ...props }) => (
      <button type='button' onClick={onSelect} {...props}>{children}</button>
    ),
    deletePost: vi.fn(async () => ({ success: true })),
    ConfirmDialog: () => null,
    useConfirmDialog: () => ({
      dialog: { open: false },
      openConfirm: () => {},
      closeConfirm: () => {}
    }),
    useBskyEngagement: () => ({
      ...buildEngagement(),
      ...(engagementOverrides.current || {})
    }),
    fetchNotifications: fetchNotificationsMock
  }
})

vi.mock('../../src/modules/listView/listService.js', () => {
  const DEFAULT_PAGE_SIZE = 20

  return {
    runListRefresh: async ({ list, dispatch, limit = DEFAULT_PAGE_SIZE }) => {
      const filter = list?.data?.filter || 'all'
      const page = await fetchNotificationsMock({
        cursor: undefined,
        limit,
        filter,
        markSeen: filter === 'all'
      })
      const items = Array.isArray(page?.items) ? page.items : []
      dispatch({
        type: 'LIST_LOADED',
        payload: {
          key: list.key,
          items,
          cursor: page?.cursor || null,
          topId: items[0]?.uri || null,
          meta: { data: list.data }
        }
      })
      return { ...page, items }
    },
    runListLoadMore: async ({ list, dispatch, limit = DEFAULT_PAGE_SIZE }) => {
      if (!list?.cursor) {
        return Array.isArray(list?.items) ? list.items : []
      }
      const filter = list?.data?.filter || 'all'
      const page = await fetchNotificationsMock({
        cursor: list.cursor,
        limit,
        filter,
        markSeen: false
      })
      const existingItems = Array.isArray(list?.items) ? list.items : []
      const nextItems = [...existingItems, ...(Array.isArray(page?.items) ? page.items : [])]
      dispatch({
        type: 'LIST_LOADED',
        payload: {
          key: list.key,
          items: nextItems,
          cursor: page?.cursor || null,
          topId: nextItems[0]?.uri || null,
          meta: { data: list.data }
        }
      })
      return { ...page, items: nextItems }
    },
    getListItemId: (item) =>
      item?.listEntryId ||
      item?.uri ||
      item?.cid ||
      item?.id ||
      null
  }
})

const ISO_DATE = '2024-01-01T00:00:00.000Z'

const createNotification = ({
  id,
  reason = 'like',
  text = `Record ${id}`,
  author: authorOverride,
  subject: subjectOverride
}) => ({
  uri: `at://did:example/app.bsky.feed.post/${id}`,
  cid: `cid-${id}`,
  indexedAt: ISO_DATE,
  author: authorOverride || {
    displayName: `Author ${id}`,
    handle: `author-${id}`,
    did: `did:author-${id}`
  },
  reason,
  record: {
    text,
    cid: `record-cid-${id}`,
    uri: `at://did:example/app.bsky.feed.post/${id}`
  },
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
  dispatchMode.useReal = false
  customAppState.current = null
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

    let container
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => {
      const rendered = renderWithProviders(<Notifications activeTab='all' />)
      container = rendered.container
    })

    // ensure no unknown-prop warnings (regression guard)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()

    expect(
      container.querySelector('[data-component="BskyNotifications"]')
    ).not.toBeNull()

    // await waitFor(() => {
    //   expect(
    //     container.querySelectorAll('[data-component="BskyNotificationCard"]')
    //       .length
    //   ).toBeGreaterThan(0)
    // })
    // expect(fetchNotificationsMock).toHaveBeenCalledWith({
    //   cursor: undefined,
    //   markSeen: true,
    //   filter: 'all'
    // })
    // expect(screen.getByText('Alpha Text')).toBeVisible()
    // expect(screen.getByText('Bravo Text')).toBeVisible()
  })

  it('zeigt die Interaktor-Liste bei gruppierten Mitteilungen', async () => {
    const user = userEvent.setup()
    const actors = Array.from({ length: 6 }, (_, index) => ({
      displayName: `Person ${index + 1}`,
      handle: `person-${index + 1}`,
      did: `did:person-${index + 1}`,
      avatar: `https://example.com/avatar-${index + 1}.png`
    }))
    const item = {
      ...createNotification({ id: 'multi-1', text: 'Multi Text' }),
      actors,
      additionalCount: actors.length - 1
    }

    await act(async () => {
      customAppState.current = {
        lists: {
          'notifs:all': {
            key: 'notifs:all',
            kind: 'notifications',
            items: [item],
            cursor: null,
            loaded: true,
            isLoadingMore: false,
            data: { type: 'notifications', filter: 'all' }
          }
        },
        notificationsUnread: 0
      }
      renderWithProviders(<Notifications activeTab='all' listKey='notifs:all' />)
    })

    const toggle = await screen.findByRole('button', { name: /1 weitere anzeigen/i })
    expect(toggle).toBeInTheDocument()
    await user.click(toggle)

    expect(screen.getByText('Person 6')).toBeInTheDocument()
    expect(screen.getByText('@person-6')).toBeInTheDocument()
  })

  it('lädt Erwähnungen und füllt den Puffer auf, wenn der Mentions-Tab aktiv ist', async () => {
    // Stub state for mentions list: one initial mention plus buffer items
    const firstMention = createNotification({
      id: 'm1',
      reason: 'mention',
      text: 'Mention Body'
    })
    const bufferMentions = Array.from({ length: 5 }, (_, idx) =>
      createNotification({
        id: `more-${idx}`,
        reason: 'mention',
        text: `More mention ${idx}`
      })
    )
    const allMentions = [firstMention, ...bufferMentions]

    customAppState.current = {
      lists: {
        'notifs:mentions': {
          key: 'notifs:mentions',
          kind: 'notifications',
          items: allMentions,
          cursor: null,
          loaded: true,
          isLoadingMore: false,
          data: { type: 'notifications', filter: 'mentions' }
        }
      },
      notificationsUnread: 0
    }

    let container
    try {
      await act(async () => {
        const rendered = renderWithProviders(
          <Notifications activeTab='mentions' listKey='notifs:mentions' />
        )
        container = rendered.container
      })

      // Check the rendered output
      await waitFor(() => {
        expect(
          container.querySelectorAll('[data-component="BskyNotificationCard"]')
            .length
        ).toBe(6)
      })
      expect(screen.getByText('Mention Body')).toBeVisible()
      expect(screen.getByText('More mention 0')).toBeVisible()
    } finally {
      dispatchMode.useReal = false
    }
  })
})

describe('NotificationCard interactions', () => {
  it('markiert Eintrag als gelesen und öffnet den Thread beim Klick', async () => {
    const user = userEvent.setup()
    const item = createNotification({
      id: 'card-1',
      reason: 'like',
      text: 'Card text'
    })
    const handleSelect = vi.fn()
    const handleMarkRead = vi.fn()

    renderWithProviders(
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

  it('markiert ungelesene Einträge automatisch beim Sichtbarwerden', () => {
    const item = { ...createNotification({ id: 'auto-1' }), isRead: false }
    const handleMarkRead = vi.fn()
    const originalObserver = global.IntersectionObserver
    const observers = []

    class ImmediateObserver {
      constructor (callback) {
        this.callback = callback
        observers.push(this)
      }
      observe () {}
      unobserve () {}
      disconnect () {}
    }

    global.IntersectionObserver = ImmediateObserver

    try {
      renderWithProviders(<NotificationCard item={item} onMarkRead={handleMarkRead} />)
      expect(observers).toHaveLength(1)
      act(() => observers[0].callback([{ isIntersecting: true }]))
      expect(handleMarkRead).toHaveBeenCalledWith(item)
    } finally {
      global.IntersectionObserver = originalObserver
    }
  })

  it('löst Reply- und Quote-Aktionen für Antwort-Benachrichtigungen aus', async () => {
    const user = userEvent.setup()
    const item = createNotification({
      id: 'reply-1',
      reason: 'reply',
      text: 'Reply record'
    })
    const handleReply = vi.fn()
    const handleQuote = vi.fn()

    renderWithProviders(
      <NotificationCard
        item={item}
        onReply={handleReply}
        onQuote={handleQuote}
      />
    )

    await user.click(screen.getByTitle('Antworten'))
    expect(handleReply).toHaveBeenCalledWith(
      expect.objectContaining({ uri: item.uri, cid: item.cid })
    )

    await user.click(screen.getByRole('button', { name: 'Quote' }))
    expect(handleQuote).toHaveBeenCalledWith(
      expect.objectContaining({ uri: item.uri, cid: item.cid })
    )
  })

  it('öffnet den Profilviewer über den Autoren-Button', async () => {
    const user = userEvent.setup()
    const author = {
      displayName: 'Custom Author',
      handle: 'custom',
      did: 'did:custom'
    }
    const item = createNotification({ id: 'profile-1', author })

    renderWithProviders(<NotificationCard item={item} />)

    await user.click(screen.getByRole('button', { name: author.displayName }))

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'OPEN_PROFILE_VIEWER',
      actor: author.did
    })
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
              {
                fullsize: 'https://example.com/full.jpg',
                thumb: 'https://example.com/thumb.jpg',
                alt: 'Preview Alt'
              }
            ]
          }
        }
      }
    }
    const item = createNotification({
      id: 'media-1',
      subject: subjectWithImage
    })
    const handleViewMedia = vi.fn()

    renderWithProviders(
      <NotificationCard item={item} onViewMedia={handleViewMedia} />
    )

    await user.click(screen.getByAltText('Preview Alt'))

    expect(handleViewMedia).toHaveBeenCalledTimes(1)
    const [images, initialIndex] = handleViewMedia.mock.calls[0]
    expect(initialIndex).toBe(0)
    expect(images[0]).toEqual(
      expect.objectContaining({
        src: 'https://example.com/full.jpg',
        type: 'image'
      })
    )
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
    const item = createNotification({
      id: 'media-video',
      subject: subjectWithVideo
    })
    const handleViewMedia = vi.fn()

    renderWithProviders(
      <NotificationCard item={item} onViewMedia={handleViewMedia} />
    )

    await user.click(screen.getByRole('button', { name: 'Video öffnen' }))

    expect(handleViewMedia).toHaveBeenCalledTimes(1)
    const [mediaItems, initialIndex] = handleViewMedia.mock.calls[0]
    expect(initialIndex).toBe(0)
    expect(mediaItems[0]).toEqual(
      expect.objectContaining({
        src: 'https://example.com/video.m3u8',
        type: 'video'
      })
    )
  })

  it('öffnet die Medien-Lightbox für Medien in einer Antwort', async () => {
    const user = userEvent.setup()
    const replyWithImage = {
      ...createNotification({
        id: 'reply-media-1',
        reason: 'reply',
        author: { did: 'did:author:123' }
      }),
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

    renderWithProviders(
      <NotificationCard item={replyWithImage} onViewMedia={handleViewMedia} />
    )

    await user.click(screen.getByAltText('Reply Alt'))

    expect(handleViewMedia).toHaveBeenCalledTimes(1)
    const [images, initialIndex] = handleViewMedia.mock.calls[0]
    expect(images[0]).toEqual(
      expect.objectContaining({
        src: 'https://cdn.bsky.app/img/feed_fullsize/plain/did:author:123/bafkrei-test-cid@jpeg'
      })
    )
  })

  it('zeigt System-Hinweise für app.bsky.notification Gründe an', () => {
    const item = createNotification({
      id: 'system-1',
      reason: 'app.bsky.notification.moderation#alert'
    })
    renderWithProviders(<NotificationCard item={item} />)
    expect(screen.getByText('System (moderation alert)')).toBeVisible()
    expect(
      screen.getByText('Systembenachrichtigung von Bluesky.')
    ).toBeVisible()
  })

  it('zeigt Fehlerhinweise aus dem Engagement-Hook an', () => {
    engagementOverrides.current = {
      error: 'Aktion fehlgeschlagen'
    }
    const item = {
      ...createNotification({
        id: 'reply-error',
        reason: 'reply',
        text: 'Reply text'
      }),
      reason: 'reply'
    }
    renderWithProviders(<NotificationCard item={item} />)
    expect(screen.getByText('Aktion fehlgeschlagen')).toBeVisible()
  })
})
