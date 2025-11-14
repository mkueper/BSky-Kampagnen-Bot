import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatBubbleIcon, HeartFilledIcon, HeartIcon } from '@radix-ui/react-icons'
import { Button, useBskyEngagement, fetchNotifications as fetchNotificationsApi, RichText, RepostMenuButton } from '../shared'

const REASON_COPY = {
  like: {
    label: 'Like',
    description: ({ subjectType = 'Beitrag', additionalCount = 0, reason = 'like' } = {}) => {
      const viaRepost = reason === 'like-via-repost'
      const target = viaRepost ? 'deinen Repost' : `deinen ${subjectType}`
      if (additionalCount > 0) {
        return `und ${additionalCount} weitere haben ${target} mit „Gefällt mir“ markiert.`
      }
      return `gefällt ${target}.`
    }
  },
  repost: {
    label: 'Repost',
    description: ({ subjectType = 'Beitrag', additionalCount = 0, reason = 'repost' } = {}) => {
      const viaRepost = reason === 'repost-via-repost'
      const action = viaRepost ? 'deinen Repost erneut geteilt' : `deinen ${subjectType} erneut geteilt`
      if (additionalCount > 0) {
        return `und ${additionalCount} weitere haben ${action}.`
      }
      return `hat ${action}.`
    }
  },
  follow: {
    label: 'Follow',
    description: ({ additionalCount = 0 } = {}) => {
      if (additionalCount > 0) {
        return `und ${additionalCount} weitere folgen dir jetzt.`
      }
      return 'folgt dir jetzt.'
    }
  },
  reply: {
    label: 'Reply',
    description: () => 'hat auf deinen Beitrag geantwortet.'
  },
  mention: {
    label: 'Mention',
    description: () => 'hat dich in einem Beitrag erwähnt.'
  },
  quote: {
    label: 'Quote',
    description: ({ subjectType = 'Beitrag', additionalCount = 0 } = {}) => {
      if (additionalCount > 0) {
        return `und ${additionalCount} weitere haben deinen ${subjectType} zitiert.`
      }
      return `hat deinen ${subjectType} zitiert.`
    }
  },
  'subscribed-post': {
    label: 'Subscribed Post',
    description: () => 'hat einen abonnierten Beitrag veröffentlicht.'
  }
}

REASON_COPY['like-via-repost'] = {
  ...REASON_COPY.like,
  label: 'Like via Repost'
}
REASON_COPY['repost-via-repost'] = {
  ...REASON_COPY.repost,
  label: 'Repost via Repost'
}

function isViaRepostReason (reason) {
  return reason === 'like-via-repost' || reason === 'repost-via-repost'
}

function resolveSubjectType (subject) {
  const record = subject?.raw?.post?.record || subject?.record || null
  if (!record) return 'Beitrag'
  if (record?.reply) return 'Antwort'
  const embedType = record?.embed?.$type || record?.embed?.record?.$type || ''
  if (embedType.includes('record')) return 'Repost'
  return 'Beitrag'
}

function extractSubjectPreview (subject) {
  const record = subject?.raw?.post?.record || subject?.record || null
  const embed = subject?.raw?.post?.embed || record?.embed || null
  const images = []
  if (embed?.images && Array.isArray(embed.images)) {
    images.push(...embed.images)
  } else if (embed?.media?.images && Array.isArray(embed.media.images)) {
    images.push(...embed.media.images)
  }
  const firstImage = images.find(img => img?.thumb || img?.fullsize) || null
  const external = embed?.external || embed?.media?.external || null
  return {
    image: firstImage
      ? {
          src: firstImage.fullsize || firstImage.thumb,
          alt: firstImage.alt || ''
        }
      : null,
    external: external
      ? {
          uri: external.uri,
          title: external.title || external.uri,
          description: external.description || ''
        }
      : null
  }
}

