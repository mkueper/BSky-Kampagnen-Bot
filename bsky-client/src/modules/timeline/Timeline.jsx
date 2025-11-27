import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SkeetItem from './SkeetItem'
import SkeetItemSkeleton from './SkeetItemSkeleton.jsx'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useThread } from '../../hooks/useThread'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { runListRefresh, runListLoadMore } from '../listView/listService.js'

export default function Timeline ({ listKey = 'discover', renderMode, isActive = true }) {
  const { lists } = useAppState()
  const dispatch = useAppDispatch()
  const list = listKey ? lists?.[listKey] : null
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { t } = useTranslation()

  const [error, setError] = useState(null)
  const items = useMemo(() => (Array.isArray(list?.items) ? list.items : []), [list?.items])
  const hasMore = Boolean(list?.cursor)
  const isLoadingInitial = !list || !list.loaded
  const isLoadingMore = Boolean(list?.isLoadingMore)

  useEffect(() => {
    setError(null)
  }, [listKey])

  useEffect(() => {
    if (!listKey || !list || !list.data) return
    if (list.loaded || list.isRefreshing) return
    let cancelled = false
    runListRefresh({ list, dispatch }).catch((err) => {
      if (!cancelled) setError(err)
    })
    return () => { cancelled = true }
  }, [listKey, list, dispatch])

  const variant = useMemo(() => {
    if (renderMode === 'flat' || renderMode === 'card') return renderMode
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('bsky.renderMode') : null
      if (stored === 'flat' || stored === 'card') return stored
    } catch {}
    return 'card'
  }, [renderMode])

  const loadMore = useCallback(async () => {
    if (!list || !isActive) return
    if (!hasMore || isLoadingMore) return
    try {
      await runListLoadMore({ list, dispatch })
    } catch (err) {
      console.error('Failed to load more timeline', err)
    }
  }, [list, dispatch, hasMore, isLoadingMore, isActive])

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
    if (!list || !targetId) return
    const updated = (list.items || []).map((entry) => {
      const entryId = entry?.listEntryId || entry?.uri || entry?.cid
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
    })
    dispatch({
      type: 'LIST_LOADED',
      payload: {
        key: listKey,
        items: updated,
        cursor: list.cursor,
        topId: list.topId,
        meta: { data: list.data },
        keepHasNew: true
      }
    })
  }, [dispatch, list, listKey])

  if (isLoadingInitial) {
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

  if (error) {
    const errorText = error?.message || (typeof error === 'string' ? error : String(error))
    return (
      <p className='text-sm text-red-600' data-component='BskyTimeline' data-state='error'>
        {t('timeline.status.error', 'Fehler: {message}', { message: errorText })}
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='empty'>
        {t('timeline.status.empty', 'Keine Einträge gefunden.')}
      </p>
    )
  }

  return (
    <ul className='space-y-3' data-component='BskyTimeline' data-tab={listKey}>
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
          />
        </li>
      ))}
      {isLoadingMore ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>
          {t('timeline.status.loadingMore', 'Mehr laden…')}
        </li>
      ) : null}
      {!hasMore && items.length > 0 ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>
          {t('timeline.status.endReached', 'Ende erreicht')}
        </li>
      ) : null}
    </ul>
  )
}
