import { useMemo } from 'react'
import { useAppState } from '../../context/AppContext.jsx'
import { useChatPolling } from '../../hooks/useChatPolling.js'
import { useListPolling } from '../../hooks/useListPolling.js'
import { useNotificationPolling } from '../../hooks/useNotificationPolling.js'
import { useUIDispatch } from '../../context/UIContext.jsx'
import { SectionActivityProvider } from './SectionActivityContext.jsx'

function TimelineService ({ active }) {
  useListPolling(active)
  return null
}

function NotificationService ({ active }) {
  useNotificationPolling({ active, keepBadgeFresh: true })
  return null
}

function ChatService ({ active, shouldRunChatPolling }) {
  const dispatch = useUIDispatch()
  const enabled = Boolean(shouldRunChatPolling)
  useChatPolling(dispatch, enabled, { badgeOnly: enabled && !active })
  return null
}

export function ClientServiceOrchestrator ({
  children = null,
  notificationTab = 'all',
  notificationListKey = 'notifs:all',
  shouldRunChatPolling,
  timelineLanguageFilter = '',
  timelineListKey = 'discover'
}) {
  const { section } = useAppState()
  const sectionActivityValue = useMemo(() => ({
    section,
    notificationListKey,
    notificationTab,
    timelineLanguageFilter,
    timelineListKey
  }), [
    notificationListKey,
    notificationTab,
    timelineLanguageFilter,
    timelineListKey,
    section
  ])

  return (
    <SectionActivityProvider value={sectionActivityValue}>
      <TimelineService active={section === 'home'} />
      <NotificationService active={section === 'notifications'} />
      <ChatService active={section === 'chat'} shouldRunChatPolling={shouldRunChatPolling} />
      {children}
    </SectionActivityProvider>
  )
}
