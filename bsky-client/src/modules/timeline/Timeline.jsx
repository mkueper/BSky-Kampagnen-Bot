import React, { useCallback, useEffect, useMemo, useState } from 'react'
import SkeetItem from './SkeetItem'
import SkeetItemSkeleton from './SkeetItemSkeleton.jsx'
import { useTimelineDispatch, useTimelineState } from '../../context/TimelineContext.jsx'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useThread } from '../../hooks/useThread'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { runListRefresh, runListLoadMore, getListItemId } from '../listView/listService.js'
import { VirtualizedList } from '../listView/VirtualizedList.jsx'
import { searchBsky } from '../shared'

const LANGUAGE_FILTER_TARGET = 30

function extractItemLanguages (item) {
  if (!item) return []
  const pools = [
    item?.raw?.post?.record?.langs,
    item?.raw?.post?.record?.language,
    item?.raw?.item?.record?.langs,
    item?.raw?.item?.record?.language,
    item?.record?.langs,
    item?.record?.language,
    item?.langs,
    item?.language
  ]
  const values = []
  pools.forEach((entry) => {
    if (Array.isArray(entry)) {
      entry.forEach((lang) => {
        if (typeof lang === 'string' && lang.trim()) {
          values.push(lang.trim().toLowerCase())
        }
      })
    } else if (typeof entry === 'string' && entry.trim()) {
      values.push(entry.trim().toLowerCase())
    }
  })
  if (values.length === 0) return []
  return Array.from(new Set(values))
}

export default function Timeline ({ listKey = 'discover', renderMode, isActive = true, languageFilter = '' }) {
  const { lists } = useTimelineState()
  const dispatch = useTimelineDispatch()
  const list = listKey ? lists?.[listKey] : null
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { t } = useTranslation()

  const [error, setError] = useState(null)
  const items = useMemo(() => (Array.isArray(list?.items) ? list.items : []), [list?.items])
  const unreadIdSet = useMemo(() => new Set(Array.isArray(list?.unreadIds) ? list.unreadIds : []), [list?.unreadIds])
  const normalizedLanguageFilter = typeof languageFilter === 'string' ? languageFilter.trim().toLowerCase() : ''
  const filteredItems = useMemo(() => {
    if (!normalizedLanguageFilter) return items
    return items.filter((entry) => {
      const langs = extractItemLanguages(entry)
      if (!langs.length) return false
      return langs.includes(normalizedLanguageFilter)
    })
  }, [items, normalizedLanguageFilter])
  const hasMore = Boolean(list?.cursor)
  const isLoadingInitial = !list || !list.loaded
  const isLoadingMore = Boolean(list?.isLoadingMore)
  const [languageSearchState, setLanguageSearchState] = useState({
    items: [],
    loading: false,
    error: ''
  })

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

  const showLanguageSearch = Boolean(normalizedLanguageFilter)

  const variant = useMemo(() => {
    if (renderMode === 'flat' || renderMode === 'card') return renderMode
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('bsky.renderMode') : null
      if (stored === 'flat' || stored === 'card') return stored
    } catch {
      /* ignore storage errors */
    }
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
    if (showLanguageSearch) return undefined
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
  }, [loadMore, isActive, showLanguageSearch])

  useEffect(() => {
    if (!showLanguageSearch) {
      setLanguageSearchState({ items: [], loading: false, error: '' })
      return
    }
    let ignore = false
    setLanguageSearchState({ items: [], loading: true, error: '' })
    searchBsky({
      query: `lang:${normalizedLanguageFilter}`,
      type: 'latest',
      limit: 50,
      language: normalizedLanguageFilter
    })
      .then((result) => {
        if (ignore) return
        setLanguageSearchState({
          items: Array.isArray(result?.items) ? result.items : [],
          loading: false,
          error: ''
        })
      })
      .catch((err) => {
        if (ignore) return
        setLanguageSearchState({
          items: [],
          loading: false,
          error: err?.message || t('timeline.status.languageSearchFailed', 'Sprachsuche fehlgeschlagen.')
        })
      })
    return () => { ignore = true }
  }, [normalizedLanguageFilter, showLanguageSearch, t])

  useEffect(() => {
    if (!normalizedLanguageFilter) return
    if (!isActive) return
    if (filteredItems.length >= LANGUAGE_FILTER_TARGET) return
    if (!hasMore || isLoadingMore) return
    loadMore()
  }, [
    filteredItems.length,
    hasMore,
    isActive,
    isLoadingMore,
    loadMore,
    normalizedLanguageFilter
  ])

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

  const handleMarkRead = useCallback((targetItem) => {
    if (!list?.key) return
    const targetId = getListItemId(targetItem)
    if (!targetId) return
    if (!unreadIdSet.has(targetId)) return
    dispatch({
      type: 'LIST_CLEAR_UNREAD',
      payload: { key: list.key, ids: [targetId] }
    })
  }, [dispatch, list?.key, unreadIdSet])

  if (showLanguageSearch) {
    if (languageSearchState.loading) {
      return (
        <p className='text-sm text-foreground-muted' data-component='BskyTimeline' data-state='language-loading'>
          {t('common.status.loading', 'Lade…')}
        </p>
      )
    }
    if (languageSearchState.error) {
      return (
        <p className='text-sm text-red-600' data-component='BskyTimeline' data-state='language-error'>
          {languageSearchState.error}
        </p>
      )
    }
    if (languageSearchState.items.length === 0) {
      return (
        <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='empty-language'>
          {t('timeline.status.languageFilteredEmpty', 'Keine Beiträge in dieser Sprache.')}
        </p>
      )
    }
  }

  if (!showLanguageSearch && isLoadingInitial) {
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

  if (!showLanguageSearch && error) {
    const errorText = error?.message || (typeof error === 'string' ? error : String(error))
    return (
      <p className='text-sm text-red-600' data-component='BskyTimeline' data-state='error'>
        {t('timeline.status.error', 'Fehler: {message}', { message: errorText })}
      </p>
    )
  }

  const displayItems = showLanguageSearch ? languageSearchState.items : filteredItems

  if (displayItems.length === 0) {
    return (
      <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='empty'>
        {t('timeline.status.empty', 'Keine Einträge gefunden.')}
      </p>
    )
  }

  return (
    <>
      <VirtualizedList
        className='space-y-3'
        data-component='BskyTimeline'
        data-tab={showLanguageSearch ? `lang-${normalizedLanguageFilter}` : listKey}
        items={displayItems}
        itemHeight={220}
        virtualizationThreshold={100}
        overscan={4}
        getItemId={getListItemId}
        renderItem={(it) => {
          const itemId = getListItemId(it)
          const isUnread = itemId ? unreadIdSet.has(itemId) : false
          return (
            <SkeetItem
              item={it}
              variant={variant}
              isUnread={isUnread}
              onMarkRead={handleMarkRead}
              onReply={onReply}
              onQuote={onQuote}
              onSelect={onSelectPost ? ((selected) => onSelectPost(selected || it)) : undefined}
              onViewMedia={onViewMedia}
              onEngagementChange={showLanguageSearch ? undefined : handleEngagementChange}
            />
          )
        }}
      />
      {!showLanguageSearch && isLoadingMore ? (
        <div className='py-3 text-center text-xs text-foreground-muted'>
          {t('timeline.status.loadingMore', 'Mehr laden…')}
        </div>
      ) : null}
      {!showLanguageSearch && !hasMore && filteredItems.length > 0 ? (
        <div className='py-3 text-center text-xs text-foreground-muted'>
          {t('timeline.status.endReached', 'Ende erreicht')}
        </div>
      ) : null}
    </>
  )
}
