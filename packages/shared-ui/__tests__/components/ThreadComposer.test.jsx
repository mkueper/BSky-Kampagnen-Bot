import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ThreadComposer from '../../src/components/ThreadComposer.jsx'

vi.mock('@kampagnen-bot/media-pickers', () => ({
  GifPicker: ({ open, onPick }) => (open ? <button data-testid='gif-pick' onClick={() => onPick({ id: 'g1', downloadUrl: 'https://example/g1.gif' })}>pick</button> : null),
  EmojiPicker: () => null
}))

describe('ThreadComposer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows error message when picked GIF exceeds max size', async () => {
    // mock fetch to return a large blob (>8MB default)
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob([new Uint8Array(9 * 1024 * 1024)], { type: 'image/gif' }))
    })

    const { getByText, queryByTestId } = render(<ThreadComposer value={'Hello'} onChange={() => {}} gifPickerEnabled />)

    const gifButton = getByText('GIF')
    fireEvent.click(gifButton)

    const pick = queryByTestId('gif-pick')
    expect(pick).toBeTruthy()
    fireEvent.click(pick)

    await waitFor(() => {
      expect(getByText(/GIF too large/i)).toBeInTheDocument()
    })
  })
})