function extractQuotedPost (subject) {
  const embed = subject?.raw?.post?.embed || subject?.record?.embed || null
  const embedType = embed?.$type || ''
  let recordView = null
  if (typeof embedType === 'string') {
    if (embedType.startsWith('app.bsky.embed.recordWithMedia')) {
      recordView = embed?.record || null
    } else if (embedType.startsWith('app.bsky.embed.record')) {
      recordView = embed
    }
  }
  if (!recordView) return null
  const view = recordView?.record && recordView?.record?.$type
    ? recordView.record
    : recordView
  const viewType = view?.$type || ''
  if (viewType.endsWith('#viewBlocked')) {
    return {
      status: 'blocked',
      statusMessage: 'Dieser Beitrag ist geschützt oder blockiert.'
    }
  }
  if (viewType.endsWith('#viewNotFound')) {
    return {
      status: 'not_found',
      statusMessage: 'Der Original-Beitrag wurde entfernt oder ist nicht mehr verfügbar.'
    }
  }
  if (viewType.endsWith('#viewDetached')) {
    return {
      status: 'detached',
      statusMessage: 'Der Original-Beitrag wurde losgelöst und kann nicht angezeigt werden.'
    }
  }
  const author = view?.author || {}
  const value = view?.value || {}
  return {
    status: 'ok',
    statusMessage: '',
    uri: view?.uri || null,
    cid: view?.cid || null,
    text: typeof value?.text === 'string' ? value.text : '',
    author: {
      handle: author?.handle || '',
      displayName: author?.displayName || author?.handle || '',
      avatar: author?.avatar || null
    }
  }
}

