import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Timeline from './Timeline.jsx'

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
  })

  it('renders skeleton placeholders while the first page loads', () => {
    fetchTimelineMock.mockReturnValue(new Promise(() => {}))
    render(<Timeline />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders items once data arrives', async () => {
    fetchTimelineMock.mockResolvedValue({
      items: [{ uri: 'at://example/post1' }],
      cursor: null
    })

    render(<Timeline />)

    await waitFor(() => {
      expect(screen.getByTestId('skeet-item')).toHaveTextContent('at://example/post1')
    })
  })
})
