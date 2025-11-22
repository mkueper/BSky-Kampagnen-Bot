import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { ChatBubbleIcon, HeartFilledIcon, HeartIcon, TriangleRightIcon } from '@radix-ui/react-icons'
import { Button, Card, useBskyEngagement, fetchNotifications as fetchNotificationsApi, RichText, RepostMenuButton } from '../shared'
import NotificationCardSkeleton from './NotificationCardSkeleton.jsx'
import { useAppDispatch } from '../../context/AppContext'
import { useCardConfig } from '../../context/CardConfigContext.jsx'

const APP_BSKY_REASON_PREFIX = 'app.bsky.notification.'
const POST_RECORD_SEGMENT = '/app.bsky.feed.post/'

const parseAspectRatioValue = (value) => {
  if (!value) return null
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (Array.isArray(value) && value.length === 2) {
    const [w, h] = value.map(Number)
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h
  }
  if (typeof value === 'string') {
    if (value.includes(':')) {
      const [w, h] = value.split(':').map(Number)
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h
    }
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return numeric
  }
  return null
}


function getNotificationId (entry) {
  if (!entry) return ''
  if (entry.groupKey) {
    return entry.groupKey
  }
  // Für einzelne Benachrichtigungen ist die URI der eindeutige Schlüssel.
  // Der Zeitstempel dient als Fallback, um Kollisionen bei fehlenden URIs zu vermeiden.
  return entry.uri || `${entry.reason}:${entry.reasonSubject}:${entry.indexedAt}`
}


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
  const imageSources = []
  const tryCollectImages = (source) => {
    if (source?.images && Array.isArray(source.images)) {
      imageSources.push(...source.images)
    }
  }
  tryCollectImages(embed)
  tryCollectImages(embed?.media)

  const videoCandidates = []
  const tryCollectVideo = (candidate) => {
    if (!candidate || typeof candidate !== 'object') return
    const type = String(candidate.$type || '').toLowerCase()
    if (type.includes('app.bsky.embed.video')) {
      videoCandidates.push(candidate)
    } else if (candidate.video && typeof candidate.video === 'object') {
      videoCandidates.push(candidate.video)
    }
  }
  tryCollectVideo(embed)
  tryCollectVideo(embed?.media)
  if (Array.isArray(embed?.videos)) {
    videoCandidates.push(...embed.videos)
  }
  if (Array.isArray(embed?.media?.videos)) {
    videoCandidates.push(...embed.media.videos)
  }

  const normalizedImages = imageSources
    .map(img => {
      const src = img?.fullsize || img?.thumb || ''
      if (!src) return null
      return {
        type: 'image',
        src,
        thumb: img?.thumb || img?.fullsize || src,
        alt: img?.alt || ''
      }
    })
    .filter(Boolean)

  const normalizedVideos = videoCandidates
    .map(video => {
      const src = typeof video?.playlist === 'string' && video.playlist
        ? video.playlist
        : (video?.src || '')
      if (!src) return null
      return {
        type: 'video',
        src,
        thumb: video?.thumbnail || '',
        poster: video?.thumbnail || '',
        alt: video?.alt || '',
        aspectRatio: video?.aspectRatio || null
      }
    })
    .filter(Boolean)

  const mediaItems = [...normalizedImages, ...normalizedVideos]
  const firstImage = normalizedImages[0] || null
  const firstVideo = normalizedVideos[0] || null
  const external = embed?.external || embed?.media?.external || null

  return {
    image: firstImage || null,
    imageIndex: firstImage ? mediaItems.indexOf(firstImage) : -1,
    video: firstVideo || null,
    videoIndex: firstVideo ? mediaItems.indexOf(firstVideo) : -1,
    images: normalizedImages,
    videos: normalizedVideos,
    media: mediaItems,
    external: external
      ? {
          uri: external.uri,
          title: external.title || external.uri,
          description: external.description || ''
        }
      : null
  }
}

function buildBlobUrl (did, cid, format = 'feed_fullsize') {
  if (!did || !cid) return ''
  return `https://cdn.bsky.app/img/${format}/plain/${did}/${cid}@jpeg`
}

