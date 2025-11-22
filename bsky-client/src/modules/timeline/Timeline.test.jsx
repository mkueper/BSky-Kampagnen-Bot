import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Timeline from './Timeline.jsx'
import { AppProvider } from '../../context/AppContext.jsx'

const renderWithProviders = (ui, options) => {
  return render(ui, {
    wrapper: AppProvider,
    ...options
  })
}

const fetchTimelineMock = vi.fn()

vi.mock('../shared', () => ({
  fetchTimeline: (...args) => fetchTimelineMock(...args)
}))

vi.mock('./SkeetItem.jsx', () => ({
  default: ({ item }) => <div data-testid='skeet-item'>{item?.uri || 'item'}</div>
}))

describe('Timeline', () => {
  beforeEach(() => {
    fetchTimelineMock.mockReset()
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: { did: 'did:example:me' } })
    })
  })

  it('renders skeleton placeholders while the first page loads', () => {
    fetchTimelineMock.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<Timeline />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders items once data arrives', async () => {
    fetchTimelineMock.mockResolvedValue({
      items: [{ uri: 'at://example/post1' }],
      cursor: null
    })

    renderWithProviders(<Timeline />)

    await waitFor(() => {
      expect(screen.getByTestId('skeet-item')).toHaveTextContent('at://example/post1')
    })
  })
})
