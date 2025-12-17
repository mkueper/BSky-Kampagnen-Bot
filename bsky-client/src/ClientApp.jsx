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
import { useChatPolling } from './hooks/useChatPolling'
import { BskyClientLayout } from './modules/layout/index.js'
import { Modals } from './modules/layout/Modals.jsx'
import { TimelineHeader, ThreadHeader } from './modules/layout/HeaderContent.jsx'
import { Button } from '@bsky-kampagnen-bot/shared-ui'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
import { Timeline, ThreadView } from './modules/timeline/index.js'
import { useTranslation } from './i18n/I18nProvider.jsx'
import { runListRefresh, getListItemId } from './modules/listView/listService.js'
import NotificationCardSkeleton from './modules/notifications/NotificationCardSkeleton.jsx'
import SavedFeed from './modules/bookmarks/SavedFeed.jsx'
import BlockListView from './modules/settings/BlockListView.jsx'
import ProfileViewerPane from './modules/profile/ProfileViewerPane.jsx'
import HashtagSearchPane from './modules/search/HashtagSearchPane.jsx'
import { SearchProvider } from './modules/search/SearchContext.jsx'
import SearchHeader from './modules/search/SearchHeader.jsx'
import { useBskyAuth } from './modules/auth/AuthContext.jsx'
import LoginView from './modules/login/LoginView.jsx'
import ChatHeader from './modules/chat/ChatHeader.jsx'
import ChatConversationPane from './modules/chat/ChatConversationPane.jsx'

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
const ChatListViewLazy = lazy(async () => {
  const module = await import('./modules/chat/ChatListView.jsx')
  return { default: module.default }
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
    status: authStatus,
    statusDetail: authStatusDetail,
    session: authSession,
    activeAccountId: authActiveAccountId
  } = useBskyAuth()

  const hasAuthenticatedContext = Boolean(authActiveAccountId || authSession)
  if (authStatus === 'loading' && !hasAuthenticatedContext) return null
  if (authStatus === 'unauthenticated') return <LoginView />

  return (
    <>
      <AuthenticatedClientApp onNavigateDashboard={onNavigateDashboard} />
      {(authStatus === 'loading' && authStatusDetail === 'switch-account') ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm'>
          <div className='flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-3 shadow-soft'>
            <span className='h-4 w-4 animate-spin rounded-full border-2 border-foreground/40 border-t-transparent' />
            <span className='text-sm font-medium text-foreground'>Konto wird gewechselt…</span>
          </div>
        </div>
      ) : null}
    </>
  )
}

