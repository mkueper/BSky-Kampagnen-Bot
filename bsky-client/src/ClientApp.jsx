import { useMemo, useState } from 'react'
import BskyClientLayout from './layout/BskyClientLayout'
import Timeline from './components/Timeline'
import Composer from './components/Composer'
import ComposeModal from './components/ComposeModal'

export default function BskyClientApp () {
  const [section, setSection] = useState('home')
  const [composeOpen, setComposeOpen] = useState(false)
  const [timelineTab, setTimelineTab] = useState('discover')

  const headerContent = useMemo(() => {
    if (section !== 'home') return null
    const tabs = [
      { id: 'discover', label: 'Discover' },
      { id: 'following', label: 'Following' },
      { id: 'friends-popular', label: 'Popular with Friends' },
      { id: 'mutuals', label: 'Mutuals' },
      { id: 'best-of-follows', label: 'Best of Follows' }
    ]
    return (
      <article className='group rounded-2xl'>
        <div className='flex items-center gap-2 overflow-x-auto'>
          {tabs.map(t => (
            <button
              key={t.id}
              type='button'
              onClick={() => setTimelineTab(t.id)}
              className={`rounded-2xl px-3 py-1 text-sm transition ${
                timelineTab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-background-subtle text-foreground-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </article>
    )
  }, [section, timelineTab])

  let content = null
  if (section === 'home') content = <Timeline tab={timelineTab} />
  else if (section === 'search') content = <div className='text-sm text-muted-foreground'>Suche – folgt</div>
  else if (section === 'notifications') content = <div className='text-sm text-muted-foreground'>Mitteilungen – folgt</div>
  else if (section === 'chat') content = <div className='text-sm text-muted-foreground'>Chat – später</div>
  else if (section === 'feeds') content = <div className='text-sm text-muted-foreground'>Feeds – folgt</div>
  else if (section === 'lists') content = <div className='text-sm text-muted-foreground'>Listen – folgt</div>
  else if (section === 'saved') content = <div className='text-sm text-muted-foreground'>Gespeichert – folgt</div>
  else if (section === 'profile') content = <div className='text-sm text-muted-foreground'>Profil – folgt</div>
  else if (section === 'settings') content = <div className='text-sm text-muted-foreground'>Einstellungen – folgt</div>

  return (
    <>
      <BskyClientLayout
        activeSection={section}
        onSelectSection={setSection}
        onOpenCompose={() => setComposeOpen(true)}
        headerContent={headerContent}
      >
        {content}
      </BskyClientLayout>
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)}>
        <Composer />
      </ComposeModal>
    </>
  )
}
