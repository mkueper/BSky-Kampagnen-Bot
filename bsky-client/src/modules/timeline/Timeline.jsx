import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import SkeetItem from './SkeetItem'
import SkeetItemSkeleton from './SkeetItemSkeleton.jsx'
import { fetchTimeline as fetchTimelineApi } from '../shared'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useThread } from '../../hooks/useThread'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const PAGE_SIZE = 20

export default function Timeline ({ renderMode, isActive = true, onRefreshStateChange = () => {} }) {
  const { timelineTab: tab, timelineSource: source, refreshTick: refreshKey } = useAppState()
  const dispatch = useAppDispatch()
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { t } = useTranslation()

  const onLoadingChange = useCallback((loading) => {
    dispatch({ type: 'SET_TIMELINE_LOADING', payload: loading })
  }, [dispatch])

  const onTopItemChange = useCallback((item) => {
    const nextUri = item?.uri || ''
    dispatch({ type: 'SET_TIMELINE_TOP_URI', payload: nextUri })
  }, [dispatch])

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

  const getTimelineKey = useCallback((pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-timeline', timelineSource.feedUri || null, timelineSource.tab || null, cursor]
  }, [timelineSource.feedUri, timelineSource.tab])

  const fetchTimelinePage = useCallback(async ([, feedUri, tabParam, cursor]) => {
    const params = {
      cursor: cursor || undefined,
      limit: PAGE_SIZE
    }
    if (feedUri) params.feedUri = feedUri
    else params.tab = tabParam
    const { items: nextItems, cursor: nextCursor } = await fetchTimelineApi(params)
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
  } = useSWRInfinite(getTimelineKey, fetchTimelinePage, {
    revalidateFirstPage: false
  })

  const definedPages = useMemo(() => {
    if (!Array.isArray(data)) return []
    return data.filter(Boolean)
  }, [data])

  const mergedItems = useMemo(() => {
    if (!definedPages.length) return []
    const seen = new Set()
    const flatten = []
    definedPages.forEach((page) => {
      const pageItems = Array.isArray(page?.items) ? page.items : []
      pageItems.forEach((entry) => {
        const key = entry?.listEntryId || entry?.uri || entry?.cid
        if (key) {
          if (seen.has(key)) return
          seen.add(key)
        }
        flatten.push(entry)
      })
    })
    return flatten
  }, [definedPages])

  const [manualRefreshing, setManualRefreshing] = useState(false)
  const refreshRef = useRef(refreshKey)
  const lastPage = definedPages[definedPages.length - 1] || null
  const isReachingEnd = Boolean(lastPage) && !lastPage.cursor
  const isLoadingInitialData = isLoading && definedPages.length === 0
  const isLoadingMore = isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === 'undefined')
  const isSoftRefreshing = !isLoadingInitialData && !isLoadingMore && isValidating
  const hasMore = !isReachingEnd

  const loadMore = useCallback(async () => {
    if (isLoadingInitialData || isLoadingMore || !hasMore) return
    await setSize(size + 1)
  }, [hasMore, isLoadingInitialData, isLoadingMore, setSize, size])

  const handleEngagementChange = useCallback((targetId, patch = {}) => {
    if (!targetId) return
    mutate((previousPages) => {
      if (!Array.isArray(previousPages)) return previousPages
      let changed = false
      const updatedPages = previousPages.map((page) => {
        if (!page || !Array.isArray(page.items)) return page
        let pageChanged = false
        const nextItems = page.items.map((entry) => {
          const entryId = entry?.listEntryId || entry?.uri || entry?.cid
          if (entryId !== targetId) return entry
          pageChanged = true
          changed = true
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
        return pageChanged ? { ...page, items: nextItems } : page
      })
      return changed ? updatedPages : previousPages
    }, false)
  }, [mutate])

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
      onLoadingChange(isLoadingInitialData)
    }
  }, [isLoadingInitialData, onLoadingChange])

  useEffect(() => {
    if (!mergedItems.length) return
    onTopItemChange?.(mergedItems[0])
  }, [mergedItems, onTopItemChange])

  useEffect(() => {
    if (refreshRef.current === refreshKey) return
    refreshRef.current = refreshKey
    setManualRefreshing(true)
    mutate()
      .catch(() => {})
      .finally(() => setManualRefreshing(false))
  }, [refreshKey, mutate])

  useEffect(() => {
    onRefreshStateChange(isSoftRefreshing || manualRefreshing)
  }, [isSoftRefreshing, manualRefreshing, onRefreshStateChange])

  if (isLoadingInitialData) {
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
  if (mergedItems.length === 0) {
    return (
      <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='empty'>
        {t('timeline.status.empty', 'Keine Einträge gefunden.')}
      </p>
    )
  }
  return (
    <ul className='space-y-3' data-component='BskyTimeline' data-tab={tab}>
      {mergedItems.map((it, idx) => (
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
      {!isLoadingInitialData && isLoadingMore ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>
          {t('timeline.status.loadingMore', 'Mehr laden…')}
        </li>
      ) : null}
      {!hasMore && mergedItems.length > 0 ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>
          {t('timeline.status.endReached', 'Ende erreicht')}
        </li>
      ) : null}
    </ul>
  )
}
