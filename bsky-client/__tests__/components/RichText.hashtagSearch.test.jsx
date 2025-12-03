import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Testgruppe: RichText.hashtagSearch.test.jsx
 *
 * Diese Tests überprüfen:
 * - Hashtag-Menüaktionen, die OPEN_HASHTAG_SEARCH im AppContext dispatchen
 * - Varianten „Hashtag-Posts“ und „Hashtag-Posts des Nutzers“
 * - Deaktiviertes Hashtag-Menü (disableHashtagMenu)
 *
 * Kontext:
 * Ergänzt die Hashtag-Search-Context-Tests um UI-Verhalten
 * (vgl. usefull-tests.md, Abschnitt 7).
 */

const mockDispatch = vi.fn()

vi.mock('../../src/context/AppContext', () => ({
  useAppDispatch: () => mockDispatch
}))

vi.mock('@bsky-kampagnen-bot/shared-ui', () => {
  const InlineMenu = ({ children }) => <div data-inline-menu>{children}</div>
  const InlineMenuTrigger = ({ children }) => <div>{children}</div>
  const InlineMenuContent = ({ children }) => <div>{children}</div>
  const InlineMenuItem = ({ children, onSelect, disabled = false }) => (
    <button type='button' disabled={disabled} onClick={onSelect}>
      {children}
    </button>
  )
  return { InlineMenu, InlineMenuTrigger, InlineMenuContent, InlineMenuItem }
})

import RichText from '../../src/modules/shared/RichText.jsx'

describe('RichText – Hashtag Search Integration', () => {
  beforeEach(() => {
    mockDispatch.mockReset()
  })

  it('dispatcht OPEN_HASHTAG_SEARCH für „Hashtag-Posts ansehen“', async () => {
    const user = userEvent.setup()

    render(<RichText text='Hello #Bluesky' />)

    const button = await screen.findByRole('button', {
      name: '#Bluesky-Posts ansehen'
    })
    await user.click(button)

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [action] = mockDispatch.mock.calls[0]
    expect(action.type).toBe('OPEN_HASHTAG_SEARCH')
    expect(action.payload).toEqual({
      query: '#Bluesky',
      label: '#Bluesky',
      description: '',
      tab: 'top'
    })
  })

  it('dispatcht OPEN_HASHTAG_SEARCH für „Hashtag-Posts des Nutzers ansehen“ mit author-Kontext', async () => {
    const user = userEvent.setup()

    render(
      <RichText
        text='Hello #Bluesky'
        hashtagContext={{ authorHandle: '@alice' }}
      />
    )

    const button = await screen.findByRole('button', {
      name: '#Bluesky-Posts des Nutzers ansehen'
    })
    await user.click(button)

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [action] = mockDispatch.mock.calls[0]
    expect(action.type).toBe('OPEN_HASHTAG_SEARCH')
    expect(action.payload).toEqual({
      query: 'from:alice #Bluesky',
      label: '#Bluesky',
      description: '@alice',
      tab: 'top'
    })
  })

  it('ruft bei disableHashtagMenu keinen OPEN_HASHTAG_SEARCH-Dispatch aus', async () => {
    const user = userEvent.setup()

    render(<RichText text='Hello #Bluesky' disableHashtagMenu />)

    const hashtagSpan = screen.getByText('#Bluesky')
    await user.click(hashtagSpan)

    expect(mockDispatch).not.toHaveBeenCalled()
  })
})

