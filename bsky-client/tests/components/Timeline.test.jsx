import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/**
 * Testgruppe: Timeline.test.jsx
 *
 * Diese Tests überprüfen:
 * - Rendering des Timeline-Feed mit Skeletons
 * - Anzeige von Items nach erfolgreichem Fetch
 * - Integration mit AppContext & I18nProvider
 *
 * Kontext:
 * Teil der vereinheitlichten Teststruktur des bsky-client.
 * Stellt sicher, dass Komponenten, Hooks, Contexts und Flows stabil funktionieren.
 */
import { SWRConfig } from 'swr'
import Timeline from '../../src/modules/timeline/Timeline.jsx'
import { AppProvider } from '../../src/context/AppContext.jsx'
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'

const renderWithProviders = (ui, options) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }}>
        <I18nProvider initialLocale='de'>
          <AppProvider>{children}</AppProvider>
        </I18nProvider>
      </SWRConfig>
    ),
    ...options
  })
}

const fetchTimelineMock = vi.fn()

vi.mock('../../src/modules/shared', () => ({
  fetchTimeline: (...args) => fetchTimelineMock(...args)
}))

vi.mock('../../src/modules/timeline/SkeetItem.jsx', () => ({
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

  it('renders skeleton placeholders while the first page loads', async () => {
    fetchTimelineMock.mockReturnValue(new Promise(() => {}))
    await act(async () => {
      renderWithProviders(<Timeline />)
    })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders items once data arrives', async () => {
    fetchTimelineMock.mockResolvedValue({
      items: [{ uri: 'at://example/post1' }],
      cursor: null
    })

    await act(async () => {
      renderWithProviders(<Timeline />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('skeet-item')).toHaveTextContent('at://example/post1')
    })
  })
})
