import { Suspense, useEffect, useRef, useState } from 'react'
import NotificationCardSkeleton from '../notifications/NotificationCardSkeleton.jsx'
import SavedFeed from '../bookmarks/SavedFeed.jsx'
import BlockListView from '../settings/BlockListView.jsx'
import FeedManager from '../layout/FeedManager.jsx'
import { Button } from '../shared/index.js'
import {
  ChatListViewLazy,
  NotificationsLazy,
  TimelineLazy,
  ProfileViewLazy,
  SettingsViewLazy
} from './lazySections.jsx'
import { useSectionActivity } from '../service/SectionActivityContext.jsx'
import { useFeedPicker } from '../../hooks/useFeedPicker.js'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { LayersIcon, ChevronRightIcon, ListBulletIcon, ClockIcon, MagnifyingGlassIcon, PinLeftIcon } from '@radix-ui/react-icons'

const NotificationsFallback = () => (
  <div className='space-y-3' data-component='BskyNotifications' data-state='loading'>
    <NotificationCardSkeleton />
    <NotificationCardSkeleton />
    <NotificationCardSkeleton />
    <NotificationCardSkeleton />
  </div>
)

const SectionFallback = ({ label }) => (
  <div className='text-sm text-muted-foreground'>{label}</div>
)

function TimelineSection ({ listKey, languageFilter }) {
  return (
    <div className='space-y-6'>
      <Suspense fallback={<SectionFallback label='Timeline lädt…' />}>
        <TimelineLazy listKey={listKey} isActive languageFilter={languageFilter} />
      </Suspense>
    </div>
  )
}

function NotificationsSection ({ listKey, activeTab }) {
  return (
    <div className='space-y-6'>
      <Suspense fallback={<NotificationsFallback />}>
        <NotificationsLazy
          listKey={listKey}
          activeTab={activeTab}
        />
      </Suspense>
    </div>
  )
}

function ChatSection () {
  return (
    <div className='space-y-6'>
      <Suspense fallback={<SectionFallback label='Chats' />}>
        <ChatListViewLazy />
      </Suspense>
    </div>
  )
}

function SettingsSection () {
  return (
    <Suspense fallback={<SectionFallback label='Einstellungen' />}>
      <SettingsViewLazy />
    </Suspense>
  )
}

function ProfileSection () {
  return (
    <div className='space-y-6'>
      <Suspense fallback={<SectionFallback label='Profil' />}>
        <ProfileViewLazy showHeroBackButton={false} />
      </Suspense>
    </div>
  )
}

