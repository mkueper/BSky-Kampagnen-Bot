import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Button, searchBsky } from '../shared'
import SkeetItem from '../timeline/SkeetItem'
import { useThread } from '../../hooks/useThread'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useAppDispatch, useAppState } from '../../context/AppContext'

const HASHTAG_TABS = [
  { id: 'top', label: 'Top' },
  { id: 'latest', label: 'Neueste' }
]

export default function HashtagSearchModal () {
  const { hashtagSearch } = useAppState()
  const dispatch = useAppDispatch()
  const { selectThreadFromItem } = useThread()
  const { openReplyComposer, openQuoteComposer } = useComposer()
  const { openMediaPreview } = useMediaLightbox()

  const open = Boolean(hashtagSearch?.open && hashtagSearch?.query)
  const query = hashtagSearch?.query?.trim() || ''
  const label = hashtagSearch?.label || query
  const description = hashtagSearch?.description || ''
  const defaultTab = hashtagSearch?.tab === 'latest' ? 'latest' : 'top'

  const [activeTab, setActiveTab] = useState(defaultTab)
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const searchSignatureRef = useRef('')
  const loadMoreTriggerRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE_HASHTAG_SEARCH' })
  }, [dispatch])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, handleClose])

  useEffect(() => {
    if (!open) {
      setItems([])
      setCursor(null)
      setError('')
      setActiveTab('top')
      setReloadTick(0)
      return
    }
    setActiveTab(defaultTab)
    setReloadTick((tick) => tick + 1)
  }, [open, defaultTab, query])

  useEffect(() => {
    if (!open || !query || reloadTick === 0) return
    let ignore = false
    setLoading(true)
    setError('')
    setItems([])
    setCursor(null)
    const signature = `${query}::${activeTab}::${reloadTick}`
    searchSignatureRef.current = signature
    searchBsky({ query, type: activeTab })
      .then(({ items: nextItems, cursor: nextCursor }) => {
        if (ignore || searchSignatureRef.current !== signature) return
        setItems(nextItems)
        setCursor(nextCursor)
      })
      .catch((err) => {
        if (ignore || searchSignatureRef.current !== signature) return
        setError(err?.message || 'Suche fehlgeschlagen.')
      })
      .finally(() => {
        if (!ignore && searchSignatureRef.current === signature) {
          setLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [open, query, activeTab, reloadTick])

  const loadMore = useCallback(async () => {
    if (!open || !cursor || loading || loadingMore) return
    const requestSignature = searchSignatureRef.current
    setLoadingMore(true)
    try {
      const { items: nextItems, cursor: nextCursor } = await searchBsky({ query, type: activeTab, cursor })
      if (searchSignatureRef.current !== requestSignature) return
      setItems((prev) => [...prev, ...nextItems])
      setCursor(nextCursor)
    } catch (err) {
      if (searchSignatureRef.current !== requestSignature) return
      setError(err?.message || 'Weitere Ergebnisse konnten nicht geladen werden.')
    } finally {
      setLoadingMore(false)
    }
  }, [open, cursor, loading, loadingMore, query, activeTab])

  useEffect(() => {
    const root = scrollContainerRef.current
    if (!open || !cursor || !root || !loadMoreTriggerRef.current) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadMore()
      }
    }, {
      root,
      rootMargin: '200px 0px 200px 0px'
    })
    const target = loadMoreTriggerRef.current
    observer.observe(target)
    return () => observer.unobserve(target)
  }, [open, cursor, loadMore])

  const handleEngagementChange = useCallback((targetId, patch = {}) => {
    if (!targetId) return
    setItems((prev) => prev.map((entry) => {
      const entryId = entry.listEntryId || entry.uri || entry.cid
      if (entryId !== targetId) return entry
      const nextStats = { ...(entry.stats || {}) }
      if (patch.likeCount != null) nextStats.likeCount = patch.likeCount
      if (patch.repostCount != null) nextStats.repostCount = patch.repostCount
      const baseViewer = entry.viewer || entry?.raw?.post?.viewer || entry?.raw?.item?.viewer || {}
      const nextViewer = { ...baseViewer }
      if (patch.likeUri !== undefined) nextViewer.like = patch.likeUri
      if (patch.repostUri !== undefined) nextViewer.repost = patch.repostUri
      if (patch.bookmarked !== undefined) nextViewer.bookmarked = patch.bookmarked
      const nextRaw = entry.raw ? { ...entry.raw } : null
      if (nextRaw?.post) nextRaw.post = { ...nextRaw.post, viewer: nextViewer }
      else if (nextRaw?.item) nextRaw.item = { ...nextRaw.item, viewer: nextViewer }
      return {
        ...entry,
        stats: nextStats,
        viewer: nextViewer,
        raw: nextRaw || entry.raw
      }
    }))
  }, [])

  const postsList = useMemo(() => {
    if (!items || items.length === 0) return null
    return (
      <ul className='space-y-4'>
        {items.map((item, idx) => (
          <li key={item.listEntryId || item.uri || item.cid || `hashtag-${idx}`}>
            <SkeetItem
              item={item}
              onReply={openReplyComposer}
              onQuote={openQuoteComposer}
              onViewMedia={openMediaPreview}
              onSelect={selectThreadFromItem ? ((selected) => selectThreadFromItem(selected || item)) : undefined}
              onEngagementChange={handleEngagementChange}
            />
          </li>
        ))}
      </ul>
    )
  }, [items, openReplyComposer, openQuoteComposer, openMediaPreview, selectThreadFromItem, handleEngagementChange])

  if (!open) return null

  return (
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={handleClose} aria-hidden='true' />
      <div className='relative z-50 flex h-full w-full items-center justify-center p-2 sm:p-6'>
        <div className='flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-none border border-border bg-background shadow-2xl sm:rounded-2xl'>
          <header className='flex items-start justify-between border-b border-border px-4 py-3 sm:px-6'>
            <div className='min-w-0'>
              <p className='text-xs uppercase tracking-wide text-foreground-muted'>Hashtag</p>
              <h2 className='text-xl font-semibold text-foreground'>{label || query}</h2>
              {description ? (
                <p className='text-sm text-foreground-muted'>{description}</p>
              ) : null}
            </div>
            <button
              type='button'
              onClick={handleClose}
              className='rounded-full p-2 text-foreground-muted transition hover:bg-background-subtle hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
              aria-label='Hashtag-Suche schließen'
            >
              <Cross2Icon className='h-5 w-5' />
            </button>
          </header>
          <div className='border-b border-border px-4 pt-3 sm:px-6'>
            <div className='flex gap-3'>
              {HASHTAG_TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className='flex-1 overflow-y-auto px-4 py-4 sm:px-6' ref={scrollContainerRef}>
            {error ? (
              <div className='mb-4 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                <p className='font-semibold'>Fehler</p>
                <p>{error}</p>
                <div className='mt-3'>
                  <Button variant='secondary' size='pill' onClick={() => setReloadTick((tick) => tick + 1)}>Erneut versuchen</Button>
                </div>
              </div>
            ) : null}
            {loading ? (
              <p className='text-sm text-foreground-muted'>Beiträge werden geladen …</p>
            ) : null}
            {!loading && !error && (!items || items.length === 0) ? (
              <p className='text-sm text-foreground-muted'>Keine Beiträge gefunden.</p>
            ) : null}
            {postsList}
            <div ref={loadMoreTriggerRef} aria-hidden='true' />
            {loadingMore ? (
              <p className='mt-4 text-center text-sm text-foreground-muted'>Weitere Beiträge werden geladen …</p>
            ) : null}
            {!loading && !loadingMore && cursor ? (
              <div className='mt-4 flex justify-center'>
                <Button variant='outline' size='pill' onClick={loadMore}>Mehr laden</Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