function NotificationCard ({ item, onSelectItem, onSelectSubject, onReply, onQuote, onMarkRead }) {
  const {
    author = {},
    reason = 'unknown',
    record = {},
    subject = null,
    indexedAt,
    isRead
  } = item || {}

  const subjectType = useMemo(() => resolveSubjectType(subject), [subject])
  const reasonInfo = REASON_COPY[reason] || {
    label: 'Aktivität',
    description: () => 'hat eine Aktion ausgeführt.'
  }
  const reasonDescription = typeof reasonInfo.description === 'function'
    ? reasonInfo.description({ subjectType, reason, additionalCount: item?.additionalCount || 0 })
    : reasonInfo.description
  const timestamp = indexedAt ? new Date(indexedAt).toLocaleString('de-DE') : ''
  const recordText = record?.text || ''
  const isReply = reason === 'reply'
  const profileUrl = author?.handle ? `https://bsky.app/profile/${author.handle}` : null
  const canOpenItem = typeof onSelectItem === 'function'
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

  const authorDisplayName = author.displayName || author.handle || ''
  const authorLabel = authorDisplayName || 'Unbekannt'
  const authorFallbackHint = authorDisplayName ? '' : 'Profilangaben wurden von Bluesky für diese Benachrichtigung nicht mitgeliefert.'

  const markAsRead = useCallback(() => {
    if (!isRead && typeof onMarkRead === 'function') {
      onMarkRead(item)
    }
  }, [isRead, onMarkRead, item])

  const fallbackUri = item?.reasonSubject || record?.subject?.uri || record?.uri || null

  const buildThreadTarget = useCallback((target) => {
    if (target && target.uri) {
      return target
    }
    const uri = target?.raw?.post?.uri || fallbackUri
    if (!uri) return target || null
    const rawPost = target?.raw?.post || {
      uri,
      cid: target?.cid || null,
      author: target?.author || {},
      record: { text: target?.text || '' }
    }
    return {
      ...(target || {}),
      uri,
      raw: { post: { ...rawPost, uri } }
    }
  }, [fallbackUri])

  const handleSelectItem = useCallback((target) => {
    if (typeof onSelectItem !== 'function') return
    markAsRead()
    onSelectItem(buildThreadTarget(target))
  }, [onSelectItem, markAsRead, buildThreadTarget])

  const handleSelectSubject = useCallback((target) => {
    if (typeof onSelectSubject !== 'function') return
    markAsRead()
    onSelectSubject(buildThreadTarget(target))
  }, [onSelectSubject, markAsRead, buildThreadTarget])

  const unreadHighlight = isRead ? 'bg-background border-border' : 'bg-primary/5 border-primary/60 shadow-[0_10px_35px_-20px_rgba(14,165,233,0.7)]'

  return (
    <article
      className={`rounded-2xl border p-4 shadow-soft transition ${unreadHighlight} ${canOpenItem ? 'cursor-pointer hover:bg-background-subtle/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60' : ''}`}
      data-component='BskyNotificationCard'
      data-reason={reason}
      onClick={(event) => {
        if (!canOpenItem) return
        if (event.target?.closest?.('button, a')) return
        handleSelectItem(subject || item)
      }}
      onKeyDown={(event) => {
        if (!canOpenItem) return
        if (event.target?.closest?.('button, a')) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleSelectItem(subject || item)
        }
      }}
      role={canOpenItem ? 'button' : undefined}
      tabIndex={canOpenItem ? 0 : undefined}
      aria-label={canOpenItem ? 'Thread öffnen' : undefined}
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
                {authorLabel}
              </a>
            ) : (
              <p className='font-semibold text-foreground truncate'>{authorLabel}</p>
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
          {authorFallbackHint ? (
            <p className='text-xs text-foreground-muted'>{authorFallbackHint}</p>
          ) : null}
          <p className='text-sm text-foreground'>
            <span className='font-semibold'>{author.displayName || author.handle || 'Jemand'}</span> {reasonDescription}
          </p>
          {recordText ? (
            <p className='rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground'>
              <RichText text={recordText} className='whitespace-pre-wrap break-words' />
            </p>
          ) : null}
          {subject ? (
            <NotificationSubjectPreview
              subject={subject}
              reason={reason}
              onSelect={canOpenSubject ? handleSelectSubject : undefined}
              onSelectQuoted={handleSelectSubject}
            />
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
              onQuote={onQuote ? (() => {
                clearError()
                onQuote(item)
              }) : undefined}
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

function NotificationSubjectPreview ({ subject, reason, onSelect, onSelectQuoted }) {
  const author = subject?.author || {}
  const preview = extractSubjectPreview(subject)
  const timestamp = subject?.createdAt ? new Date(subject.createdAt).toLocaleString('de-DE') : ''
  const profileUrl = author?.handle ? `https://bsky.app/profile/${author.handle}` : null
  const showQuoted = isViaRepostReason(reason)
  const quoted = showQuoted ? extractQuotedPost(subject) : null
  const quotedAuthorLabel = quoted?.author
    ? (quoted.author.displayName || quoted.author.handle || 'Unbekannt')
    : ''
  const quotedAuthorMissing = quoted?.author ? !(quoted.author.displayName || quoted.author.handle) : false
  const canOpenSubject = typeof onSelect === 'function'
  const canOpenQuoted = typeof onSelectQuoted === 'function' && quoted?.uri && quoted.status === 'ok'

  const handleSelectSubject = useCallback((event) => {
    if (!canOpenSubject) return
    if (event?.target?.closest?.('a, button')) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(subject)
  }, [canOpenSubject, onSelect, subject])

  const handleSelectQuoted = useCallback((event) => {
    if (!canOpenQuoted) return
    event.preventDefault()
    event.stopPropagation()
    onSelectQuoted({
      uri: quoted.uri,
      cid: quoted.cid,
      text: quoted.text,
      author: quoted.author,
      raw: { post: { uri: quoted.uri, cid: quoted.cid, author: quoted.author, record: { text: quoted.text } } }
    })
  }, [canOpenQuoted, onSelectQuoted, quoted])

  return (
    <div
      className={`rounded-2xl border border-border bg-background-subtle px-3 py-3 text-sm text-foreground space-y-2 ${
        canOpenSubject ? 'cursor-pointer transition hover:bg-background-subtle/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70' : ''
      }`}
      role={canOpenSubject ? 'button' : undefined}
      tabIndex={canOpenSubject ? 0 : undefined}
      onClick={canOpenSubject ? handleSelectSubject : undefined}
      onKeyDown={canOpenSubject ? ((event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleSelectSubject(event)
        }
      }) : undefined}
    >
      <div className='flex items-center gap-3'>
        {author.avatar ? (
          <img src={author.avatar} alt='' className='h-8 w-8 rounded-full border border-border object-cover' />
        ) : (
          <div className='h-8 w-8 rounded-full border border-border bg-background' />
        )}
        <div className='min-w-0'>
          {profileUrl ? (
            <a
              href={profileUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='font-semibold text-foreground hover:text-primary transition truncate'
            >
              {author.displayName || author.handle || 'Profil'}
            </a>
          ) : (
            <p className='font-semibold text-foreground truncate'>{author.displayName || author.handle || 'Profil'}</p>
          )}
          {timestamp ? <p className='text-xs text-foreground-muted'>{timestamp}</p> : null}
        </div>
      </div>
      {subject?.text ? (
        <div className='text-sm text-foreground'>
          <RichText text={subject.text} className='whitespace-pre-wrap break-words' />
        </div>
      ) : null}
      {preview.image ? (
        <div className='overflow-hidden rounded-xl border border-border'>
          <img src={preview.image.src} alt={preview.image.alt || ''} className='w-full object-cover max-h-48' loading='lazy' />
        </div>
      ) : null}
      {preview.external ? (
        <a
          href={preview.external.uri}
          target='_blank'
          rel='noopener noreferrer'
          className='block rounded-xl border border-border bg-background px-3 py-2 text-sm hover:bg-background-subtle transition'
        >
          <p className='font-medium text-foreground truncate'>{preview.external.title}</p>
          {preview.external.description ? (
            <p className='text-xs text-foreground-muted line-clamp-2'>{preview.external.description}</p>
          ) : null}
        </a>
      ) : null}
      {quoted ? (
        <div className='space-y-1'>
          <p className='text-xs font-medium uppercase tracking-wide text-foreground-muted'>Originaler Beitrag</p>
          <div
            className={`rounded-2xl border border-border bg-background px-3 py-3 text-sm text-foreground ${
              canOpenQuoted ? 'cursor-pointer transition hover:bg-background-subtle/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70' : ''
            }`}
            role={canOpenQuoted ? 'button' : undefined}
            tabIndex={canOpenQuoted ? 0 : undefined}
            onClick={canOpenQuoted ? handleSelectQuoted : undefined}
            onKeyDown={canOpenQuoted ? ((event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleSelectQuoted(event)
              }
            }) : undefined}
          >
            {quoted.status !== 'ok' ? (
              <p className='text-xs text-foreground-muted'>{quoted.statusMessage}</p>
            ) : (
              <div className='space-y-2'>
                <div className='flex items-center gap-3'>
                  {quoted.author?.avatar ? (
                    <img src={quoted.author.avatar} alt='' className='h-8 w-8 rounded-full border border-border object-cover' />
                  ) : (
                    <div className='h-8 w-8 rounded-full border border-border bg-background-subtle' />
                  )}
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-foreground'>{quotedAuthorLabel}</p>
                    {quotedAuthorMissing ? (
                      <p className='text-xs text-foreground-muted'>Autorinformationen wurden nicht mitgeliefert.</p>
                    ) : null}
                    {quoted.author?.handle ? (
                      <p className='truncate text-xs text-foreground-muted'>@{quoted.author.handle}</p>
                    ) : null}
                  </div>
                </div>
                {quoted.text ? (
                  <div className='text-sm text-foreground'>
                    <RichText text={quoted.text} className='whitespace-pre-wrap break-words text-sm text-foreground' />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function Notifications ({ refreshKey = 0, onSelectPost, onReply, onQuote, onUnreadChange, activeTab = 'all' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [retryTick, setRetryTick] = useState(0)
  const loadMoreTriggerRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const syncUnread = useCallback((count) => {
    setUnreadCount(count)
    if (typeof onUnreadChange === 'function') {
      onUnreadChange(count)
    }
  }, [onUnreadChange])

  const hasMore = useMemo(() => Boolean(cursor), [cursor])

  const fetchPage = useCallback(async ({ withCursor, markSeen = false } = {}) => {
    const { items: notifications, cursor: nextCursor, unreadCount } = await fetchNotificationsApi({
      cursor: withCursor,
      markSeen,
    })
    return { notifications, cursor: nextCursor, unreadCount }
  }, [])

  useEffect(() => {
    let ignore = false
    async function loadInitial () {
      setLoading(true)
      setError('')
      try {
        const { notifications, cursor: nextCursor, unreadCount } = await fetchPage({ markSeen: true })
        if (!ignore) {
          setItems(notifications)
          setCursor(nextCursor)
          syncUnread(unreadCount)
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
      const { notifications, cursor: nextCursor, unreadCount } = await fetchPage({ withCursor: cursor })
      setItems(prev => [...prev, ...notifications])
      setCursor(nextCursor)
      if (typeof unreadCount === 'number') {
        syncUnread(unreadCount)
      }
    } catch (err) {
      console.error('Notifications loadMore failed', err)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, fetchPage, hasMore, loadingMore])

  const handleMarkRead = useCallback((notification) => {
    if (!notification || notification.isRead) return
    const targetId = notification.uri || notification.cid || notification.indexedAt
    setItems(prev =>
      prev.map(entry => {
        const entryId = entry?.uri || entry?.cid || entry?.indexedAt
        if (entryId === targetId) {
          return entry.isRead ? entry : { ...entry, isRead: true }
        }
        return entry
      })
    )
    setUnreadCount(current => {
      if (current <= 0) return 0
      const next = current - 1
      if (typeof onUnreadChange === 'function') onUnreadChange(next)
      return next
    })
  }, [onUnreadChange])

  useEffect(() => {
    if (!hasMore || !loadMoreTriggerRef.current) return
    const root = typeof document !== 'undefined'
      ? document.getElementById('bsky-scroll-container')
      : null
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        loadMore()
      }
    }, {
      root,
      rootMargin: '200px 0px 200px 0px'
    })
    const target = loadMoreTriggerRef.current
    observer.observe(target)
    return () => {
      observer.unobserve(target)
    }
  }, [hasMore, loadMore])

  const filteredItems = useMemo(() => {
    if (activeTab === 'mentions') {
      const mentionReasons = new Set(['like', 'mention', 'reply', 'quote'])
      return items.filter((entry) => mentionReasons.has(entry?.reason))
    }
    return items
  }, [activeTab, items])

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

  if (filteredItems.length === 0) {
    return <p className='text-sm text-muted-foreground'>Keine Mitteilungen gefunden.</p>
  }

  return (
    <section className='space-y-4' data-component='BskyNotifications'>
      <ul className='space-y-3'>
        {filteredItems.map((item, idx) => (
          <li key={item.uri || item.cid || `${item.reason || 'notification'}-${item.reasonSubject || idx}-${idx}`}>
            <NotificationCard
              item={item}
              onSelectItem={onSelectPost ? ((selected) => onSelectPost(selected || item)) : undefined}
              onSelectSubject={onSelectPost ? ((subject) => onSelectPost(subject)) : undefined}
              onReply={onReply}
              onQuote={onQuote}
              onMarkRead={handleMarkRead}
            />
          </li>
        ))}
      </ul>
      {hasMore ? (
        <div
          ref={loadMoreTriggerRef}
          className='py-4 text-center text-sm text-foreground-muted'
        >
          {loadingMore ? 'Lade…' : 'Weitere Mitteilungen werden automatisch geladen…'}
        </div>
      ) : null}
    </section>
  )
}
