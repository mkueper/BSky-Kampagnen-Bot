import { describe, it, beforeAll, afterEach, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVirtualList } from '../useVirtualList'

class ResizeObserverMock {
  constructor (callback) {
    this.callback = callback
    this.elements = new Set()
  }

  observe (element) {
    this.elements.add(element)
    const height = element?.clientHeight ?? element?.__mockHeight ?? 0
    this.callback([{ target: element, contentRect: { height } }])
  }

  unobserve (element) {
    this.elements.delete(element)
  }

  disconnect () {
    this.elements.clear()
  }
}

describe('useVirtualList', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns fallback state when disabled', () => {
    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 5,
        enabled: false,
        estimateSize: 100,
        getScrollElement: () => null
      })
    )

    expect(result.current.isReady).toBe(false)
    expect(result.current.virtualItems).toHaveLength(5)
  })

  it('computes virtual items using scroll container and measurements', async () => {
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

    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 50,
        estimateSize: 150,
        overscan: 2,
        enabled: true,
        getScrollElement: () => container
      })
    )

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    const node = document.createElement('div')
    node.__mockHeight = 180
    node.getBoundingClientRect = () => ({ height: 180 })

    act(() => {
      result.current.measureRef(0)(node)
      result.current.measureRef(1)(node)
    })

    expect(result.current.virtualItems.length).toBeGreaterThan(0)
    expect(result.current.virtualItems.some(item => item.index === 0)).toBe(
      true
    )
    expect(result.current.totalSize).toBeGreaterThan(0)
  })

  it('resets readiness when disabled after initialization', async () => {
    const container = document.createElement('div')
    container.id = 'app-scroll-container'
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true
    })
    Object.defineProperty(container, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    })
    document.body.appendChild(container)

    const { result, rerender } = renderHook(
      props =>
        useVirtualList({
          itemCount: 10,
          estimateSize: 120,
          overscan: 1,
          getScrollElement: () => container,
          ...props
        }),
      {
        initialProps: { enabled: true }
      }
    )

    await waitFor(() => expect(result.current.isReady).toBe(true))

    rerender({ enabled: false })

    expect(result.current.isReady).toBe(false)
  })
})
