import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChatBubbleIcon, HeartFilledIcon, HeartIcon } from '@radix-ui/react-icons'
import { Button, useBskyEngagement, fetchNotifications as fetchNotificationsApi, RichText, RepostMenuButton } from '../shared'

const REASON_COPY = {
  like: { label: 'Like', description: 'hat deinen Beitrag geliked.' },
  repost: { label: 'Repost', description: 'hat deinen Beitrag geteilt.' },
  follow: { label: 'Follow', description: 'folgt dir jetzt.' },
  reply: { label: 'Antwort', description: 'hat auf deinen Beitrag geantwortet.' },
  mention: { label: 'Mention', description: 'hat dich erwähnt.' },
  quote: { label: 'Quote', description: 'hat deinen Beitrag zitiert.' }
}

function NotificationCard ({ item, onSelectSubject, onReply }) {
  const {
    author = {},
    reason = 'unknown',
    record = {},
    subject = null,
    indexedAt,
    isRead
  } = item || {}

  const reasonInfo = REASON_COPY[reason] || {
    label: 'Aktivität',
    description: 'hat eine Aktion ausgeführt.'
  }
  const timestamp = indexedAt ? new Date(indexedAt).toLocaleString('de-DE') : ''
  const recordText = record?.text || ''
  const isReply = reason === 'reply'
  const profileUrl = author?.handle ? `https://bsky.app/profile/${author.handle}` : null
  const canOpenSubject = Boolean(subject && typeof onSelectSubject === 'function')

  const {
    likeCount,
    repostCount,
    hasLiked,
    hasReposted,
    busy,
    refreshing,
    error: actionError,
    toggleLike,
    toggleRepost,
    refresh,
    clearError,
  } = useBskyEngagement({
    uri: item?.uri,
    cid: item?.cid || record?.cid,
    initialLikes: item?.stats?.likeCount,
    initialReposts: item?.stats?.repostCount,
    viewer: item?.viewer,
  })

  const likeStyle = hasLiked ? { color: '#e11d48' } : undefined
  const repostStyle = hasReposted ? { color: '#0ea5e9' } : undefined

  return (
    <article
      className={`rounded-2xl border border-border bg-background p-4 shadow-soft transition ${isRead ? '' : 'ring-1 ring-primary/40'} ${canOpenSubject ? 'cursor-pointer hover:bg-background-subtle/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60' : ''}`}
      data-component='BskyNotificationCard'
      data-reason={reason}
      onClick={(event) => {
        if (!canOpenSubject) return
        if (event.target?.closest?.('button, a')) return
        onSelectSubject(subject)
      }}
      onKeyDown={(event) => {
        if (!canOpenSubject) return
        if (event.target?.closest?.('button, a')) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectSubject(subject)
        }
      }}
      role={canOpenSubject ? 'button' : undefined}
      tabIndex={canOpenSubject ? 0 : undefined}
      aria-label={canOpenSubject ? 'Thread öffnen' : undefined}
    >
      <div className='flex items-start gap-3'>
        {author.avatar ? (
          <img src={author.avatar} alt='' className='h-12 w-12 rounded-full border border-border object-cover' />
        ) : (
          <div className='h-12 w-12 rounded-full border border-border bg-background-subtle' />
        )}
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            {profileUrl ? (
              <a
                href={profileUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='font-semibold text-foreground hover:text-primary transition truncate'
              >
                {author.displayName || author.handle || 'Unbekannt'}
              </a>
            ) : (
              <p className='font-semibold text-foreground truncate'>{author.displayName || author.handle || 'Unbekannt'}</p>
            )}
            {author.handle ? (
              <a
                href={profileUrl || '#'}
                target={profileUrl ? '_blank' : undefined}
                rel={profileUrl ? 'noopener noreferrer' : undefined}
                className='text-sm text-foreground-muted hover:text-primary transition truncate'
              >
                @{author.handle}
              </a>
            ) : null}
            <span className='ml-auto rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-foreground-muted'>
              {reasonInfo.label}
            </span>
          </div>
          <p className='text-sm text-foreground'>
            {author.displayName || author.handle || 'Jemand'} {reasonInfo.description}
          </p>
          {recordText ? (
            <p className='rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground'>
              <RichText text={recordText} className='whitespace-pre-wrap break-words' />
            </p>
          ) : null}
          {subject ? (
            <div className='rounded-xl border border-dashed border-border px-3 py-2 text-xs text-foreground-muted'>
              Bezogen auf:&nbsp;
              <span className='font-medium text-foreground'>
                <RichText text={subject.text || 'Beitrag'} />
              </span>
            </div>
          ) : null}
          {timestamp ? (
            <time className='block text-xs text-foreground-muted' dateTime={indexedAt}>{timestamp}</time>
          ) : null}
        </div>
      </div>
      {isReply ? (
        <>
          <footer className='mt-3 flex flex-wrap items-center gap-4 text-sm text-foreground-muted'>
            <button
              type='button'
              className='group inline-flex items-center gap-2 hover:text-foreground transition'
              title='Antworten'
          onClick={() => {
            if (typeof onReply === 'function') {
              clearError()
              onReply({ uri: item?.uri, cid: item?.cid || record?.cid })
            }
          }}
        >
              <ChatBubbleIcon className='h-5 w-5' />
              <span>Antworten</span>
            </button>
            <RepostMenuButton
              count={repostCount}
              hasReposted={hasReposted}
              busy={busy}
              style={repostStyle}
              onRepost={() => {
                clearError()
                toggleRepost()
              }}
            />
            <button
              type='button'
              className={`group inline-flex items-center gap-2 transition ${busy ? 'opacity-60' : ''}`}
              style={likeStyle}
              title='Gefällt mir'
              aria-pressed={hasLiked}
              disabled={busy}
              onClick={toggleLike}
            >
              {hasLiked ? (
                <HeartFilledIcon className='h-5 w-5' />
              ) : (
                <HeartIcon className='h-5 w-5' />
              )}
              <span className='tabular-nums'>{likeCount}</span>
            </button>
            <button
              type='button'
              className={`ml-auto inline-flex items-center gap-2 rounded-full border border-border px-2 py-1 text-xs hover:bg-background-subtle ${refreshing ? 'opacity-60' : ''}`}
              onClick={refresh}
              disabled={refreshing}
            >
              {refreshing ? 'Aktualisiere…' : 'Aktualisieren'}
            </button>
          </footer>
          {actionError ? (
            <p className='mt-2 text-xs text-red-600'>{actionError}</p>
          ) : null}
        </>
      ) : null}
    </article>
  )
}

