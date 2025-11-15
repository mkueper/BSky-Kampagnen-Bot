import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useAppState, useAppDispatch } from './context/AppContext'
import { useThread } from './hooks/useThread'
import { useMediaLightbox } from './hooks/useMediaLightbox'
import { useComposer } from './hooks/useComposer'
import { useFeedPicker } from './hooks/useFeedPicker'
import { BskyClientLayout } from './modules/layout/index.js'
import { Modals } from './modules/layout/Modals.jsx'
import { TimelineHeader, ThreadHeader } from './modules/layout/HeaderContent.jsx'
import { NewPostsBanner, Card } from '@bsky-kampagnen-bot/shared-ui'
import { QuickComposer } from './modules/composer'
import { fetchTimeline as fetchTimelineApi, fetchNotifications as fetchNotificationsApi } from './modules/shared/index.js'
import { Timeline, ThreadView } from './modules/timeline/index.js'

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
const SectionFallback = ({ label = 'Bereich' }) => (
  <Card background='subtle' padding='p-4' className='text-sm text-foreground-muted'>
    {label} wird geladen…
  </Card>
)

export default function BskyClientApp () {
  const {
    section,
    timelineTab,
    timelineSource,
    refreshTick,
    notificationsRefreshTick,
    timelineTopUri,
    notificationsUnread,
    timelineHasNew,
    timelineLoading
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
  const [clientConfig, setClientConfig] = useState(null)

  const timelineSourceFeedUri = timelineSource?.feedUri || null
  const timelineSourceId = timelineSource?.id || timelineTab
  const timelineQueryParams = useMemo(() => {
    if (timelineSourceFeedUri && timelineSource?.origin === 'pinned') {
      return { feedUri: timelineSourceFeedUri }
    }
    return { tab: timelineSourceId }
  }, [timelineSourceFeedUri, timelineSourceId, timelineSource?.origin])

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
  const quickComposerEnabled = clientConfig?.ui?.quickComposer?.enabled !== false

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

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch('/api/client-config')
        const data = await res.json().catch(() => ({}))
        if (!ignore && res.ok) {
          setClientConfig(data)
        }
      } catch {
        if (!ignore) {
          setClientConfig(null)
        }
      }
    })()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    if (section !== 'home') return undefined
    if (!timelineTopUri) return undefined

    let ignore = false

    const check = async () => {
      try {
        const { items } = await fetchTimelineApi({ ...timelineQueryParams, limit: 1 })
        const topUri = items?.[0]?.uri || ''
        if (!ignore && topUri && timelineTopUri && topUri !== timelineTopUri) {
          dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: true })
        }
      } catch {}
    }
    
    check()
    const id = window.setInterval(check, 45000)
    return () => {
      ignore = true
      window.clearInterval(id)
    }
  }, [section, timelineTopUri, timelineQueryParams, dispatch])

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

  const headerContent = useMemo(() => {
    if (section === 'home') {
      if (threadState.active) {
        return (
          <ThreadHeader
            busy={threadState.loading}
            onReload={reloadThread}
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
      return (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-sm text-foreground-muted'>
            Mitteilungen{notificationsUnread > 0 ? ` · ${notificationsUnread} neu` : ''}
          </p>
          <div className='flex items-center gap-2'>
            {['all', 'mentions'].map((tab) => (
              <button
                key={tab}
                type='button'
                onClick={() => setNotificationTab(tab)}
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
    notificationsUnread,
    notificationTab
  ])

  const topBlock = null

  const homeContent = (
    <div className='space-y-6'>
      {quickComposerEnabled ? (
        <QuickComposer onSent={() => refreshTimeline()} />
      ) : null}
      {timelineHasNew ? (
        <NewPostsBanner
          visible={timelineHasNew}
          busy={timelineLoading}
          onClick={() => {
            scrollTimelineToTop()
            refreshTimeline()
          }}
        />
      ) : null}
      <div aria-hidden={threadState.active} style={{ display: threadState.active ? 'none' : 'block' }}>
        <Timeline
          tab={timelineTab}
          source={timelineSource}
          refreshKey={refreshTick}
          onLoadingChange={(loading) => dispatch({ type: 'SET_TIMELINE_LOADING', payload: loading })}
          isActive={section === 'home'}
          onReply={openReplyComposer}
          onQuote={openQuoteComposer}
          onViewMedia={openMediaPreview}
          onSelectPost={selectThreadFromItem}
          onTopItemChange={(item) => {
            const nextUri = item?.uri || ''
            dispatch({ type: 'SET_TIMELINE_TOP_URI', payload: nextUri })
          }}
        />
      </div>
      {threadState.active ? (
        <ThreadView
          state={threadState}
          onReload={reloadThread}
          onReply={openReplyComposer}
          onQuote={openQuoteComposer}
          onViewMedia={openMediaPreview}
          onSelectPost={selectThreadFromItem}
        />
      ) : null}
    </div>
  )

  let secondaryContent = null
  if (section === 'search') secondaryContent = (
    <Suspense fallback={<SectionFallback label='Suche' />}>
      <SearchViewLazy
        onSelectPost={selectThreadFromItem}
        onReply={openReplyComposer}
        onQuote={openQuoteComposer}
        onViewMedia={openMediaPreview}
      />
    </Suspense>
  )
  else if (section === 'notifications') {
    secondaryContent = (
      <Suspense fallback={<SectionFallback label='Mitteilungen' />}>
        <NotificationsLazy
          refreshKey={notificationsRefreshTick}
          onSelectPost={selectThreadFromItem}
          onReply={openReplyComposer}
          onQuote={openQuoteComposer}
          onUnreadChange={(count) => dispatch({ type: 'SET_NOTIFICATIONS_UNREAD', payload: count })}
          activeTab={notificationTab}
        />
      </Suspense>
    )
  }
  else if (section === 'chat') secondaryContent = <div className='text-sm text-muted-foreground'>Chat folgt</div>
  else if (section === 'feeds') secondaryContent = <div className='text-sm text-muted-foreground'>Feeds folgt</div>
  else if (section === 'lists') secondaryContent = <div className='text-sm text-muted-foreground'>Listen folgt</div>
  else if (section === 'saved') secondaryContent = <div className='text-sm text-muted-foreground'>Gespeichert folgt</div>
  else if (section === 'profile') secondaryContent = <div className='text-sm text-muted-foreground'>Profil folgt</div>
  else if (section === 'settings') secondaryContent = <div className='text-sm text-muted-foreground'>Einstellungen folgt</div>

  useEffect(() => {
    dispatch({ type: 'SET_TIMELINE_READY', payload: false })
  }, [timelineTab, dispatch])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    let ignore = false
    let timer = null
    const checkUnread = async () => {
      try {
        const { unreadCount } = await fetchNotificationsApi({ limit: 1 })
        if (!ignore) {
          dispatch({ type: 'SET_NOTIFICATIONS_UNREAD', payload: unreadCount })
        }
      } catch {}
    }
    checkUnread()
    timer = window.setInterval(checkUnread, 60000)
    return () => {
      ignore = true
      if (timer) window.clearInterval(timer)
    }
  }, [dispatch])


  const handleSelectSection = useCallback((id) => {
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
    if (threadState.active) closeThread({ force: true })
    dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: false })
    dispatch({ type: 'SET_SECTION', payload: id })
  }, [closeFeedMenu, closeThread, dispatch, refreshNotifications, refreshTimeline, section, threadState.active])

  return (
    <>
      <BskyClientLayout
        activeSection={section}
        notificationsUnread={notificationsUnread}
        onSelectSection={handleSelectSection}
        onOpenCompose={openComposer}
        headerContent={headerContent}
        topBlock={topBlock}
      >
        <div style={{ display: section === 'home' ? 'block' : 'none' }} aria-hidden={section !== 'home'}>
          {homeContent}
        </div>
        {section === 'home' ? null : secondaryContent}
      </BskyClientLayout>
      <Modals />
    </>
  )
}
