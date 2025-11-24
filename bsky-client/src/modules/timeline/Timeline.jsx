import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SkeetItem from './SkeetItem'
import SkeetItemSkeleton from './SkeetItemSkeleton.jsx'
import { fetchTimeline as fetchTimelineApi } from '../shared'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useThread } from '../../hooks/useThread'

export default function Timeline ({ renderMode, isActive = true }) {
  const { timelineTab: tab, timelineSource: source, refreshTick: refreshKey } = useAppState()
  const dispatch = useAppDispatch()
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const { selectThreadFromItem: onSelectPost } = useThread()

  const onLoadingChange = useCallback((loading) => {
    dispatch({ type: 'SET_TIMELINE_LOADING', payload: loading })
  }, [dispatch])

  const onTopItemChange = useCallback((item) => {
    const nextUri = item?.uri || ''
    dispatch({ type: 'SET_TIMELINE_TOP_URI', payload: nextUri })
  }, [dispatch])

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursorState] = useState(null)
  const cursorRef = useRef(null)
  const updateCursor = useCallback((value) => {
    cursorRef.current = value
    setCursorState(value)
  }, [])
  const [loadingMore, setLoadingMore] = useState(false)
  const hasMore = useMemo(() => Boolean(cursor), [cursor])
  const sourceFeedUri = source?.feedUri || null
  const sourceTab = source?.id || tab
  const timelineSource = useMemo(() => {
    if (sourceFeedUri) return { feedUri: sourceFeedUri, tab: null }
    return { feedUri: null, tab: sourceTab }
  }, [sourceFeedUri, sourceTab])

  const variant = useMemo(() => {
    if (renderMode === 'flat' || renderMode === 'card') return renderMode
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('bsky.renderMode') : null
      if (stored === 'flat' || stored === 'card') return stored
    } catch {}
    return 'card'
  }, [renderMode])

  const fetchPage = useCallback(async ({ withCursor, limit } = {}) => {
    const params = {
      cursor: withCursor,
      limit
    }
    if (timelineSource.feedUri) params.feedUri = timelineSource.feedUri
    else params.tab = timelineSource.tab
    const { items: nextItems, cursor: nextCursor } = await fetchTimelineApi(params)
    return { nextItems, nextCursor }
  }, [timelineSource])

  // Initial load and tab change
  useEffect(() => {
    let ignore = false
    async function load () {
      setLoading(true)
      setError('')
      try {
        const { nextItems, nextCursor } = await fetchPage({ limit: 20 })
        if (!ignore) {
          setItems(nextItems)
          updateCursor(nextCursor || null)
        }
      } catch (e) {
        if (!ignore) setError(e?.message || String(e))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    setItems([])
    updateCursor(null)
    load()
    return () => { ignore = true }
  }, [timelineSource, fetchPage, refreshKey, updateCursor])

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
      if (nextRaw?.post) {
        nextRaw.post = { ...nextRaw.post, viewer: nextViewer }
      } else if (nextRaw?.item) {
        nextRaw.item = { ...nextRaw.item, viewer: nextViewer }
      }
      return {
        ...entry,
        stats: nextStats,
        viewer: nextViewer,
        raw: nextRaw || entry.raw
      }
    }))
  }, [])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return
    const currentCursor = cursorRef.current
    if (!currentCursor) return
    setLoadingMore(true)
    try {
      const { nextItems, nextCursor } = await fetchPage({ withCursor: currentCursor })
      setItems(prev => {
        if (!Array.isArray(nextItems) || nextItems.length === 0) return prev
        const seen = new Set(
          prev.map(entry => entry?.listEntryId || entry?.uri || entry?.cid).filter(Boolean)
        )
        const deduped = nextItems.filter(entry => {
          const key = entry?.listEntryId || entry?.uri || entry?.cid
          if (!key) return true
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        return deduped.length ? [...prev, ...deduped] : prev
      })
      updateCursor(nextCursor || null)
    } catch (e) {
      // we don't surface as fatal; keep existing items
      console.error('Timeline loadMore failed:', e)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loading, loadingMore, updateCursor])

  // Scroll listener on the outer BSky scroll container to trigger loadMore
  useEffect(() => {
    const el = typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null
    if (!el || !isActive) return
    const onScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = el
      if (scrollHeight <= 0) return
      const ratio = (scrollTop + clientHeight) / scrollHeight
      if (ratio >= 0.8) {
        // within last 20%
        loadMore()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [loadMore, isActive])

  useEffect(() => {
    if (typeof onLoadingChange === 'function') {
      onLoadingChange(loading)
    }
  }, [loading, onLoadingChange])

  useEffect(() => {
    if (!items.length) return
    onTopItemChange?.(items[0])
  }, [items, onTopItemChange])

  if (loading) {
    return (
      <div className='space-y-3' data-component='BskyTimeline' data-state='loading' role='status' aria-live='polite'>
        <ul className='space-y-3'>
          <li><SkeetItemSkeleton /></li>
          <li><SkeetItemSkeleton /></li>
          <li><SkeetItemSkeleton /></li>
        </ul>
      </div>
    )
  }
  if (error) return <p className='text-sm text-red-600' data-component='BskyTimeline' data-state='error'>Fehler: {error}</p>
  if (items.length === 0) return <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='empty'>Keine Einträge gefunden.</p>
  return (
    <ul className='space-y-3' data-component='BskyTimeline' data-tab={tab}>
      {items.map((it, idx) => (
        <li key={it.listEntryId || it.uri || it.cid || `timeline-${idx}`}>
          <SkeetItem
            item={it}
            variant={variant}
            onReply={onReply}
            onQuote={onQuote}
            onSelect={onSelectPost ? ((selected) => onSelectPost(selected || it)) : undefined}
            onViewMedia={onViewMedia}
            onEngagementChange={handleEngagementChange}
            showThreadButton
          />
        </li>
      ))}
      {loadingMore ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>Mehr laden…</li>
      ) : null}
      {!hasMore ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>Ende erreicht</li>
      ) : null}
    </ul>
  )
}
