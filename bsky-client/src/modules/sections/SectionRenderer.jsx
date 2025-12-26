import { Suspense } from 'react'
import NotificationCardSkeleton from '../notifications/NotificationCardSkeleton.jsx'
import SavedFeed from '../bookmarks/SavedFeed.jsx'
import BlockListView from '../settings/BlockListView.jsx'
import {
  ChatListViewLazy,
  NotificationsLazy,
  TimelineLazy,
  ProfileViewLazy,
  SettingsViewLazy
} from './lazySections.jsx'
import { useSectionActivity } from '../service/SectionActivityContext.jsx'

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

export function SectionRenderer () {
  const {
    section,
    notificationTab,
    notificationListKey,
    timelineLanguageFilter,
    timelineListKey
  } = useSectionActivity()
  if (section === 'home') {
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

  const placeholderText = {
    feeds: 'Feeds folgt',
    lists: 'Listen folgt'
  }[section]

  if (placeholderText) {
    return <div className='text-sm text-muted-foreground'>{placeholderText}</div>
  }

  return null
}
