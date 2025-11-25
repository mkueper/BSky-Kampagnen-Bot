import { cloneElement, isValidElement, useCallback, useEffect, useMemo, useState } from 'react'
import SidebarNav, { NAV_ITEMS } from './SidebarNav'
import { ScrollTopButton } from '@bsky-kampagnen-bot/shared-ui'
import { PlusIcon, SunIcon, MoonIcon, ShadowIcon, Half2Icon } from '@radix-ui/react-icons'
import clsx from 'clsx'
import { useThemeMode } from '../../hooks/useThemeMode'
import { useLayout } from '../../context/LayoutContext'

const MOBILE_NAV_IDS = ['home', 'search', 'chat', 'notifications', 'profile', 'blocks', 'dashboard']
const MOBILE_NAV_HEIGHT = 72
const MOBILE_NAV_GAP = 16
const THEME_SEQUENCE = ['light', 'dim', 'dark', 'midnight']
const THEME_CONFIG = {
  light: { label: 'Hell', colorScheme: 'light', icon: SunIcon, colors: { background: 'hsl(240 10% 99%)', foreground: 'hsl(240 10% 3.9%)' } },
  dim: { label: 'Gedimmt', colorScheme: 'dark', icon: ShadowIcon, colors: { background: 'hsl(240 3.7% 15.9%)', foreground: 'hsl(240 5% 96.1%)' } },
  dark: { label: 'Dunkel', colorScheme: 'dark', icon: MoonIcon, colors: { background: 'hsl(240 5.9% 10%)', foreground: 'hsl(240 5% 96.1%)' } },
  midnight: { label: 'Mitternacht', colorScheme: 'dark', icon: Half2Icon, colors: { background: 'hsl(240 10% 3.9%)', foreground: 'hsl(240 5% 96.1%)' } }
}

const computeIsMobile = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(max-width: 768px)').matches
  : false)

