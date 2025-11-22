import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { fetchProfileFeed, fetchProfileLikes } from '../shared/api/bsky'
import { Card, Button } from '@bsky-kampagnen-bot/shared-ui'
import SkeetItem from '../timeline/SkeetItem.jsx'
import SkeetItemSkeleton from '../timeline/SkeetItemSkeleton.jsx'
import { hasVideoMedia } from './utils.js'
import { useThread } from '../../hooks/useThread'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'

export default function ProfilePosts ({
  actor,
  actorHandle = '',
  activeTab,
  feedData,
  setFeeds,
  scrollContainerRef
}) {
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()

  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreTriggerRef = useRef(null)

  const { items, cursor, status, error } = feedData
  const hasMore = useMemo(() => Boolean(cursor), [cursor])

  const loadMore = useCallback(async () => {
    if (!actor || loadingMore || !hasMore) return
    setLoadingMore(true)
    setFeeds(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        error: ''
      }
    }))
    try {
      const filterMap = {
        posts: 'posts_no_replies',
        replies: 'posts_with_replies',
        media: 'posts_with_media',
        videos: 'posts_with_media'
      }
      let nextItemsRaw = []
      let nextCursor = null
      if (activeTab === 'likes') {
        const result = await fetchProfileLikes({
          actor: actorHandle || actor,
          cursor,
          limit: 20
        })
        nextItemsRaw = result.items
        nextCursor = result.cursor
      } else {
        const result = await fetchProfileFeed({
          actor,
          cursor,
          limit: 20,
          filter: filterMap[activeTab]
        })
        nextItemsRaw = result.items
        nextCursor = result.cursor
      }
      let normalized = nextItemsRaw
      if (activeTab === 'replies') {
        normalized = nextItemsRaw.filter(entry => entry?.raw?.post?.record?.reply?.parent)
      } else if (activeTab === 'videos') {
        normalized = nextItemsRaw.filter(hasVideoMedia)
      }

      setFeeds(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          items: prev[activeTab].items.concat(normalized),
          cursor: nextCursor,
          error: ''
        }
      }))
    } catch (err) {
      const message = err?.message || 'Weitere Beiträge konnten nicht geladen werden.'
      setFeeds(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          error: message
        }
      }))
    } finally {
      setLoadingMore(false)
    }
  }, [actor, cursor, hasMore, loadingMore, activeTab, setFeeds])

  const handleRetryLoadMore = useCallback(() => {
    if (loadingMore) return
    loadMore()
  }, [loadMore, loadingMore])

  useEffect(() => {
    if (!hasMore || !loadMoreTriggerRef.current) return
    if (error && items.length > 0) return
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
  }, [hasMore, loadMore, scrollContainerRef, error, items.length])

  if (!actor) {
    return (
      <Card padding='p-4' className='text-sm text-foreground-muted'>
        Kein Profil ausgewählt.
      </Card>
    )
  }

  if (status === 'idle' || status === 'loading') {
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
        <p className='text-sm text-destructive'>{error}</p>
        <Button
          variant='secondary'
          size='pill'
          onClick={() => setFeeds(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], status: 'idle' } }))}
        >
          Erneut versuchen
        </Button>
      </Card>
    )
  }

  if (items.length === 0) {
    const emptyMessageMap = {
      posts: 'Noch keine Beiträge.',
      replies: 'Noch keine Antworten.',
      media: 'Noch keine Medien.',
      videos: 'Noch keine Videos.',
      likes: 'Noch keine Likes.'
    }
    return (
      <p className='text-sm text-foreground-muted'>{emptyMessageMap[activeTab]}</p>
    )
  }

  return (
    <div className='space-y-4'>
      <ul className='space-y-3'>
        {items.map((item, idx) => {
          const key = item.uri || item.cid || `${idx}-${item.record?.createdAt || ''}`
          return (
            <li key={key}>
              <SkeetItem
                item={item}
                variant='card'
                onReply={onReply}
                onQuote={onQuote}
                onSelect={onSelectPost ? ((selected) => onSelectPost(selected || item)) : undefined}
                onViewMedia={onViewMedia}
              />
            </li>
          )
        })}
      </ul>
      {error && items.length > 0 ? (
        <div className='space-y-2 rounded-xl border border-border/70 bg-background-subtle p-3'>
          <p className='text-sm text-destructive'>{error}</p>
          <Button
            variant='secondary'
            size='pill'
            disabled={loadingMore}
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
          {loadingMore ? 'Lade…' : 'Weitere Einträge werden automatisch geladen…'}
        </div>
      ) : null}
    </div>
  )
}
