import { render } from '@testing-library/react'
import { ClientServiceOrchestrator } from '../../../src/modules/service/ClientServiceOrchestrator.jsx'
import { useAppDispatch, useAppState } from '../../../src/context/AppContext.jsx'
import { useUIDispatch } from '../../../src/context/UIContext.jsx'
import { useChatPolling } from '../../../src/hooks/useChatPolling.js'
import { useListPolling } from '../../../src/hooks/useListPolling.js'
import { useNotificationPolling } from '../../../src/hooks/useNotificationPolling.js'

vi.mock('../../../src/hooks/useListPolling.js', () => ({
  useListPolling: vi.fn()
}))
vi.mock('../../../src/hooks/useNotificationPolling.js', () => ({
  useNotificationPolling: vi.fn()
}))
vi.mock('../../../src/hooks/useChatPolling.js', () => ({
  useChatPolling: vi.fn()
}))
vi.mock('../../../src/context/AppContext.jsx', () => ({
  useAppState: vi.fn(),
  useAppDispatch: vi.fn()
}))
vi.mock('../../../src/context/UIContext.jsx', () => ({
  useUIDispatch: vi.fn()
}))

describe('ClientServiceOrchestrator', () => {
  const fakeDispatch = {}

  beforeEach(() => {
    vi.clearAllMocks()
    useAppDispatch.mockReturnValue(fakeDispatch)
    useUIDispatch.mockReturnValue(fakeDispatch)
  })

  it('polls timeline & badges when home is active', () => {
    useAppState.mockReturnValue({ section: 'home' })

    render(<ClientServiceOrchestrator shouldRunChatPolling={true} />)

    expect(useListPolling).toHaveBeenCalledWith(true)
    expect(useNotificationPolling).toHaveBeenCalledWith({
      active: false,
      keepBadgeFresh: true
    })
    expect(useChatPolling).toHaveBeenCalledWith(fakeDispatch, true, {
      badgeOnly: true
    })
  })

  it('keeps notification badges active even when section is inactive', () => {
    useAppState.mockReturnValue({ section: 'saved' })

    render(<ClientServiceOrchestrator shouldRunChatPolling={true} />)

    expect(useListPolling).toHaveBeenCalledWith(false)
    expect(useNotificationPolling).toHaveBeenCalledWith({
      active: false,
      keepBadgeFresh: true
    })
  })

  it('runs full notification & chat polling when corresponding section is active', () => {
    useAppState.mockReturnValue({ section: 'notifications' })

    render(<ClientServiceOrchestrator shouldRunChatPolling={true} />)

    expect(useNotificationPolling).toHaveBeenCalledWith({
      active: true,
      keepBadgeFresh: true
    })

    useAppState.mockReturnValue({ section: 'chat' })
    render(<ClientServiceOrchestrator shouldRunChatPolling={true} />)

    expect(useChatPolling).toHaveBeenCalledWith(fakeDispatch, true, {
      badgeOnly: false
    })
  })

  it('does not start chat polling when guard flag is false', () => {
    useAppState.mockReturnValue({ section: 'chat' })

    render(<ClientServiceOrchestrator shouldRunChatPolling={false} />)

    expect(useChatPolling).toHaveBeenCalledWith(fakeDispatch, false, {
      badgeOnly: false
    })
  })
})
