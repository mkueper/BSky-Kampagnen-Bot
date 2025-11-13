import { describe, expect, it, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import PublishedSkeetList from '../PublishedSkeetList'

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
    global.ResizeObserver = ResizeObserverMock
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('renders all skeets when virtualization is not required', () => {
    const skeets = Array.from({ length: 3 }, (_, idx) => createSkeet(idx + 1))
    render(
      <PublishedSkeetList
        {...defaultProps}
        skeets={skeets}
      />
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
      <PublishedSkeetList
        {...defaultProps}
        skeets={skeets}
      />
    )

    await waitFor(() => {
      const virtualContainer = document.querySelector('[style*="position: relative"]')
      expect(virtualContainer).toBeTruthy()
    })
  })
})
