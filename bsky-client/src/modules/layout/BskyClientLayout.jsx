import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
import SidebarNav, { NAV_ITEMS } from './SidebarNav'
import {
  Drawer,
  ScrollTopButton,
  InlineMenu,
  InlineMenuTrigger,
  InlineMenuContent,
  InlineMenuItem,
  useThemeMode
} from '@bsky-kampagnen-bot/shared-ui'
import { PlusIcon, SunIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import clsx from 'clsx'
import { useLayout } from '../../context/LayoutContext'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const MOBILE_NAV_IDS = [
  'home',
  'search',
  'chat',
  'notifications',
  'profile',
  'blocks'
]
const MOBILE_NAV_HEIGHT = 72
const MOBILE_NAV_GAP = 16
const computeIsMobile = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 768px)').matches
    : false

function MobileNavBar ({
  activeSection,
  notificationsUnread,
  chatUnread = 0,
  onSelect,
  interactionsLocked = false,
  onOpenMenu
}) {
  const { t } = useTranslation()
  const items = NAV_ITEMS.filter(item => MOBILE_NAV_IDS.includes(item.id))
  const normalizedNotif = Number.isFinite(notificationsUnread) ? notificationsUnread : 0
  const normalizedChat = Number.isFinite(chatUnread) ? chatUnread : 0
  return (
    <nav
      className='pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4'
      style={{
        paddingBottom: `calc(var(--bottom-nav-safe-area, 0px) + var(--bottom-nav-gap, ${MOBILE_NAV_GAP}px))`
      }}
      aria-label='Mobile Navigation'
    >
      <div
        className='pointer-events-auto mx-auto flex w-full max-w-xl items-center justify-between gap-2 rounded-full border border-border bg-background-elevated/80 px-3 py-2 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60'
        style={{ minHeight: 'var(--bottom-nav-height)' }}
      >
        {typeof onOpenMenu === 'function' ? (
          <button
            type='button'
            onClick={onOpenMenu}
            aria-label={t('nav.openMenu', 'Menü öffnen')}
            className='inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:text-primary hover:shadow-lg hover:scale-[1.02]'
          >
            <HamburgerMenuIcon className='h-5 w-5' />
          </button>
        ) : null}
        {items.map(item => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          const permanentlyDisabled = Boolean(item.disabled)
          const disabled = permanentlyDisabled || interactionsLocked
          const disabledHint = permanentlyDisabled && item.disabledHint ? item.disabledHint : null
          const rawBadgeCount = item.id === 'notifications'
            ? normalizedNotif
            : (item.id === 'chat' ? normalizedChat : 0)
          const showBadge = rawBadgeCount > 0
          const badgeLabel = rawBadgeCount > 30 ? '30+' : String(rawBadgeCount)
          const showPlaceholder = !showBadge && (item.id === 'notifications' || item.id === 'chat')
          const badgeBaseClass = 'absolute -top-1 -right-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-semibold'
          const badgeToneClass = isActive ? 'bg-white text-primary' : 'bg-primary text-primary-foreground'
          const baseLabel = t(item.labelKey, item.defaultLabel)
          const label = showBadge
            ? t(
                item.id === 'notifications'
                  ? 'nav.notificationsWithCount'
                  : 'nav.chatWithCount',
                '{label} ({count} neu)',
                { label: baseLabel, count: badgeLabel }
              )
            : baseLabel
          const ariaLabel = disabledHint ? `${label} (${disabledHint})` : label
          return (
            <button
              key={item.id}
              type='button'
              onClick={() => !disabled && onSelect(item.id)}
              aria-label={ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              disabled={disabled}
              title={ariaLabel}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition hover:bg-background-subtle hover:text-primary ${
                isActive ? 'bg-background-subtle text-primary shadow-soft' : ''
              }`}
            >
              {Icon ? <Icon className='h-5 w-5' /> : null}
              {showBadge ? (
                <span className={`${badgeBaseClass} ${badgeToneClass}`}>
                  {badgeLabel}
                </span>
              ) : showPlaceholder ? (
                <span
                  className={`${badgeBaseClass} ${badgeToneClass} pointer-events-none select-none opacity-0`}
                  aria-hidden='true'
                >
                  0
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
  chatUnread = 0,
  onSelectSection,
  onOpenCompose,
  onOpenComposeThread,
  headerContent,
  topBlock,
  topBlockClassName = '',
  scrollContainerClassName = '',
  children,
  detailPane = null,
  detailPaneActive = false,
  scrollTopForceVisible = false,
  onScrollTopActivate,
  navInteractionsLocked: navInteractionsLockedProp,
  accountProfiles = [],
  onSwitchAccount = null,
  onAddAccount = null,
  onLogout = null,
  logoutPending = false,
  onOpenClientSettings = null
}) {
  const { t } = useTranslation()
  const [isMobile, setIsMobile] = useState(computeIsMobile)
  const [navVisible, setNavVisible] = useState(() => !computeIsMobile())
  const [detailLayoutHeader, setDetailLayoutHeader] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [composeMenuOpen, setComposeMenuOpen] = useState(false)
  
  const {
    currentThemeConfig,
    nextThemeLabel,
    nextThemeConfig,
    ThemeIcon: ActiveThemeIcon,
    toggleTheme,
  } = useThemeMode()

  const ThemeIcon = ActiveThemeIcon || SunIcon
  const currentThemeLabel = currentThemeConfig?.labelKey
    ? t(
        currentThemeConfig.labelKey,
        currentThemeConfig.label || currentThemeConfig.labelKey
      )
    : currentThemeConfig?.label || '—'
  const nextThemeLabelFallback =
    nextThemeLabel || nextThemeConfig?.label || currentThemeConfig?.label || ''
  const nextThemeTranslated = nextThemeConfig?.labelKey
    ? t(nextThemeConfig.labelKey, nextThemeLabelFallback)
    : nextThemeLabelFallback
  const { setHeaderRef } = useLayout()
  const themeToggleProps = {
    icon: ThemeIcon,
    label: t('nav.themeButton', 'Theme'),
    modeLabel: currentThemeLabel,
    nextLabel: nextThemeTranslated,
    nextColor: nextThemeConfig?.previewColor,
    nextBorderColor: nextThemeConfig?.previewColor,
    onToggle: toggleTheme,
    ariaLabel: t(
      'nav.themeSwitch',
      `Theme wechseln – ${nextThemeTranslated || ''}`,
      { label: nextThemeTranslated || '' }
    )
  }

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    )
      return undefined

    const mq = window.matchMedia('(max-width: 768px)')

    const handleChange = event => {
      const isNowMobile = event.matches
      setIsMobile(isNowMobile)
      setNavVisible(!isNowMobile)
    }

    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const navInteractionsLocked = typeof navInteractionsLockedProp === 'boolean'
    ? navInteractionsLockedProp
    : Boolean(detailPaneActive)
  const newPostLabel = t('nav.newPost', 'Neuer Post')
  const newPostAria = t('nav.newPostAria', 'Neuen Post erstellen')
  const newThreadLabel = t('nav.newThread', 'Neuer Thread')
  const newThreadAria = t('nav.newThreadAria', 'Neuen Thread erstellen')

  const handleSelect = useCallback(
    (section, actorOrOptions = null, maybeOptions = {}) => {
      const actor = typeof actorOrOptions === 'string' ? actorOrOptions : null
      const options = actor ? maybeOptions : (actorOrOptions || {})
      if (navInteractionsLocked && !options?.force) return
      if (typeof onSelectSection === 'function') {
        onSelectSection(section, actor)
      }
    },
    [onSelectSection, navInteractionsLocked]
  )

  const handleMobileSelect = useCallback(
    (section, actorOrOptions = null, maybeOptions = {}) => {
      setMobileMenuOpen(false)
      handleSelect(section, actorOrOptions, maybeOptions)
    },
    [handleSelect]
  )

  const handleOpenCompose = useCallback(() => {
    if (typeof onOpenCompose === 'function') {
      onOpenCompose()
    }
  }, [onOpenCompose])

  const handleOpenComposeThread = useCallback(() => {
    if (typeof onOpenComposeThread === 'function') {
      onOpenComposeThread()
    }
  }, [onOpenComposeThread])
  const handleOpenClientSettings = useCallback(() => {
    if (typeof onOpenClientSettings === 'function') {
      onOpenClientSettings()
    }
  }, [onOpenClientSettings])
  const asideClassName = clsx(
    'z-40 rounded-2xl border border-border bg-background-elevated/80 px-4 py-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 transition-transform duration-200 overflow-hidden',
    'fixed top-4 bottom-4 left-4',
    isMobile ? 'w-[min(220px,80vw)]' : 'w-[min(280px,85vw)]',
    'md:sticky md:top-4 md:self-start md:shrink-0 md:h-[calc(100vh-48px)] md:max-h-[calc(100vh-48px)]',
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
  const resolvedScrollContainerClassName = clsx(
    'flex-1 min-h-0 h-full',
    isProfileSection
      ? 'overflow-y-auto p-[2px] sm:p-2'
      : 'overflow-y-auto px-2 pt-3 sm:px-5 sm:pt-4',
    scrollContainerClassName
  )
  const mainClassName = clsx({
    'flex h-full w-full min-h-0 justify-center': isProfileSection,
    'space-y-5 sm:space-y-8': !isProfileSection && !isMobile
  })
  const mainSectionClassName = clsx(
    'min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden'
  )
  const hasDetailPane = Boolean(detailPane)
  const isPaneExclusive = hasDetailPane && detailPaneActive

  useEffect(() => {
    if (!isPaneExclusive) {
      setDetailLayoutHeader(null)
    }
  }, [isPaneExclusive])

  const registerDetailLayoutHeader = useCallback(node => {
    setDetailLayoutHeader(node)
  }, [])

  const detailPaneNode = useMemo(() => {
    if (!detailPane || !isValidElement(detailPane)) return detailPane
    return cloneElement(detailPane, {
      registerLayoutHeader: registerDetailLayoutHeader,
      renderHeaderInLayout: isPaneExclusive
    })
  }, [detailPane, registerDetailLayoutHeader, isPaneExclusive])

  const effectiveHeaderContent = isPaneExclusive
    ? detailLayoutHeader
    : headerContent
  const showHeaderContent = Boolean(effectiveHeaderContent)
  const showTopBlock = Boolean(topBlock) && !isPaneExclusive
  const contentWrapperClassName = clsx(
    hasDetailPane
      ? 'flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] xl:gap-8'
      : '',
    hasDetailPane ? 'mt-0' : '',
    detailPaneActive ? 'h-full min-h-0' : ''
  )

  return (
    <div
      className='relative flex items-stretch h-screen gap-0 md:gap-6'
      data-component='BskyClientLayout'
      style={layoutStyle}
    >
      {isMobile ? (
        <Drawer
          open={mobileMenuOpen}
          title={t('nav.menuTitle', 'Navigation')}
          onClose={() => setMobileMenuOpen(false)}
          side='left'
          fitContent
        >
            <SidebarNav
              active={activeSection}
              notificationsUnread={notificationsUnread}
              chatUnread={chatUnread}
            onSelect={handleMobileSelect}
            onCompose={() => {
              setMobileMenuOpen(false)
              handleOpenCompose()
            }}
            onComposeThread={() => {
              setMobileMenuOpen(false)
              handleOpenComposeThread()
            }}
            themeToggle={themeToggleProps}
            interactionsLocked={navInteractionsLocked}
            accountProfiles={accountProfiles}
            onSwitchAccount={onSwitchAccount}
            onAddAccount={onAddAccount}
            onLogout={onLogout}
            logoutPending={logoutPending}
            onOpenClientSettings={handleOpenClientSettings}
            showLabels
          />
        </Drawer>
      ) : null}
      {!isMobile ? (
        <aside
          className={asideClassName}
          data-component='BskyLayoutAside'
          data-state={navVisible ? 'open' : 'closed'}
        >
          <SidebarNav
            active={activeSection}
            notificationsUnread={notificationsUnread}
            chatUnread={chatUnread}
            onSelect={handleSelect}
            onCompose={handleOpenCompose}
            onComposeThread={handleOpenComposeThread}
            themeToggle={themeToggleProps}
            interactionsLocked={navInteractionsLocked}
            accountProfiles={accountProfiles}
            onSwitchAccount={onSwitchAccount}
            onAddAccount={onAddAccount}
            onLogout={onLogout}
            logoutPending={logoutPending}
            onOpenClientSettings={handleOpenClientSettings}
          />
        </aside>
      ) : null}
      <section className={mainSectionClassName} data-component='BskyLayoutMain'>
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
            className={clsx(
              'space-y-6 px-2 pb-6 sm:space-y-8 sm:px-4 sm:pb-8 md:px-6',
              topBlockClassName
            )}
            data-component='BskyTopBlock'
          >
            {topBlock}
          </section>
        ) : null}

        <div
          id='bsky-scroll-container'
          className={resolvedScrollContainerClassName}
          data-component='BskyScrollContainer'
          style={{
            scrollbarGutter: 'stable',
            paddingBottom: bottomPaddingValue
          }}
        >
          <div className={contentWrapperClassName}>
            <main
              className={mainClassName}
              inert={isPaneExclusive ? '' : undefined}
              style={isPaneExclusive ? { display: 'none' } : undefined}
            >
              {children}
            </main>
            {detailPaneNode ? (
              <section
                className={clsx(
                  'mt-0 xl:mt-0',
                  detailPaneActive ? 'flex h-full min-h-0 flex-col' : '',
                  !detailPaneActive
                    ? 'xl:mt-0 xl:sticky xl:top-4 xl:self-start'
                    : '',
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
              threshold={300}
              forceVisible={scrollTopForceVisible}
              manualScroll
              onActivate={onScrollTopActivate}
              offset={isMobile ? MOBILE_NAV_HEIGHT + MOBILE_NAV_GAP + 16 : 16}
              horizontalOffset={isMobile ? 12 : 16}
            />
          ) : null}
          {/* Floating Action Button: Neuer Skeet */}
          {!navVisible ? (
            <>
              {isMobile ? (
                <InlineMenu open={composeMenuOpen} onOpenChange={setComposeMenuOpen}>
                  <InlineMenuTrigger>
                    <button
                      type='button'
                    onClick={() => setComposeMenuOpen(true)}
                    className='fixed right-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-soft hover:opacity-95'
                    style={{ bottom: mobileNavReservedSpace }}
                    aria-label={newPostAria}
                    title={newPostAria}
                  >
                    <PlusIcon className='h-6 w-6' />
                    <span className='hidden sm:inline'>{newPostLabel}</span>
                  </button>
                  </InlineMenuTrigger>
                  <InlineMenuContent side='top' align='end' sideOffset={10} className='w-56'>
                    <div className='py-1 text-sm'>
                      <InlineMenuItem
                        icon={PlusIcon}
                        onSelect={() => {
                          setComposeMenuOpen(false)
                        handleOpenCompose()
                      }}
                    >
                      {newPostLabel}
                      </InlineMenuItem>
                      <InlineMenuItem
                        icon={PlusIcon}
                        onSelect={() => {
                          setComposeMenuOpen(false)
                        handleOpenComposeThread()
                      }}
                    >
                      {newThreadLabel}
                      </InlineMenuItem>
                    </div>
                  </InlineMenuContent>
                </InlineMenu>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={handleOpenComposeThread}
                    className='fixed right-5 inline-flex items-center gap-2 rounded-full border border-border bg-background-elevated px-4 py-3 text-base font-semibold text-foreground shadow-soft hover:bg-background'
                    style={{ bottom: '96px' }}
                    aria-label={newThreadAria}
                    title={newThreadLabel}
                  >
                    <PlusIcon className='h-6 w-6' />
                    <span className='hidden sm:inline'>{newThreadLabel}</span>
                  </button>
                  <button
                    type='button'
                    onClick={handleOpenCompose}
                    className='fixed right-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-soft hover:opacity-95'
                    style={{ bottom: '20px' }}
                    aria-label={newPostAria}
                    title={newPostLabel}
                  >
                    <PlusIcon className='h-6 w-6' />
                    <span className='hidden sm:inline'>{newPostLabel}</span>
                  </button>
                </>
              )}
            </>
          ) : null}
        </div>
      {isMobile ? (
        <MobileNavBar
          activeSection={activeSection}
          notificationsUnread={notificationsUnread}
          chatUnread={chatUnread}
          onSelect={handleSelect}
          onOpenMenu={() => setMobileMenuOpen(true)}
          themeToggle={themeToggleProps}
          interactionsLocked={navInteractionsLocked}
          onLogout={onLogout}
          logoutPending={logoutPending}
        />
      ) : null}
      </section>
    </div>
  )
}
