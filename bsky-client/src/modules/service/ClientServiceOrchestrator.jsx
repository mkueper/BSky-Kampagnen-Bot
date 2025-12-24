import { useAppDispatch, useAppState } from '../../context/AppContext.jsx'
import { useChatPolling } from '../../hooks/useChatPolling.js'
import { useListPolling } from '../../hooks/useListPolling.js'
import { useNotificationPolling } from '../../hooks/useNotificationPolling.js'

export function ClientServiceOrchestrator ({ shouldRunChatPolling }) {
  const dispatch = useAppDispatch()
  const { section } = useAppState()
  const shouldPollListSection = section === 'home'
  const shouldPollNotificationSection = section === 'notifications'
  useListPolling(shouldPollListSection)
  useNotificationPolling(shouldPollNotificationSection)
  const shouldPollChat = Boolean(shouldRunChatPolling && section === 'chat')
  useChatPolling(dispatch, shouldPollChat)
  return null
}
