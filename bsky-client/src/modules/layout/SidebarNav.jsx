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
} from '@radix-ui/react-icons';

export const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'search', label: 'Suchen', icon: MagnifyingGlassIcon },
  { id: 'notifications', label: 'Mitteilungen', icon: BellIcon },
  { id: 'chat', label: 'Chat', icon: ChatBubbleIcon, disabled: true },
  { id: 'feeds', label: 'Feeds', icon: LayersIcon },
  { id: 'lists', label: 'Listen', icon: ListBulletIcon },
  { id: 'saved', label: 'Gespeichert', icon: BookmarkIcon },
  { id: 'profile', label: 'Profil', icon: PersonIcon },
  { id: 'settings', label: 'Einstellungen', icon: GearIcon },
  { id: 'dashboard', label: 'Dashboard', icon: ViewHorizontalIcon },
];

export default function SidebarNav({ active, onSelect, onCompose, notificationsUnread = 0, themeToggle = null }) {
  const ThemeToggleIcon = themeToggle?.Icon || null;
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
          const disabled = Boolean(item.disabled);
          const showBadge = item.id === 'notifications' && notificationsUnread > 0;
          const badgeLabel = notificationsUnread > 30 ? '30+' : String(notificationsUnread);
          const label = showBadge ? `${item.label} (${badgeLabel} neu)` : item.label;
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
              className={`relative inline-flex items-center rounded-2xl text-sm transition justify-center xl:justify-start gap-0 xl:gap-3 h-12 w-12 xl:h-auto xl:w-auto xl:px-4 xl:py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? 'bg-background-subtle text-foreground shadow-soft'
                  : 'text-foreground-muted hover:text-foreground'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {Icon ? <Icon className="h-6 w-6 shrink-0" /> : null}
              <span className="hidden xl:inline truncate">{item.label}</span>
              <span
                className={`absolute top-2 right-2 xl:static xl:ml-1 xl:mr-1 inline-flex h-5 w-[2.2rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity ${
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
              className="inline-flex h-12 w-12 xl:h-auto xl:w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background-subtle xl:px-4 xl:py-3 text-sm text-foreground transition hover:bg-background"
              aria-label={`Theme wechseln – nächstes: ${themeToggle.nextLabel}`}
              title={`Theme wechseln – nächstes: ${themeToggle.nextLabel}`}
            >
              {ThemeToggleIcon ? <ThemeToggleIcon className="h-6 w-5" /> : null}
              <span className="hidden xl:inline truncate">Theme</span>
              <span className="hidden xl:inline text-xs text-foreground-muted">
                {themeToggle.label}
              </span>
              {themeToggle?.nextConfig?.colors && (
                <span
                  className="hidden xl:inline-block h-4 w-4 rounded-full ml-auto"
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
            onClick={onCompose}
            className="inline-flex items-center justify-center xl:justify-start gap-2 rounded-2xl bg-primary h-12 w-12 xl:h-auto xl:w-full xl:px-4 xl:py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Neuer Post"
            data-nav-item="compose"
            title="Neuer Post"
          >
            <PlusIcon className="h-6 w-6 shrink-0" />
            <span className="hidden xl:inline truncate">Neuer Post</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
