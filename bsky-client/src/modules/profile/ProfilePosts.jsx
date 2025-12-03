import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import useSWRInfinite from 'swr/infinite'
import { fetchProfileFeed, fetchProfileLikes } from '../shared/api/bsky'
import { Card, Button } from '@bsky-kampagnen-bot/shared-ui'
import SkeetItem from '../timeline/SkeetItem.jsx'
import SkeetItemSkeleton from '../timeline/SkeetItemSkeleton.jsx'
import { hasVideoMedia } from './utils.js'
import { useThread } from '../../hooks/useThread'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'

const PAGE_SIZE = 20
const FILTER_MAP = {
  posts: 'posts_no_replies',
  replies: 'posts_with_replies',
  media: 'posts_with_media',
  videos: 'posts_with_media'
}

const EMPTY_MESSAGE_MAP = {
  posts: 'Noch keine Beiträge.',
  replies: 'Noch keine Antworten.',
  media: 'Noch keine Medien.',
  videos: 'Noch keine Videos.',
  likes: 'Noch keine Likes.'
}

export default function ProfilePosts ({
  actor,
  actorHandle = '',
  activeTab,
  scrollContainerRef
}) {
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()

  const [refreshTick, setRefreshTick] = useState(0)
  const loadMoreTriggerRef = useRef(null)

  const targetActor = useMemo(() => {
    if (activeTab === 'likes') return actorHandle || actor
    return actor
  }, [activeTab, actor, actorHandle])

  useEffect(() => {
    setRefreshTick(0)
  }, [activeTab, targetActor])

  const getProfileFeedKey = useCallback((pageIndex, previousPageData) => {
    if (!targetActor) return null
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['profile-feed', activeTab, targetActor, refreshTick, cursor]
  }, [activeTab, targetActor, refreshTick])

  const fetchProfilePage = useCallback(async ([, tab, actorKey, _refresh, cursor]) => {
    if (!actorKey) return { items: [], cursor: null }
    if (tab === 'likes') {
      const { items, cursor: nextCursor } = await fetchProfileLikes({
        actor: actorKey,
        cursor: cursor || undefined,
        limit: PAGE_SIZE
      })
      return {
        items,
        cursor: nextCursor || null
      }
    }
    const { items, cursor: nextCursor } = await fetchProfileFeed({
      actor: actorKey,
      cursor: cursor || undefined,
      limit: PAGE_SIZE,
      filter: FILTER_MAP[tab] || FILTER_MAP.posts
    })
    let normalized = items
    if (tab === 'replies') {
      normalized = items.filter(entry => entry?.raw?.post?.record?.reply?.parent)
    } else if (tab === 'videos') {
      normalized = items.filter(hasVideoMedia)
    }
    return {
      items: normalized,
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
  } = useSWRInfinite(getProfileFeedKey, fetchProfilePage, {
    revalidateFirstPage: false
  })

  const pages = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data])
  const items = useMemo(() => {
    if (!pages.length) return []
    return pages.flatMap((page) => Array.isArray(page?.items) ? page.items : [])
  }, [pages])

  const lastPage = pages[pages.length - 1] || null
  const hasMore = Boolean(lastPage?.cursor)
  const isLoadingInitial = isLoading && pages.length === 0
  const isLoadingMore = !isLoadingInitial && isValidating && hasMore
  const showInlineError = Boolean(error && items.length > 0)

  const handleRetryInitial = useCallback(() => {
    setRefreshTick((tick) => tick + 1)
    setSize(1)
  }, [setSize])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingInitial || isLoadingMore) return
    try {
      await setSize(size + 1)
    } catch (_) {
      // error state handled by SWR
    }
  }, [hasMore, isLoadingInitial, isLoadingMore, setSize, size])

  const handleRetryLoadMore = useCallback(async () => {
    if (isLoadingMore) return
    try {
      await setSize(size + 1)
    } catch (_) {}
  }, [isLoadingMore, setSize, size])

  const handleEngagementChange = useCallback((targetId, patch = {}) => {
    if (!targetId) return
    mutate((previousPages) => {
      if (!Array.isArray(previousPages)) return previousPages
      let changed = false
      const updated = previousPages.map((page) => {
        if (!page || !Array.isArray(page.items)) return page
        let pageChanged = false
        const nextItems = page.items.map((entry) => {
          const entryId = entry.listEntryId || entry.uri || entry.cid
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
          if (nextRaw?.post) nextRaw.post = { ...nextRaw.post, viewer: nextViewer }
          else if (nextRaw?.item) nextRaw.item = { ...nextRaw.item, viewer: nextViewer }
          return {
            ...entry,
            stats: nextStats,
            viewer: nextViewer,
            raw: nextRaw || entry.raw
          }
        })
        return pageChanged ? { ...page, items: nextItems } : page
      })
      return changed ? updated : previousPages
    }, false)
  }, [mutate])

  useEffect(() => {
    if (!hasMore || !loadMoreTriggerRef.current) return
    if (showInlineError) return
    const root = scrollContainerRef?.current || (typeof document !== 'undefined'
      ? document.getElementById('bsky-scroll-container')
      : null)
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        loadMore()
      }
    }, {
      root,
      rootMargin: '200px 0px'
    })
    const target = loadMoreTriggerRef.current
    observer.observe(target)
    return () => {
      observer.unobserve(target)
    }
  }, [hasMore, loadMore, scrollContainerRef, showInlineError])

  if (!actor) {
    return (
      <Card padding='p-4' className='text-sm text-foreground-muted'>
        Kein Profil ausgewählt.
      </Card>
    )
  }

  if (isLoadingInitial) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <ul className='w-full space-y-3'>
          <li><SkeetItemSkeleton /></li>
          <li><SkeetItemSkeleton /></li>
        </ul>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <Card padding='p-4' className='space-y-3'>
        <p className='text-sm text-destructive'>{error?.message || 'Beiträge konnten nicht geladen werden.'}</p>
        <Button
          variant='secondary'
          size='pill'
          onClick={handleRetryInitial}
        >
          Erneut versuchen
        </Button>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <p className='text-sm text-foreground-muted'>{EMPTY_MESSAGE_MAP[activeTab]}</p>
    )
  }

  return (
    <div className='space-y-4'>
      <ul className='space-y-3'>
        {items.map((item, idx) => {
          const key = item.listEntryId || item.uri || item.cid || `${idx}-${item.record?.createdAt || ''}`
          return (
            <li key={key}>
              <SkeetItem
                item={item}
                variant='card'
                onReply={onReply}
                onQuote={onQuote}
                onSelect={onSelectPost ? ((selected) => onSelectPost(selected || item)) : undefined}
                onViewMedia={onViewMedia}
                onEngagementChange={handleEngagementChange}
              />
            </li>
          )
        })}
      </ul>
      {showInlineError ? (
        <div className='space-y-2 rounded-xl border border-border/70 bg-background-subtle p-3'>
          <p className='text-sm text-destructive'>{error?.message || 'Weitere Beiträge konnten nicht geladen werden.'}</p>
          <Button
            variant='secondary'
            size='pill'
            disabled={isLoadingMore}
            onClick={handleRetryLoadMore}
          >
            Erneut versuchen
          </Button>
        </div>
      ) : null}
      {hasMore ? (
        <div
          ref={loadMoreTriggerRef}
          className='py-4 text-center text-sm text-foreground-muted'
        >
          {isLoadingMore ? 'Lade…' : 'Weitere Einträge werden automatisch geladen…'}
        </div>
      ) : null}
    </div>
  )
}