export default function Notifications ({ refreshKey = 0, onSelectPost, onReply }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  const hasMore = useMemo(() => Boolean(cursor), [cursor])

  const fetchPage = useCallback(async ({ withCursor, markSeen = false } = {}) => {
    const { items: notifications, cursor: nextCursor } = await fetchNotificationsApi({
      cursor: withCursor,
      markSeen,
    })
    return { notifications, cursor: nextCursor }
  }, [])

  useEffect(() => {
    let ignore = false
    async function loadInitial () {
      setLoading(true)
      setError('')
      try {
        const { notifications, cursor: nextCursor } = await fetchPage({ markSeen: true })
        if (!ignore) {
          setItems(notifications)
          setCursor(nextCursor)
        }
      } catch (err) {
        if (!ignore) setError(err?.message || 'Mitteilungen konnten nicht geladen werden.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadInitial()
    return () => {
      ignore = true
    }
  }, [refreshKey, retryTick, fetchPage])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { notifications, cursor: nextCursor } = await fetchPage({ withCursor: cursor })
      setItems(prev => [...prev, ...notifications])
      setCursor(nextCursor)
    } catch (err) {
      console.error('Notifications loadMore failed', err)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, fetchPage, hasMore, loadingMore])

  if (loading) {
    return (
      <div className='flex min-h-[240px] items-center justify-center' data-component='BskyNotifications' data-state='loading'>
        <div
          className='flex flex-col items-center gap-3'
          role='status'
          aria-live='polite'
          aria-label='Mitteilungen werden geladen…'
        >
          <div className='h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary' />
          <span className='sr-only'>Mitteilungen werden geladen…</span>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className='space-y-3'>
        <p className='text-sm text-red-600'>{error}</p>
        <Button variant='secondary' size='pill' onClick={() => setRetryTick(v => v + 1)}>
          Erneut versuchen
        </Button>
      </div>
    )
  }
  if (items.length === 0) {
    return <p className='text-sm text-muted-foreground'>Keine Mitteilungen gefunden.</p>
  }

  return (
    <section className='space-y-4' data-component='BskyNotifications'>
      <ul className='space-y-3'>
        {items.map((item, idx) => (
          <li key={item.uri || item.cid || `${item.reason || 'notification'}-${item.reasonSubject || idx}-${idx}`}>
            <NotificationCard
              item={item}
              onSelectSubject={onSelectPost ? ((subject) => onSelectPost(subject)) : undefined}
              onReply={onReply}
            />
          </li>
        ))}
      </ul>
      {hasMore ? (
        <div className='text-center'>
          <Button variant='secondary' onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Lade...' : 'Mehr laden'}
          </Button>
        </div>
      ) : null}
    </section>
  )
}



