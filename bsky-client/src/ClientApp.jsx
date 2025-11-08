import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BskyClientLayout, HorizontalScrollContainer } from './modules/layout'
import { Timeline, ThreadView } from './modules/timeline'
import { Composer, ComposeModal } from './modules/composer'
import { Notifications } from './modules/notifications'
import { Button, MediaLightbox, fetchThread as fetchThreadApi, fetchTimeline as fetchTimelineApi } from './modules/shared'
import { ReloadIcon } from '@radix-ui/react-icons'

export default function BskyClientApp () {
  const [section, setSection] = useState('home')
  const [composeOpen, setComposeOpen] = useState(false)
  const [timelineTab, setTimelineTab] = useState('discover')
  const [replyTarget, setReplyTarget] = useState(null)
  const [quoteTarget, setQuoteTarget] = useState(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [notificationsRefreshTick, setNotificationsRefreshTick] = useState(0)
  const [timelineTopUri, setTimelineTopUri] = useState('')
  const [timelineHasNew, setTimelineHasNew] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(true)
  const [timelineReady, setTimelineReady] = useState(false)
  const [mediaLightbox, setMediaLightbox] = useState({ open: false, images: [], index: 0 })
  const [threadState, setThreadState] = useState({ active: false, loading: false, error: '', data: null, uri: null })
  const scrollPosRef = useRef(0)
  const threadScrollPosRef = useRef(0)
  const threadHistoryRef = useRef([])

  const getScrollContainer = useCallback(
    () => (typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null),
    []
  )

  const refreshTimeline = useCallback(() => {
    setTimelineHasNew(false)
    setTimelineReady(false)
    setRefreshTick((tick) => tick + 1)
  }, [])

  const refreshNotifications = useCallback(() => setNotificationsRefreshTick((tick) => tick + 1), [])

  const openReplyComposer = useCallback((target) => {
    setQuoteTarget(null)
    setReplyTarget(target)
    setComposeOpen(true)
  }, [])

  const resolveQuoteTarget = useCallback((source) => {
    if (!source) return null
    const rawPost = source?.raw?.post || null
    const record = rawPost?.record || source?.record || {}
    const author = source?.author || rawPost?.author || record?.author || {}
    const uri = source?.uri || rawPost?.uri || record?.uri || ''
    const cid = source?.cid || rawPost?.cid || record?.cid || ''
    if (!uri || !cid) return null
    return {
      uri,
      cid,
      text: source?.text || record?.text || '',
      author: {
        handle: author?.handle || '',
        displayName: author?.displayName || author?.handle || '',
        avatar: author?.avatar || null
      }
    }
  }, [])

  const openQuoteComposer = useCallback((source) => {
    const normalized = resolveQuoteTarget(source)
    if (!normalized) return
    setReplyTarget(null)
    setQuoteTarget(normalized)
    setComposeOpen(true)
  }, [resolveQuoteTarget])

  const resetComposerTargets = useCallback(() => {
    setReplyTarget(null)
    setQuoteTarget(null)
  }, [])

  const openMediaPreview = useCallback((items = [], startIndex = 0) => {
    if (!Array.isArray(items) || items.length === 0) return
    const safeIndex = Math.max(0, Math.min(startIndex, items.length - 1))
    setMediaLightbox({ open: true, images: items, index: safeIndex })
  }, [])

  const closeMediaPreview = useCallback(() => {
    setMediaLightbox(prev => ({ ...prev, open: false }))
  }, [])

  const navigateMediaPreview = useCallback((direction) => {
    setMediaLightbox(prev => {
      if (!prev.open || prev.images.length === 0) return prev
      const delta = direction === 'prev' ? -1 : 1
      const nextIndex = (prev.index + delta + prev.images.length) % prev.images.length
      return { ...prev, index: nextIndex }
    })
  }, [])

  const closeThread = useCallback((options = {}) => {
    const { force = false } = options
    const history = threadHistoryRef.current
    if (!force && Array.isArray(history) && history.length > 0) {
      const previous = history[history.length - 1]
      threadHistoryRef.current = history.slice(0, -1)
      setThreadState(previous || { active: false, loading: false, error: '', data: null, uri: null })
      return
    }
    threadHistoryRef.current = []
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
    setThreadState((prev) => {
      if (!prev?.active) {
        threadHistoryRef.current = []
      } else if (prev?.uri && prev.uri !== normalized) {
        threadHistoryRef.current = [...threadHistoryRef.current, { ...prev }]
      }
      return {
        active: true,
        loading: true,
        error: '',
        data: prev?.uri === normalized ? prev.data : null,
        uri: normalized
      }
    })
    try {
      const data = await fetchThreadApi(normalized)
      setThreadState({ active: true, loading: false, error: '', data, uri: normalized });
    } catch (error) {
      console.error('Thread konnte nicht geladen werden', error)
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
        const busy = threadState.loading
        return (
          <div className='flex items-center justify-between gap-3' data-component='BskyThreadHeader'>
            <p className='text-sm text-foreground-muted truncate'>Thread-Ansicht</p>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='pill'
                onClick={reloadThread}
                disabled={busy}
                aria-label='Thread neu laden'
              >
                <ReloadIcon className={`h-4 w-4 shrink-0 transition ${busy ? 'animate-spin' : ''}`} />
                <span className='hidden sm:inline pl-1'>Neu laden</span>
              </Button>
              <Button variant='secondary' size='pill' onClick={closeThread}>Zurueck zur Timeline</Button>
            </div>
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
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <HorizontalScrollContainer
            className='max-w-full'
            data-component='BskyTimelineHeaderContent'
          >
            {tabs.map(t => (
              <button
                key={t.id}
                type='button'
                onClick={() => {
                  if (threadState.active) closeThread({ force: true })
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
            disabled={!timelineReady || timelineLoading || !timelineHasNew}
            className='whitespace-nowrap'
          >
            {timelineHasNew ? 'Neue Beitraege anzeigen' : 'Aktuell'}
          </Button>
        </div>
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
  }, [section, threadState.active, threadState.loading, closeThread, timelineTab, refreshTimeline, refreshNotifications, timelineReady, timelineHasNew, timelineLoading, getScrollContainer])

  const topBlock = null

  const homeContent = (
    <div className='space-y-6'>
      <div aria-hidden={threadState.active} style={{ display: threadState.active ? 'none' : 'block' }}>
        <Timeline
          tab={timelineTab}
          refreshKey={refreshTick}
          onLoadingChange={setTimelineLoading}
          isActive={section === 'home'}
          onReply={openReplyComposer}
          onQuote={openQuoteComposer}
          onViewMedia={openMediaPreview}
          onSelectPost={selectThreadFromItem}
          onTopItemChange={(item) => {
            const nextUri = item?.uri || ''
            setTimelineTopUri(nextUri)
            setTimelineHasNew(false)
            setTimelineReady(true)
          }}
        />
      </div>
      {threadState.active ? (
        <ThreadView
          state={threadState}
          onReload={reloadThread}
          onReply={openReplyComposer}
          onQuote={openQuoteComposer}
          onViewMedia={openMediaPreview}
          onSelectPost={selectThreadFromItem}
        />
      ) : null}
    </div>
  )

  let secondaryContent = null
  if (section === 'search') secondaryContent = <div className='text-sm text-muted-foreground'>Suche folgt</div>
  else if (section === 'notifications') {
    secondaryContent = (
      <Notifications
        refreshKey={notificationsRefreshTick}
        onSelectPost={selectThreadFromItem}
        onReply={openReplyComposer}
        onQuote={openQuoteComposer}
      />
    )
  }
  else if (section === 'chat') secondaryContent = <div className='text-sm text-muted-foreground'>Chat folgt</div>
  else if (section === 'feeds') secondaryContent = <div className='text-sm text-muted-foreground'>Feeds folgt</div>
  else if (section === 'lists') secondaryContent = <div className='text-sm text-muted-foreground'>Listen folgt</div>
  else if (section === 'saved') secondaryContent = <div className='text-sm text-muted-foreground'>Gespeichert folgt</div>
  else if (section === 'profile') secondaryContent = <div className='text-sm text-muted-foreground'>Profil folgt</div>
  else if (section === 'settings') secondaryContent = <div className='text-sm text-muted-foreground'>Einstellungen folgt</div>

  useEffect(() => {
    setTimelineReady(false)
  }, [timelineTab])


  return (
    <>
      <BskyClientLayout
        activeSection={section}
        onSelectSection={(id) => {
          if (id === 'home') {
            if (threadState.active) closeThread({ force: true })
            else if (section === 'home') refreshTimeline()
            setSection('home')
            return
          }
          if (threadState.active) closeThread({ force: true })
          setTimelineHasNew(false)
          setSection(id)
        }}
        onOpenCompose={() => setComposeOpen(true)}
        headerContent={headerContent}
        topBlock={topBlock}
      >
        <div style={{ display: section === 'home' ? 'block' : 'none' }} aria-hidden={section !== 'home'}>
          {homeContent}
        </div>
        {section === 'home' ? null : secondaryContent}
      </BskyClientLayout>
      <ComposeModal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); resetComposerTargets() }}
        title={replyTarget ? 'Antworten' : (quoteTarget ? 'Post zitieren' : 'Neuer Post')}
        actions={
          <div className='flex items-center gap-2'>
            <Button variant='secondary' onClick={() => setConfirmDiscard(true)}>Abbrechen</Button>
            <Button form='bsky-composer-form' type='submit' variant='primary'>Posten</Button>
          </div>
        }
      >
        <Composer
          reply={replyTarget}
          quote={quoteTarget}
          onCancelQuote={() => setQuoteTarget(null)}
          onSent={() => {
            setComposeOpen(false)
            resetComposerTargets()
          }}
        />
      </ComposeModal>

      {composeOpen && confirmDiscard ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setConfirmDiscard(false)} aria-hidden='true' />
          <div className='relative z-50 w-[min(520px,92vw)] rounded-2xl border border-border bg-background p-5 shadow-card'>
            <h4 className='text-lg font-semibold text-foreground'>Entwurf verwerfen</h4>
            <p className='mt-2 text-sm text-foreground-muted'>Bist du sicher, dass du diesen Entwurf verwerfen moechtest?</p>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='secondary' onClick={() => setConfirmDiscard(false)}>Abbrechen</Button>
              <Button variant='primary' onClick={() => {
                setConfirmDiscard(false)
                setComposeOpen(false)
                resetComposerTargets()
              }}>Verwerfen</Button>
            </div>
          </div>
        </div>
      ) : null}

      {mediaLightbox.open ? (
        <MediaLightbox
          images={mediaLightbox.images}
          index={mediaLightbox.index}
          onClose={closeMediaPreview}
          onNavigate={navigateMediaPreview}
        />
      ) : null}
    </>
  )
}
