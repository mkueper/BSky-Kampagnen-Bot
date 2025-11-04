import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BskyClientLayout, HorizontalScrollContainer } from './modules/layout'
import { Timeline, ThreadView } from './modules/timeline'
import { Composer, ComposeModal } from './modules/composer'
import { Notifications } from './modules/notifications'
import { Button, fetchThread as fetchThreadApi, fetchTimeline as fetchTimelineApi } from './modules/shared'

export default function BskyClientApp () {
  const [section, setSection] = useState('home')
  const [composeOpen, setComposeOpen] = useState(false)
  const [timelineTab, setTimelineTab] = useState('discover')
  const [replyTarget, setReplyTarget] = useState(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [notificationsRefreshTick, setNotificationsRefreshTick] = useState(0)
  const [timelineTopUri, setTimelineTopUri] = useState('')
  const [timelineHasNew, setTimelineHasNew] = useState(false)
  const [threadState, setThreadState] = useState({ active: false, loading: false, error: '', data: null, uri: null })
  const scrollPosRef = useRef(0)
  const threadScrollPosRef = useRef(0)

  const getScrollContainer = useCallback(
    () => (typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null),
    []
  )

  const refreshTimeline = useCallback(() => {
    setTimelineHasNew(false)
    setRefreshTick((tick) => tick + 1)
  }, [])

  const refreshNotifications = useCallback(() => setNotificationsRefreshTick((tick) => tick + 1), [])

  const openReplyComposer = useCallback((target) => {
    setReplyTarget(target)
    setComposeOpen(true)
  }, [])

  const closeThread = useCallback(() => {
    setThreadState({ active: false, loading: false, error: '', data: null, uri: null })
    const el = getScrollContainer()
    if (el) el.scrollTop = threadScrollPosRef.current || 0
  }, [getScrollContainer])

  const loadThread = useCallback(async (uri, { rememberScroll = false } = {}) => {
    const normalized = String(uri || '').trim()
    if (!normalized) return
    if (rememberScroll) {
      const el = getScrollContainer()
      if (el) threadScrollPosRef.current = el.scrollTop || 0
    }
    setThreadState((prev) => ({
      active: true,
      loading: true,
      error: '',
      data: prev?.uri === normalized ? prev.data : null,
      uri: normalized
    }))
    try {
      const data = await fetchThreadApi(normalized)
      setThreadState({ active: true, loading: false, error: '', data, uri: normalized })
    } catch (error) {
      setThreadState({
        active: true,
        loading: false,
        data: null,
        uri: normalized,
        error: error?.message || 'Thread konnte nicht geladen werden.'
      })
    }
  }, [getScrollContainer])

  const selectThreadFromItem = useCallback((item) => {
    const uri = item?.uri || item?.raw?.post?.uri
    if (uri) loadThread(uri, { rememberScroll: !threadState.active })
  }, [loadThread, threadState.active])

  const reloadThread = useCallback(() => {
    if (threadState.uri) loadThread(threadState.uri)
  }, [threadState.uri, loadThread])

  useEffect(() => {
    const el = getScrollContainer()
    if (!el) return
    if (composeOpen) {
      scrollPosRef.current = el.scrollTop || 0
    } else {
      const y = scrollPosRef.current || 0
      const t = setTimeout(() => { try { el.scrollTop = y } catch {} }, 0)
      return () => clearTimeout(t)
    }
  }, [composeOpen, getScrollContainer])

  useEffect(() => {
    if (section !== 'home') return undefined
    if (!timelineTopUri) return undefined

    let ignore = false

    const check = async () => {
      try {
        const { items } = await fetchTimelineApi({ tab: timelineTab, limit: 1 })
        const topUri = items?.[0]?.uri || ''
        if (!ignore && topUri && timelineTopUri && topUri !== timelineTopUri) {
          setTimelineHasNew(true)
        }
      } catch {}
    }

    check()
    const id = window.setInterval(check, 45000)
    return () => {
      ignore = true
      window.clearInterval(id)
    }
  }, [section, timelineTab, timelineTopUri])

  const headerContent = useMemo(() => {
    if (section === 'home') {
      if (threadState.active) {
        return (
          <div className='flex items-center justify-between gap-3' data-component='BskyThreadHeader'>
            <p className='text-sm text-foreground-muted truncate'>Thread-Ansicht</p>
            <Button variant='secondary' size='pill' onClick={closeThread}>Zurueck zur Timeline</Button>
          </div>
        )
      }
      const tabs = [
        { id: 'discover', label: 'Discover' },
        { id: 'following', label: 'Following' },
        { id: 'friends-popular', label: 'Popular with Friends' },
        { id: 'mutuals', label: 'Mutuals' },
        { id: 'best-of-follows', label: 'Best of Follows' }
      ]
      return (
        <HorizontalScrollContainer
          className='max-w-full'
          data-component='BskyTimelineHeaderContent'
        >
          {tabs.map(t => (
            <button
              key={t.id}
              type='button'
              onClick={() => {
                if (threadState.active) closeThread()
                if (timelineTab === t.id) refreshTimeline()
                setTimelineHasNew(false)
                setTimelineTopUri('')
                setTimelineTab(t.id)
              }}
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
        </HorizontalScrollContainer>
      )
    }
    if (section === 'notifications') {
      return (
        <div className='flex items-center justify-between gap-3'>
          <p className='text-sm text-foreground-muted'>Mitteilungen</p>
          <Button variant='secondary' size='pill' onClick={refreshNotifications}>Aktualisieren</Button>
        </div>
      )
    }
    return null
  }, [section, threadState.active, closeThread, timelineTab, refreshTimeline, refreshNotifications])

  const topBlock = null

  let content = null
  if (section === 'home') {
    content = (
      <div className='space-y-6'>
        {timelineHasNew && !threadState.active ? (
          <div className='sticky top-3 z-30 flex justify-center'>
            <Button
              variant='primary'
              size='pill'
              onClick={() => {
                const el = getScrollContainer()
                if (el) {
                  try { el.scrollTo({ top: 0, behavior: 'smooth' }) } catch { el.scrollTop = 0 }
                }
                refreshTimeline()
              }}
            >
              Neue Beitraege anzeigen
            </Button>
          </div>
        ) : null}
        <div aria-hidden={threadState.active} style={{ display: threadState.active ? 'none' : 'block' }}>
          <Timeline
            tab={timelineTab}
            refreshKey={refreshTick}
            onReply={openReplyComposer}
            onSelectPost={selectThreadFromItem}
            onTopItemChange={(item) => {
              const nextUri = item?.uri || ''
              setTimelineTopUri(nextUri)
              setTimelineHasNew(false)
            }}
          />
        </div>
        {threadState.active ? (
          <ThreadView
            state={threadState}
            onReload={reloadThread}
            onReply={openReplyComposer}
            onSelectPost={selectThreadFromItem}
          />
        ) : null}
      </div>
    )
  } else if (section === 'search') content = <div className='text-sm text-muted-foreground'>Suche folgt</div>
  else if (section === 'notifications') {
    content = (
      <Notifications
        refreshKey={notificationsRefreshTick}
        onSelectPost={selectThreadFromItem}
        onReply={openReplyComposer}
      />
    )
  }
  else if (section === 'chat') content = <div className='text-sm text-muted-foreground'>Chat folgt</div>
  else if (section === 'feeds') content = <div className='text-sm text-muted-foreground'>Feeds folgt</div>
  else if (section === 'lists') content = <div className='text-sm text-muted-foreground'>Listen folgt</div>
  else if (section === 'saved') content = <div className='text-sm text-muted-foreground'>Gespeichert folgt</div>
  else if (section === 'profile') content = <div className='text-sm text-muted-foreground'>Profil folgt</div>
  else if (section === 'settings') content = <div className='text-sm text-muted-foreground'>Einstellungen folgt</div>

  return (
    <>
      <BskyClientLayout
        activeSection={section}
        onSelectSection={(id) => {
          if (id === 'home') {
            if (threadState.active) closeThread()
            else if (section === 'home') refreshTimeline()
            setSection('home')
            return
          }
          if (threadState.active) closeThread()
          setTimelineHasNew(false)
          setSection(id)
        }}
        onOpenCompose={() => setComposeOpen(true)}
        headerContent={headerContent}
        topBlock={topBlock}
      >
        {content}
      </BskyClientLayout>
      <ComposeModal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setReplyTarget(null) }}
        title={replyTarget ? 'Antworten' : 'Neuer Post'}
        actions={
          <div className='flex items-center gap-2'>
            <Button variant='secondary' onClick={() => setConfirmDiscard(true)}>Abbrechen</Button>
            <Button form='bsky-composer-form' type='submit' variant='primary'>Posten</Button>
          </div>
        }
      >
        <Composer reply={replyTarget} onSent={() => { setComposeOpen(false); setReplyTarget(null) }} />
      </ComposeModal>

      {composeOpen && confirmDiscard ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setConfirmDiscard(false)} aria-hidden='true' />
          <div className='relative z-50 w-[min(520px,92vw)] rounded-2xl border border-border bg-background p-5 shadow-card'>
            <h4 className='text-lg font-semibold text-foreground'>Entwurf verwerfen</h4>
            <p className='mt-2 text-sm text-foreground-muted'>Bist du sicher, dass du diesen Entwurf verwerfen moechtest?</p>
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
