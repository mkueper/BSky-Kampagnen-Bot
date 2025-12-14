import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileView from 'src/modules/profile/ProfileView'
import * as api from 'src/modules/shared/api/bsky'

jest.mock('src/modules/shared/api/bsky', () => ({
  fetchProfile: jest.fn(),
  muteActor: jest.fn(),
  unmuteActor: jest.fn(),
  blockActor: jest.fn(),
  unblockActor: jest.fn()
}))

describe('Profile actions: mute & block', () => {
  beforeEach(() => {
    jest.resetAllMocks()
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

    render(<ProfileView actor='did:example:1' />)

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
