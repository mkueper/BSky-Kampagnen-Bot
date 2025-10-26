import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from './Button'

const REASON_COPY = {
  like: { label: 'Like', description: 'hat deinen Beitrag geliked.' },
  repost: { label: 'Repost', description: 'hat deinen Beitrag geteilt.' },
  follow: { label: 'Follow', description: 'folgt dir jetzt.' },
  reply: { label: 'Antwort', description: 'hat auf deinen Beitrag geantwortet.' },
  mention: { label: 'Mention', description: 'hat dich erwaehnt.' },
  quote: { label: 'Quote', description: 'hat deinen Beitrag zitiert.' }
}

function NotificationCard ({ item, onSelectSubject }) {
  const {
    author = {},
    reason = 'unknown',
    record = {},
    subject = null,
    indexedAt,
    isRead
  } = item || {}

  const reasonInfo = REASON_COPY[reason] || {
    label: 'Aktivitaet',
    description: 'hat eine Aktion ausgefuehrt.'
  }
  const timestamp = indexedAt ? new Date(indexedAt).toLocaleString('de-DE') : ''
  const recordText = record?.text || ''

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
            <p className='font-semibold text-foreground truncate'>{author.displayName || author.handle || 'Unbekannt'}</p>
            {author.handle ? (
              <p className='text-sm text-foreground-muted truncate'>@{author.handle}</p>
            ) : null}
            <span className='ml-auto rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-foreground-muted'>
              {reasonInfo.label}
            </span>
          </div>
          <p className='text-sm text-foreground'>
            {author.displayName || author.handle || 'Jemand'} {reasonInfo.description}
          </p>
          {recordText ? (
            <p className='rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words'>
              {recordText}
            </p>
          ) : null}
          {subject ? (
            <div className='rounded-xl border border-dashed border-border px-3 py-2 text-xs text-foreground-muted'>
              Bezogen auf:&nbsp;
              <span className='font-medium text-foreground'>{subject.text || 'Beitrag'}</span>
              {onSelectSubject && subject?.uri ? (
                <Button
                  size='pill'
                  variant='secondary'
                  className='ml-3 inline-flex'
                  onClick={() => onSelectSubject(subject)}
                >
                  Beitrag anzeigen
                </Button>
              ) : null}
            </div>
          ) : null}
          {timestamp ? (
            <time className='block text-xs text-foreground-muted' dateTime={indexedAt}>{timestamp}</time>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function Notifications ({ refreshKey = 0, onSelectPost }) {
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
    return <p className='text-sm text-muted-foreground'>Mitteilungen werden geladen...</p>
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
            <NotificationCard item={item} onSelectSubject={onSelectPost ? ((subject) => onSelectPost(subject)) : undefined} />
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
