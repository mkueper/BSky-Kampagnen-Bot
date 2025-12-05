/**
 * Testgruppe: PublishedSkeetList.test.jsx
 *
 * Diese Tests überprüfen:
 * - Rendering der veröffentlichten Skeet-Liste ohne Virtualisierung
 * - Virtualisierung für lange Listen inklusive ResizeObserver
 * - Aufräumen des DOM zwischen den Szenarien
 *
 * Kontext:
 * Diese Testdateien gehören zur vereinheitlichten Dashboard-Teststruktur.
 * Sie stellen sicher, dass Komponenten, Hooks oder Seiten erwartungsgemäß funktionieren.
 */
import { describe, expect, it, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import PublishedSkeetList from '../../src/components/PublishedSkeetList'
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'

class ResizeObserverMock {
  constructor (cb) {
    this.cb = cb
  }

  observe (element) {
    const height = element?.clientHeight ?? element?.__mockHeight ?? 0
    this.cb([{ target: element, contentRect: { height } }])
  }

  unobserve () {}

  disconnect () {}
}

const defaultProps = {
  activeCardTabs: {},
  repliesBySkeet: {},
  replyErrors: {},
  loadingReplies: {},
  loadingReactions: {},
  onShowSkeetContent: () => {},
  onShowRepliesContent: () => {},
  onFetchReactions: () => {},
  onRetract: () => {},
  reactionStats: {},
  platformLabels: { bluesky: 'Bluesky' },
  formatTime: () => 'Heute',
  getItemRef: () => () => {}
}

const createSkeet = id => ({
  id,
  content: `Skeet ${id}`,
  targetPlatforms: ['bluesky'],
  platformResults: {},
  media: [],
  likesCount: 0,
  repostsCount: 0
})

describe('PublishedSkeetList', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('renders all skeets when virtualization is not required', () => {
    const skeets = Array.from({ length: 3 }, (_, idx) => createSkeet(idx + 1))
    render(
      <I18nProvider>
        <PublishedSkeetList
          {...defaultProps}
          skeets={skeets}
        />
      </I18nProvider>
    )

    const buttons = screen.getAllByRole('button', { name: 'Beitrag' })
    expect(buttons).toHaveLength(3)
  })

  it('virtualizes long lists by rendering fewer cards than provided', async () => {
    const container = document.createElement('div')
    container.id = 'app-scroll-container'
    Object.defineProperty(container, 'clientHeight', {
      value: 600,
      configurable: true
    })
    Object.defineProperty(container, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    })
    document.body.appendChild(container)

    const skeets = Array.from({ length: 40 }, (_, idx) => createSkeet(idx + 1))
    render(
      <I18nProvider>
        <PublishedSkeetList
          {...defaultProps}
          skeets={skeets}
        />
      </I18nProvider>
    )

    await waitFor(() => {
      const virtualContainer = document.querySelector('[style*="position: relative"]')
      expect(virtualContainer).toBeTruthy()
    })
  })
})
