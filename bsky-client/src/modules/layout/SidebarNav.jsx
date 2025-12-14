import { useMemo, useState } from 'react'
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ChatBubbleIcon,
  LayersIcon,
  ListBulletIcon,
  BookmarkIcon,
  PersonIcon,
  GearIcon,
  PlusIcon,
  SlashIcon,
  ExitIcon,
  DotsHorizontalIcon
} from '@radix-ui/react-icons'
import {
  ThemeToggle,
  InlineMenu,
  InlineMenuTrigger,
  InlineMenuContent,
  InlineMenuItem
} from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

export const NAV_ITEMS = [
  { id: 'home', defaultLabel: 'Home', labelKey: 'nav.home', icon: HomeIcon },
  { id: 'search', defaultLabel: 'Suchen', labelKey: 'nav.search', icon: MagnifyingGlassIcon },
  { id: 'notifications', defaultLabel: 'Mitteilungen', labelKey: 'nav.notifications', icon: BellIcon },
  { id: 'chat', defaultLabel: 'Chat', labelKey: 'nav.chat', icon: ChatBubbleIcon, disabled: true },
  { id: 'feeds', defaultLabel: 'Feeds', labelKey: 'nav.feeds', icon: LayersIcon },
  { id: 'lists', defaultLabel: 'Listen', labelKey: 'nav.lists', icon: ListBulletIcon },
  { id: 'saved', defaultLabel: 'Gespeichert', labelKey: 'nav.saved', icon: BookmarkIcon },
  { id: 'blocks', defaultLabel: 'Blockliste', labelKey: 'nav.blocks', icon: SlashIcon },
  { id: 'profile', defaultLabel: 'Profil', labelKey: 'nav.profile', icon: PersonIcon },
  { id: 'settings', defaultLabel: 'Einstellungen', labelKey: 'nav.settings', icon: GearIcon },
]

