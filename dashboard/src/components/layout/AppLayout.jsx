import { useEffect, useMemo, useState } from 'react'
import {
  HamburgerMenuIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@radix-ui/react-icons'
import { ScrollTopButton } from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
/**
 * High-level layout wrapper for the dashboard application.
 *
 * Responsibilities:
 * - renders the persistent sidebar navigation and mobile overlay
 * - provides the sticky header with caller-supplied title/subtitle/actions
 * - positions the main content area and the global scroll-to-top button
 *
 * The component is intentionally dumb: navigation items and header content are
 * passed in from the outside so that the business logic can stay in App.jsx.
 */
function AppLayout ({
  navItems,
  activeView,
  onSelectView,
  headerCaption,
  headerTitle,
  headerActions,
  children,
  showScrollTop = true,
  headerHidden = false,
  mobileMenuExtras = null,
  navFooter = null
}) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  // Desktop: collapsed main navigation state (default visible)
  const [navCollapsed, setNavCollapsed] = useState(false)

  const activeNavItemLabel = useMemo(() => {
    for (const item of navItems) {
      if (item.id === activeView) {
        return item.label
      }
      if (Array.isArray(item.children)) {
        const child = item.children.find(entry => entry.id === activeView)
        if (child) {
          return child.label
        }
      }
    }
    return ''
  }, [navItems, activeView])

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {}
    navItems.forEach(item => {
      if (Array.isArray(item.children) && item.children.length > 0) {
        const isChildActive = item.children.some(
          child => child.id === activeView
        )
        const isParentActive = item.id === activeView
        initial[item.id] = isChildActive || isParentActive
      }
    })
    return initial
  })

  useEffect(() => {
    setOpenGroups(current => {
      const next = { ...current }
      navItems.forEach(item => {
        if (Array.isArray(item.children) && item.children.length > 0) {
          const isChildActive = item.children.some(
            child => child.id === activeView
          )
          const isParentActive = item.id === activeView
          if (isChildActive || isParentActive) {
            next[item.id] = true
          }
        }
      })
      return next
    })
  }, [activeView, navItems])

  const handleSelectView = viewId => {
    onSelectView(viewId)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleOpenNav = () => setMenuOpen(true)
    window.addEventListener('dashboard:open-nav', handleOpenNav)
    return () => window.removeEventListener('dashboard:open-nav', handleOpenNav)
  }, [])

  return (
    <div className='h-screen overflow-hidden bg-background text-foreground'>
      <div className='mx-auto flex h-full w-full max-w-[1400px] px-2 py-2 sm:px-20 lg:px-10'>
        <aside
          className={`fixed inset-y-6 left-3 z-30 w-64 rounded-3xl border border-border bg-background-elevated shadow-card transition-transform duration-200 md:static ${
            navCollapsed ? 'md:hidden' : 'md:block md:translate-x-0'
          } ${
            menuOpen ? 'translate-x-0' : '-translate-x-[110%] md:-translate-x-0'
          }`}
          aria-label={t('layout.nav.ariaLabel', 'Hauptnavigation')}
        >
          <div className='flex h-full flex-col p-6'>
            <div className='flex items-center justify-between pb-6'>
              <div>
                <p className='text-xs uppercase tracking-[0.3em] text-foreground-subtle'>
                  {t('layout.nav.tagline', 'Control Center')}
                </p>
                <h1 className='mt-1 text-xl font-semibold'>
                  {t('layout.nav.appName', 'Kampagnen‑Tool')}
                </h1>
              </div>
              <div className='flex items-center gap-2'>
                {/* Mobile: schließt Overlay */}
                <button
                  type='button'
                  className='rounded-full p-2 text-foreground-muted transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm hover:text-foreground md:hidden' 
                  onClick={() => setMenuOpen(false)}
                >
                  <HamburgerMenuIcon className='h-5 w-5 rotate-180' />
                  <span className='sr-only'>
                    {t('layout.nav.close', 'Navigation schließen')}
                  </span>
                </button>
                {/* Desktop: klappt Hauptnavigation ein */}
                <button
                  type='button'
                  className='hidden rounded-full p-2 text-foreground-muted transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm hover:text-foreground md:inline-flex' 
                  onClick={() => setNavCollapsed(true)}
                  aria-label='Navigation einklappen'
                  title='Navigation einklappen'
                >
                  <HamburgerMenuIcon className='h-5 w-5 rotate-180' />
                </button>
              </div>
            </div>

            <div className='flex flex-1 flex-col'>
              <nav className='flex flex-1 flex-col gap-2'>
                {navItems.map(item => {
                  const { id, label, icon: Icon, children } = item
                  const hasChildren =
                    Array.isArray(children) && children.length > 0
                  const isChildActive = hasChildren
                    ? children.some(child => child.id === activeView)
                    : false
                  const isActive = id === activeView || isChildActive

                  if (!hasChildren) {
                    return (
                      <button
                        key={id}
                        type='button'
                        onClick={() => handleSelectView(id)}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-soft'
                            : 'text-foreground-muted hover:bg-background-subtle'
                        }`}
                      >
                        {Icon ? <Icon className='h-5 w-5' /> : null}
                        <span>{label}</span>
                      </button>
                    )
                  }

                  const expanded = openGroups[id] ?? false

                  return (
                    <div key={id} className='space-y-2'>
                      <button
                        type='button'
                        onClick={() => {
                          setOpenGroups(current => ({
                            ...current,
                            [id]: !expanded
                          }))
                          handleSelectView(id)
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-soft'
                            : 'text-foreground-muted hover:bg-background-subtle'
                        }`}
                      >
                        <span className='flex items-center gap-3'>
                          {Icon ? <Icon className='h-5 w-5' /> : null}
                          {label}
                        </span>
                        {expanded ? (
                          <ChevronDownIcon className='h-4 w-4' />
                        ) : (
                          <ChevronRightIcon className='h-4 w-4' />
                        )}
                      </button>

                      {expanded ? (
                        <div className='ml-8 flex flex-col gap-2'>
                          {children.map(child => {
                            const childActive = child.id === activeView
                            return (
                              <button
                                key={child.id}
                                type='button'
                                onClick={() => handleSelectView(child.id)}
                                className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm transition ${
                                  childActive
                                    ? 'bg-primary text-primary-foreground shadow-soft'
                                    : 'text-foreground-muted hover:bg-background-subtle'
                                }`}
                              >
                                <span>{child.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </nav>
              {navFooter ? (
                <div className='mt-6 border-t border-border pt-4'>
                  {navFooter}
                </div>
              ) : null}
            </div>
            {mobileMenuExtras ? (
              <div className='mt-6 border-t border-border pt-4 md:hidden'>
                {mobileMenuExtras}
              </div>
            ) : null}
          </div>
        </aside>

        {/* Desktop: schmale Leiste zum Wiederherstellen der Navigation */}
        {navCollapsed ? (
          <button
            type='button'
            className='group fixed inset-y-6 left-0 z-20 hidden w-3 hover:w-4 rounded-r-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-background-elevated/80 to-background-elevated/60 shadow-soft backdrop-blur transition-all hover:border-primary hover:from-primary/25 hover:via-background-elevated/90 hover:to-background-elevated md:flex md:flex-col md:items-center md:justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            aria-label={t(
              'layout.nav.restore',
              'Navigation einblenden'
            )}
            title={t('layout.nav.restore', 'Navigation einblenden')}
            onClick={() => setNavCollapsed(false)}
          >
            <ChevronRightIcon className='h-4 w-4 text-foreground-muted opacity-80 transition group-hover:opacity-100 group-hover:text-foreground' />
          </button>
        ) : null}

        {menuOpen ? (
          <div
            className='fixed inset-0 z-20 bg-gradient-to-br from-black/30 via-black/20 to-black/40 backdrop-blur-sm md:hidden'
            onClick={() => setMenuOpen(false)}
            aria-hidden='true'
          />
        ) : null}

        <div
          className={`ml-0 flex h-full min-h-0 flex-1 flex-col overflow-hidden ${
            navCollapsed ? 'md:ml-0' : 'md:ml-8'
          }`}
        >
          {!headerHidden ? (
            <header className='sticky top-0 z-10 rounded-3xl border border-border bg-background-elevated/80 px-4 py-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 sm:px-5 sm:py-4'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-center gap-3 order-1 sm:order-none'>
                  <button
                    type='button'
                    className='rounded-2xl border border-border-muted bg-background-subtle/80 p-2 text-foreground-muted transition hover:bg-background-subtle md:hidden'
                    onClick={() => setMenuOpen(true)}
                  >
                    <HamburgerMenuIcon className='h-5 w-5' />
                    <span className='sr-only'>
                      {t('layout.nav.open', 'Navigation öffnen')}
                    </span>
                  </button>
                  <div className='min-w-0'>
                    {headerCaption ? (
                      <p className='text-[11px] uppercase tracking-[0.25em] text-foreground-subtle'>
                        {headerCaption}
                      </p>
                    ) : null}
                    <h2 className='text-lg font-semibold whitespace-nowrap truncate sm:text-2xl'>
                      {headerTitle || activeNavItemLabel}
                    </h2>
                  </div>
                </div>

                <div className='order-2 sm:order-none w-full sm:w-auto flex flex-wrap items-center gap-2 sm:flex-nowrap'>
                  {headerActions}
                </div>
              </div>
            </header>
          ) : null}

          <div
            id='app-scroll-container'
            className={`flex-1 min-h-0 max-h-full pr-1 ${
              headerHidden ? 'pt-2 sm:pt-4' : 'pt-4'
            } overflow-y-auto`}
            style={{ scrollbarGutter: 'stable' }}
          >
            <main className='space-y-8 pb-6 md:pb-8'>{children}</main>
          </div>
          {showScrollTop ? <ScrollTopButton position='bottom-left' /> : null}
        </div>
      </div>
    </div>
  )
}

export default AppLayout
