import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { ChatBubbleIcon, HeartFilledIcon, HeartIcon } from '@radix-ui/react-icons'
import { Button, Card, useBskyEngagement, fetchNotifications as fetchNotificationsApi, RichText, RepostMenuButton } from '../shared'
import NotificationCardSkeleton from './NotificationCardSkeleton.jsx'
import { useAppDispatch } from '../../context/AppContext'

const APP_BSKY_REASON_PREFIX = 'app.bsky.notification.'
const POST_RECORD_SEGMENT = '/app.bsky.feed.post/'

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

function formatAppBskyReason (reason) {
  if (!reason || !reason.startsWith(APP_BSKY_REASON_PREFIX)) return null
  const slug = reason.slice(APP_BSKY_REASON_PREFIX.length)
  const readable = slug.replace(/[.#]/g, ' ').trim() || 'System'
  return {
    label: `System (${readable})`,
    description: () => 'Systembenachrichtigung von Bluesky.'
  }
}

function isPostUri (value) {
  return typeof value === 'string' && value.includes(POST_RECORD_SEGMENT)
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
  const normalizedImages = images
    .map(img => {
      const src = img?.fullsize || img?.thumb || ''
      if (!src) return null
      return {
        src,
        thumb: img?.thumb || img?.fullsize || src,
        alt: img?.alt || ''
      }
    })
    .filter(Boolean)
  const firstImage = normalizedImages[0] || null
  const external = embed?.external || embed?.media?.external || null
  return {
    image: firstImage
      ? {
          src: firstImage.src,
          alt: firstImage.alt || ''
        }
      : null,
    images: normalizedImages,
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

const NotificationCard = memo(function NotificationCard ({ item, onSelectItem, onSelectSubject, onReply, onQuote, onMarkRead, onViewMedia }) {
  const dispatch = useAppDispatch()
  const {
    author = {},
    reason = 'unknown',
    record = {},
    subject = null,
    indexedAt,
    isRead
  } = item || {}

  const subjectType = useMemo(() => resolveSubjectType(subject), [subject])
  const reasonInfo = REASON_COPY[reason] || formatAppBskyReason(reason) || {
    label: 'Aktivität',
    description: () => 'hat eine Aktion ausgeführt.'
  }
  const reasonDescription = typeof reasonInfo.description === 'function'
    ? reasonInfo.description({ subjectType, reason, additionalCount: item?.additionalCount || 0 })
    : reasonInfo.description
  const timestamp = indexedAt ? new Date(indexedAt).toLocaleString('de-DE') : ''
  const recordText = record?.text || ''
  const isReply = reason === 'reply'
  const profileActor = author?.did || author?.handle || ''
  const canOpenProfileViewer = Boolean(profileActor)

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
    if (target?.uri) return target
    const uri = target?.raw?.post?.uri || target?.record?.uri || target?.post?.uri || fallbackUri
    if (!uri) return target || null
    const rawPost = target?.raw?.post || target?.record || target?.post || {
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

  const threadTarget = useMemo(() => buildThreadTarget(subject || item), [buildThreadTarget, subject, item])
  const resolvedThreadTarget = useMemo(() => {
    if (!threadTarget || !isPostUri(threadTarget?.uri)) return null
    return threadTarget
  }, [threadTarget])
  const canOpenItem = Boolean(resolvedThreadTarget && typeof onSelectItem === 'function')
  const canOpenSubject = Boolean(resolvedThreadTarget && subject && typeof onSelectSubject === 'function')

  const handleSelectItem = useCallback((target) => {
    if (!resolvedThreadTarget || typeof onSelectItem !== 'function') return
    markAsRead()
    const finalTarget = (target && isPostUri(target?.uri)) ? target : resolvedThreadTarget
    onSelectItem(buildThreadTarget(finalTarget))
  }, [onSelectItem, markAsRead, buildThreadTarget, resolvedThreadTarget])

  const handleSelectSubject = useCallback((targetArg) => {
    if (!resolvedThreadTarget || typeof onSelectSubject !== 'function') return
    const finalTarget = (targetArg && isPostUri(targetArg?.uri)) ? targetArg : resolvedThreadTarget
    markAsRead()
    onSelectSubject(buildThreadTarget(finalTarget))
  }, [onSelectSubject, markAsRead, buildThreadTarget, resolvedThreadTarget])

  const unreadHighlight = isRead ? 'bg-background border-border' : 'bg-primary/5 border-primary/60 shadow-[0_10px_35px_-20px_rgba(14,165,233,0.7)]'

  const openProfileViewer = useCallback(() => {
    if (!canOpenProfileViewer) return
    markAsRead()
    dispatch({ type: 'OPEN_PROFILE_VIEWER', actor: profileActor })
  }, [canOpenProfileViewer, dispatch, markAsRead, profileActor])

  const handleProfileClick = useCallback((event) => {
    event?.preventDefault()
    event?.stopPropagation()
    openProfileViewer()
  }, [openProfileViewer])

  return (
    <Card
      as='article'
      padding='p-4'
      hover={false}
      className={`${unreadHighlight} ${canOpenItem ? 'cursor-pointer hover:bg-background-subtle/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60' : ''}`}
      data-component='BskyNotificationCard'
      data-reason={reason}
      onClick={(event) => {
        if (!canOpenItem) return
        if (event.target?.closest?.('button, a, svg, img')) return
        handleSelectItem(resolvedThreadTarget)
      }}
      onKeyDown={(event) => {
        if (!canOpenItem) return
        if (event.target?.closest?.('button, a')) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleSelectItem(resolvedThreadTarget)
        }
      }}
      role={canOpenItem ? 'button' : undefined}
      tabIndex={canOpenItem ? 0 : undefined}
      aria-label={canOpenItem ? 'Thread öffnen' : undefined}
    >
      <div className='flex items-start gap-3'>
        {author.avatar ? (
          canOpenProfileViewer ? (
            <button type='button' onClick={handleProfileClick} className='h-12 w-12 rounded-full border border-border transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'>
              <img src={author.avatar} alt='' className='h-full w-full rounded-full object-cover' />
            </button>
          ) : (
            <img src={author.avatar} alt='' className='h-12 w-12 rounded-full border border-border object-cover' />
          )
        ) : (
          <div className='h-12 w-12 rounded-full border border-border bg-background-subtle' />
        )}
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='flex items-center gap-2 min-w-0'>
            <div className='min-w-0 flex-1'>
              {canOpenProfileViewer ? (
                <button
                  type='button'
                  onClick={handleProfileClick}
                  className='block w-full truncate text-left font-semibold text-foreground transition hover:text-primary'
                  title={authorLabel}
                >
                  {authorLabel}
                </button>
              ) : (
                <p className='truncate font-semibold text-foreground' title={authorLabel}>{authorLabel}</p>
              )}
              {author.handle ? (
                canOpenProfileViewer ? (
                  <button
                    type='button'
                    onClick={handleProfileClick}
                    className='block w-full truncate text-left text-sm text-foreground-muted transition hover:text-primary'
                    title={`@${author.handle}`}
                  >
                    @{author.handle}
                  </button>
                ) : (
                  <p className='truncate text-sm text-foreground-muted' title={`@${author.handle}`}>@{author.handle}</p>
                )
              ) : null}
            </div>
            <span className='shrink-0 rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-foreground-muted'>
              {reasonInfo.label}
            </span>
          </div>
          {authorFallbackHint ? (
            <p className='text-xs text-foreground-muted'>{authorFallbackHint}</p>
          ) : null}
          <p className='text-sm text-foreground break-words'>
            <span className='inline-flex max-w-full truncate align-baseline font-semibold'>
              {author.displayName || author.handle || 'Jemand'}
            </span>{' '}
            {reasonDescription}
          </p>
          {recordText ? (
            <p
              className={`rounded-2xl border px-3 py-2 text-sm ${
                isReply
                  ? 'border-primary/60 bg-primary/20 text-foreground shadow-[0_18px_45px_-18px_rgba(14,165,233,0.9)]'
                  : 'border-border bg-background-subtle text-foreground'
              }`}
            >
              <RichText text={recordText} className='whitespace-pre-wrap break-words' />
            </p>
          ) : null}
          {subject ? (
            <NotificationSubjectPreview
              subject={subject}
              reason={reason}
              threadTarget={resolvedThreadTarget}
              onSelect={canOpenSubject && resolvedThreadTarget ? (() => handleSelectSubject(resolvedThreadTarget)) : undefined}
              onSelectQuoted={handleSelectSubject}
              onViewMedia={onViewMedia}
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
    </Card>
  )
})

function NotificationSubjectPreview ({ subject, reason, onSelect, onSelectQuoted, threadTarget, onViewMedia }) {
  const dispatch = useAppDispatch()
  const author = subject?.author || {}
  const preview = extractSubjectPreview(subject)
  const timestamp = subject?.createdAt ? new Date(subject.createdAt).toLocaleString('de-DE') : ''
  const profileActor = author?.did || author?.handle || ''
  const canOpenProfileViewer = Boolean(profileActor)
  const showQuoted = isViaRepostReason(reason)
  const quoted = showQuoted ? extractQuotedPost(subject) : null
  const quotedAuthorLabel = quoted?.author
    ? (quoted.author.displayName || quoted.author.handle || 'Unbekannt')
    : ''
  const quotedAuthorMissing = quoted?.author ? !(quoted.author.displayName || quoted.author.handle) : false
  const canOpenSubject = typeof onSelect === 'function' && Boolean(threadTarget)
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

  const openSubjectAuthor = useCallback((event) => {
    if (!canOpenProfileViewer) return
    event?.preventDefault()
    event?.stopPropagation()
    dispatch({ type: 'OPEN_PROFILE_VIEWER', actor: profileActor })
  }, [canOpenProfileViewer, dispatch, profileActor])

  const handlePreviewImageClick = useCallback((event) => {
    if (typeof onViewMedia !== 'function') return
    if (!Array.isArray(preview?.images) || preview.images.length === 0) return
    event?.preventDefault()
    event?.stopPropagation()
    onViewMedia(preview.images, 0)
  }, [onViewMedia, preview?.images])

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
          canOpenProfileViewer
            ? (
              <button type='button' onClick={openSubjectAuthor} className='h-8 w-8 rounded-full border border-border transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'>
                <img src={author.avatar} alt='' className='h-full w-full rounded-full object-cover' />
              </button>
              )
            : <img src={author.avatar} alt='' className='h-8 w-8 rounded-full border border-border object-cover' />
        ) : (
          <div className='h-8 w-8 rounded-full border border-border bg-background' />
        )}
        <div className='min-w-0 flex-1'>
          {canOpenProfileViewer ? (
            <button
              type='button'
              onClick={openSubjectAuthor}
              className='block w-full truncate text-left font-semibold text-foreground transition hover:text-primary'
            >
              {author.displayName || author.handle || 'Profil'}
            </button>
          ) : (
            <p className='truncate font-semibold text-foreground'>{author.displayName || author.handle || 'Profil'}</p>
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
        <button
          type='button'
          onClick={handlePreviewImageClick}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              handlePreviewImageClick(event)
            }
          }}
          className='block w-full overflow-hidden rounded-xl border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
        >
          <img src={preview.image.src} alt={preview.image.alt || ''} className='w-full object-cover max-h-48' loading='lazy' />
        </button>
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

export default function Notifications ({ refreshKey = 0, onSelectPost, onReply, onQuote, onUnreadChange, activeTab = 'all', onViewMedia }) {
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
      const mentionReasons = new Set(['mention', 'reply', 'quote'])
      return items.filter((entry) => mentionReasons.has(entry?.reason))
    }
    return items
  }, [activeTab, items])

  useEffect(() => {
    if (activeTab !== 'mentions') return
    if (loading || loadingMore) return
    if (filteredItems.length > 0) return
    if (!hasMore) return
    loadMore()
  }, [activeTab, filteredItems.length, hasMore, loadMore, loading, loadingMore])

  if (loading) {
    return (
      <div className='space-y-3' data-component='BskyNotifications' data-state='loading'>
        <NotificationCardSkeleton />
        <NotificationCardSkeleton />
        <NotificationCardSkeleton />
        <NotificationCardSkeleton />
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
              onViewMedia={onViewMedia}
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
