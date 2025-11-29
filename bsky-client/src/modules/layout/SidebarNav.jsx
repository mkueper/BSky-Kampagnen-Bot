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
  SlashIcon
} from '@radix-ui/react-icons';
import { useTranslation } from '../../i18n/I18nProvider.jsx';

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
];

export default function SidebarNav({ active, onSelect, onCompose, notificationsUnread = 0, themeToggle = null, interactionsLocked = false }) {
  const ThemeToggleIcon = themeToggle?.Icon || null;
  const { t } = useTranslation();
  const normalizedUnread = Number.isFinite(notificationsUnread) ? notificationsUnread : 0;
  return (
    <nav
      className="flex h-full w-full flex-col items-start gap-2"
      data-component="BskyPrimaryNav"
      aria-label="Hauptnavigation"
    >
      <div
        className="min-h-0 flex flex-1 flex-col space-y-1 overflow-y-auto pr-1"
        style={{ scrollbarGutter: 'stable' }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const disabled = Boolean(item.disabled) || interactionsLocked;
          const showBadge = item.id === 'notifications' && normalizedUnread > 0;
          const badgeLabel = normalizedUnread > 30 ? '30+' : String(normalizedUnread);
          const baseLabel = t(item.labelKey, item.defaultLabel);
          const label = showBadge
            ? t('nav.notificationsWithCount', '{label} ({count} neu)', { label: baseLabel, count: badgeLabel })
            : baseLabel;
          return (
            <button
              key={item.id}
              type="button"
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
              {Icon ? <Icon className="h-6 w-6 shrink-0" /> : null}
              <span className="hidden lg:inline truncate">{baseLabel}</span>
              <span
                className={`absolute top-2 right-2 lg:static lg:ml-1 lg:mr-1 inline-flex h-5 w-[2.2rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity ${
                  showBadge ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden={!showBadge}
              >
                {badgeLabel}
              </span>
            </button>
          );
        })}

        <div className="pt-2">
          <hr className="border-t border-border" />
        </div>

        {themeToggle ? (
          <div className="pt-2 w-full">
            <button
              type="button"
              onClick={themeToggle.onToggle}
              className="inline-flex h-12 w-12 lg:h-auto lg:w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background-subtle lg:px-4 lg:py-3 text-sm text-foreground transition hover:bg-background"
              aria-label={t('nav.themeSwitch', `Theme wechseln – nächstes: ${themeToggle.nextLabel || ''}`, { label: themeToggle.nextLabel || '' })}
              title={t('nav.themeSwitch', `Theme wechseln – nächstes: ${themeToggle.nextLabel || ''}`, { label: themeToggle.nextLabel || '' })}
            >
              {ThemeToggleIcon ? <ThemeToggleIcon className="h-6 w-5" /> : null}
              <span className="hidden lg:inline truncate">{t('nav.themeButton', 'Theme')}</span>
              <span className="hidden lg:inline text-xs text-foreground-muted">
                {themeToggle.label}
              </span>
              {themeToggle?.nextConfig?.colors && (
                <span
                  className="hidden lg:inline-block h-4 w-4 rounded-full ml-auto"
                  style={{
                    backgroundColor: themeToggle.nextConfig.colors.background,
                    border: `2px solid ${themeToggle.nextConfig.colors.background}`
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        ) : null}
        <div className="pt-2">
          <button
            type="button"
            onClick={interactionsLocked ? undefined : onCompose}
            className="inline-flex items-center justify-center lg:justify-start gap-2 rounded-2xl bg-primary h-12 w-12 lg:h-auto lg:w-full lg:px-4 lg:py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            disabled={interactionsLocked}
            aria-label={t('nav.newPostAria', 'Neuer Post')}
            aria-disabled={interactionsLocked || undefined}
            data-nav-item="compose"
            title={t('nav.newPost', 'Neuer Post')}
          >
            <PlusIcon className="h-6 w-6 shrink-0" />
            <span className="hidden lg:inline truncate">{t('nav.newPost', 'Neuer Post')}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
