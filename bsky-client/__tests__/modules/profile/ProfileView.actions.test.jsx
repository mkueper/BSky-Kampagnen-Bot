import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const dispatchMock = vi.fn()

vi.mock('../../../src/context/AppContext', () => ({
  useAppState: () => ({ profileActor: null, me: null }),
  useAppDispatch: () => dispatchMock
}))
vi.mock('../../../src/context/UIContext', () => ({
  useUIState: () => ({ profileActor: null, me: null }),
  useUIDispatch: () => dispatchMock
}))
vi.mock('../../../src/modules/profile/ProfilePosts.jsx', () => ({
  __esModule: true,
  default: () => null
}))

vi.mock('../../../src/modules/shared/api/bsky', () => ({
  fetchProfile: vi.fn(),
  muteActor: vi.fn(),
  unmuteActor: vi.fn(),
  blockActor: vi.fn(),
  unblockActor: vi.fn()
}))

import ProfileView from '../../../src/modules/profile/ProfileView.jsx'
import * as api from '../../../src/modules/shared/api/bsky'
import { I18nProvider } from '../../../src/i18n/I18nProvider.jsx'

describe('Profile actions: mute & block', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    dispatchMock.mockReset()
  })

  it('shows menu items and calls mute API on confirm', async () => {
    const profile = {
      did: 'did:example:1',
      handle: 'alice',
      displayName: 'Alice',
      viewer: { muted: false, blocking: false }
    }
    api.fetchProfile.mockResolvedValue(profile)
    api.muteActor.mockResolvedValue({ ok: true })

    render(
      <I18nProvider initialLocale='de'>
        <ProfileView actor='did:example:1' />
      </I18nProvider>
    )

    // Wait for profile to load
    await screen.findByText('@alice')

    // Open menu
    const trigger = screen.getByRole('button', { name: /weitere aktionen/i })
    await userEvent.click(trigger)

    // Click mute menu item
    const muteItem = await screen.findByText(/Account stummschalten|Stummschaltung aufheben/i)
    await userEvent.click(muteItem)

    // Confirm dialog appears
    const confirm = await screen.findByRole('button', { name: /stummschalten|aufheben/i })
    await userEvent.click(confirm)

    await waitFor(() => expect(api.muteActor).toHaveBeenCalledWith('did:example:1'))
  })
})
