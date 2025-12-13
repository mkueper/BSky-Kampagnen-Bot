/**
 * ListView-Quick-Reminder:
 * - Neuer Feed = neuer key + Meta in getTimelineListMeta/getNotificationListMeta.
 * - kind/label/route/supportsPolling/supportsRefresh sauber setzen.
 * - listService: data.type/mode/filter so auswerten, dass Fetch klar definiert ist.
 * - Initial-Load: Beim ersten Aktivieren (!list || !list.loaded) -> refreshListByKey(key, { scrollAfter: true }).
 * - Kein Auto-Reload beim Tab-Wechsel, nur bei Refresh/Home/LoadMore.
 * - Polling setzt nur hasNew, lädt aber nichts automatisch nach.
 * - ScrollToTop/Home: refresh + harter Scroll nach oben, wenn supportsRefresh === true.
 */

import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppState, useAppDispatch } from './context/AppContext'
import { useThread } from './hooks/useThread'
import { useComposer } from './hooks/useComposer'
import { useFeedPicker } from './hooks/useFeedPicker'
import { useListPolling } from './hooks/useListPolling'
import { useNotificationPolling } from './hooks/useNotificationPolling'
import { BskyClientLayout } from './modules/layout/index.js'
import { Modals } from './modules/layout/Modals.jsx'
import { TimelineHeader, ThreadHeader } from './modules/layout/HeaderContent.jsx'
import { Button } from '@bsky-kampagnen-bot/shared-ui'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
import { Timeline, ThreadView } from './modules/timeline/index.js'
import { useTranslation } from './i18n/I18nProvider.jsx'
import { runListRefresh } from './modules/listView/listService.js'
import NotificationCardSkeleton from './modules/notifications/NotificationCardSkeleton.jsx'
import SavedFeed from './modules/bookmarks/SavedFeed.jsx'
import BlockListView from './modules/settings/BlockListView.jsx'
import ProfileViewerPane from './modules/profile/ProfileViewerPane.jsx'
import HashtagSearchPane from './modules/search/HashtagSearchPane.jsx'
import { SearchProvider } from './modules/search/SearchContext.jsx'
import SearchHeader from './modules/search/SearchHeader.jsx'
import { useBskyAuth } from './modules/auth/AuthContext.jsx'
import LoginView from './modules/login/LoginView.jsx'

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
  const { status: authStatus } = useBskyAuth()
  if (authStatus === 'loading') {
    return null
  }
  if (authStatus === 'unauthenticated') {
    return <LoginView />
  }
  return <AuthenticatedClientApp onNavigateDashboard={onNavigateDashboard} />
}

