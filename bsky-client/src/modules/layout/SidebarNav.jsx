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
  ViewHorizontalIcon,
  PlusIcon,
  SlashIcon,
  ExitIcon,
  ChevronDownIcon
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
  { id: 'dashboard', defaultLabel: 'Dashboard', labelKey: 'nav.dashboard', icon: ViewHorizontalIcon },
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

export default function SidebarNav ({
  active,
  onSelect,
  onCompose,
  notificationsUnread = 0,
  themeToggle = null,
  interactionsLocked = false,
  accountProfiles = [],
  onSwitchAccount = null,
  onAddAccount = null,
  onLogout = null,
  logoutPending = false
}) {
  const { t } = useTranslation()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const normalizedUnread = Number.isFinite(notificationsUnread) ? notificationsUnread : 0
  const accounts = useMemo(
    () => (Array.isArray(accountProfiles) ? accountProfiles.filter(Boolean) : []),
    [accountProfiles]
  )
  const activeAccount = accounts.find(account => account?.isActive) || accounts[0] || null
  const accountDisplayName =
    activeAccount?.displayName || activeAccount?.handle || ''
  const accountHandle = normalizeHandle(activeAccount?.handle)
  const accountAvatar = activeAccount?.avatar
  const accountInitial = getInitial(accountDisplayName, accountHandle)
  const logoutLabel = t('nav.logout', 'Abmelden')
  const hasMenuAccounts = accounts.length > 0
  const menuTitle = t('nav.accountSwitchTitle', 'Account wechseln')
  const addAccountLabel = t('nav.addAccount', 'Weiteren Account hinzufügen')
  const profileLabel = t('nav.viewProfile', 'Zum Profil')
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
      className='flex h-full w-full flex-col items-start gap-3'
      data-component='BskyPrimaryNav'
      aria-label='Hauptnavigation'
    >
      {activeAccount ? (
        <div className='w-full'>
          <InlineMenu open={accountMenuOpen} onOpenChange={setAccountMenuOpen}>
            <InlineMenuTrigger>
              <button
                type='button'
                className='flex w-full items-center justify-between rounded-2xl border border-border bg-background-subtle/70 px-3 py-2 text-left shadow-soft transition hover:bg-background'
                aria-haspopup='menu'
                aria-label={menuTitle}
              >
                <span className='flex items-center gap-3'>
                  <span className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-foreground'>
                    {accountAvatar ? (
                      <img
                        src={accountAvatar}
                        alt={accountDisplayName || accountHandle || 'Avatar'}
                        className='h-10 w-10 rounded-full object-cover'
                      />
                    ) : (
                      accountInitial
                    )}
                  </span>
                  <span className='flex min-w-0 flex-col leading-tight'>
                    <span className='truncate text-sm font-semibold text-foreground'>
                      {accountDisplayName || t('nav.profile', 'Profil')}
                    </span>
                    {accountHandle ? (
                      <span className='truncate text-xs text-foreground-muted'>
                        {accountHandle}
                      </span>
                    ) : null}
                  </span>
                </span>
                <ChevronDownIcon className='h-5 w-5 text-foreground-muted' />
              </button>
            </InlineMenuTrigger>
            <InlineMenuContent align='start' side='right' sideOffset={12} className='p-2 w-64 space-y-2'>
              <div className='px-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
                {menuTitle}
              </div>
              <div className='max-h-64 space-y-1 overflow-y-auto pr-1'>
                {hasMenuAccounts
                  ? accounts.map(account => {
                      const handle = normalizeHandle(account?.handle)
                      const displayName = account?.displayName || handle || 'Account'
                      const avatar = account?.avatar
                      const initial = getInitial(displayName, handle)
                      const isActive = account?.isActive
                      return (
                        <button
                          type='button'
                          key={account?.id || handle || displayName}
                          onClick={() => handleSwitchAccount(account)}
                          className={`flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 text-left transition ${
                            isActive
                              ? 'bg-background-subtle text-foreground'
                              : 'hover:bg-background-subtle text-foreground'
                          }`}
                          aria-current={isActive ? 'true' : undefined}
                        >
                          <span className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold'>
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={displayName}
                                className='h-8 w-8 rounded-full object-cover'
                              />
                            ) : (
                              initial
                            )}
                          </span>
                          <span className='flex min-w-0 flex-col leading-tight'>
                            <span className='truncate text-sm font-semibold'>
                              {displayName}
                            </span>
                            {handle ? (
                              <span className='truncate text-xs text-foreground-muted'>
                                {handle}
                              </span>
                            ) : null}
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
      <div
        className='min-h-0 flex flex-1 flex-col space-y-1 overflow-y-auto pr-1'
        style={{ scrollbarGutter: 'stable' }}
      >
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
              className={`relative inline-flex items-center rounded-2xl text-sm transition justify-center lg:justify-start gap-0 lg:gap-3 h-12 w-12 lg:h-auto lg:w-auto lg:px-4 lg:py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? 'bg-background-subtle text-foreground shadow-soft'
                  : 'text-foreground-muted hover:text-foreground'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {Icon ? <Icon className='h-6 w-6 shrink-0' /> : null}
              <span className='hidden lg:inline truncate'>{baseLabel}</span>
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

        {themeToggle ? (
          <div className='pt-2 w-full'>
            <ThemeToggle
              {...themeToggle}
              className='w-full'
            />
          </div>
        ) : null}
        <div className='pt-2'>
          <button
            type='button'
            onClick={interactionsLocked ? undefined : onCompose}
            className='inline-flex items-center justify-center lg:justify-start gap-2 rounded-2xl bg-primary h-12 w-12 lg:h-auto lg:w-full lg:px-4 lg:py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            disabled={interactionsLocked}
            aria-label={t('nav.newPostAria', 'Neuer Post')}
            aria-disabled={interactionsLocked || undefined}
            data-nav-item='compose'
            title={t('nav.newPost', 'Neuer Post')}
          >
            <PlusIcon className='h-6 w-6 shrink-0' />
            <span className='hidden lg:inline truncate'>
              {t('nav.newPost', 'Neuer Post')}
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}
