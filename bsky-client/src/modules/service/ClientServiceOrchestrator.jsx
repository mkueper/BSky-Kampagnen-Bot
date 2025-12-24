import { useAppDispatch } from '../../context/AppContext.jsx'
import { useChatPolling } from '../../hooks/useChatPolling.js'
import { useListPolling } from '../../hooks/useListPolling.js'
import { useNotificationPolling } from '../../hooks/useNotificationPolling.js'

export function ClientServiceOrchestrator ({ shouldRunChatPolling }) {
  const dispatch = useAppDispatch()
  useListPolling()
  useNotificationPolling()
  useChatPolling(dispatch, shouldRunChatPolling)
  return null
}
