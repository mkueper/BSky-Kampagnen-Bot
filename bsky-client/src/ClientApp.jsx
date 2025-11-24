import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useAppState, useAppDispatch } from './context/AppContext'
import { useThread } from './hooks/useThread'
import { useMediaLightbox } from './hooks/useMediaLightbox'
import { useComposer } from './hooks/useComposer'
import { useFeedPicker } from './hooks/useFeedPicker'
import { useClientConfig } from './hooks/useClientConfig'
import { useTimelineAutoRefresh } from './hooks/useTimelineAutoRefresh'
import { useNotificationPolling } from './hooks/useNotificationPolling'
import { BskyClientLayout } from './modules/layout/index.js'
import { Modals } from './modules/layout/Modals.jsx'
import { TimelineHeader, ThreadHeader } from './modules/layout/HeaderContent.jsx'
import { Card } from '@bsky-kampagnen-bot/shared-ui'
import { Timeline, ThreadView } from './modules/timeline/index.js'
import NotificationCardSkeleton from './modules/notifications/NotificationCardSkeleton.jsx'
import SavedFeed from './modules/bookmarks/SavedFeed.jsx'
import BlockListView from './modules/settings/BlockListView.jsx'

const STATIC_TIMELINE_TABS = [
  { id: 'discover', label: 'Discover', type: 'official', value: 'discover', origin: 'official' },
  { id: 'following', label: 'Following', type: 'timeline', value: 'following', origin: 'official' },
  { id: 'friends-popular', label: 'Popular with Friends', type: 'feed', value: 'friends-popular', feedUri: null, origin: 'official' },
  { id: 'mutuals', label: 'Mutuals', type: 'feed', value: 'mutuals', feedUri: null, origin: 'official' },
  { id: 'best-of-follows', label: 'Best of Follows', type: 'feed', value: 'best-of-follows', feedUri: null, origin: 'official' }
]

const SearchViewLazy = lazy(async () => {
  const module = await import('./modules/search/index.js')
  return { default: module.SearchView ?? module.default }
})
const NotificationsLazy = lazy(async () => {
  const module = await import('./modules/notifications/index.js')
  return { default: module.Notifications ?? module.default }
})
const SettingsViewLazy = lazy(async () => {
  const module = await import('./modules/settings/index.js')
  return { default: module.SettingsView ?? module.default }
})
const ProfileViewLazy = lazy(async () => {
  const module = await import('./modules/profile/ProfileView')
  return { default: module.ProfileView ?? module.default }
})
const SectionFallback = () => null

const NotificationsFallback = () => (
  <div className='space-y-3' data-component='BskyNotifications' data-state='loading'>
    <NotificationCardSkeleton />
    <NotificationCardSkeleton />
    <NotificationCardSkeleton />
    <NotificationCardSkeleton />
  </div>
)

