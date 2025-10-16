import { useMemo, useState, useRef, useEffect } from 'react'
import Button from './components/Button'
import BskyClientLayout from './layout/BskyClientLayout'
import Timeline from './components/Timeline'
import Composer from './components/Composer'
import ComposeModal from './components/ComposeModal'

export default function BskyClientApp () {
  const [section, setSection] = useState('home')
  const [composeOpen, setComposeOpen] = useState(false)
  const [timelineTab, setTimelineTab] = useState('discover')
  const [replyTarget, setReplyTarget] = useState(null) // { uri, cid }
  const scrollPosRef = useRef(0)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  // Bewahre die Scroll-Position beim Öffnen/Schließen des Modals
  useEffect(() => {
    const el = typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null
    if (!el) return
    if (composeOpen) {
      scrollPosRef.current = el.scrollTop || 0
    } else {
      // Restore after modal close (next tick to ensure layout stable)
      const y = scrollPosRef.current || 0
      const t = setTimeout(() => { try { el.scrollTop = y } catch {} }, 0)
      return () => clearTimeout(t)
    }
  }, [composeOpen])

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
      <div className='flex items-center gap-2 overflow-x-auto' data-component='BskyTimelineTabs'>
        {tabs.map(t => (
          <button
            key={t.id}
            type='button'
            onClick={() => setTimelineTab(t.id)}
            aria-current={timelineTab === t.id ? 'page' : undefined}
            className={`rounded-2xl px-3 py-1 text-sm transition ${
              timelineTab === t.id
                ? 'bg-background-subtle text-foreground'
                : 'text-foreground-muted'
            }`}
            data-tab={t.id}
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  }, [section, timelineTab])

  const topBlock = null

  let content = null
  if (section === 'home') content = (
    <Timeline
      tab={timelineTab}
      onReply={(target) => { setReplyTarget(target); setComposeOpen(true) }}
    />
  )
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
        topBlock={topBlock}
      >
        {content}
      </BskyClientLayout>
      <ComposeModal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setReplyTarget(null) }}
        actions={
          <div className='flex items-center gap-2'>
            <Button variant='secondary' onClick={() => setConfirmDiscard(true)}>Abbrechen</Button>
            <Button form='bsky-composer-form' type='submit' variant='primary'>Posten</Button>
          </div>
        }
      >
        <Composer reply={replyTarget} onSent={() => { setComposeOpen(false); setReplyTarget(null) }} />
      </ComposeModal>

      {/* Bestätigungsdialog: Entwurf verwerfen */}
      {composeOpen && confirmDiscard ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setConfirmDiscard(false)} aria-hidden='true' />
          <div className='relative z-50 w-[min(520px,92vw)] rounded-2xl border border-border bg-background p-5 shadow-card'>
            <h4 className='text-lg font-semibold text-foreground'>Entwurf verwerfen</h4>
            <p className='mt-2 text-sm text-foreground-muted'>Bist du sicher, dass du diesen Entwurf verwerfen möchtest?</p>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='secondary' onClick={() => setConfirmDiscard(false)}>Abbrechen</Button>
              <Button variant='primary' onClick={() => { setConfirmDiscard(false); setComposeOpen(false); setReplyTarget(null) }}>Verwerfen</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
