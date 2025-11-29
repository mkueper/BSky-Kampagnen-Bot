import { useEffect, useState } from 'react'

export function VirtualizedList ({
  items,
  renderItem,
  className,
  emptyFallback,
  virtualizationThreshold = 100,
  itemHeight,
  overscan = 3,
  debugVirtualization = false,
  ...passthroughProps
}) {
  const listItems = Array.isArray(items) ? items : []
  const totalCount = listItems.length
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [hasScrollContainer, setHasScrollContainer] = useState(false)
  const { style: inlineStyle, ...restProps } = passthroughProps

  useEffect(() => {
    if (typeof document === 'undefined') return
    const container = document.getElementById('bsky-scroll-container')
    if (!container) {
      setHasScrollContainer(false)
      return
    }

    setHasScrollContainer(true)

    const handleScroll = () => {
      setScrollTop(container.scrollTop || 0)
    }

    const handleResize = () => {
      setViewportHeight(container.clientHeight || 0)
    }

    handleResize()
    setScrollTop(container.scrollTop || 0)

    container.addEventListener('scroll', handleScroll, { passive: true })
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
      setHasScrollContainer(false)
    }
  }, [])

  if (listItems.length === 0) {
    if (emptyFallback !== undefined) {
      return <>{emptyFallback}</>
    }
    return <ul className={className} style={inlineStyle} {...restProps} />
  }

  const hasValidHeight = typeof itemHeight === 'number' && itemHeight > 0
  const overscanValue = typeof overscan === 'number' ? Math.max(0, overscan) : 3
  const meetsThreshold = Array.isArray(items) && totalCount >= virtualizationThreshold
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
          return (
            <li key={getItemKey(item, itemIndex)}>
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
