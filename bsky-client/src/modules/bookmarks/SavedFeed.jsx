import { useCallback, useEffect, useMemo } from 'react'
import useSWRInfinite from 'swr/infinite'
import { fetchBookmarks as fetchBookmarksApi } from '../shared'
import SkeetItem from '../timeline/SkeetItem.jsx'
import SkeetItemSkeleton from '../timeline/SkeetItemSkeleton.jsx'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useThread } from '../../hooks/useThread'

const PAGE_SIZE = 20

export default function SavedFeed ({ isActive = true }) {
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const { selectThreadFromItem: onSelectPost } = useThread()

  const variant = useMemo(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('bsky.renderMode') : null
      if (stored === 'flat' || stored === 'card') return stored
    } catch {}
    return 'card'
  }, [])

  const getSavedFeedKey = useCallback((pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-saved-feed', cursor]
  }, [])

  const fetchSavedFeedPage = useCallback(async ([, cursor]) => {
    const { items: nextItems, cursor: nextCursor } = await fetchBookmarksApi({
      cursor: cursor || undefined,
      limit: PAGE_SIZE
    })
    return {
      items: nextItems,
      cursor: nextCursor || null
    }
  }, [])

  const {
    data,
    error,
    size,
    setSize,
    mutate,
    isLoading,
    isValidating
  } = useSWRInfinite(getSavedFeedKey, fetchSavedFeedPage, {
    revalidateFirstPage: false
  })

  const pages = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data])
  const mergedItems = useMemo(() => {
    if (!pages.length) return []
    return pages.flatMap(page => Array.isArray(page?.items) ? page.items : [])
  }, [pages])

  const lastPage = pages[pages.length - 1] || null
  const hasMore = Boolean(lastPage?.cursor)
  const isLoadingInitial = isLoading && pages.length === 0
  const isLoadingMore = !isLoadingInitial && isValidating && hasMore

  const loadMore = useCallback(async () => {
    if (isLoadingInitial || isLoadingMore || !hasMore) return
    await setSize(size + 1)
  }, [hasMore, isLoadingInitial, isLoadingMore, setSize, size])

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

  const handleEngagementChange = useCallback((targetId, patch = {}) => {
    if (!targetId) return
    mutate((previousPages) => {
      if (!Array.isArray(previousPages)) return previousPages
      let changed = false
      const updated = previousPages.map((page) => {
        if (!page || !Array.isArray(page.items)) return page
        let nextItems = page.items
        if (patch.bookmarked === false) {
          const filtered = nextItems.filter((entry) => (entry.listEntryId || entry.uri || entry.cid) !== targetId)
          if (filtered.length !== nextItems.length) {
            nextItems = filtered
            changed = true
            return { ...page, items: nextItems }
          }
          return page
        }
        let pageChanged = false
        nextItems = nextItems.map((entry) => {
          const entryId = entry?.listEntryId || entry?.uri || entry?.cid
          if (entryId !== targetId) return entry
          pageChanged = true
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
        if (pageChanged) {
          changed = true
          return { ...page, items: nextItems }
        }
        return page
      })
      return changed ? updated : previousPages
    }, false)
  }, [mutate])

  if (isLoadingInitial) {
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
    return <p className='text-sm text-red-600'>Fehler: {error?.message || String(error)}</p>
  }

  if (mergedItems.length === 0) {
    return <p className='text-sm text-muted-foreground'>Keine gespeicherten Beiträge gefunden.</p>
  }

  return (
    <ul className='space-y-3' data-component='BskySavedFeed'>
      {mergedItems.map((item, idx) => (
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
      {isLoadingMore ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>Mehr laden…</li>
      ) : null}
      {!hasMore ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>Ende erreicht</li>
      ) : null}
    </ul>
  )
}
