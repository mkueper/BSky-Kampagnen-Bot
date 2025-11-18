import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { fetchProfileFeed } from '../shared/api/bsky'
import { Card, Button } from '@bsky-kampagnen-bot/shared-ui'
import SkeetItem from '../timeline/SkeetItem.jsx'

function SkeetItemSkeleton () {
  return (
    <Card padding='p-4' className='space-y-3'>
      <div className='flex items-center gap-3'>
        <div className='h-12 w-12 shrink-0 animate-pulse rounded-full bg-background-subtle' />
        <div className='h-5 w-40 animate-pulse rounded bg-background-subtle' />
      </div>
      <div className='ml-15 space-y-2'><div className='h-4 w-full animate-pulse rounded bg-background-subtle' /><div className='h-4 w-3/4 animate-pulse rounded bg-background-subtle' /></div>
    </Card>
  )
}

export default function ProfilePosts ({ actor, activeTab, feedData, setFeeds, scrollContainerRef, onSelectPost, onReply, onQuote, onViewMedia }) {
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreTriggerRef = useRef(null)

  const { items, cursor, status, error } = feedData
  const hasMore = useMemo(() => Boolean(cursor), [cursor])

  const loadMore = useCallback(async () => {
    if (!actor || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const filterMap = {
        posts: 'posts_no_replies',
        replies: 'posts_with_replies',
        media: 'posts_with_media'
      }
      const { items: nextItemsRaw, cursor: nextCursor } = await fetchProfileFeed({
        actor,
        cursor,
        limit: 20,
        filter: filterMap[activeTab]
      })
      const normalized = activeTab === 'replies'
        ? nextItemsRaw.filter(entry => entry?.raw?.post?.record?.reply?.parent)
        : nextItemsRaw

      setFeeds(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          items: prev[activeTab].items.concat(normalized),
          cursor: nextCursor
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

  useEffect(() => {
    if (!hasMore || !loadMoreTriggerRef.current) return
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
  }, [hasMore, loadMore, scrollContainerRef])

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
      media: 'Noch keine Medien.'
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
      {error ? (
        <p className='text-sm text-destructive'>{error}</p>
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