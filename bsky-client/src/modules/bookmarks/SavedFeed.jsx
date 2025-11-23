import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchBookmarks as fetchBookmarksApi } from '../shared'
import SkeetItem from '../timeline/SkeetItem.jsx'
import SkeetItemSkeleton from '../timeline/SkeetItemSkeleton.jsx'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useThread } from '../../hooks/useThread'

export default function SavedFeed ({ isActive = true }) {
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const { selectThreadFromItem: onSelectPost } = useThread()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const hasMore = useMemo(() => Boolean(cursor), [cursor])

  const variant = useMemo(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('bsky.renderMode') : null
      if (stored === 'flat' || stored === 'card') return stored
    } catch {}
    return 'card'
  }, [])

  const fetchPage = useCallback(async ({ withCursor, limit = 20 } = {}) => {
    const { items: nextItems, cursor: nextCursor } = await fetchBookmarksApi({ cursor: withCursor, limit })
    return { nextItems, nextCursor }
  }, [])

  useEffect(() => {
    let ignore = false
    async function load () {
      setLoading(true)
      setError('')
      try {
        const { nextItems, nextCursor } = await fetchPage({ limit: 20 })
        if (!ignore) {
          setItems(nextItems)
          setCursor(nextCursor)
        }
      } catch (e) {
        if (!ignore) setError(e?.message || String(e))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { nextItems, nextCursor } = await fetchPage({ withCursor: cursor })
      setItems((prev) => [...prev, ...nextItems])
      setCursor(nextCursor)
    } catch (e) {
      console.error('SavedFeed loadMore failed:', e)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, fetchPage, hasMore, loading, loadingMore])

  useEffect(() => {
    const el = typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null
    if (!el || !isActive) return
    const onScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = el
      if (scrollHeight <= 0) return
      const ratio = (scrollTop + clientHeight) / scrollHeight
      if (ratio >= 0.8) {
        loadMore()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [loadMore, isActive])

  if (loading) {
    return (
      <div className='space-y-3' data-component='BskySavedFeed' data-state='loading' role='status' aria-live='polite'>
        <ul className='space-y-3'>
          <li><SkeetItemSkeleton /></li>
          <li><SkeetItemSkeleton /></li>
          <li><SkeetItemSkeleton /></li>
        </ul>
      </div>
    )
  }

  if (error) {
    return <p className='text-sm text-red-600'>Fehler: {error}</p>
  }

  if (items.length === 0) {
    return <p className='text-sm text-muted-foreground'>Keine gespeicherten Beiträge gefunden.</p>
  }

  const handleEngagementChange = useCallback((targetId, patch = {}) => {
    if (!targetId) return
    setItems((prev) => {
      const baseList = prev.map((entry) => {
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
      })
      if (patch.bookmarked === false) {
        return baseList.filter((entry) => (entry.listEntryId || entry.uri || entry.cid) !== targetId)
      }
      return baseList
    })
  }, [])

  return (
    <ul className='space-y-3' data-component='BskySavedFeed'>
      {items.map((item, idx) => (
        <li key={item.listEntryId || item.uri || item.cid || `saved-${idx}`}>
          <SkeetItem
            item={item}
            variant={variant}
            onReply={onReply}
            onQuote={onQuote}
            onSelect={onSelectPost ? ((selected) => onSelectPost(selected || item)) : undefined}
            onViewMedia={onViewMedia}
            onEngagementChange={handleEngagementChange}
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