function AuthenticatedClientApp ({ onNavigateDashboard }) {
  const {
    section,
    activeListKey,
    lists,
    notificationsUnread,
    chatUnreadCount,
    me,
    profileViewer,
    hashtagSearch,
    chatViewer
  } = useAppState()
  const dispatch = useAppDispatch()
  const {
    logout,
    profile: authProfile,
    accounts: authAccounts,
    activeAccountId,
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
  const { openComposer, openThreadComposer } = useComposer()
  const {
    feedPicker,
    refreshFeeds: refreshFeedPicker,
    openFeedManager
  } = useFeedPicker()
  const [feedMenuOpen, setFeedMenuOpen] = useState(false)

  useListPolling(lists, dispatch)
  useNotificationPolling(lists, dispatch)
  useChatPolling(dispatch)

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

  const scrollPositionsRef = useRef(new Map())
  const scrollKeyRef = useRef(null)
  const skipScrollRestoreRef = useRef(false)
  const TIMELINE_ITEM_ESTIMATE = 220
  const NOTIFICATION_ITEM_ESTIMATE = 180
  const SCROLL_TOP_THRESHOLD = 1

  const escapeSelectorValue = useCallback((value) => {
    if (!value) return ''
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value)
    }
    return value.replace(/["\\#.:]/g, '\\$&')
  }, [])

  const extractListKey = useCallback((key) => {
    if (!key) return ''
    const separatorIndex = key.indexOf(':')
    if (separatorIndex === -1) return ''
    return key.slice(separatorIndex + 1)
  }, [])

  const estimateAnchorId = useCallback((listState, scrollValue) => {
    if (!listState || !Array.isArray(listState.items) || listState.items.length === 0) return null
    const estimate = listState.kind === 'notifications' ? NOTIFICATION_ITEM_ESTIMATE : TIMELINE_ITEM_ESTIMATE
    if (!estimate || estimate <= 0) {
      const firstItem = listState.items[0]
      return firstItem ? getListItemId(firstItem) || null : null
    }
    const rawIndex = Math.floor((scrollValue || 0) / estimate)
    const clampedIndex = Math.max(0, Math.min(listState.items.length - 1, rawIndex))
    const anchorItem = listState.items[clampedIndex]
    return anchorItem ? getListItemId(anchorItem) || null : null
  }, [])

  const getVisibleAnchor = useCallback((container) => {
    if (!container) return null
    const firstItem = container.querySelector('[data-list-item-id]')
    if (!firstItem) return null
    const anchorId = firstItem.getAttribute('data-list-item-id')
    if (!anchorId) return null
    const containerRect = container.getBoundingClientRect()
    const itemRect = firstItem.getBoundingClientRect()
    const offset = itemRect.top - containerRect.top
    return { anchorId, offset }
  }, [])

  const saveScrollPosition = useCallback((key, scrollValue, options = {}) => {
    if (!key) return
    const listKey = extractListKey(key)
    const listState = listKey ? lists?.[listKey] : null
    const normalizedScroll = typeof scrollValue === 'number' && scrollValue > SCROLL_TOP_THRESHOLD ? scrollValue : 0
    let anchorId = null
    let anchorOffset = 0
    if (normalizedScroll > 0) {
      const domAnchor = options?.container ? getVisibleAnchor(options.container) : null
      if (domAnchor?.anchorId) {
        anchorId = domAnchor.anchorId
        anchorOffset = typeof domAnchor.offset === 'number' ? domAnchor.offset : 0
      } else {
        anchorId = estimateAnchorId(listState, normalizedScroll)
      }
    }
    scrollPositionsRef.current.set(key, {
      top: normalizedScroll,
      anchorId: anchorId || null,
      anchorOffset,
      savedAt: Date.now()
    })
  }, [SCROLL_TOP_THRESHOLD, estimateAnchorId, extractListKey, getVisibleAnchor, lists])

  const restoreAnchorIfNeeded = useCallback((container, entry) => {
    if (!container || !entry?.anchorId) return
    const targetOffset = typeof entry.anchorOffset === 'number' ? entry.anchorOffset : 0
    requestAnimationFrame(() => {
      const selector = `[data-list-item-id="${escapeSelectorValue(entry.anchorId)}"]`
      const target = container.querySelector(selector)
      if (!target) return
      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const desiredTop = containerRect.top + targetOffset
      const delta = targetRect.top - desiredTop
      container.scrollTop += delta
    })
  }, [escapeSelectorValue])

  const scrollActiveListToTop = useCallback(() => {
    const scheduleScroll = () => {
      const container = getScrollContainer()
      if (!container) return
      container.scrollTop = 0
      // Zweiter Frame gleicht Layout-Korrekturen nach dem ersten Render aus.
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          const followUpContainer = getScrollContainer()
          if (!followUpContainer) return
          followUpContainer.scrollTop = 0
        })
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(scheduleScroll)
    } else {
      scheduleScroll()
    }
  }, [getScrollContainer])

  useEffect(() => {
    const el = getScrollContainer()
    if (!el) return

    const activeKey = `${section}:${activeList?.key || ''}`
    const previousKey = scrollKeyRef.current
    if (previousKey && previousKey !== activeKey) {
      saveScrollPosition(previousKey, el.scrollTop || 0, { container: el })
    }
    scrollKeyRef.current = activeKey

    if (skipScrollRestoreRef.current) {
      skipScrollRestoreRef.current = false
      return
    }

    const savedEntry = scrollPositionsRef.current.get(activeKey)
    const savedTop = typeof savedEntry === 'object' && savedEntry !== null
      ? savedEntry.top
      : typeof savedEntry === 'number'
        ? savedEntry
        : null
    if (typeof savedTop !== 'number') return

    const restore = () => {
      const container = getScrollContainer()
      if (!container) return
      container.scrollTop = savedTop
      if (savedEntry && typeof savedEntry === 'object' && savedTop > SCROLL_TOP_THRESHOLD) {
        restoreAnchorIfNeeded(container, savedEntry)
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(restore)
    } else {
      restore()
    }
  }, [SCROLL_TOP_THRESHOLD, activeList?.key, getScrollContainer, restoreAnchorIfNeeded, saveScrollPosition, section])
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

  const handleOpenClientSettings = useCallback(() => {
    dispatch({ type: 'SET_CLIENT_SETTINGS_OPEN', payload: true })
  }, [dispatch])

  const captureVisibleAnchor = useCallback(() => {
    const container = getScrollContainer()
    if (!container) return null
    if (container.scrollTop <= SCROLL_TOP_THRESHOLD) return null
    const anchor = getVisibleAnchor(container)
    if (!anchor?.anchorId) return null
    return { ...anchor, savedAt: Date.now() }
  }, [SCROLL_TOP_THRESHOLD, getScrollContainer, getVisibleAnchor])

  const refreshListByKey = useCallback(async (key, options = {}) => {
    if (!key) return
    const isNotification = key.startsWith('notifs:')
    const meta = isNotification ? getNotificationListMeta(key) : getTimelineListMeta(key)
    if (!meta) return
    const listState = lists?.[key] || null
    const shouldPreserveVisible = !options.scrollAfter && activeList?.key === key && section === (isNotification ? 'notifications' : 'home')
    const preservedAnchorEntry = shouldPreserveVisible ? captureVisibleAnchor() : null
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
      } else if (preservedAnchorEntry) {
        const container = getScrollContainer()
        if (container) {
          restoreAnchorIfNeeded(container, preservedAnchorEntry)
        }
      }
    }
  }, [
    activeList?.key,
    captureVisibleAnchor,
    dispatch,
    getNotificationListMeta,
    getTimelineListMeta,
    getScrollContainer,
    lists,
    restoreAnchorIfNeeded,
    scrollActiveListToTop,
    section
  ])

  const toggleFeedMenu = useCallback(() => {
    setFeedMenuOpen((prev) => !prev)
  }, [])

  const closeFeedMenu = useCallback(() => setFeedMenuOpen(false), [])

  const previousAccountIdRef = useRef(activeAccountId)
  useEffect(() => {
    const prevId = previousAccountIdRef.current
    if (!activeAccountId || prevId === activeAccountId) return
    previousAccountIdRef.current = activeAccountId

    closeFeedMenu()
    if (threadState.active) {
      closeThread({ force: true })
    }
    scrollPositionsRef.current.clear()
    skipScrollRestoreRef.current = true
    dispatch({ type: 'RESET_LISTS' })

    timelineKeyRef.current = 'discover'
    dispatch({ type: 'SET_ACTIVE_LIST', payload: 'discover' })
    dispatch({ type: 'SET_SECTION', payload: 'home' })
    pushSectionRoute('home')

    refreshListByKey('discover', { scrollAfter: true })
  }, [
    activeAccountId,
    closeFeedMenu,
    closeThread,
    dispatch,
    pushSectionRoute,
    refreshListByKey,
    threadState.active
  ])

  const [notificationTab, setNotificationTab] = useState('all')
  const notificationListKey = notificationTab === 'mentions' ? 'notifs:mentions' : 'notifs:all'
  const timelineList = lists?.[timelineKeyRef.current] || null
  const timelinePaneRefreshing = Boolean(timelineList?.isRefreshing)
  const notificationList = lists?.[notificationListKey] || null
  const notificationPaneRefreshing = Boolean(notificationList?.isRefreshing)


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
    const previousSection = previousSectionRef.current
    if (
      section === 'notifications' &&
      previousSection !== 'notifications'
    ) {
      if (!notificationList || !notificationList.loaded) {
        refreshListByKey(notificationListKey)
      }
    }
    if (
      section === 'home' &&
      previousSection !== 'home'
    ) {
      if (!timelineList || !timelineList.loaded) {
        refreshListByKey(timelineKeyRef.current, { scrollAfter: true })
      }
    }
    previousSectionRef.current = section
  }, [section, refreshListByKey, notificationListKey, notificationList, timelineList])

  const buildCompositeListKey = useCallback((sectionName, listKeyValue) => {
    return `${sectionName || ''}:${listKeyValue || ''}`
  }, [])
  const clearSavedScrollPosition = useCallback((sectionName, listKeyValue) => {
    const key = buildCompositeListKey(sectionName, listKeyValue)
    if (key && scrollPositionsRef.current.has(key)) {
      scrollPositionsRef.current.delete(key)
    }
  }, [buildCompositeListKey])

  const restoreSavedEntry = useCallback((entry) => {
    if (!entry) return false
    const applyPosition = () => {
      const container = getScrollContainer()
      if (!container) return false
      container.scrollTop = entry.top || 0
      if (entry.anchorId) {
        restoreAnchorIfNeeded(container, entry)
      }
      return true
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        requestAnimationFrame(applyPosition)
      })
      return true
    }
    return applyPosition()
  }, [getScrollContainer, restoreAnchorIfNeeded])

  const applySavedScrollPosition = useCallback((sectionName, listKeyValue) => {
    const key = buildCompositeListKey(sectionName, listKeyValue)
    if (!key) return false
    const savedEntry = scrollPositionsRef.current.get(key)
    if (!savedEntry) return false
    return restoreSavedEntry(savedEntry)
  }, [buildCompositeListKey, restoreSavedEntry])

  const handleTimelineTabSelect = useCallback((tabInfo) => {
    if (!tabInfo) return
    const meta = getTimelineListMeta(tabInfo)
    if (!meta) return
    const nextKey = meta.key
    const existingList = lists?.[nextKey]
    const compositeKey = buildCompositeListKey('home', nextKey)
    const hasSavedPosition = scrollPositionsRef.current.has(compositeKey)
    if (threadState.active) closeThread({ force: true })
    closeFeedMenu()
    if (timelineKeyRef.current === nextKey) {
      skipScrollRestoreRef.current = true
      refreshListByKey(nextKey, { scrollAfter: true })
      return
    }
    timelineKeyRef.current = nextKey
    dispatch({ type: 'SET_ACTIVE_LIST', payload: nextKey })
    if (section !== 'home') {
      dispatch({ type: 'SET_SECTION', payload: 'home' })
      pushSectionRoute('home')
    }
    if (!hasSavedPosition) {
      skipScrollRestoreRef.current = true
      scrollActiveListToTop()
    } else {
      applySavedScrollPosition('home', nextKey)
      skipScrollRestoreRef.current = false
    }
    if (!existingList || !existingList.loaded) {
      refreshListByKey(nextKey, { scrollAfter: !hasSavedPosition })
    }
  }, [getTimelineListMeta, lists, buildCompositeListKey, threadState.active, closeThread, closeFeedMenu, refreshListByKey, dispatch, section, pushSectionRoute, scrollActiveListToTop, applySavedScrollPosition])

  const handleNotificationTabSelect = useCallback((tabId) => {
    setNotificationTab((prev) => {
      if (prev === tabId) {
        const key = tabId === 'mentions' ? 'notifs:mentions' : 'notifs:all'
        skipScrollRestoreRef.current = true
        clearSavedScrollPosition('notifications', key)
        refreshListByKey(key, { scrollAfter: true })
        return prev
      }
      const key = tabId === 'mentions' ? 'notifs:mentions' : 'notifs:all'
      const restored = applySavedScrollPosition('notifications', key)
      skipScrollRestoreRef.current = !restored
      return tabId
    })
  }, [refreshListByKey, clearSavedScrollPosition, applySavedScrollPosition])
  const handleStartNewChat = useCallback(() => {
    console.info('Neuer Chat wird später implementiert.')
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
          <div className='flex flex-1 items-center'>
            <div className='inline-flex items-center'>
              {['all', 'mentions'].map((tab) => (
                <button
                  key={tab}
                  type='button'
                  onClick={() => handleNotificationTabSelect(tab)}
                  className={`mr-2 rounded-2xl px-3 py-1 text-xs font-medium whitespace-nowrap sm:text-sm transform transition-all duration-150 ease-out ${
                    notificationTab === tab
                      ? 'border border-border bg-background-subtle text-foreground shadow-soft'
                      : 'text-foreground-muted hover:bg-background-subtle/80 dark:hover:bg-primary/10 hover:text-foreground hover:shadow-lg hover:scale-[1.02]'
                  }`}
                >
                  <span className='inline-flex items-center gap-2'>
                    <span>
                      {tab === 'all'
                        ? t('layout.notifications.tabAll', 'Alle')
                        : t('layout.notifications.tabMentions', 'Erwähnungen')}
                    </span>
                    {(tab === 'mentions'
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
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm' 
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
    if (section === 'chat') {
      return <ChatHeader onStartNewChat={handleStartNewChat} />
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
    t,
    handleStartNewChat
  ])

  const topBlock = null

  const handleSelectSection = useCallback((id, actor = null) => {
    if (chatViewer?.open) {
      dispatch({ type: 'CLOSE_CHAT_VIEWER' })
    }
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
        skipScrollRestoreRef.current = true
        clearSavedScrollPosition('notifications', notificationListKey)
        refreshListByKey(notificationListKey, { scrollAfter: true })
      } else if (!notificationList || !notificationList.loaded) {
        refreshListByKey(notificationListKey)
      } else {
        applySavedScrollPosition('notifications', notificationListKey)
        skipScrollRestoreRef.current = false
      }
      return
    }
    if (id === 'home') {
      if (threadState.active) {
        closeThread({ force: true })
      }
      const listLoaded = Boolean(timelineList?.loaded)
      if (section !== 'home') {
        dispatch({ type: 'SET_SECTION', payload: 'home' })
        pushSectionRoute('home')
        if (!listLoaded) {
          refreshListByKey(timelineKeyRef.current, { scrollAfter: true })
        } else {
          applySavedScrollPosition('home', timelineKeyRef.current)
          skipScrollRestoreRef.current = false
        }
        return
      }
      dispatch({ type: 'SET_ACTIVE_LIST', payload: timelineKeyRef.current })
      skipScrollRestoreRef.current = true
      clearSavedScrollPosition('home', timelineKeyRef.current)
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
  }, [chatViewer?.open, clearSavedScrollPosition, closeFeedMenu, closeThread, dispatch, onNavigateDashboard, refreshFeedPicker, refreshListByKey, section, threadState.active, me, pushSectionRoute, notificationListKey, notificationList, timelineList])

  const scrollTopForceVisible = Boolean(activeList?.hasNew)

  const handleScrollTopActivate = useCallback(() => {
    if (!activeList?.key) {
      skipScrollRestoreRef.current = true
      scrollActiveListToTop()
      return
    }
    if (activeList.supportsRefresh && activeList.hasNew) {
      skipScrollRestoreRef.current = true
      refreshListByKey(activeList.key, { scrollAfter: true })
    } else {
      skipScrollRestoreRef.current = true
      scrollActiveListToTop()
    }
  }, [activeList, refreshListByKey, scrollActiveListToTop])

  const threadPane = threadState.active ? <ThreadView /> : null
  const profilePane = profileViewer?.open ? <ProfileViewerPane /> : null
  const hashtagPane = hashtagSearch?.open ? <HashtagSearchPane /> : null
  const chatPane = chatViewer?.open ? <ChatConversationPane /> : null
  const detailPane = threadPane || profilePane || hashtagPane || chatPane
  const chatPaneActive = Boolean(chatPane)
  const detailPaneActive = Boolean(
    (threadState.active && threadPane) ||
    (profileViewer?.open && profilePane) ||
    (hashtagSearch?.open && hashtagPane) ||
    (chatPaneActive)
  )
  const navInteractionsLocked = detailPaneActive && !chatPaneActive

  const isSearchSection = section === 'search'
  if (isSearchSection) {
    return (
      <>
        <SearchProvider>
          <BskyClientLayout
            activeSection={section}
            notificationsUnread={notificationsUnread}
            chatUnread={chatUnreadCount}
            onSelectSection={handleSelectSection}
            onOpenCompose={openComposer}
            onOpenComposeThread={openThreadComposer}
            headerContent={<SearchHeader />}
            topBlock={topBlock}
           scrollTopForceVisible={scrollTopForceVisible}
           onScrollTopActivate={handleScrollTopActivate}
           detailPane={detailPane}
           detailPaneActive={detailPaneActive}
           navInteractionsLocked={navInteractionsLocked}
            accountProfiles={accountProfiles}
            onSwitchAccount={handleSwitchAccount}
            onAddAccount={handleAddAccount}
            onLogout={handleLogout}
            logoutPending={logoutPending}
            onOpenClientSettings={handleOpenClientSettings}
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
        chatUnread={chatUnreadCount}
        onSelectSection={handleSelectSection}
        onOpenCompose={openComposer}
        onOpenComposeThread={openThreadComposer}
        headerContent={baseHeaderContent}
        topBlock={topBlock}
        scrollTopForceVisible={scrollTopForceVisible}
        onScrollTopActivate={handleScrollTopActivate}
       detailPane={detailPane}
       detailPaneActive={detailPaneActive}
       navInteractionsLocked={navInteractionsLocked}
        accountProfiles={accountProfiles}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={handleAddAccount}
        onLogout={handleLogout}
        logoutPending={logoutPending}
        onOpenClientSettings={handleOpenClientSettings}
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

  if (section === 'chat') {
    return (
      <div className='space-y-6'>
        <Suspense fallback={<SectionFallback label='Chats' />}>
          <ChatListViewLazy />
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
    feeds: 'Feeds folgt',
    lists: 'Listen folgt'
  }[section]

  if (placeholderText) {
    return <div className='text-sm text-muted-foreground'>{placeholderText}</div>
  }

  return null
}
