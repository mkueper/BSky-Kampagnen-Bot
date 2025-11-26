import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { Card, Button } from '@bsky-kampagnen-bot/shared-ui'
import { Timeline, ThreadView } from './modules/timeline/index.js'
import NotificationCardSkeleton from './modules/notifications/NotificationCardSkeleton.jsx'
import SavedFeed from './modules/bookmarks/SavedFeed.jsx'
import BlockListView from './modules/settings/BlockListView.jsx'
import ProfileViewerPane from './modules/profile/ProfileViewerPane.jsx'
import HashtagSearchPane from './modules/search/HashtagSearchPane.jsx'
import { SearchProvider } from './modules/search/SearchContext.jsx'
import SearchHeader from './modules/search/SearchHeader.jsx'

const STATIC_TIMELINE_TABS = [
  { id: 'discover', label: 'Discover', type: 'official', value: 'discover', origin: 'official' },
  { id: 'following', label: 'Following', type: 'timeline', value: 'following', origin: 'official' },
  { id: 'friends-popular', label: 'Popular with Friends', type: 'feed', value: 'friends-popular', feedUri: null, origin: 'official' },
  { id: 'mutuals', label: 'Mutuals', type: 'feed', value: 'mutuals', feedUri: null, origin: 'official' },
  { id: 'best-of-follows', label: 'Best of Follows', type: 'feed', value: 'best-of-follows', feedUri: null, origin: 'official' }
]

const SECTION_ROUTE_MAP = {
  home: '/',
  search: '/search',
  notifications: '/notifications',
  saved: '/saved',
  blocks: '/blocks',
  settings: '/settings',
  lists: '/lists',
  feeds: '/feeds',
  chat: '/chat'
}

const ROUTE_SECTION_MAP = Object.entries(SECTION_ROUTE_MAP).reduce((acc, [sectionId, path]) => {
  acc[path] = sectionId
  return acc
}, {})

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
    me,
    profileViewer,
    hashtagSearch
  } = useAppState()
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const previousSectionRef = useRef(section)
  const pushSectionRoute = useCallback((nextSection) => {
    const targetPath = SECTION_ROUTE_MAP[nextSection] || '/'
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: false })
    }
  }, [location.pathname, navigate])
  const sectionRef = useRef(section)

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
    sectionRef.current = section
  }, [section])

  useEffect(() => {
    const normalizedPath = location.pathname || '/'
    const nextSection = ROUTE_SECTION_MAP[normalizedPath] || 'home'
    if (nextSection !== sectionRef.current) {
      dispatch({ type: 'SET_SECTION', payload: nextSection })
    }
  }, [location.pathname, dispatch])

  useEffect(() => {
    refreshFeedPicker({ force: true })
  }, [refreshFeedPicker])

  useEffect(() => {
    if (section === 'notifications' && previousSectionRef.current !== 'notifications') {
      refreshNotifications()
    }
    previousSectionRef.current = section
  }, [section, refreshNotifications])

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

  const threadActions = threadState.active ? (
    <>
      <Button
        variant='secondary'
        size='pill'
        disabled={!threadState.isAuthorThread}
        onClick={() => threadState.isAuthorThread ? dispatch({ type: 'OPEN_THREAD_UNROLL' }) : null}
      >
        Unroll
      </Button>
      <Button variant='secondary' size='pill' onClick={() => reloadThread()} disabled={threadState.loading}>
        Aktualisieren
      </Button>
    </>
  ) : null

  const baseHeaderContent = useMemo(() => {
    if (threadState.active) {
      return (
        <ThreadHeader
          onClose={() => closeThread({ force: true })}
          actions={threadActions}
        />
      )
    }

    if (section === 'home') {
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
          <p className='text-base font-semibold text-foreground'>Persönliche Blockliste</p>
        </div>
      )
    }
    if (section === 'saved') {
      return (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-base font-semibold text-foreground'>Gespeicherte Beiträge</p>
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
    if (id === 'notifications' && section === 'notifications') {
      refreshNotifications()
    }
    if (id === 'home') {
      if (threadState.active) closeThread({ force: true })
      else if (section === 'home') refreshTimeline()
      dispatch({ type: 'SET_SECTION', payload: 'home' })
      pushSectionRoute('home')
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
    pushSectionRoute(id)
  }, [closeFeedMenu, closeThread, dispatch, onNavigateDashboard, refreshFeedPicker, refreshNotifications, refreshTimeline, section, threadState.active, me, pushSectionRoute])

  const scrollTopForceVisible = section === 'home' && timelineHasNew

  const handleScrollTopActivate = useCallback(() => {
    if (section !== 'home') return
    if (timelineHasNew) {
      scrollTimelineToTop()
      refreshTimeline()
    }
  }, [section, timelineHasNew, scrollTimelineToTop, refreshTimeline])

  const threadPane = threadState.active ? <ThreadView /> : null
  const profilePane = profileViewer?.open ? <ProfileViewerPane /> : null
  const hashtagPane = hashtagSearch?.open ? <HashtagSearchPane /> : null
  const detailPane = threadPane || profilePane || hashtagPane
  const detailPaneActive = Boolean(
    (threadState.active && threadPane) ||
    (profileViewer?.open && profilePane) ||
    (hashtagSearch?.open && hashtagPane)
  )

  const isSearchSection = section === 'search'
  if (isSearchSection) {
    return (
      <>
        <SearchProvider>
          <BskyClientLayout
            activeSection={section}
            notificationsUnread={notificationsUnread}
            onSelectSection={handleSelectSection}
            onOpenCompose={openComposer}
            headerContent={<SearchHeader />}
            topBlock={topBlock}
            scrollTopForceVisible={scrollTopForceVisible}
            onScrollTopActivate={handleScrollTopActivate}
            detailPane={detailPane}
            detailPaneActive={detailPaneActive}
          >
            <div className='space-y-6'>
              <Suspense fallback={<SectionFallback label='Suche' />}>
                <SearchViewLazy />
              </Suspense>
            </div>
          </BskyClientLayout>
        </SearchProvider>
        <Modals />
      </>
    )
  }

  return (
    <>
      <BskyClientLayout
        activeSection={section}
        notificationsUnread={notificationsUnread}
        onSelectSection={handleSelectSection}
        onOpenCompose={openComposer}
        headerContent={baseHeaderContent}
        topBlock={topBlock}
        scrollTopForceVisible={scrollTopForceVisible}
        onScrollTopActivate={handleScrollTopActivate}
        detailPane={detailPane}
        detailPaneActive={detailPaneActive}
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
  const { section } = useAppState()
  const dispatch = useAppDispatch()

  const { clientConfig } = useClientConfig()
  const refreshTimeline = useCallback(() => dispatch({ type: 'REFRESH_TIMELINE' }), [dispatch])

  if (section === 'home') {
    return (
      <div className='space-y-6'>
        <Timeline isActive />
      </div>
    )
  }

  if (section === 'notifications') {
    return (
      <div className='space-y-6'>
        <Suspense fallback={<NotificationsFallback />}>
          <NotificationsLazy activeTab={notificationTab} manualRefreshTick={notificationTabRefreshKey} />
        </Suspense>
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
          <ProfileViewLazy showHeroBackButton={false} />
        </Suspense>
      </div>
    )
  }

  if (section === 'saved') {
    return (
      <div className='space-y-6'>
        <SavedFeed isActive={section === 'saved'} />
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