function FeedsSection () {
  const { t } = useTranslation()
  const {
    feedPicker,
    feedManagerOpen,
    refreshFeeds,
    pinFeed,
    unpinFeed,
    reorderPinnedFeeds,
    loadMoreDiscover,
    closeFeedManager
  } = useFeedPicker()
  const [activeTab, setActiveTab] = useState('mine')

  useEffect(() => {
    refreshFeeds({ force: true, loadDiscover: true })
  }, [refreshFeeds])

  const tabs = [
    { id: 'mine', label: t('layout.feeds.tabMine', 'Meine Feeds') },
    { id: 'discover', label: t('layout.feeds.tabDiscover', 'Entdecke neue Feeds') }
  ]

  const pinnedFeeds = Array.isArray(feedPicker?.pinned) ? feedPicker.pinned : []
  const savedFeeds = Array.isArray(feedPicker?.saved) ? feedPicker.saved : []
  const customFeeds = [...pinnedFeeds, ...savedFeeds]
    .filter((entry) => entry && (entry.feedUri || entry.value))
    .filter((entry, index, arr) => {
      const key = entry.feedUri || entry.value
      return arr.findIndex((other) => (other.feedUri || other.value) === key) === index
    })

  const feedRows = customFeeds
    .filter((feed) => !['error', 'not-found'].includes(feed?.status))
    .map((feed) => ({
      id: feed.id || feed.feedUri || feed.value,
      label: feed.displayName || feed.feedUri || feed.value || t('layout.feeds.feedFallback', 'Feed'),
      avatar: feed.avatar || null,
      status: feed.status || null,
      type: feed.type || 'feed',
      value: feed.value || ''
    }))

  const allRows = feedRows

  const handleFeedRowClick = () => {}
  const [discoverQuery, setDiscoverQuery] = useState('')
  const resolveFeedIcon = (feed) => {
    if (feed.type === 'timeline') {
      return feed.value === 'latest' ? ClockIcon : ListBulletIcon
    }
    if (feed.type === 'list') return ListBulletIcon
    const label = String(feed.label || '').toLowerCase()
    if (label.includes('latest')) return ClockIcon
    if (label.includes('following')) return ListBulletIcon
    return LayersIcon
  }
  const discoverFeeds = Array.isArray(feedPicker?.discover) ? feedPicker.discover : []
  const discoverHasMore = Boolean(feedPicker?.discoverHasMore)
  const discoverLoadingMore = Boolean(feedPicker?.discoverLoadingMore)
  const discoverSentinelRef = useRef(null)
  const pinnedFeedUris = new Set(
    (Array.isArray(feedPicker?.pinned) ? feedPicker.pinned : [])
      .map((entry) => entry?.feedUri || entry?.value)
      .filter(Boolean)
  )
  const normalizedQuery = discoverQuery.trim().toLowerCase()
  const visibleDiscoverFeeds = discoverFeeds.filter((feed) => {
    const feedUri = feed?.feedUri || feed?.value || ''
    if (feedUri && pinnedFeedUris.has(feedUri)) return false
    if (!normalizedQuery) return true
    const label = String(feed?.displayName || feed?.label || '').toLowerCase()
    const description = String(feed?.description || '').toLowerCase()
    const creator = String(feed?.creator?.handle || '').toLowerCase()
    return label.includes(normalizedQuery)
      || description.includes(normalizedQuery)
      || creator.includes(normalizedQuery)
  })

  useEffect(() => {
    if (activeTab !== 'discover') return
    const sentinel = discoverSentinelRef.current
    if (!sentinel || !discoverHasMore || discoverLoadingMore) return
    // Discover lädt weitere Vorschläge per Infinite Scroll nach.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMoreDiscover?.()
      }
    }, { rootMargin: '200px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeTab, discoverHasMore, discoverLoadingMore, loadMoreDiscover])

  return (
    <div className='space-y-6'>
      <div className='rounded-2xl border border-border bg-background-elevated/70 px-3 py-2 shadow-soft'>
        <div className='flex flex-wrap items-center gap-2'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`rounded-2xl px-3 py-1 text-xs font-medium whitespace-nowrap sm:text-sm transform transition-all duration-150 ease-out ${
                activeTab === tab.id
                  ? 'border border-border bg-background-subtle text-foreground shadow-soft'
                  : 'text-foreground-muted hover:bg-background-subtle/80 dark:hover:bg-primary/10 hover:text-foreground hover:shadow-lg hover:scale-[1.02]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={feedManagerOpen ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]' : ''}>
        <div className='space-y-6'>
          {activeTab === 'mine' ? (
            <div className='space-y-4'>
              <div className='flex items-center gap-4 rounded-3xl border border-border bg-background p-4 shadow-soft'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
                  <LayersIcon className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-base font-semibold text-foreground'>
                    {t('layout.feeds.mineTitle', 'Meine Feeds')}
                  </p>
                  <p className='text-sm text-foreground-muted'>
                    {t('layout.feeds.mineDescription', 'Alle deine gespeicherten Feeds an einem Ort.')}
                  </p>
                </div>
              </div>
              <div className='overflow-hidden rounded-3xl border border-border bg-background shadow-soft'>
                {allRows.map((feed, idx) => (
                  <button
                    key={feed.id || idx}
                    type='button'
                    onClick={handleFeedRowClick}
                    className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition ${
                      idx === allRows.length - 1 ? '' : 'border-b border-border'
                    } hover:bg-background-subtle/70`}
                  >
                    <div className='flex items-center gap-3'>
                      {feed.avatar ? (
                        <img
                          src={feed.avatar}
                          alt=''
                          className='h-9 w-9 rounded-lg border border-border object-cover'
                        />
                      ) : (
                        <div className='flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background-subtle text-primary'>
                          {(() => {
                            const Icon = resolveFeedIcon(feed)
                            return <Icon className='h-4 w-4' />
                          })()}
                        </div>
                      )}
                      <span className={`text-sm font-semibold ${feed.status === 'error' ? 'text-amber-700' : 'text-foreground'}`}>
                        {feed.status === 'error'
                          ? t('layout.feeds.feedErrorLabel', 'Feed nicht geladen')
                          : feed.label}
                      </span>
                    </div>
                    <ChevronRightIcon className='h-5 w-5 text-foreground-muted' aria-hidden='true' />
                  </button>
                ))}
                {allRows.length === 0 ? (
                  <p className='px-4 py-6 text-sm text-foreground-muted'>
                    {t('layout.feeds.mineEmpty', 'Noch keine Feeds vorhanden.')}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-center gap-4 rounded-3xl border border-border bg-background p-4 shadow-soft'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
                  <MagnifyingGlassIcon className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-base font-semibold text-foreground'>
                    {t('layout.feeds.discoverTitle', 'Entdecke neue Feeds')}
                  </p>
                  <p className='text-sm text-foreground-muted'>
                    {t('layout.feeds.discoverDescription', 'Finde Feeds aus der Community und pinne deine Favoriten.')}
                  </p>
                </div>
              </div>
              <div className='relative'>
                <MagnifyingGlassIcon className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted' />
                <input
                  type='search'
                  value={discoverQuery}
                  onChange={(event) => setDiscoverQuery(event.target.value)}
                  placeholder={t('layout.feeds.discoverSearch', 'Feeds durchsuchen')}
                  className='h-11 w-full rounded-2xl border border-border bg-background px-11 text-sm text-foreground placeholder:text-foreground-muted shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
                />
              </div>
              <div className='overflow-hidden rounded-3xl border border-border bg-background shadow-soft'>
                {visibleDiscoverFeeds.length === 0 ? (
                  <p className='px-4 py-6 text-sm text-foreground-muted'>
                    {t('layout.feeds.discoverEmpty', 'Noch keine Empfehlungen verfügbar.')}
                  </p>
                ) : (
                  <div className='divide-y divide-border'>
                    {visibleDiscoverFeeds.map((feed) => {
                      const feedUri = feed.feedUri || feed.value || ''
                      const isPinned = Boolean(feed.pinned)
                      return (
                        <div key={feed.id || feedUri} className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
                          <div className='flex items-start gap-3'>
                            {feed.avatar ? (
                              <img
                                src={feed.avatar}
                                alt=''
                                className='h-12 w-12 rounded-xl border border-border object-cover'
                              />
                            ) : (
                              <div className='flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background-subtle text-primary'>
                                <LayersIcon className='h-5 w-5' />
                              </div>
                            )}
                            <div>
                              <p className='text-sm font-semibold text-foreground'>
                                {feed.displayName || feed.label || t('layout.feeds.feedFallback', 'Feed')}
                              </p>
                              {feed.creator?.handle ? (
                                <p className='text-xs text-foreground-muted'>
                                  {t('layout.feeds.byCreator', 'von @{handle}', { handle: feed.creator.handle })}
                                </p>
                              ) : null}
                              {feed.description ? (
                                <p className='mt-2 text-sm text-foreground-muted'>{feed.description}</p>
                              ) : null}
                              {feed.likeCount != null ? (
                                <p className='mt-2 text-xs text-foreground-muted'>
                                  {t('layout.feeds.likes', '{count} Likes', { count: feed.likeCount })}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className='flex items-center justify-end'>
                            <Button
                              type='button'
                              variant='primary'
                              size='pill'
                              disabled={!feedUri}
                              className='min-w-[160px] h-7 justify-center whitespace-nowrap'
                              onClick={() => {
                                if (!feedUri || isPinned) return
                                pinFeed?.(feedUri)
                              }}
                            >
                              {!isPinned ? <PinLeftIcon className='h-4 w-4' aria-hidden='true' /> : null}
                              {isPinned
                                ? t('layout.feeds.attached', 'Angeheftet')
                                : t('layout.feeds.attach', 'Feed anheften')}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={discoverSentinelRef} aria-hidden='true' className='h-6' />
                    {discoverLoadingMore ? (
                      <p className='px-4 py-3 text-xs text-foreground-muted'>
                        {t('common.status.autoLoading', 'Weitere Ergebnisse werden automatisch geladen…')}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {feedManagerOpen ? (
          <FeedManager
            variant='pane'
            dataComponent={null}
            open
            loading={feedPicker.loading}
            error={feedPicker.error}
            feeds={feedPicker}
            onClose={closeFeedManager}
            onRefresh={() => refreshFeeds({ force: true })}
            onPin={pinFeed}
            onUnpin={unpinFeed}
            onReorder={reorderPinnedFeeds}
          />
        ) : null}
      </div>
    </div>
  )
}

export function SectionRenderer () {
  const { t } = useTranslation()
  const { feedPicker } = useFeedPicker()
  const {
    section,
    notificationTab,
    notificationListKey,
    timelineLanguageFilter,
    timelineListKey
  } = useSectionActivity()
  const feedPickerInitializing = !feedPicker?.lastUpdatedAt
    && (feedPicker?.loading || feedPicker?.action?.refreshing)
  if (section === 'home') {
    if (feedPickerInitializing) {
      return <SectionFallback label={t('layout.timeline.pinnedLoading', 'Gepinnte Feeds werden geladen…')} />
    }
    return (
      <TimelineSection
        listKey={timelineListKey}
        languageFilter={timelineLanguageFilter}
      />
    )
  }

  if (section === 'notifications') {
    return (
      <NotificationsSection
        listKey={notificationListKey}
        activeTab={notificationTab}
      />
    )
  }

  if (section === 'chat') {
    return <ChatSection />
  }

  if (section === 'settings') {
    return <SettingsSection />
  }

  if (section === 'saved') {
    return (
      <div className='space-y-6'>
        <SavedFeed isActive={section === 'saved'} />
      </div>
    )
  }

  if (section === 'profile') {
    return <ProfileSection />
  }

  if (section === 'blocks') {
    return (
      <div className='space-y-6'>
        <BlockListView />
      </div>
    )
  }

  if (section === 'feeds') {
    return <FeedsSection />
  }

  const placeholderText = {
    lists: 'Listen folgt'
  }[section]

  if (placeholderText) {
    return <div className='text-sm text-muted-foreground'>{placeholderText}</div>
  }

  return null
}