const normalizeHandle = handle => {
  if (!handle) return ''
  const trimmed = handle.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

const getInitial = (primary, fallback) => {
  const source = (primary || fallback || '').trim()
  if (!source) return '•'
  return source.charAt(0).toUpperCase()
}

const isSameLabel = (left, right) => {
  const a = (left || '').trim().toLowerCase()
  const b = (right || '').trim().toLowerCase()
  return Boolean(a && b && a === b)
}

const cx = (...parts) => parts.filter(Boolean).join(' ')

const SIDEBAR_BUTTON_BASE =
  'relative inline-flex items-center rounded-2xl text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
const SIDEBAR_BUTTON_SQUARE =
  'h-12 w-12 justify-center'
const SIDEBAR_BUTTON_PILL =
  'lg:h-auto lg:w-auto lg:px-4 lg:py-3 lg:justify-start lg:gap-3'

const SIDEBAR_BUTTON_ACTIVE =
  'bg-background-subtle text-foreground shadow-soft'
const SIDEBAR_BUTTON_INACTIVE =
  'text-foreground-muted hover:bg-background-subtle hover:text-foreground hover:shadow-soft'
const SIDEBAR_BUTTON_DISABLED =
  'opacity-50 cursor-not-allowed'

export default function SidebarNav ({
  active,
  onSelect,
  onCompose,
  onComposeThread,
  notificationsUnread = 0,
  themeToggle = null,
  interactionsLocked = false,
  accountProfiles = [],
  onSwitchAccount = null,
  onAddAccount = null,
  onLogout = null,
  logoutPending = false,
  showLabels = false
}) {
  const { t } = useTranslation()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const normalizedUnread = Number.isFinite(notificationsUnread) ? notificationsUnread : 0
  const accounts = useMemo(
    () => (Array.isArray(accountProfiles) ? accountProfiles.filter(Boolean) : []),
    [accountProfiles]
  )
  const activeAccount = accounts.find(account => account?.isActive) || accounts[0] || null
  const accountHandle = normalizeHandle(activeAccount?.handle)
  const rawAccountDisplayName =
    activeAccount?.displayName || activeAccount?.handle || ''
  const accountDisplayName = isSameLabel(rawAccountDisplayName, accountHandle)
    ? ''
    : rawAccountDisplayName
  const accountAvatar = activeAccount?.avatar
  const accountInitial = getInitial(accountDisplayName, accountHandle)
  const logoutLabel = t('nav.logout', 'Abmelden')
  const hasMenuAccounts = accounts.length > 0
  const menuTitle = t('nav.accountSwitchTitle', 'Account wechseln')
  const addAccountLabel = t('nav.addAccount', 'Weiteren Account hinzufügen')
  const profileLabel = t('nav.viewProfile', 'Zum Profil')
  const resolvedThemeToggle = themeToggle || null
  const showThemeToggle = Boolean(resolvedThemeToggle)
  const showFullLabels = Boolean(showLabels)
  const navLabelClassName = showFullLabels ? 'inline truncate' : 'hidden lg:inline truncate'
  const accountDetailsClassName = showFullLabels ? 'flex min-w-0 flex-col leading-tight' : 'hidden lg:flex min-w-0 flex-col leading-tight'
  const accountMenuSide = 'bottom'
  const accountMenuSideOffset = 8
  const handleProfileClick = () => {
    setAccountMenuOpen(false)
    if (!activeAccount) return
    const actor = activeAccount.actor || activeAccount.did || activeAccount.handle || null
    if (typeof onSelect === 'function') {
      onSelect('profile', actor, { force: true })
    }
  }
  const handleAddAccount = () => {
    setAccountMenuOpen(false)
    if (typeof onAddAccount === 'function') {
      onAddAccount()
    }
  }
  const handleLogoutClick = () => {
    setAccountMenuOpen(false)
    if (typeof onLogout === 'function') {
      onLogout()
    }
  }
  const handleSwitchAccount = targetAccount => {
    if (!targetAccount || targetAccount.isActive || typeof onSwitchAccount !== 'function') {
      setAccountMenuOpen(false)
      return
    }
    setAccountMenuOpen(false)
    onSwitchAccount(targetAccount)
  }
  return (
    <nav
      className={cx(
        'relative flex h-full flex-col items-start gap-3',
        showFullLabels ? 'w-max' : 'w-full'
      )}
      data-component='BskyPrimaryNav'
      aria-label='Hauptnavigation'
    >
      {activeAccount ? (
        <div className='absolute left-0 right-0 top-0 z-10 w-full'>
          <InlineMenu open={accountMenuOpen} onOpenChange={setAccountMenuOpen}>
            <InlineMenuTrigger>
              <button
                type='button'
                className={cx(
                  SIDEBAR_BUTTON_BASE,
                  showFullLabels
                    ? 'h-auto w-full justify-between gap-3 px-4 py-3'
                    : 'h-12 w-12 justify-center lg:h-16 lg:w-full lg:justify-between lg:gap-3 lg:px-4 lg:py-3',
                  'overflow-hidden border border-border bg-background-subtle/70 text-left shadow-soft hover:bg-background'
                )}
                aria-haspopup='menu'
                aria-label={menuTitle}
              >
                <span className='flex min-w-0 items-center gap-3'>
                  <span className='inline-flex h-8 w-8 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-foreground'>
                    {accountAvatar ? (
                      <img
                        src={accountAvatar}
                        alt={accountDisplayName || accountHandle || 'Avatar'}
                        className='h-8 w-8 lg:h-10 lg:w-10 rounded-full object-cover'
                      />
                    ) : (
                      accountInitial
                    )}
                  </span>
                  <span className={accountDetailsClassName}>
                    {accountDisplayName ? (
                      <span className='truncate text-sm font-semibold text-foreground'>
                        {accountDisplayName}
                      </span>
                    ) : null}
                    {accountHandle ? (
                      <span className='truncate text-xs text-foreground-muted'>
                        {accountHandle}
                      </span>
                    ) : null}
                  </span>
                </span>
                <DotsHorizontalIcon className={showFullLabels ? 'h-5 w-5 shrink-0 text-foreground-muted' : 'hidden lg:inline h-5 w-5 shrink-0 text-foreground-muted'} />
              </button>
            </InlineMenuTrigger>
            <InlineMenuContent
              align='start'
              side={accountMenuSide}
              sideOffset={accountMenuSideOffset}
              className='w-[min(20rem,85vw)] space-y-2 p-2'
            >
              <div className='px-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
                {menuTitle}
              </div>
              <div className='max-h-64 space-y-1 overflow-y-auto pr-1'>
                {hasMenuAccounts
                  ? accounts.map(account => {
                      const handle = normalizeHandle(account?.handle)
                      const avatar = account?.avatar
                      const initial = getInitial('', handle)
                      const isActive = account?.isActive
                      return (
                        <button
                          type='button'
                          key={account?.id || handle || 'account'}
                          onClick={() => handleSwitchAccount(account)}
                          className={`flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 text-left transition ${
                            isActive
                              ? 'bg-background-subtle text-foreground'
                              : 'hover:bg-background-subtle text-foreground'
                          }`}
                          aria-current={isActive ? 'true' : undefined}
                        >
                          <span className='inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold leading-none'>
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={handle || 'Avatar'}
                                className='h-6 w-6 rounded-full object-cover'
                              />
                            ) : (
                              initial
                            )}
                          </span>
                          <span className='min-w-0 flex-1 truncate text-sm font-semibold'>
                            {handle || t('nav.noAccounts', 'Keine Accounts gefunden.')}
                          </span>
                          {isActive ? (
                            <span className='ml-auto text-xs font-semibold text-primary'>
                              {t('nav.activeAccount', 'Aktiv')}
                            </span>
                          ) : null}
                        </button>
                      )
                    })
                  : (
                    <p className='px-2 py-2 text-sm text-foreground-muted'>
                      {t('nav.noAccounts', 'Keine Accounts gefunden.')}
                    </p>
                    )}
              </div>
              <div className='space-y-1 border-t border-border/70 pt-2'>
                <InlineMenuItem icon={PersonIcon} onSelect={handleProfileClick}>
                  {profileLabel}
                </InlineMenuItem>
                {typeof onAddAccount === 'function' ? (
                  <InlineMenuItem icon={PlusIcon} onSelect={handleAddAccount}>
                    {addAccountLabel}
                  </InlineMenuItem>
                ) : null}
                <InlineMenuItem icon={ExitIcon} onSelect={handleLogoutClick} disabled={logoutPending}>
                  {logoutPending ? t('nav.logoutPending', 'Abmelden…') : logoutLabel}
                </InlineMenuItem>
              </div>
            </InlineMenuContent>
          </InlineMenu>
        </div>
      ) : null}
      {activeAccount ? <div className='h-12 lg:h-16' aria-hidden='true' /> : null}
      <div
        className='min-h-0 flex flex-1 overflow-y-auto'
      >
        <div className='grid content-start w-max grid-cols-[max-content] justify-items-stretch gap-1'>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = active === item.id
            const disabled = Boolean(item.disabled) || interactionsLocked
            const showBadge = item.id === 'notifications' && normalizedUnread > 0
            const badgeLabel =
              normalizedUnread > 30 ? '30+' : String(normalizedUnread)
            const baseLabel = t(item.labelKey, item.defaultLabel)
            const label = showBadge
              ? t('nav.notificationsWithCount', '{label} ({count} neu)', {
                  label: baseLabel,
                  count: badgeLabel
                })
              : baseLabel
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => !disabled && onSelect(item.id)}
                disabled={disabled}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={disabled || undefined}
                aria-label={label}
                data-nav-item={item.id}
                title={label}
                className={cx(
                  SIDEBAR_BUTTON_BASE,
                  showFullLabels
                    ? 'h-auto w-full justify-start gap-3 px-4 py-3'
                    : SIDEBAR_BUTTON_SQUARE,
                  showFullLabels
                    ? ''
                    : SIDEBAR_BUTTON_PILL,
                  isActive ? SIDEBAR_BUTTON_ACTIVE : SIDEBAR_BUTTON_INACTIVE,
                  disabled ? SIDEBAR_BUTTON_DISABLED : ''
                )}
              >
                {Icon ? <Icon className='h-6 w-6 shrink-0' /> : null}
                <span className={navLabelClassName}>{baseLabel}</span>
                <span
                  className={`absolute top-2 right-2 lg:static lg:ml-1 lg:mr-1 inline-flex h-5 w-[2.2rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity ${
                    showBadge ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden={!showBadge}
                >
                  {badgeLabel}
                </span>
              </button>
            )
          })}

          <div className='pt-2'>
            <hr className='border-t border-border' />
          </div>

          {showThemeToggle ? (
            <div className='pt-2'>
              {showFullLabels ? (
                <ThemeToggle
                  {...resolvedThemeToggle}
                  size='sidebar'
                  variant='subtle'
                  iconStyle='inline'
                  className='w-full'
                />
              ) : (
                <>
                  <ThemeToggle
                    {...resolvedThemeToggle}
                    size='icon'
                    showIndicator={false}
                    className='w-12 lg:hidden'
                    variant='subtle'
                  />
                  <ThemeToggle
                    {...resolvedThemeToggle}
                    size='sidebar'
                    variant='subtle'
                    iconStyle='inline'
                    className='hidden lg:inline-flex lg:w-full'
                  />
                </>
              )}
            </div>
          ) : null}
          {typeof onComposeThread === 'function' ? (
            <div className='pt-2'>
              <button
                type='button'
                onClick={interactionsLocked ? undefined : onComposeThread}
                className={cx(
                  SIDEBAR_BUTTON_BASE,
                  showFullLabels
                    ? 'h-auto w-full justify-start gap-2 px-4 py-3'
                    : SIDEBAR_BUTTON_SQUARE,
                  showFullLabels ? '' : SIDEBAR_BUTTON_PILL,
                  'gap-2 rounded-2xl border border-border bg-background-subtle text-sm font-semibold text-foreground shadow-soft hover:bg-background lg:w-full',
                  interactionsLocked ? SIDEBAR_BUTTON_DISABLED : ''
                )}
                disabled={interactionsLocked}
                aria-label={t('nav.newThreadAria', 'Neuer Thread')}
                aria-disabled={interactionsLocked || undefined}
                data-nav-item='compose-thread'
                title={t('nav.newThread', 'Neuer Thread')}
              >
                <PlusIcon className='h-6 w-6 shrink-0' />
                <span className={navLabelClassName}>
                  {t('nav.newThread', 'Neuer Thread')}
                </span>
              </button>
            </div>
          ) : null}
          <div className='pt-2'>
            <button
              type='button'
              onClick={interactionsLocked ? undefined : onCompose}
              className={cx(
                SIDEBAR_BUTTON_BASE,
                showFullLabels
                  ? 'h-auto w-full justify-start gap-2 px-4 py-3'
                  : SIDEBAR_BUTTON_SQUARE,
                showFullLabels ? '' : SIDEBAR_BUTTON_PILL,
                'gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 lg:w-full',
                interactionsLocked ? SIDEBAR_BUTTON_DISABLED : ''
              )}
              disabled={interactionsLocked}
              aria-label={t('nav.newPostAria', 'Neuer Post')}
              aria-disabled={interactionsLocked || undefined}
              data-nav-item='compose'
              title={t('nav.newPost', 'Neuer Post')}
            >
              <PlusIcon className='h-6 w-6 shrink-0' />
              <span className={navLabelClassName}>
                {t('nav.newPost', 'Neuer Post')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
