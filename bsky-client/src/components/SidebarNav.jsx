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
  PlusIcon
} from '@radix-ui/react-icons'

const NAV = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'search', label: 'Suchen', icon: MagnifyingGlassIcon },
  { id: 'notifications', label: 'Mitteilungen', icon: BellIcon },
  { id: 'chat', label: 'Chat', icon: ChatBubbleIcon, disabled: true },
  { id: 'feeds', label: 'Feeds', icon: LayersIcon },
  { id: 'lists', label: 'Listen', icon: ListBulletIcon },
  { id: 'saved', label: 'Gespeichert', icon: BookmarkIcon },
  { id: 'profile', label: 'Profil', icon: PersonIcon },
  { id: 'settings', label: 'Einstellungen', icon: GearIcon }
]

export default function SidebarNav ({ active, onSelect, onCompose }) {
  return (
    <nav className='flex h-full flex-col items-center gap-2'>
      <div className='flex-1 space-y-1'>
        {NAV.map(item => {
          const Icon = item.icon
          const isActive = active === item.id
          const disabled = Boolean(item.disabled)
          return (
            <button
              key={item.id}
              type='button'
              onClick={() => !disabled && onSelect(item.id)}
              disabled={disabled}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-sm transition ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'text-foreground hover:bg-background-subtle'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={item.label}
              title={item.label}
            >
              {Icon ? <Icon className='h-5 w-5 shrink-0' /> : null}
            </button>
          )
        })}
      </div>
      <div className='pt-2'>
        <button
          type='button'
          onClick={onCompose}
          className='inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95'
          aria-label='Neuer Post'
          title='Neuer Post'
        >
          <PlusIcon className='h-5 w-5' />
        </button>
      </div>
    </nav>
  )
}
