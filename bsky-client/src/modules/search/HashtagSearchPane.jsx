import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { searchBsky } from '../shared'
import SkeetItem from '../timeline/SkeetItem'
import { useThread } from '../../hooks/useThread'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useAppDispatch, useAppState } from '../../context/AppContext'

const HASHTAG_TABS = [
  { id: 'top', label: 'Top' },
  { id: 'latest', label: 'Neueste' }
]

export default function HashtagSearchPane () {
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
              showThreadButton
            />
          </li>
        ))}
      </ul>
    )
  }, [items, openReplyComposer, openQuoteComposer, openMediaPreview, selectThreadFromItem, handleEngagementChange])

  if (!open) return null

  return (
    <div className='flex h-full min-h-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-soft'>
      <header className='sticky top-0 z-10 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur'>
        <div className='flex items-start justify-between gap-3'>
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
        </div>
        <div className='mt-3 flex gap-3'>
          {HASHTAG_TABS.map((tab) => (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-background-subtle text-foreground shadow-soft' : 'text-foreground-muted hover:text-foreground'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className='flex-1 overflow-y-auto px-4 py-4' ref={scrollContainerRef}>
        {loading ? (
          <div className='flex min-h-[200px] items-center justify-center text-sm text-foreground-muted'>
            Suche läuft…
          </div>
        ) : null}
        {error ? <p className='text-sm text-red-600'>{error}</p> : null}
        {!loading && !error ? (
          postsList || <p className='text-sm text-foreground-muted'>Keine Ergebnisse gefunden.</p>
        ) : null}
        {cursor ? (
          <div ref={loadMoreTriggerRef} className='py-4 text-center text-xs text-foreground-muted'>
            {loadingMore ? 'Lade…' : 'Mehr Ergebnisse werden automatisch geladen…'}
          </div>
        ) : null}
      </div>
    </div>
  )
}