function extractReplyMedia ({ record, authorDid }) {
  const embed = record?.embed || null
  if (!embed) return { media: [], images: [], videos: [] }

  const imageSources = []
  if (embed.images && Array.isArray(embed.images)) {
    imageSources.push(...embed.images)
  }

  const videoCandidates = []
  const type = String(embed.$type || '').toLowerCase()
  if (type.includes('app.bsky.embed.video')) {
    videoCandidates.push(embed)
  } else if (embed.video && typeof embed.video === 'object') {
    videoCandidates.push(embed.video)
  }

  const normalizedImages = imageSources
    .map(img => {
      const imageBlob = img?.image
      if (!imageBlob || imageBlob?.$type !== 'blob') return null
      const cid = imageBlob.ref?.$link
      if (!cid) return null
      const src = buildBlobUrl(authorDid, cid, 'feed_fullsize')
      if (!src) return null
      return { type: 'image', src, thumb: buildBlobUrl(authorDid, cid, 'feed_thumb'), alt: img?.alt || '' }
    })
    .filter(Boolean)

  const normalizedVideos = videoCandidates
    .map(video => {
      const src = typeof video?.playlist === 'string' && video.playlist
        ? video.playlist
        : (video?.src || '')
      if (!src) return null
      return { type: 'video', src, thumb: video?.thumbnail || '', poster: video?.thumbnail || '', alt: video?.alt || '', aspectRatio: video?.aspectRatio || null }
    })
    .filter(Boolean)

  const mediaItems = [...normalizedImages, ...normalizedVideos].map((item, idx) => ({ ...item, mediaIndex: idx }))

  return {
    media: mediaItems,
    images: normalizedImages,
    videos: normalizedVideos
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

export const NotificationCard = memo(function NotificationCard ({ item, onSelectItem, onSelectSubject, onReply, onQuote, onMarkRead, onViewMedia }) {
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

  const replyMedia = useMemo(() => {
    if (!isReply) return null
    return extractReplyMedia({ record, authorDid: author.did })
  }, [isReply, record])

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
    initialLikes: record?.stats?.likeCount,
    initialReposts: record?.stats?.repostCount,
    viewer: record?.viewer || item?.viewer,
  })

  const likeStyle = hasLiked ? { color: '#e11d48' } : undefined
  const repostStyle = hasReposted ? { color: '#0ea5e9' } : undefined

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

  const authorDisplayName = author.displayName || author.handle || ''
  const authorLabel = authorDisplayName || 'Unbekannt'
  const authorFallbackHint = authorDisplayName ? '' : 'Profilangaben wurden von Bluesky für diese Benachrichtigung nicht mitgeliefert.'
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
          <div className='flex flex-wrap items-center gap-2 min-w-0'>
            {canOpenProfileViewer ? (
              <button
                type='button'
                onClick={handleProfileClick}
                className='truncate text-left font-semibold text-foreground transition hover:text-primary'
                title={authorLabel}
              >
                {authorLabel}
              </button>
            ) : (
              <p className='truncate font-semibold text-foreground' title={authorLabel}>{authorLabel}</p>
            )}
            <span className='rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-foreground-muted'>
              {reasonInfo.label}
            </span>
          </div>
          {authorFallbackHint ? (
            <p className='text-xs text-foreground-muted'>{authorFallbackHint}</p>
          ) : null}
          {reasonDescription ? (
            <p className='text-sm text-foreground break-words'>{reasonDescription}</p>
          ) : null}
          {recordText ? (
            <p className='rounded-2xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground'>
              <RichText text={recordText} className='whitespace-pre-wrap break-words' />
            </p>
          ) : null}
          {isReply && replyMedia?.media?.length > 0 ? (
            <div className='rounded-2xl border border-border bg-background-subtle p-2'>
              <ReplyMediaPreview
                media={replyMedia.media}
                onViewMedia={onViewMedia}
              />
            </div>
          ) : null}
          {!isReply && subject ? (
            <NotificationSubjectPreview
              subject={subject}
              reason={reason}
              threadTarget={resolvedThreadTarget}
              onSelect={canOpenSubject ? handleSelectSubject : undefined}
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
              <span className='tabular-nums'>{record?.stats?.replyCount ?? 0}</span>
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
  const { config } = useCardConfig()
  const author = subject?.author || {}
  const preview = extractSubjectPreview(subject)
  const previewMedia = preview?.media || []
  const timestamp = subject?.createdAt ? new Date(subject.createdAt).toLocaleString('de-DE') : ''
  const profileActor = author?.did || author?.handle || ''
  const canOpenProfileViewer = Boolean(profileActor)
  const showQuoted = isViaRepostReason(reason)
  const quoted = showQuoted ? extractQuotedPost(subject) : null
  const quotedAuthorLabel = quoted?.author
    ? (quoted.author.displayName || quoted.author.handle || 'Unbekannt')
    : ''
  const quotedAuthorMissing = quoted?.author ? !(quoted.author.displayName || quoted.author.handle) : false
  const canOpenSubject = typeof onSelect === 'function' && Boolean(threadTarget || subject)
  const canOpenQuoted = typeof onSelectQuoted === 'function' && quoted?.uri && quoted.status === 'ok'

  const handleSelectSubject = useCallback((event) => {
    if (!canOpenSubject) return
    if (event?.target?.closest?.('a, button')) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(threadTarget || subject)
  }, [canOpenSubject, onSelect, subject, threadTarget])

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

  const handlePreviewMediaClick = useCallback((event, mediaIndex = 0) => {
    if (typeof onViewMedia !== 'function') return
    if (!Array.isArray(previewMedia) || previewMedia.length === 0) return
    event?.preventDefault()
    event?.stopPropagation()
    const safeIndex = Math.max(0, Math.min(mediaIndex, previewMedia.length - 1))
    onViewMedia(previewMedia, safeIndex)
  }, [onViewMedia, previewMedia])

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
          onClick={(event) => handlePreviewMediaClick(event, preview.imageIndex ?? 0)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              handlePreviewMediaClick(event, preview.imageIndex ?? 0)
            }
          }}
          className='block w-full overflow-hidden rounded-xl border border-border bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
        >
          <img
            src={preview.image.src}
            alt={preview.image.alt || ''}
            className='w-full rounded-xl'
            style={{
              maxHeight: config?.singleMax ?? 256,
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
              backgroundColor: 'var(--background-subtle, #f6f6f6)'
            }}
            loading='lazy'
          />
        </button>
      ) : null}
      {!preview.image && preview.video ? (
        (() => {
          const singleMax = config?.singleMax ?? 256
          const ratio = parseAspectRatioValue(preview.video.aspectRatio) || (16 / 9)
          return (
            <button
              type='button'
              onClick={(event) => handlePreviewMediaClick(event, preview.videoIndex ?? 0)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handlePreviewMediaClick(event, preview.videoIndex ?? 0)
                }
              }}
              className='relative block w-full overflow-hidden rounded-xl border border-border bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
              aria-label='Video öffnen'
              title='Video öffnen'
            >
              <div
                className='relative w-full overflow-hidden rounded-xl'
                style={{
                  aspectRatio: ratio,
                  width: '100%',
                  maxHeight: singleMax,
                  minHeight: singleMax,
                  backgroundColor: 'var(--background-subtle, #000)'
                }}
              >
                {preview.video.poster ? (
                  <img
                    src={preview.video.poster}
                    alt={preview.video.alt || ''}
                    className='h-full w-full object-contain opacity-80'
                    loading='lazy'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-black/80 to-gray-800 text-white'>
                    <span className='text-sm uppercase tracking-wide'>Video</span>
                  </div>
                )}
              </div>
              <span className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                <span className='flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white'>
                  <TriangleRightIcon className='h-6 w-6 translate-x-[1px]' />
                </span>
              </span>
            </button>
          )
        })()
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

