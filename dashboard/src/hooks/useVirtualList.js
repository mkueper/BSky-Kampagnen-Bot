import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function buildMeasurements (itemCount, sizes, estimateSize) {
  const measurements = []
  let offset = 0
  for (let index = 0; index < itemCount; index += 1) {
    const size = sizes[index] ?? estimateSize
    const start = offset
    const end = start + size
    measurements.push({ index, start, size, end })
    offset = end
  }
  return { measurements, totalSize: offset }
}

function findNearestIndex (measurements, offset) {
  let low = 0
  let high = measurements.length - 1
  let nearest = 0
  while (low <= high) {
    const mid = (low + high) >> 1
    const item = measurements[mid]
    if (item.end === offset) {
      return mid
    }
    if (item.end < offset) {
      low = mid + 1
      nearest = mid
    } else {
      nearest = mid
      high = mid - 1
    }
  }
  return nearest
}

export function useVirtualList ({
  itemCount = 0,
  estimateSize = 320,
  overscan = 4,
  enabled = true,
  getScrollElement
} = {}) {
  const [scrollParent, setScrollParent] = useState(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [sizes, setSizes] = useState({})
  const observersRef = useRef(new Map())

  useEffect(() => {
    observersRef.current.forEach(observer => observer.disconnect())
    observersRef.current.clear()
    if (!enabled) {
      setScrollParent(null)
      return undefined
    }
    if (typeof window === 'undefined') return undefined
    let cancelled = false
    let timer = null
    const resolve = () => {
      if (cancelled) return
      if (typeof getScrollElement === 'function') {
        const el = getScrollElement()
        if (el) {
          setScrollParent(el)
          return
        }
      }
      timer = setTimeout(resolve, 100)
    }
    resolve()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, getScrollElement])

  useEffect(() => {
    if (!enabled || !scrollParent) return undefined
    const onScroll = () => {
      setScrollOffset(scrollParent.scrollTop)
    }
    onScroll()
    scrollParent.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scrollParent.removeEventListener('scroll', onScroll)
    }
  }, [enabled, scrollParent])

  useEffect(() => {
    if (!enabled || !scrollParent || typeof ResizeObserver === 'undefined') {
      if (scrollParent) {
        setViewportHeight(scrollParent.clientHeight || 0)
      }
      return undefined
    }
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setViewportHeight(entry.contentRect.height)
      }
    })
    observer.observe(scrollParent)
    setViewportHeight(scrollParent.clientHeight || 0)
    return () => observer.disconnect()
  }, [enabled, scrollParent])

  const registerSize = useCallback((index, size) => {
    setSizes(previous => {
      const nextSize = Math.max(1, Math.round(size))
      if (previous[index] === nextSize) {
        return previous
      }
      return { ...previous, [index]: nextSize }
    })
  }, [])

  useEffect(() => {
    return () => {
      observersRef.current.forEach(observer => observer.disconnect())
      observersRef.current.clear()
    }
  }, [])

  const measureRef = useCallback(
    index => node => {
      const existing = observersRef.current.get(index)
      if (existing) {
        existing.disconnect()
        observersRef.current.delete(index)
      }
      if (!node || !enabled || typeof ResizeObserver === 'undefined') {
        return
      }
      registerSize(index, node.getBoundingClientRect().height)
      const observer = new ResizeObserver(entries => {
        const entry = entries[0]
        if (entry) {
          registerSize(index, entry.contentRect.height)
        }
      })
      observer.observe(node)
      observersRef.current.set(index, observer)
    },
    [enabled, registerSize]
  )

  const { measurements, totalSize } = useMemo(
    () => buildMeasurements(itemCount, sizes, estimateSize),
    [itemCount, sizes, estimateSize]
  )

  const virtualItems = useMemo(() => {
    if (!enabled || measurements.length === 0) {
      return measurements
    }
    const viewportEnd = scrollOffset + viewportHeight
    const startIndex = findNearestIndex(measurements, Math.max(0, scrollOffset))
    const endIndex = findNearestIndex(
      measurements,
      Math.max(0, viewportEnd)
    )
    const from = Math.max(0, startIndex - overscan)
    const to = Math.min(measurements.length - 1, endIndex + overscan)
    return measurements.slice(from, to + 1)
  }, [enabled, measurements, overscan, scrollOffset, viewportHeight])

  return {
    isReady: enabled && Boolean(scrollParent),
    virtualItems,
    totalSize,
    measureRef
  }
}
