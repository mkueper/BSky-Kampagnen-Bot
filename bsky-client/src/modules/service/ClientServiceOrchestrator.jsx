import { useAppDispatch, useAppState } from '../../context/AppContext.jsx'
import { useChatPolling } from '../../hooks/useChatPolling.js'
import { useListPolling } from '../../hooks/useListPolling.js'
import { useNotificationPolling } from '../../hooks/useNotificationPolling.js'

function TimelineService ({ active }) {
  useListPolling(active)
  return null
}

function NotificationService ({ active }) {
  useNotificationPolling(active)
  return null
}

function ChatService ({ active, shouldRunChatPolling }) {
  const dispatch = useAppDispatch()
  useChatPolling(dispatch, Boolean(active && shouldRunChatPolling))
  return null
}

export function ClientServiceOrchestrator ({ shouldRunChatPolling }) {
  const { section } = useAppState()
  return (
    <>
      <TimelineService active={section === 'home'} />
      <NotificationService active={section === 'notifications'} />
      <ChatService active={section === 'chat'} shouldRunChatPolling={shouldRunChatPolling} />
    </>
  )
}
