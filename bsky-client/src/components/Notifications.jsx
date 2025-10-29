import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChatBubbleIcon, HeartFilledIcon, HeartIcon, LoopIcon } from '@radix-ui/react-icons'
import Button from './Button'

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

  const [likeUri, setLikeUri] = useState(item?.viewer?.like || null)
  const [repostUri, setRepostUri] = useState(item?.viewer?.repost || null)
  const [likeCount, setLikeCount] = useState(Number(item?.stats?.likeCount ?? 0))
  const [repostCount, setRepostCount] = useState(Number(item?.stats?.repostCount ?? 0))
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const hasLiked = Boolean(likeUri)
  const hasReposted = Boolean(repostUri)
  const likeStyle = hasLiked ? { color: '#e11d48' } : undefined
  const repostStyle = hasReposted ? { color: '#0ea5e9' } : undefined

  const openSubject = () => { if (canOpenSubject) onSelectSubject(subject) }
  const openSubjectOnKey = (event) => {
    if (!canOpenSubject) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectSubject(subject)
    }
  }

  async function toggleRepost () {
    if (busy) return
    setBusy(true)
    try {
      if (!hasReposted) {
        const res = await fetch('/api/bsky/repost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uri: item?.uri, cid: item?.cid || record?.cid }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Reskeet fehlgeschlagen')
        setRepostUri(data?.viewer?.repost || null)
        if (data?.totals?.reposts != null) setRepostCount(Number(data.totals.reposts))
      } else {
        const res = await fetch('/api/bsky/repost', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repostUri }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Undo-Reskeet fehlgeschlagen')
        setRepostUri(null)
        if (data?.totals?.reposts != null) setRepostCount(Number(data.totals.reposts))
        else setRepostCount((v) => Math.max(0, v - 1))
      }
      setActionError('')
    } catch (err) {
      setActionError(err?.message || 'Aktion fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function toggleLike () {
    if (busy) return
    setBusy(true)
    try {
      if (!hasLiked) {
        const res = await fetch('/api/bsky/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uri: item?.uri, cid: item?.cid || record?.cid }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Like fehlgeschlagen')
        setLikeUri(data?.viewer?.like || null)
        if (data?.totals?.likes != null) setLikeCount(Number(data.totals.likes))
        else setLikeCount((v) => v + 1)
      } else {
        const res = await fetch('/api/bsky/like', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ likeUri }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Unlike fehlgeschlagen')
        setLikeUri(null)
        if (data?.totals?.likes != null) setLikeCount(Number(data.totals.likes))
        else setLikeCount((v) => Math.max(0, v - 1))
      }
      setActionError('')
    } catch (err) {
      setActionError(err?.message || 'Aktion fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function refreshStats () {
    if (refreshing) return
    setRefreshing(true)
    try {
      const params = new URLSearchParams({ uri: String(item?.uri || '') })
      const res = await fetch(`/api/bsky/reactions?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Aktualisieren fehlgeschlagen')
      if (data?.likes != null) setLikeCount(Number(data.likes))
      if (data?.reposts != null) setRepostCount(Number(data.reposts))
      setActionError('')
    } catch (err) {
      setActionError(err?.message || 'Aktualisieren fehlgeschlagen')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <article
      className={`rounded-2xl border border-border bg-background p-4 shadow-soft ${isRead ? '' : 'ring-1 ring-primary/40'}`}
      data-component='BskyNotificationCard'
      data-reason={reason}
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
            <p
              className={`rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words ${canOpenSubject ? 'cursor-pointer hover:bg-background-subtle/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60' : ''}`}
              role={canOpenSubject ? 'button' : undefined}
              tabIndex={canOpenSubject ? 0 : undefined}
              onClick={canOpenSubject ? openSubject : undefined}
              onKeyDown={canOpenSubject ? openSubjectOnKey : undefined}
            >
              {recordText}
            </p>
          ) : null}
          {subject ? (
            <div
              className={`rounded-xl border border-dashed border-border px-3 py-2 text-xs text-foreground-muted ${canOpenSubject ? 'cursor-pointer hover:bg-background-subtle/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60' : ''}`}
              role={canOpenSubject ? 'button' : undefined}
              tabIndex={canOpenSubject ? 0 : undefined}
              onClick={canOpenSubject ? openSubject : undefined}
              onKeyDown={canOpenSubject ? openSubjectOnKey : undefined}
            >
              Bezogen auf:&nbsp;
              <span className='font-medium text-foreground'>{subject.text || 'Beitrag'}</span>
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
                  onReply({ uri: item?.uri, cid: item?.cid || record?.cid })
                }
              }}
            >
              <ChatBubbleIcon className='h-5 w-5' />
              <span>Antworten</span>
            </button>
            <button
              type='button'
              className={`group inline-flex items-center gap-2 transition ${busy ? 'opacity-60' : ''}`}
              style={repostStyle}
              title='Reskeet'
              aria-pressed={hasReposted}
              disabled={busy}
              onClick={toggleRepost}
            >
              <LoopIcon className='h-5 w-5' />
              <span className='tabular-nums'>{repostCount}</span>
            </button>
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
              onClick={refreshStats}
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
    const params = new URLSearchParams()
    if (withCursor) params.set('cursor', withCursor)
    if (markSeen) params.set('markSeen', 'true')
    const query = params.toString()
    const res = await fetch(query ? `/api/bsky/notifications?${query}` : '/api/bsky/notifications')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    const notifications = Array.isArray(data?.notifications) ? data.notifications : []
    return { notifications, cursor: data?.cursor || null }
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