function AuthenticatedClientApp ({ onNavigateDashboard }) {
  const {
    section,
    activeListKey,
    lists,
    notificationsUnread,
    me,
    profileViewer,
    hashtagSearch
  } = useAppState()
  const dispatch = useAppDispatch()
  const {
    logout,
    profile: authProfile,
    accounts: authAccounts,
    switchAccount,
    beginAddAccount
  } = useBskyAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const previousSectionRef = useRef(section)
  const [logoutPending, setLogoutPending] = useState(false)
  const pushSectionRoute = useCallback((nextSection) => {
    const targetPath = SECTION_ROUTE_MAP[nextSection] || '/'
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: false })
    }
  }, [location.pathname, navigate])
  const sectionRef = useRef(section)
  const activeList = activeListKey ? lists?.[activeListKey] : null
  const timelineKeyRef = useRef(activeList?.kind === 'timeline' ? activeList.key : 'discover')
  useEffect(() => {
    if (activeList?.kind === 'timeline' && activeList?.key) {
      timelineKeyRef.current = activeList.key
    }
  }, [activeList?.kind, activeList?.key])

  const { threadState, closeThread, reloadThread } = useThread()
  const { openComposer } = useComposer()
  const {
    feedPicker,
    refreshFeeds: refreshFeedPicker,
    openFeedManager
  } = useFeedPicker()
  const [feedMenuOpen, setFeedMenuOpen] = useState(false)

  useListPolling(lists, dispatch)
  useNotificationPolling(dispatch)

  const officialTabs = STATIC_TIMELINE_TABS

  const pinnedTabs = useMemo(() => {
    return (feedPicker?.pinned || [])
      .filter((entry) => entry.type === 'feed')
      .map((entry) => {
        const listState = lists?.[entry.id]
        return {
          id: entry.id,
          label: entry.displayName || entry.feedUri || 'Feed',
          feedUri: entry.feedUri || entry.value,
          value: entry.feedUri || entry.value,
          type: 'feed',
          pinned: true,
          origin: 'pinned',
          hasNew: Boolean(listState?.hasNew)
        }
      })
  }, [feedPicker?.pinned, lists])

  const timelineTabs = useMemo(() => {
    return officialTabs.map((tab) => {
      const listState = lists?.[tab.id]
      return {
        ...tab,
        hasNew: Boolean(listState?.hasNew)
      }
    })
  }, [officialTabs, lists])

  const allTimelineTabs = useMemo(() => [...timelineTabs, ...pinnedTabs], [timelineTabs, pinnedTabs])

  const findTimelineTabByKey = useCallback((key) => {
    return allTimelineTabs.find((tab) => tab?.id === key)
  }, [allTimelineTabs])

  const getTimelineListMeta = useCallback((keyOrTab) => {
    const tabInfo = typeof keyOrTab === 'string' ? findTimelineTabByKey(keyOrTab) : keyOrTab
    if (!tabInfo) return null
    return {
      key: tabInfo.id,
      kind: 'timeline',
      label: tabInfo.label,
      route: '/',
      supportsPolling: true,
      supportsRefresh: true,
      data: {
        type: 'timeline',
        tab: tabInfo.origin === 'pinned' ? null : (tabInfo.value || tabInfo.id),
        feedUri: tabInfo.feedUri || null
      }
    }
  }, [findTimelineTabByKey])

  const getNotificationListMeta = useCallback((key) => {
    const filter = key === 'notifs:mentions' ? 'mentions' : 'all'
    return {
      key,
      kind: 'notifications',
      label: filter === 'mentions' ? 'Mentions' : 'Notifications',
      route: '/notifications',
      supportsPolling: true,
      supportsRefresh: true,
      data: { type: 'notifications', filter }
    }
  }, [])

  const getScrollContainer = useCallback(
    () => (typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null),
    []
  )

  const scrollActiveListToTop = useCallback(() => {
    const el = getScrollContainer()
    if (!el) return
    el.scrollTop = 0
  }, [getScrollContainer])
  const accountProfiles = Array.isArray(authAccounts) && authAccounts.length > 0
    ? authAccounts
    : (me || authProfile)
        ? [
            {
              id: (me || authProfile).did || (me || authProfile).handle || 'active',
              displayName: (me || authProfile).displayName || '',
              handle: (me || authProfile).handle || '',
              avatar: (me || authProfile).avatar || '',
              actor: (me || authProfile).did || (me || authProfile).handle || null,
              isActive: true
            }
          ]
        : []

  const handleAddAccount = useCallback(() => {
    beginAddAccount()
  }, [beginAddAccount])

  const handleSwitchAccount = useCallback(async (account) => {
    const targetId = typeof account?.id === 'string' ? account.id : null
    if (!targetId) return
    await switchAccount(targetId)
  }, [switchAccount])

  const handleLogout = useCallback(async () => {
    if (logoutPending) return
    setLogoutPending(true)
    try {
      await logout()
    } catch (error) {
      console.warn('Logout failed', error)
    } finally {
      setLogoutPending(false)
    }
  }, [logout, logoutPending])

  const refreshListByKey = useCallback(async (key, options = {}) => {
    if (!key) return
    const isNotification = key.startsWith('notifs:')
    const meta = isNotification ? getNotificationListMeta(key) : getTimelineListMeta(key)
    if (!meta) return
    const listState = lists?.[key] || null
    try {
      const page = await runListRefresh({
        list: { ...(listState || {}), ...meta },
        dispatch,
        meta
      })
      if (page && typeof page.unreadCount === 'number') {
        dispatch({
          type: 'SET_NOTIFICATIONS_UNREAD',
          payload: Math.max(0, page.unreadCount)
        })
      }
    } catch (error) {
      console.error('Failed to refresh list', key, error)
    } finally {
      if (options.scrollAfter) {
        scrollActiveListToTop()
      }
    }
  }, [dispatch, getNotificationListMeta, getTimelineListMeta, lists, scrollActiveListToTop])

  const toggleFeedMenu = useCallback(() => {
    setFeedMenuOpen((prev) => !prev)
  }, [])

  const closeFeedMenu = useCallback(() => setFeedMenuOpen(false), [])

  const [notificationTab, setNotificationTab] = useState('all')
  const notificationListKey = notificationTab === 'mentions' ? 'notifs:mentions' : 'notifs:all'
  const timelinePaneRefreshing = Boolean(lists?.[timelineKeyRef.current]?.isRefreshing)
  const notificationPaneRefreshing = Boolean(lists?.[notificationListKey]?.isRefreshing)


  useEffect(() => {
    sectionRef.current = section
  }, [section])

  useEffect(() => {
    if (section === 'home') {
      dispatch({ type: 'SET_ACTIVE_LIST', payload: timelineKeyRef.current })
    } else if (section === 'notifications') {
      dispatch({ type: 'SET_ACTIVE_LIST', payload: notificationListKey })
    }
  }, [section, notificationListKey, dispatch])

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
      refreshListByKey(notificationListKey)
    }
    previousSectionRef.current = section
  }, [section, refreshListByKey, notificationListKey])

  const handleTimelineTabSelect = useCallback((tabInfo) => {
    if (!tabInfo) return
    const meta = getTimelineListMeta(tabInfo)
    if (!meta) return
    const nextKey = meta.key
    const existingList = lists?.[nextKey]
    if (threadState.active) closeThread({ force: true })
    closeFeedMenu()
    if (timelineKeyRef.current === nextKey) {
      refreshListByKey(nextKey, { scrollAfter: true })
      return
    }
    timelineKeyRef.current = nextKey
    dispatch({ type: 'SET_ACTIVE_LIST', payload: nextKey })
    if (section !== 'home') {
      dispatch({ type: 'SET_SECTION', payload: 'home' })
      pushSectionRoute('home')
    }
    scrollActiveListToTop()
    if (!existingList || !existingList.loaded) {
      refreshListByKey(nextKey, { scrollAfter: true })
    }
  }, [getTimelineListMeta, threadState.active, closeThread, closeFeedMenu, refreshListByKey, dispatch, section, pushSectionRoute, scrollActiveListToTop, lists])

  const handleNotificationTabSelect = useCallback((tabId) => {
    setNotificationTab((prev) => {
      if (prev === tabId) {
        const key = tabId === 'mentions' ? 'notifs:mentions' : 'notifs:all'
        refreshListByKey(key, { scrollAfter: true })
        return prev
      }
      return tabId
    })
  }, [refreshListByKey])

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
          timelineTab={timelineKeyRef.current}
          tabs={allTimelineTabs}
          onSelectTab={handleTimelineTabSelect}
          pinnedTabs={pinnedTabs}
          feedMenuOpen={feedMenuOpen}
          onToggleFeedMenu={toggleFeedMenu}
          onCloseFeedMenu={closeFeedMenu}
          isRefreshing={timelinePaneRefreshing}
        />
      )
    }
    if (section === 'notifications') {
      return (
        <div className='flex flex-wrap items-center gap-3'>
          <p className='text-base font-semibold text-foreground'>{t('layout.headers.notifications', 'Mitteilungen')}</p>
          <div className='flex flex-1 items-center justify-center'>
            <div className='inline-flex items-center gap-4'>
              {['all', 'mentions'].map((tab) => (
                <button
                  key={tab}
                  type='button'
                  onClick={() => handleNotificationTabSelect(tab)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    notificationTab === tab
                      ? 'border border-foreground bg-foreground text-background shadow-soft'
                      : 'border border-transparent bg-background-subtle text-foreground hover:border-foreground/40'
                  }`}
                >
                  <span className='inline-flex items-center gap-2'>
                    <span>
                      {tab === 'all'
                        ? t('layout.notifications.tabAll', 'Alle')
                        : t('layout.notifications.tabMentions', 'Erwähnungen')}
                    </span>
                    {tab !== notificationTab && (tab === 'mentions'
                      ? lists?.['notifs:mentions']?.hasNew
                      : lists?.['notifs:all']?.hasNew) ? (
                      <span className='h-2 w-2 rounded-full bg-primary' aria-label={t('layout.notifications.newItems', 'Neue Einträge')} />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className='flex items-center justify-end min-w-[48px]'>
            {notificationPaneRefreshing ? (
              <span className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border'>
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-foreground/40 border-t-transparent' />
              </span>
            ) : (
              <button
                type='button'
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-background-subtle'
                title={t('layout.notifications.configure', 'Filter konfigurieren')}
                aria-label={t('layout.notifications.configure', 'Filter konfigurieren')}
              >
                <MixerHorizontalIcon className='h-5 w-5' />
              </button>
            )}
          </div>
        </div>
      )
    }
    if (section === 'blocks') {
      return (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-base font-semibold text-foreground'>{t('layout.headers.blocks', 'Persönliche Blockliste')}</p>
        </div>
      )
    }
    if (section === 'saved') {
      return (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-base font-semibold text-foreground'>{t('layout.headers.saved', 'Gespeicherte Beiträge')}</p>
        </div>
      )
    }
    return null
  }, [
    section,
    threadState.active,
    threadState.loading,
    timelineTabs,
    handleTimelineTabSelect,
    reloadThread,
    closeThread,
    pinnedTabs,
    feedMenuOpen,
    toggleFeedMenu,
    closeFeedMenu,
    notificationsUnread,
    notificationTab,
    handleNotificationTabSelect,
    timelinePaneRefreshing,
    notificationPaneRefreshing,
    lists,
    t
  ])

  const topBlock = null

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
      if (threadState.active) closeThread({ force: true })
      dispatch({ type: 'SET_SECTION', payload: 'notifications' })
      pushSectionRoute('notifications')
      if (section === 'notifications') {
        refreshListByKey(notificationListKey, { scrollAfter: true })
      } else {
        refreshListByKey(notificationListKey)
      }
      return
    }
    if (id === 'home') {
      if (threadState.active) {
        closeThread({ force: true })
      }
      if (section !== 'home') {
        dispatch({ type: 'SET_SECTION', payload: 'home' })
        pushSectionRoute('home')
      }
      dispatch({ type: 'SET_ACTIVE_LIST', payload: timelineKeyRef.current })
      refreshListByKey(timelineKeyRef.current, { scrollAfter: true })
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
    dispatch({ type: 'SET_SECTION', payload: id, actor })
    pushSectionRoute(id)
  }, [closeFeedMenu, closeThread, dispatch, onNavigateDashboard, refreshFeedPicker, refreshListByKey, section, threadState.active, me, pushSectionRoute, notificationListKey])

  const scrollTopForceVisible = Boolean(activeList?.hasNew)

  const handleScrollTopActivate = useCallback(() => {
    if (!activeList?.key) {
      scrollActiveListToTop()
      return
    }
    if (activeList.supportsRefresh && activeList.hasNew) {
      refreshListByKey(activeList.key, { scrollAfter: true })
    } else {
      scrollActiveListToTop()
    }
  }, [activeList, refreshListByKey, scrollActiveListToTop])

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
            accountProfiles={accountProfiles}
            onSwitchAccount={handleSwitchAccount}
            onAddAccount={handleAddAccount}
            onLogout={handleLogout}
            logoutPending={logoutPending}
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
        accountProfiles={accountProfiles}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={handleAddAccount}
        onLogout={handleLogout}
        logoutPending={logoutPending}
      >
        <MainContent
          notificationTab={notificationTab}
          notificationListKey={notificationListKey}
          timelineListKey={timelineKeyRef.current}
        />
      </BskyClientLayout>
      <Modals />
    </>
  )
}

function MainContent ({ notificationTab, notificationListKey, timelineListKey }) {
  const { section } = useAppState()
  if (section === 'home') {
    return (
      <div className='space-y-6'>
        <Timeline listKey={timelineListKey} isActive />
      </div>
    )
  }

  if (section === 'notifications') {
    return (
      <div className='space-y-6'>
        <Suspense fallback={<NotificationsFallback />}>
          <NotificationsLazy
            listKey={notificationListKey}
            activeTab={notificationTab}
          />
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