function MobileNavBar ({ activeSection, notificationsUnread, onSelect, themeToggle = null }) {
  const items = NAV_ITEMS.filter((item) => MOBILE_NAV_IDS.includes(item.id))
  const ThemeToggleIcon = themeToggle?.Icon || null
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
        {themeToggle ? (
          <button
            type='button'
            onClick={themeToggle.onToggle}
            aria-label={`Theme wechseln – ${themeToggle.nextLabel}`}
            className='relative inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition hover:bg-background-subtle/80 hover:text-primary'
          >
            {ThemeToggleIcon ? <ThemeToggleIcon className='h-5 w-5' /> : null}
          </button>
        ) : null}
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
  detailPane = null,
  detailPaneActive = false,
  scrollTopForceVisible = false,
  onScrollTopActivate
}) {
  const [isMobile, setIsMobile] = useState(computeIsMobile)
  const [navVisible, setNavVisible] = useState(() => !computeIsMobile())
  const [detailLayoutHeader, setDetailLayoutHeader] = useState(null)
  const {
    currentThemeConfig,
    nextThemeLabel,
    nextThemeConfig,
    ThemeIcon: ActiveThemeIcon,
    toggleTheme: toggleThemeMode
  } = useThemeMode({
    themes: THEME_SEQUENCE,
    themeConfig: THEME_CONFIG,
    defaultTheme: 'dark'
  })
  const ThemeIcon = ActiveThemeIcon || SunIcon
  const { setHeaderRef } = useLayout()
  const themeToggleProps = {
    label: currentThemeConfig?.label || 'Theme',
    nextLabel: nextThemeLabel,
    nextConfig: nextThemeConfig,
    onToggle: toggleThemeMode,
    Icon: ThemeIcon
  }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

    const mq = window.matchMedia('(max-width: 768px)')

    const handleChange = (event) => {
      const isNowMobile = event.matches
      setIsMobile(isNowMobile)
      setNavVisible(!isNowMobile)
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

  const asideClassName = clsx(
    'z-40 rounded-2xl border border-border bg-background-elevated/80 px-4 py-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 transition-transform duration-200 overflow-hidden',
    'fixed top-4 bottom-4 left-4',
    isMobile ? 'w-[min(220px,80vw)]' : 'w-[min(280px,85vw)]',
    'md:sticky md:top-4 md:self-start md:shrink-0 md:max-h-[calc(100vh-48px)]',
    'md:relative md:top-auto md:bottom-auto md:left-auto md:w-20 md:px-[11px] md:py-2 lg:w-max lg:px-[6px]',
    {
      'translate-x-0': navVisible,
      '-translate-x-[120%] md:translate-x-0': !navVisible
    }
  )

  const layoutStyle = {
    '--bottom-nav-height': `${MOBILE_NAV_HEIGHT}px`,
    '--bottom-nav-safe-area': 'env(safe-area-inset-bottom, 0px)',
    '--bottom-nav-gap': `${MOBILE_NAV_GAP}px`
  }
  const mobileNavReservedSpace = `calc(var(--bottom-nav-height, ${MOBILE_NAV_HEIGHT}px) + var(--bottom-nav-safe-area, 0px) + var(--bottom-nav-gap, ${MOBILE_NAV_GAP}px))`
  const bottomPaddingValue = isMobile ? '16px' : undefined
  const isProfileSection = activeSection === 'profile'
  const scrollContainerClassName = clsx(
    'flex-1 min-h-0',
    isProfileSection
      ? 'overflow-y-auto p-[2px] sm:p-2'
      : 'overflow-y-auto px-2 pt-3 sm:px-5 sm:pt-4'
  )
  const mainClassName = clsx({
    'flex h-full w-full min-h-0 justify-center': isProfileSection,
    'space-y-5 sm:space-y-8': !isProfileSection,
    '': !isProfileSection && !isMobile
  })
  const mainSectionClassName = clsx('min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden', {
    'pb-3': !isMobile
  })
  const hasDetailPane = Boolean(detailPane)
  const isPaneExclusive = hasDetailPane && detailPaneActive

  useEffect(() => {
    if (!isPaneExclusive) {
      setDetailLayoutHeader(null)
    }
  }, [isPaneExclusive])

  const registerDetailLayoutHeader = useCallback((node) => {
    setDetailLayoutHeader(node)
  }, [])

  const detailPaneNode = useMemo(() => {
    if (!detailPane || !isValidElement(detailPane)) return detailPane
    return cloneElement(detailPane, {
      registerLayoutHeader: registerDetailLayoutHeader,
      renderHeaderInLayout: isPaneExclusive
    })
  }, [detailPane, registerDetailLayoutHeader, isPaneExclusive])

  const effectiveHeaderContent = isPaneExclusive ? detailLayoutHeader : headerContent
  const showHeaderContent = Boolean(effectiveHeaderContent)
  const showTopBlock = Boolean(topBlock) && !isPaneExclusive
  const contentWrapperClassName = clsx(
    hasDetailPane ? 'flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] xl:gap-8' : '',
    hasDetailPane ? 'mt-0' : ''
  )

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
            themeToggle={themeToggleProps}
          />
        </aside>
      ) : null}
      <section
        className={mainSectionClassName}
        data-component='BskyLayoutMain'
      >
        {showHeaderContent ? (
          <header
            className='sticky top-0 z-10 mb-2 rounded-2xl border border-border bg-background-elevated/80 px-2 py-2 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 sm:px-5 sm:py-4'
            data-component='BskyTimelineHeader'
            ref={setHeaderRef}
          >
            {effectiveHeaderContent}
          </header>
        ) : null}

        {showTopBlock ? (
          <section
            className='space-y-6 px-2 pb-6 sm:space-y-8 sm:px-4 sm:pb-8 md:px-6'
            data-component='BskyTopBlock'
          >
            {topBlock}
          </section>
        ) : null}

        <div
          id='bsky-scroll-container'
          className={scrollContainerClassName}
          data-component='BskyScrollContainer'
          style={{ scrollbarGutter: 'stable', paddingBottom: bottomPaddingValue }}
        >
          <div className={contentWrapperClassName}>
            <main
              className={mainClassName}
              aria-hidden={isPaneExclusive}
              style={isPaneExclusive ? { display: 'none' } : undefined}
            >
              {children}
            </main>
            {detailPaneNode ? (
              <section
                className={clsx(
                  'mt-0 xl:mt-0',
                  !detailPaneActive ? 'xl:mt-0 xl:sticky xl:top-4 xl:self-start' : '',
                  detailPaneActive ? 'w-full' : ''
                )}
                data-component='BskyThreadPane'
              >
                {detailPaneNode}
              </section>
            ) : null}
          </div>
          {isMobile ? (
            <div
              className='pointer-events-none'
              style={{ height: mobileNavReservedSpace }}
            />
          ) : null}
          {!isPaneExclusive ? (
            <ScrollTopButton
              containerId='bsky-scroll-container'
              position='bottom-left'
              variant='primary'
              forceVisible={scrollTopForceVisible}
              onActivate={onScrollTopActivate}
              offset={isMobile ? MOBILE_NAV_HEIGHT + MOBILE_NAV_GAP + 16 : 16}
              horizontalOffset={isMobile ? 12 : 16}
            />
          ) : null}
          {/* Floating Action Button: Neuer Skeet */}
          {!navVisible ? (
            <button
              type='button'
              onClick={handleOpenCompose}
              className='fixed right-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-soft hover:opacity-95'
              style={isMobile ? { bottom: mobileNavReservedSpace } : { bottom: '20px' }}
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
            themeToggle={themeToggleProps}
          />
        ) : null}
      </section>
    </div>
  )
}
