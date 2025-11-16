import { useCallback, useEffect, useState } from 'react'
import SidebarNav, { NAV_ITEMS } from './SidebarNav'
import { ScrollTopButton } from '@bsky-kampagnen-bot/shared-ui'
import { PlusIcon } from '@radix-ui/react-icons'

const MOBILE_NAV_IDS = ['home', 'search', 'chat', 'notifications', 'profile', 'dashboard']
const MOBILE_NAV_HEIGHT = 72
const MOBILE_NAV_GAP = 16

function MobileNavBar ({ activeSection, notificationsUnread, onSelect }) {
  const items = NAV_ITEMS.filter((item) => MOBILE_NAV_IDS.includes(item.id))
  return (
    <nav
      className='pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4'
      style={{ paddingBottom: `calc(var(--bottom-nav-safe-area, 0px) + var(--bottom-nav-gap, ${MOBILE_NAV_GAP}px))` }}
      aria-label='Mobile Navigation'
    >
      <div
        className='pointer-events-auto mx-auto flex w-full max-w-xl items-center justify-between gap-2 rounded-full border border-border bg-background-elevated/80 px-3 py-2 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60'
        style={{ minHeight: 'var(--bottom-nav-height)' }}
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          const disabled = Boolean(item.disabled)
          const showBadge = item.id === 'notifications' && notificationsUnread > 0
          const badgeLabel = notificationsUnread > 30 ? '30+' : String(notificationsUnread)
          return (
            <button
              key={item.id}
              type='button'
              onClick={() => !disabled && onSelect(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              disabled={disabled}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition hover:bg-background-subtle/80 hover:text-primary ${isActive ? 'bg-background-subtle text-primary shadow-soft' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {Icon ? <Icon className='h-5 w-5' /> : null}
              {showBadge ? (
                <span className='absolute -top-1 -right-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground'>
                  {badgeLabel}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function BskyClientLayout ({
  activeSection,
  notificationsUnread = 0,
  onSelectSection,
  onOpenCompose,
  headerContent,
  topBlock,
  children,
  scrollTopForceVisible = false,
  onScrollTopActivate
}) {
  const computeIsMobile = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 768px)').matches
    : false)
  const [isMobile, setIsMobile] = useState(computeIsMobile)
  const [navVisible, setNavVisible] = useState(() => !computeIsMobile())

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

  const handleSelect = useCallback((section) => {
    if (typeof onSelectSection === 'function') {
      onSelectSection(section)
    }
  }, [onSelectSection])

  const handleOpenCompose = useCallback(() => {
    if (typeof onOpenCompose === 'function') {
      onOpenCompose()
    }
  }, [onOpenCompose])

  const asideClassName = [
    'z-40 rounded-2xl border border-border bg-background-elevated/80 px-4 py-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 transition-transform duration-200 overflow-hidden',
    `fixed top-4 bottom-4 left-4 ${isMobile ? 'w-[min(220px,80vw)]' : 'w-[min(280px,85vw)]'} md:relative md:top-auto md:bottom-auto md:left-auto md:w-20 md:px-[11px] md:py-2 xl:w-max xl:px-[6px]`,
    'md:sticky md:top-4 md:self-start md:shrink-0 md:max-h-[calc(100vh-48px)]',
    navVisible ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'
  ].join(' ')

  const layoutStyle = {
    '--bottom-nav-height': `${MOBILE_NAV_HEIGHT}px`,
    '--bottom-nav-safe-area': 'env(safe-area-inset-bottom, 0px)',
    '--bottom-nav-gap': `${MOBILE_NAV_GAP}px`
  }
  const mobileNavReservedSpace = `var(--bottom-nav-height, ${MOBILE_NAV_HEIGHT}px) + var(--bottom-nav-safe-area, 0px) + var(--bottom-nav-gap, ${MOBILE_NAV_GAP}px)`
  const bottomPaddingValue = isMobile ? `calc(${mobileNavReservedSpace} + 16px)` : undefined

  return (
    <div
      className='relative flex items-stretch h-screen gap-0 md:gap-6'
      data-component='BskyClientLayout'
      style={layoutStyle}
    >
      {!isMobile ? (
        <aside
          className={asideClassName}
          data-component='BskyLayoutAside'
          data-state={navVisible ? 'open' : 'closed'}
        >
          <SidebarNav
            active={activeSection}
            notificationsUnread={notificationsUnread}
            onSelect={handleSelect}
            onCompose={handleOpenCompose}
          />
        </aside>
      ) : null}
      <section
        className='min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden'
        data-component='BskyLayoutMain'
      >
        {headerContent ? (
          <header
            className='sticky top-0 z-10 mb-2 rounded-2xl border border-border bg-background-elevated/80 px-2 py-2 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 sm:px-5 sm:py-4'
            data-component='BskyTimelineHeader'
          >
            {headerContent}
          </header>
        ) : null}

        {topBlock ? (
          <section
            className='space-y-6 px-2 pb-6 sm:space-y-8 sm:px-4 sm:pb-8 md:px-6'
            data-component='BskyTopBlock'
          >
            {topBlock}
          </section>
        ) : null}

        <div
          id='bsky-scroll-container'
          className='flex-1 min-h-0 overflow-y-auto px-2 pt-3 sm:px-5 sm:pt-4'
          data-component='BskyScrollContainer'
          style={{ scrollbarGutter: 'stable', paddingBottom: bottomPaddingValue }}
        >
          <main
            className={`space-y-5 ${isMobile ? '' : 'pb-6 sm:pb-8'} sm:space-y-8`}
            style={isMobile ? { paddingBottom: bottomPaddingValue } : undefined}
          >
            {children}
          </main>
          <ScrollTopButton
            containerId='bsky-scroll-container'
            position='bottom-left'
            variant='primary'
            forceVisible={scrollTopForceVisible}
            onActivate={onScrollTopActivate}
            offset={isMobile ? MOBILE_NAV_HEIGHT + MOBILE_NAV_GAP + 16 : 16}
          />
          {/* Floating Action Button: Neuer Skeet */}
          {!navVisible ? (
            <button
              type='button'
              onClick={handleOpenCompose}
              className='fixed right-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-soft hover:opacity-95'
              style={isMobile ? { bottom: `calc(${mobileNavReservedSpace})` } : { bottom: '20px' }}
              aria-label='Neuer Skeet'
              title='Neuen Skeet posten'
            >
              <PlusIcon className='h-6 w-6' />
              <span className='hidden sm:inline'>Neuer Skeet</span>
            </button>
          ) : null}
        </div>
        {isMobile ? (
          <MobileNavBar
            activeSection={activeSection}
            notificationsUnread={notificationsUnread}
            onSelect={handleSelect}
          />
        ) : null}
      </section>
    </div>
  )
}
