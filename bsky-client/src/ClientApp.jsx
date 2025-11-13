import { useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import { useAppState, useAppDispatch } from './context/AppContext'
import { useThread } from './hooks/useThread'
import { useMediaLightbox } from './hooks/useMediaLightbox'
import { useComposer } from './hooks/useComposer'
import { BskyClientLayout } from './modules/layout/index.js'
import { TimelineHeader, ThreadHeader } from './modules/layout/HeaderContent.jsx'
import { Button, fetchTimeline as fetchTimelineApi, fetchNotifications as fetchNotificationsApi } from './modules/shared/index.js'
import { Timeline } from './modules/timeline/index.js'

const SearchViewLazy = lazy(async () => {
  const module = await import('./modules/search/index.js')
  return { default: module.SearchView ?? module.default }
})
const NotificationsLazy = lazy(async () => {
  const module = await import('./modules/notifications/index.js')
  return { default: module.Notifications ?? module.default }
})
const ThreadViewLazy = lazy(async () => {
  const module = await import('./modules/timeline/ThreadView.jsx')
  return { default: module.default }
})
const ModalsLazy = lazy(async () => {
  const module = await import('./modules/layout/Modals.jsx')
  return { default: module.default }
})

const SectionFallback = ({ label = 'Bereich' }) => (
  <div className='rounded-2xl border border-border bg-background-subtle p-4 text-sm text-foreground-muted'>
    {label} wird geladen…
  </div>
)

export default function BskyClientApp () {
  const {
    section,
    timelineTab,
    refreshTick,
    notificationsRefreshTick,
    timelineTopUri,
    notificationsUnread
  } = useAppState()
  const dispatch = useAppDispatch()

  const { threadState, closeThread, selectThreadFromItem, reloadThread } = useThread()
  const { openMediaPreview } = useMediaLightbox()
  const { openComposer, openReplyComposer, openQuoteComposer } = useComposer()

  const getScrollContainer = useCallback(
    () => (typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null),
    []
  )

  const refreshTimeline = useCallback(() => dispatch({ type: 'REFRESH_TIMELINE' }), [dispatch])
  const refreshNotifications = useCallback(() => dispatch({ type: 'REFRESH_NOTIFICATIONS' }), [dispatch])

  useEffect(() => {
    if (section !== 'home') return undefined
    if (!timelineTopUri) return undefined

    let ignore = false

    const check = async () => {
      try {
        const { items } = await fetchTimelineApi({ tab: timelineTab, limit: 1 })
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
  }, [section, timelineTab, timelineTopUri, dispatch])

  const handleTimelineTabSelect = useCallback((tabId) => {
    if (threadState.active) closeThread({ force: true })
    if (timelineTab === tabId) {
      refreshTimeline()
      return
    }
    dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: false })
    dispatch({ type: 'SET_TIMELINE_TOP_URI', payload: '' })
    dispatch({ type: 'SET_TIMELINE_TAB', payload: tabId })
  }, [threadState.active, closeThread, timelineTab, refreshTimeline, dispatch])

  const scrollTimelineToTop = useCallback(() => {
    const el = getScrollContainer()
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      el.scrollTop = 0
    }
  }, [getScrollContainer])

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
          timelineTab={timelineTab}
          onSelectTab={handleTimelineTabSelect}
        />
      )
    }
    if (section === 'notifications') {
      return (
        <div className='flex items-center justify-between gap-3'>
          <p className='text-sm text-foreground-muted'>
            Mitteilungen{notificationsUnread > 0 ? ` · ${notificationsUnread} neu` : ''}
          </p>
        </div>
      )
    }
    return null
  }, [
    section,
    threadState.active,
    threadState.loading,
    timelineTab,
    handleTimelineTabSelect,
    reloadThread,
    closeThread,
    refreshNotifications,
    notificationsUnread
  ])

  const topBlock = null

  const threadPanel = threadState.active ? (
    <Suspense fallback={<SectionFallback label='Thread' />}>
      <ThreadViewLazy
        state={threadState}
        onReload={reloadThread}
        onReply={openReplyComposer}
        onQuote={openQuoteComposer}
        onViewMedia={openMediaPreview}
        onSelectPost={selectThreadFromItem}
      />
    </Suspense>
  ) : null

  const homeContent = (
    <div className='space-y-6'>
      <div aria-hidden={threadState.active} style={{ display: threadState.active ? 'none' : 'block' }}>
        <Timeline
          tab={timelineTab}
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
      {threadPanel}
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


  return (
    <>
      <BskyClientLayout
        activeSection={section}
        notificationsUnread={notificationsUnread}
        onSelectSection={(id) => {
          if (id === 'home') {
            if (threadState.active) closeThread({ force: true })
            else if (section === 'home') refreshTimeline()
            dispatch({ type: 'SET_SECTION', payload: 'home' })
            return
          }
          if (threadState.active) closeThread({ force: true })
          dispatch({ type: 'SET_TIMELINE_HAS_NEW', payload: false })
          dispatch({ type: 'SET_SECTION', payload: id })
        }}
        onOpenCompose={openComposer}
        headerContent={headerContent}
        topBlock={topBlock}
      >
        <div style={{ display: section === 'home' ? 'block' : 'none' }} aria-hidden={section !== 'home'}>
          {homeContent}
        </div>
        {section === 'home' ? null : secondaryContent}
      </BskyClientLayout>
      <Suspense fallback={null}>
        <ModalsLazy />
      </Suspense>
    </>
  )
}
