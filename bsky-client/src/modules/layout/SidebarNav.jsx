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
} from '@radix-ui/react-icons';

const NAV = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'search', label: 'Suchen', icon: MagnifyingGlassIcon },
  { id: 'notifications', label: 'Mitteilungen', icon: BellIcon },
  { id: 'chat', label: 'Chat', icon: ChatBubbleIcon, disabled: true },
  { id: 'feeds', label: 'Feeds', icon: LayersIcon },
  { id: 'lists', label: 'Listen', icon: ListBulletIcon },
  { id: 'saved', label: 'Gespeichert', icon: BookmarkIcon },
  { id: 'profile', label: 'Profil', icon: PersonIcon },
  { id: 'settings', label: 'Einstellungen', icon: GearIcon },
];

export default function SidebarNav({ active, onSelect, onCompose }) {
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
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const disabled = Boolean(item.disabled);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => !disabled && onSelect(item.id)}
              disabled={disabled}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={disabled || undefined}
              className={`inline-flex items-center rounded-2xl text-sm transition justify-center xl:justify-start gap-0 xl:gap-3 h-14 w-14 xl:h-auto xl:w-auto xl:px-4 xl:py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? 'bg-background-subtle text-foreground shadow-soft'
                  : 'text-foreground-muted hover:text-foreground'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={item.label}
              data-nav-item={item.id}
              title={item.label}
            >
              {Icon ? <Icon className="h-10 w-10 shrink-0" /> : null}
              <span className="hidden xl:inline truncate">{item.label}</span>
            </button>
          );
        })}
        <div className="pt-2">
          <button
            type="button"
            onClick={onCompose}
            className="inline-flex items-center justify-center xl:justify-start gap-2 rounded-2xl bg-primary h-14 w-14 xl:h-auto xl:w-auto xl:px-4 xl:py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Neuer Post"
            data-nav-item="compose"
            title="Neuer Post"
          >
            <PlusIcon className="h-10 w-10" />
            <span className="hidden xl:inline truncate">Neuer Post</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
