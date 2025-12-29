/* global process */
import React, { useEffect, useMemo, useRef, useState } from 'react'

export function VirtualizedList ({
  items,
  renderItem,
  className,
  emptyFallback,
  virtualizationThreshold = 100,
  itemHeight,
  overscan = 3,
  getItemId,
  onEndReached,
  endReachedThreshold = 0.8,
  debugVirtualization = false,
  ...passthroughProps
}) {
  const listItems = Array.isArray(items) ? items : []
  const totalCount = listItems.length
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [hasScrollContainer, setHasScrollContainer] = useState(false)
  const { style: inlineStyle, ...restProps } = passthroughProps
  const scrollRafRef = useRef(null)
  const resizeRafRef = useRef(null)
  const endReachedTriggeredRef = useRef(false)

  const hasValidHeight = typeof itemHeight === 'number' && itemHeight > 0
  const meetsThreshold = totalCount >= virtualizationThreshold
  const shouldCheckEndReached = typeof onEndReached === 'function'
  const shouldTrackScroll = (meetsThreshold && hasValidHeight) || shouldCheckEndReached

  const updateScrollTop = useMemo(() => {
    return (container) => {
      const nextScrollTop = container?.scrollTop || 0
      setScrollTop(nextScrollTop)
    }
  }, [])

  const updateViewportHeight = useMemo(() => {
    return (container) => {
      const nextViewportHeight = container?.clientHeight || 0
      setViewportHeight(nextViewportHeight)
    }
  }, [])

  useEffect(() => {
    if (!shouldCheckEndReached) return
    endReachedTriggeredRef.current = false
  }, [shouldCheckEndReached, totalCount])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const container = document.getElementById('bsky-scroll-container')
    if (!container) {
      setHasScrollContainer(false)
      return
    }

    setHasScrollContainer(true)

    updateViewportHeight(container)
    updateScrollTop(container)

    if (!shouldTrackScroll) {
      return () => {
        setHasScrollContainer(false)
      }
    }

    const thresholdRaw = typeof endReachedThreshold === 'number' ? endReachedThreshold : 0.8
    const threshold = Math.min(0.99, Math.max(0.5, thresholdRaw))

    const handleScroll = () => {
      if (typeof requestAnimationFrame === 'undefined') {
        updateScrollTop(container)
        if (shouldCheckEndReached) maybeTriggerEndReached(container)
        return
      }
      if (scrollRafRef.current != null) return
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null
        updateScrollTop(container)
        if (shouldCheckEndReached) maybeTriggerEndReached(container)
      })
    }

    const maybeTriggerEndReached = (candidate) => {
      if (!shouldCheckEndReached) return
      const scrollHeight = candidate?.scrollHeight || 0
      const clientHeight = candidate?.clientHeight || 0
      if (scrollHeight <= 0) return
      const currentScrollTop = candidate?.scrollTop || 0
      const ratio = (currentScrollTop + clientHeight) / scrollHeight
      if (ratio >= threshold) {
        if (!endReachedTriggeredRef.current) {
          endReachedTriggeredRef.current = true
          onEndReached()
        }
      } else if (endReachedTriggeredRef.current) {
        endReachedTriggeredRef.current = false
      }
    }

    const handleResize = () => {
      if (typeof requestAnimationFrame === 'undefined') {
        updateViewportHeight(container)
        return
      }
      if (resizeRafRef.current != null) return
      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null
        updateViewportHeight(container)
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
      if (scrollRafRef.current != null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
      if (resizeRafRef.current != null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }
      setHasScrollContainer(false)
    }
  }, [endReachedThreshold, onEndReached, shouldCheckEndReached, shouldTrackScroll, updateScrollTop, updateViewportHeight])

  if (listItems.length === 0) {
    if (emptyFallback !== undefined) {
      return <>{emptyFallback}</>
    }
    return <ul className={className} style={inlineStyle} {...restProps} />
  }

  const overscanValue = typeof overscan === 'number' ? Math.max(0, overscan) : 3
  const canVirtualize = Boolean(
    meetsThreshold &&
    hasValidHeight &&
    viewportHeight > 0 &&
    hasScrollContainer
  )

  let startIndex = 0
  let endIndex = totalCount - 1
  let visibleItems = listItems
  let isVirtualized = false

  if (canVirtualize) {
    const visibleCount = Math.ceil(viewportHeight / itemHeight)
    const baseStartIndex = Math.floor(scrollTop / itemHeight)
    const rawStartIndex = baseStartIndex - overscanValue
    const rawEndIndex = baseStartIndex + visibleCount + overscanValue - 1
    const normalizedStartIndex = Math.max(0, rawStartIndex)
    const normalizedEndIndex = Math.min(totalCount - 1, rawEndIndex)

    if (normalizedStartIndex <= normalizedEndIndex) {
      startIndex = normalizedStartIndex
      endIndex = normalizedEndIndex
      visibleItems = listItems.slice(startIndex, endIndex + 1)
      isVirtualized = true
    }
  }

  const topSpacerHeight = isVirtualized ? Math.max(0, startIndex * itemHeight) : 0
  const bottomSpacerHeight = isVirtualized
    ? Math.max(0, (totalCount - endIndex - 1) * itemHeight)
    : 0
  const listStyle = isVirtualized
    ? { ...(inlineStyle || {}), paddingTop: topSpacerHeight, paddingBottom: bottomSpacerHeight }
    : inlineStyle

  const isDebugEnabled = process.env.NODE_ENV === 'development' ? Boolean(debugVirtualization) : false
  const shouldShowDebug = isVirtualized && isDebugEnabled

  return (
    <>
      <ul
        className={className}
        style={listStyle}
        {...restProps}
        {...(shouldShowDebug
          ? {
              'data-virtualized': 'true',
              'data-window-start': startIndex,
              'data-window-end': endIndex,
              'data-total-items': totalCount
            }
          : {})}
      >
        {visibleItems.map((item, index) => {
          const itemIndex = isVirtualized ? startIndex + index : index
          const itemId =
            typeof getItemId === 'function'
              ? getItemId(item, itemIndex)
              : null
          return (
            <li
              key={getItemKey(item, itemIndex)}
              {...(itemId ? { 'data-list-item-id': itemId } : {})}
            >
              {renderItem(item, itemIndex)}
            </li>
          )
        })}
      </ul>
      {shouldShowDebug && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#666',
            marginTop: '0.25rem'
          }}
        >
          {`Virtualized: true | total=${totalCount} | window=${startIndex}-${endIndex} | itemHeight=${itemHeight} | topPad=${topSpacerHeight} | bottomPad=${bottomSpacerHeight}`}
        </div>
      )}
    </>
  )
}

function getItemKey (item, index) {
  return (
    item?.listEntryId ||
    item?.uri ||
    item?.cid ||
    item?.id ||
    `${index}`
  )
}