export default function BskyClientApp ({ onNavigateDashboard }) {
  const {
    section,
    timelineTab,
    timelineSource,
    refreshTick,
    notificationsRefreshTick,
    timelineTopUri,
    notificationsUnread,
    timelineHasNew,
    me
  } = useAppState()
  const dispatch = useAppDispatch()

  const { threadState, closeThread, selectThreadFromItem, reloadThread } = useThread()
  const { openMediaPreview } = useMediaLightbox()
  const { openComposer, openReplyComposer, openQuoteComposer } = useComposer()
  const {
    feedPicker,
    refreshFeeds: refreshFeedPicker,
    openFeedManager
  } = useFeedPicker()
  const [feedMenuOpen, setFeedMenuOpen] = useState(false)
  const { clientConfig } = useClientConfig()

  const timelineSourceFeedUri = timelineSource?.feedUri || null
  const timelineSourceId = timelineSource?.id || timelineTab
  const timelineQueryParams = useMemo(() => {
    if (timelineSourceFeedUri && timelineSource?.origin === 'pinned') {
      return { feedUri: timelineSourceFeedUri }
    }
    return { tab: timelineSourceId }
  }, [timelineSourceFeedUri, timelineSourceId, timelineSource?.origin])

  useTimelineAutoRefresh(section, timelineTopUri, timelineQueryParams, dispatch)
  useNotificationPolling(dispatch)

  const officialTabs = STATIC_TIMELINE_TABS

  const pinnedTabs = useMemo(() => {
    return (feedPicker?.pinned || [])
      .filter((entry) => entry.type === 'feed')
      .map((entry) => ({
        id: entry.id,
        label: entry.displayName || entry.feedUri || 'Feed',
        feedUri: entry.feedUri || entry.value,
        value: entry.feedUri || entry.value,
        type: 'feed',
        pinned: true,
        origin: 'pinned'
      }))
  }, [feedPicker?.pinned])

  const timelineTabs = officialTabs

  const toggleFeedMenu = useCallback(() => {
    setFeedMenuOpen((prev) => !prev)
  }, [])

  const closeFeedMenu = useCallback(() => setFeedMenuOpen(false), [])

  const getScrollContainer = useCallback(
    () => (typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null),
    []
  )

  const refreshTimeline = useCallback(() => dispatch({ type: 'REFRESH_TIMELINE' }), [dispatch])
  const refreshNotifications = useCallback(() => dispatch({ type: 'REFRESH_NOTIFICATIONS' }), [dispatch])

  useEffect(() => {
    refreshFeedPicker({ force: true })
  }, [refreshFeedPicker])

  const handleTimelineTabSelect = useCallback((tabInfo) => {
    if (!tabInfo) return
    const nextSource = tabInfo.feedUri && tabInfo.origin === 'pinned'
      ? { id: tabInfo.id, kind: 'feed', label: tabInfo.label, feedUri: tabInfo.feedUri, origin: 'pinned' }
      : { id: tabInfo.value || tabInfo.id, kind: tabInfo.type || 'official', label: tabInfo.label, feedUri: null, origin: tabInfo.origin || 'official' }
    const sameSource =
      timelineSource?.id === nextSource.id &&
      (timelineSource?.feedUri || null) === (nextSource.feedUri || null)

    if (threadState.active) closeThread({ force: true })
    if (sameSource) {
      refreshTimeline()
      return
    }
    dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: false })
    dispatch({ type: 'SET_TIMELINE_TOP_URI', payload: '' })
    dispatch({ type: 'SET_TIMELINE_SOURCE', payload: nextSource })
    closeFeedMenu()
  }, [threadState.active, closeThread, timelineSource, refreshTimeline, dispatch, closeFeedMenu])

  const scrollTimelineToTop = useCallback(() => {
    const el = getScrollContainer()
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      if (el.scrollTop < 120) {
        dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: false })
      }
      el.scrollTop = 0
    }
  }, [getScrollContainer, dispatch])

  const [notificationTab, setNotificationTab] = useState('all')
  const [notificationTabRefreshKey, setNotificationTabRefreshKey] = useState(0)

  const handleNotificationTabSelect = useCallback((tabId) => {
    setNotificationTab((prev) => {
      if (prev === tabId) {
        setNotificationTabRefreshKey((tick) => tick + 1)
        return prev
      }
      return tabId
    })
  }, [])

  const headerContent = useMemo(() => {
    if (section === 'home') {
      if (threadState.active) {
        return (
          <ThreadHeader
            onClose={() => closeThread({ force: true })}
          />
        )
      }
      return (
        <TimelineHeader
          timelineTab={timelineSource?.id || timelineTab}
          tabs={timelineTabs}
          onSelectTab={handleTimelineTabSelect}
          pinnedTabs={pinnedTabs}
          feedMenuOpen={feedMenuOpen}
          onToggleFeedMenu={toggleFeedMenu}
          onCloseFeedMenu={closeFeedMenu}
        />
      )
    }
    if (section === 'notifications') {
      if (threadState.active) {
        return (
          <ThreadHeader
            onClose={() => closeThread({ force: true })}
          />
        )
      }
      return (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-base font-semibold text-foreground'>Mitteilungen</p>
          <div className='flex items-center gap-2'>
            {['all', 'mentions'].map((tab) => (
              <button
                key={tab}
                type='button'
                onClick={() => handleNotificationTabSelect(tab)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  notificationTab === tab
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-foreground hover:border-foreground/40'
                }`}
              >
                {tab === 'all' ? 'Alle' : 'Erwähnungen'}
              </button>
            ))}
          </div>
        </div>
      )
    }
    if (section === 'blocks') {
      return (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-base font-semibold text-foreground'>Blockliste</p>
        </div>
      )
    }
    return null
  }, [
    section,
    threadState.active,
    threadState.loading,
    timelineSource,
    timelineTab,
    timelineTabs,
    handleTimelineTabSelect,
    reloadThread,
    closeThread,
    pinnedTabs,
    feedMenuOpen,
    toggleFeedMenu,
    closeFeedMenu,
    closeThread,
    notificationsUnread,
    notificationTab,
    handleNotificationTabSelect
  ])

  const topBlock = null

  useEffect(() => {
    dispatch({ type: 'SET_TIMELINE_READY', payload: false })
  }, [timelineTab, dispatch])

  const handleSelectSection = useCallback((id, actor = null) => {
    if (id === 'dashboard') {
      if (typeof onNavigateDashboard === 'function') {
        onNavigateDashboard()
      }
      return
    }
    if (id === 'feeds') {
      closeFeedMenu()
      openFeedManager()
      refreshFeedPicker({ force: true })
      return
    }
    if (id === 'notifications') {
      refreshNotifications()
    }
    if (id === 'home') {
      if (threadState.active) closeThread({ force: true })
      else if (section === 'home') refreshTimeline()
      dispatch({ type: 'SET_SECTION', payload: 'home' })
      return
    }
    if (id === 'profile') {
      const targetActor = actor || me?.did || me?.handle || null
      if (targetActor) {
        dispatch({ type: 'OPEN_PROFILE_VIEWER', actor: targetActor })
        return
      }
    }
    if (threadState.active) closeThread({ force: true })
    dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: false })
    dispatch({ type: 'SET_SECTION', payload: id, actor })
  }, [closeFeedMenu, closeThread, dispatch, onNavigateDashboard, refreshFeedPicker, refreshNotifications, refreshTimeline, section, threadState.active, me])

  const scrollTopForceVisible = section === 'home' && timelineHasNew

  const handleScrollTopActivate = useCallback(() => {
    if (section !== 'home') return
    if (timelineHasNew) {
      scrollTimelineToTop()
      refreshTimeline()
    }
  }, [section, timelineHasNew, scrollTimelineToTop, refreshTimeline])

  return (
    <>
      <BskyClientLayout
        activeSection={section}
        notificationsUnread={notificationsUnread}
        onSelectSection={handleSelectSection}
        onOpenCompose={openComposer}
        headerContent={headerContent}
        topBlock={topBlock}
        scrollTopForceVisible={scrollTopForceVisible}
        onScrollTopActivate={handleScrollTopActivate}
      >
        <MainContent
          notificationTab={notificationTab}
          notificationTabRefreshKey={notificationTabRefreshKey}
        />
      </BskyClientLayout>
      <Modals />
    </>
  )
}

function MainContent ({ notificationTab, notificationTabRefreshKey }) {
  const {
    section,
    threadState
  } = useAppState()
  const dispatch = useAppDispatch()

  const { clientConfig } = useClientConfig()
  const refreshTimeline = useCallback(() => dispatch({ type: 'REFRESH_TIMELINE' }), [dispatch])

  if (section === 'home') {
    return (
      <div className='space-y-6'>
        <div aria-hidden={threadState.active} style={{ display: threadState.active ? 'none' : 'block' }}>
          <Timeline isActive={section === 'home'} />
        </div>
        {threadState.active ? (
          <ThreadView />
        ) : null}
      </div>
    )
  }

  if (section === 'search') {
    return (
      <div className='space-y-6'>
        <div aria-hidden={threadState.active} style={{ display: threadState.active ? 'none' : 'block' }}>
          <Suspense fallback={<SectionFallback label='Suche' />}>
            <SearchViewLazy />
          </Suspense>
        </div>
        {threadState.active ? (
          <ThreadView />
        ) : null}
      </div>
    )
  }

  if (section === 'notifications') {
    return (
      <div className='space-y-6'>
        <div aria-hidden={threadState.active} style={{ display: threadState.active ? 'none' : 'block' }}>
          <Suspense fallback={<NotificationsFallback />}>
            <NotificationsLazy activeTab={notificationTab} manualRefreshTick={notificationTabRefreshKey} />
          </Suspense>
        </div>
        {threadState.active ? (
          <ThreadView />
        ) : null}
      </div>
    )
  }

  if (section === 'settings') {
    return (
      <Suspense fallback={<SectionFallback label='Einstellungen' />}>
        <SettingsViewLazy />
      </Suspense>
    )
  }

  if (section === 'profile') {
    return (
      <div className='space-y-6'>
        <Suspense fallback={<SectionFallback label='Profil' />}>
          <ProfileViewLazy />
        </Suspense>
        {threadState.active ? (
          <ThreadView />
        ) : null}
      </div>
    )
  }

  if (section === 'saved') {
    return (
      <div className='space-y-6'>
        <div aria-hidden={threadState.active} style={{ display: threadState.active ? 'none' : 'block' }}>
          <SavedFeed isActive={section === 'saved'} />
        </div>
        {threadState.active ? (
          <ThreadView />
        ) : null}
      </div>
    )
  }

  if (section === 'blocks') {
    return (
      <div className='space-y-6'>
        <BlockListView />
      </div>
    )
  }

  const placeholderText = {
    chat: 'Chat folgt',
    feeds: 'Feeds folgt',
    lists: 'Listen folgt'
  }[section]

  if (placeholderText) {
    return <div className='text-sm text-muted-foreground'>{placeholderText}</div>
  }

  return null
}
