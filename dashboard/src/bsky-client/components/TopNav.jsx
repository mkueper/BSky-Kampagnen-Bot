export default function TopNav ({ active, onChange }) {
  const items = [
    { id: 'home', label: 'Home' },
    { id: 'compose', label: 'Compose' },
    { id: 'notifications', label: 'Benachrichtigungen' },
    { id: 'profile', label: 'Profil' },
  ]
  return (
    <div className='flex items-center gap-2 border-b pb-2'>
      {items.map((it) => (
        <button
          key={it.id}
          type='button'
          onClick={() => onChange(it.id)}
          className={`rounded-2xl px-3 py-1 text-sm transition ${
            active === it.id ? 'bg-primary text-primary-foreground' : 'hover:bg-background-subtle text-foreground-muted'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

