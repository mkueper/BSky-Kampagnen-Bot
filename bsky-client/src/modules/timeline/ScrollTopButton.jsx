import { useEffect, useMemo, useState } from 'react'
import { ChevronUpIcon } from '@radix-ui/react-icons'

function cn (...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function ScrollTopButton ({
  containerId = 'bsky-scroll-container',
  threshold = 400,
  position = 'bottom-right',
  offset = 16,
  safeArea = true,
  ariaLabel = 'Nach oben',
  className,
  variant = 'elevated'
}) {
  const [visible, setVisible] = useState(false)

  const stylePos = useMemo(() => {
    const bottomValue = safeArea
      ? `calc(${offset}px + env(safe-area-inset-bottom))`
      : `${offset}px`
    return position === 'bottom-left'
      ? { bottom: bottomValue, left: `${offset}px` }
      : { bottom: bottomValue, right: `${offset}px` }
  }, [position, offset, safeArea])

  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    const container = document.getElementById(containerId)
    const scrollTarget = container || window
    const onScroll = () => {
      const y = container ? container.scrollTop : window.scrollY
      setVisible(y > threshold)
    }
    onScroll()
    scrollTarget.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollTarget.removeEventListener('scroll', onScroll)
  }, [containerId, threshold])

  if (!visible) return null

  const scrollToTop = () => {
    const container = document.getElementById(containerId)
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const variants = {
    elevated: 'border-border bg-background-elevated/90 text-foreground shadow-card',
    primary: 'border-border bg-primary text-primary-foreground shadow-card'
  }

  return (
    <button
      type='button'
      onClick={scrollToTop}
      className={cn(
        'fixed z-50 rounded-full border p-2 focus:outline-none focus:ring-2 focus:ring-primary',
        variants[variant] || variants.elevated,
        className
      )}
      style={stylePos}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <ChevronUpIcon className='h-5 w-5' />
    </button>
  )
}
