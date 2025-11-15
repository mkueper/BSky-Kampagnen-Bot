import { useCallback, useEffect, useRef, useState } from 'react'
import SidebarNav from './SidebarNav'
import { ScrollTopButton } from '../timeline'
import { PlusIcon } from '@radix-ui/react-icons'

export default function BskyClientLayout ({
  activeSection,
  notificationsUnread = 0,
  onSelectSection,
  onOpenCompose,
  headerContent,
  topBlock,
  children
}) {
  const computeIsMobile = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 768px)').matches
    : false)
  const [isMobile, setIsMobile] = useState(computeIsMobile)
  const [navVisible, setNavVisible] = useState(() => !computeIsMobile())
  const pointerRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(max-width: 768px)')
    const handleChange = (event) => {
      setIsMobile(event.matches)
      setNavVisible(event.matches ? false : true)
    }
    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const handlePointerDown = useCallback((event) => {
    if (!isMobile || event.pointerType !== 'touch') return
    pointerRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now()
    }
  }, [isMobile])

  const handlePointerUp = useCallback((event) => {
    if (!isMobile || event.pointerType !== 'touch' || !pointerRef.current) return
    const start = pointerRef.current
    pointerRef.current = null
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const dt = Date.now() - start.time
    if (dt > 500) return
    if (Math.abs(dy) > Math.abs(dx) + 20) return
    if (!navVisible && start.x <= 40 && dx > 60) {
      setNavVisible(true)
    } else if (navVisible && dx < -60) {
      setNavVisible(false)
    }
  }, [isMobile, navVisible])

  const handlePointerCancel = useCallback(() => {
    pointerRef.current = null
  }, [])

  const handleSelect = useCallback((section) => {
    if (typeof onSelectSection === 'function') {
      onSelectSection(section)
    }
    if (isMobile) setNavVisible(false)
  }, [onSelectSection, isMobile])

  const handleOpenCompose = useCallback(() => {
    if (typeof onOpenCompose === 'function') {
      onOpenCompose()
    }
    if (isMobile) setNavVisible(false)
  }, [onOpenCompose, isMobile])

  const asideClassName = [
    'z-40 rounded-2xl border border-border bg-background-elevated/80 px-4 py-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 transition-transform duration-200 overflow-hidden',
    'fixed top-4 bottom-4 left-4 w-[min(280px,85vw)] md:relative md:top-auto md:bottom-auto md:left-auto md:w-20 md:px-[11px] md:py-2 xl:w-max xl:px-[6px]',
    'md:sticky md:top-4 md:self-start md:shrink-0 md:max-h-[calc(100vh-48px)]',
    navVisible ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'
  ].join(' ')

  return (
    <div
      className='relative flex items-stretch h-screen gap-0 md:gap-6'
      data-component='BskyClientLayout'
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {isMobile && navVisible ? (
        <button
          type='button'
          className='fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden'
          aria-label='Navigation ausblenden'
          onClick={() => setNavVisible(false)}
        />
      ) : null}
      <aside
        className={asideClassName}
        data-component='BskyLayoutAside'
        data-state={navVisible ? 'open' : 'closed'}
        aria-hidden={isMobile && !navVisible}
      >
        <SidebarNav
          active={activeSection}
          notificationsUnread={notificationsUnread}
          onSelect={handleSelect}
          onCompose={handleOpenCompose}
        />
      </aside>
      <section
        className='min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden'
        data-component='BskyLayoutMain'
      >
        {headerContent ? (
          <header
            className='sticky top-0 z-10 rounded-2xl border border-border bg-background-elevated/80 px-5 py-4 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60'
            data-component='BskyTimelineHeader'
          >
            {headerContent}
          </header>
        ) : null}

        {topBlock ? (
          <section
            className='space-y-8 pb-8 pl-4 v-full md:pb-8'
            data-component='BskyTopBlock'
          >
            {topBlock}
          </section>
        ) : null}

        <div
          id='bsky-scroll-container'
          className='flex-1 min-h-0 overflow-y-auto pr-1 pt-4'
          data-component='BskyScrollContainer'
          style={{ scrollbarGutter: 'stable' }}
        >
          <main className='space-y-8 pb-6 md:pb-8'>
            {children}
          </main>
          <ScrollTopButton containerId='bsky-scroll-container' position='bottom-left' variant='elevated' />
          {/* Floating Action Button: Neuer Skeet */}
          {!navVisible ? (
            <button
              type='button'
              onClick={handleOpenCompose}
              className='fixed right-5 bottom-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-soft hover:opacity-95'
              aria-label='Neuer Skeet'
              title='Neuen Skeet posten'
            >
              <PlusIcon className='h-6 w-6' />
              <span className='hidden sm:inline'>Neuer Skeet</span>
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}