function ReplyMediaPreview ({ media = [], onViewMedia }) {
  const { config } = useCardConfig()
  const handleMediaClick = useCallback((event, mediaIndex = 0) => {
    if (typeof onViewMedia !== 'function') return
    if (!Array.isArray(media) || media.length === 0) return
    event?.preventDefault()
    event?.stopPropagation()
    const safeIndex = Math.max(0, Math.min(mediaIndex, media.length - 1))
    onViewMedia(media, safeIndex)
  }, [onViewMedia, media])

  if (!media || media.length === 0) return null

  const firstImage = media.find(m => m.type === 'image')
  const firstVideo = media.find(m => m.type === 'video')

  if (firstImage) {
    const imageIndex = media.indexOf(firstImage)
    return (
      <button
        type='button'
        onClick={(event) => handleMediaClick(event, imageIndex)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleMediaClick(event, imageIndex)
          }
        }}
        className='block w-full overflow-hidden rounded-xl bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
      >
        <img
          src={firstImage.src}
          alt={firstImage.alt || ''}
          className='w-full rounded-xl'
          style={{
            maxHeight: config?.singleMax ?? 256,
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            backgroundColor: 'var(--background-subtle, #f6f6f6)'
          }}
          loading='lazy'
        />
      </button>
    )
  }

  if (firstVideo) {
    const videoIndex = media.indexOf(firstVideo)
    const singleMax = config?.singleMax ?? 256
    const ratio = parseAspectRatioValue(firstVideo.aspectRatio) || (16 / 9)
    return (
      <button
        type='button'
        onClick={(event) => handleMediaClick(event, videoIndex)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleMediaClick(event, videoIndex)
          }
        }}
        className='relative block w-full overflow-hidden rounded-xl bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
        aria-label='Video öffnen'
        title='Video öffnen'
      >
        <div
          className='relative w-full overflow-hidden rounded-xl'
          style={{
            aspectRatio: ratio,
            width: '100%',
            maxHeight: singleMax,
            minHeight: singleMax,
            backgroundColor: 'var(--background-subtle, #000)'
          }}
        >
          {firstVideo.poster ? (
            <img
              src={firstVideo.poster}
              alt={firstVideo.alt || ''}
              className='h-full w-full object-contain opacity-80'
              loading='lazy'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-black/80 to-gray-800 text-white'>
              <span className='text-sm uppercase tracking-wide'>Video</span>
            </div>
          )}
        </div>
        <span className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <span className='flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white'><TriangleRightIcon className='h-6 w-6 translate-x-[1px]' /></span>
        </span>
      </button>
    )
  }

  return null
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

  const fetchPage = useCallback(async ({ withCursor, markSeen = false, filter = 'all' } = {}) => {
    const { items: notifications, cursor: nextCursor, unreadCount } = await fetchNotificationsApi({
      cursor: withCursor,
      markSeen,
      filter,
    })
    return { notifications, cursor: nextCursor, unreadCount }
  }, [])

  useEffect(() => {
    let ignore = false
    async function loadInitial () {
      setLoading(true)
      setError('')
      try {
        const { notifications, cursor: nextCursor, unreadCount } = await fetchPage({ markSeen: true, filter: activeTab })
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
  }, [refreshKey, retryTick, fetchPage, activeTab])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { notifications, cursor: nextCursor, unreadCount } = await fetchPage({ withCursor: cursor, filter: activeTab })
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
  }, [cursor, fetchPage, hasMore, loadingMore, activeTab])

  const handleMarkRead = useCallback((notification) => {
    if (!notification || notification.isRead) return

    const targetId = getNotificationId(notification)
    if (!targetId) return

    setItems(prev =>
      prev.map(entry => {
        const entryId = getNotificationId(entry)
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
    if (target) observer.observe(target)
    return () => {
      if (target) observer.unobserve(target)
      observer.disconnect()
    }
  }, [hasMore, loadMore])



  useEffect(() => {
    if (activeTab !== 'mentions') return
    if (loading || loadingMore) return
    if (!hasMore) return
    const MIN_BUFFER = 8
    if (items.length >= MIN_BUFFER) return
    loadMore()
  }, [activeTab, items.length, hasMore, loadMore, loading, loadingMore])

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

  if (items.length === 0) {
    return <p className='text-sm text-muted-foreground'>Keine Mitteilungen gefunden.</p>
  }

  return (
    <section className='space-y-4' data-component='BskyNotifications'>
      <ul className='space-y-3'>
        {items.map((item, idx) => {
          const itemId = getNotificationId(item)
          return (
            <li key={itemId || `notification-${idx}`}>
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
          )
        })}
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
