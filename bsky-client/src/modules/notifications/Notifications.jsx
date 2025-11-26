import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import useSWRInfinite from 'swr/infinite'
import { ChatBubbleIcon, HeartFilledIcon, HeartIcon, TriangleRightIcon } from '@radix-ui/react-icons'
import { Button, Card, useBskyEngagement, fetchNotifications as fetchNotificationsApi, RichText, RepostMenuButton } from '../shared'
import { parseAspectRatioValue } from '../shared/utils/media.js'
import NotificationCardSkeleton from './NotificationCardSkeleton.jsx'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useCardConfig } from '../../context/CardConfigContext.jsx'
import { useThread } from '../../hooks/useThread.js'
import { useComposer } from '../../hooks/useComposer.js'
import { useMediaLightbox } from '../../hooks/useMediaLightbox.js'
import { useTranslation } from '../../i18n/I18nProvider.jsx'



const APP_BSKY_REASON_PREFIX = 'app.bsky.notification.'
const POST_RECORD_SEGMENT = '/app.bsky.feed.post/'



function getNotificationId (entry) {
  if (!entry) return ''
  if (entry.listEntryId) {
    return entry.listEntryId
  }
  if (entry.groupKey) {
    return entry.groupKey
  }
  // Für einzelne Benachrichtigungen ist die URI der eindeutige Schlüssel.
  // Der Zeitstempel dient als Fallback, um Kollisionen bei fehlenden URIs zu vermeiden.
  return entry.uri || `${entry.reason}:${entry.reasonSubject}:${entry.indexedAt}`
}


const REASON_COPY = {
  like: {
    labelKey: 'notifications.reason.like.label',
    defaultLabel: 'Like',
    description: ({ subjectLabel = 'Beitrag', additionalCount = 0, reason = 'like', t }) => {
      const viaRepost = reason === 'like-via-repost'
      const target = viaRepost
        ? t('notifications.reason.like.targetRepost', 'deinen Repost')
        : t('notifications.reason.like.targetSubject', 'deinen {subjectType}', { subjectType: subjectLabel })
      if (additionalCount > 0) {
        return t('notifications.reason.like.multi', 'und {count} weitere haben {target} mit „Gefällt mir“ markiert.', { count: additionalCount, target })
      }
      return t('notifications.reason.like.single', 'gefällt {target}.', { target })
    }
  },
  repost: {
    labelKey: 'notifications.reason.repost.label',
    defaultLabel: 'Repost',
    description: ({ subjectLabel = 'Beitrag', additionalCount = 0, reason = 'repost', t }) => {
      const viaRepost = reason === 'repost-via-repost'
      const action = viaRepost
        ? t('notifications.reason.repost.actionRepost', 'deinen Repost erneut geteilt')
        : t('notifications.reason.repost.actionSubject', 'deinen {subjectType} erneut geteilt', { subjectType: subjectLabel })
      if (additionalCount > 0) {
        return t('notifications.reason.repost.multi', 'und {count} weitere haben {action}.', { count: additionalCount, action })
      }
      return t('notifications.reason.repost.single', 'hat {action}.', { action })
    }
  },
  follow: {
    labelKey: 'notifications.reason.follow.label',
    defaultLabel: 'Follow',
    description: ({ additionalCount = 0, t }) => {
      if (additionalCount > 0) {
        return t('notifications.reason.follow.multi', 'und {count} weitere folgen dir jetzt.', { count: additionalCount })
      }
      return t('notifications.reason.follow.single', 'folgt dir jetzt.')
    }
  },
  reply: {
    labelKey: 'notifications.reason.reply.label',
    defaultLabel: 'Reply',
    description: ({ subjectLabel = 'Beitrag', t }) => t('notifications.reason.reply.single', 'hat auf deinen {subjectType} geantwortet.', { subjectType: subjectLabel })
  },
  mention: {
    labelKey: 'notifications.reason.mention.label',
    defaultLabel: 'Mention',
    description: ({ subjectLabel = 'Beitrag', t }) => t('notifications.reason.mention.single', 'hat dich in einem {subjectType} erwähnt.', { subjectType: subjectLabel })
  },
  quote: {
    labelKey: 'notifications.reason.quote.label',
    defaultLabel: 'Quote',
    description: ({ subjectLabel = 'Beitrag', additionalCount = 0, t }) => {
      if (additionalCount > 0) {
        return t('notifications.reason.quote.multi', 'und {count} weitere haben deinen {subjectType} zitiert.', { count: additionalCount, subjectType: subjectLabel })
      }
      return t('notifications.reason.quote.single', 'hat deinen {subjectType} zitiert.', { subjectType: subjectLabel })
    }
  },
  'subscribed-post': {
    labelKey: 'notifications.reason.subscribedPost.label',
    defaultLabel: 'Subscribed Post',
    description: ({ t }) => t('notifications.reason.subscribedPost.single', 'hat einen abonnierten Beitrag veröffentlicht.')
  }
}

REASON_COPY['like-via-repost'] = {
  ...REASON_COPY.like,
  labelKey: 'notifications.reason.likeViaRepost.label',
  defaultLabel: 'Like via Repost'
}
REASON_COPY['repost-via-repost'] = {
  ...REASON_COPY.repost,
  labelKey: 'notifications.reason.repostViaRepost.label',
  defaultLabel: 'Repost via Repost'
}

function isViaRepostReason (reason) {
  return reason === 'like-via-repost' || reason === 'repost-via-repost'
}

function formatAppBskyReason (reason, t) {
  if (!reason || !reason.startsWith(APP_BSKY_REASON_PREFIX)) return null
  const slug = reason.slice(APP_BSKY_REASON_PREFIX.length)
  const readable = slug.replace(/[.#]/g, ' ').trim() || 'System'
  return {
    label: t('notifications.reason.system.label', 'System ({name})', { name: readable }),
    description: () => t('notifications.reason.system.description', 'Systembenachrichtigung von Bluesky.')
  }
}

function isPostUri (value) {
  return typeof value === 'string' && value.includes(POST_RECORD_SEGMENT)
}

function resolveSubjectType (subject) {
  const record = subject?.raw?.post?.record || subject?.record || null
  if (!record) return 'post'
  if (record?.reply) return 'reply'
  const embedType = record?.embed?.$type || record?.embed?.record?.$type || ''
  if (embedType.includes('record')) return 'repost'
  return 'post'
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

function buildReplyTarget (notification) {
  try {
    if (!notification) return null
    const record = { ...(notification?.raw?.post?.record || notification?.record || {}) }
    const author = notification?.author || notification?.raw?.post?.author || {}
    const uri = notification?.uri || record?.uri || notification?.reasonSubject || null
    const cid = notification?.cid || record?.cid || null
    if (!uri || !cid) return null
    const post = {
      uri,
      cid,
      record,
      author,
      viewer: notification?.record?.viewer || notification?.raw?.post?.viewer || {}
    }
    return {
      uri,
      cid,
      author,
      raw: { post }
    }
  } catch {
    return null
  }
}

export const NotificationCard = memo(function NotificationCard ({ item, onSelectItem, onSelectSubject, onReply, onQuote, onMarkRead, onViewMedia }) {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const {
    author = {},
    reason = 'unknown',
    record = {},
    subject = null,
    indexedAt,
    isRead
  } = item || {}

  const subjectType = useMemo(() => resolveSubjectType(subject), [subject])
  const subjectLabel = useMemo(() => {
    const defaults = { post: 'Beitrag', reply: 'Antwort', repost: 'Repost' }
    const fallback = defaults[subjectType] || defaults.post
    return t(`notifications.subject.${subjectType}`, fallback)
  }, [subjectType, t])
  const reasonInfo = REASON_COPY[reason] || formatAppBskyReason(reason, t) || {
    label: t('notifications.reason.activity.label', 'Aktivität'),
    description: () => t('notifications.reason.activity.description', 'hat eine Aktion ausgeführt.')
  }
  const reasonLabel = reasonInfo.labelKey
    ? t(reasonInfo.labelKey, reasonInfo.defaultLabel)
    : reasonInfo.label || reasonInfo.defaultLabel || ''
  const reasonDescription = typeof reasonInfo.description === 'function'
    ? reasonInfo.description({ subjectLabel, subjectType, reason, additionalCount: item?.additionalCount || 0, t })
    : (reasonInfo.descriptionKey
        ? t(reasonInfo.descriptionKey, reasonInfo.description || '')
        : (reasonInfo.description || ''))
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
    error: actionError,
    toggleLike,
    toggleRepost,
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
  const fallbackAuthorLabel = t('notifications.card.authorUnknown', 'Unbekannt')
  const authorLabel = authorDisplayName || author?.handle || fallbackAuthorLabel
  const authorFallbackHint = authorDisplayName ? '' : t('notifications.card.authorMissing', 'Profilangaben wurden von Bluesky für diese Benachrichtigung nicht mitgeliefert.')
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
            <span className='rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-foreground-muted ml-auto'>
              {reasonLabel}
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
              <RichText
                text={recordText}
                className='whitespace-pre-wrap break-words'
                hashtagContext={{ authorHandle: author?.handle, authorDid: author?.did }}
              />
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
              title={t('notifications.card.actions.reply', 'Antworten')}
              onClick={() => {
                if (typeof onReply === 'function') {
                  const target = buildReplyTarget(item)
                  if (target) {
                    clearError()
                    onReply(target)
                  }
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
              title={t('notifications.card.actions.like', 'Gefällt mir')}
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
  const { t } = useTranslation()
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
    ? (quoted.author.displayName || quoted.author.handle || t('notifications.card.authorUnknown', 'Unbekannt'))
    : ''
  const quotedAuthorMissing = quoted?.author ? !(quoted.author.displayName || quoted.author.handle) : false
  const canOpenSubject = typeof onSelect === 'function' && Boolean(threadTarget || subject)
  const canOpenQuoted = typeof onSelectQuoted === 'function' && quoted?.uri && quoted.status === 'ok'
  const videoOpenLabel = t('notifications.preview.videoOpen', 'Video öffnen')
  const videoBadgeLabel = t('notifications.preview.videoLabel', 'Video')
  const originalPostLabel = t('notifications.preview.originalPost', 'Originaler Beitrag')
  const quotedAuthorMissingLabel = t('notifications.preview.quoted.authorMissing', 'Autorinformationen wurden nicht mitgeliefert.')
  const quotedStatusMessage = quoted?.status
    ? t(`notifications.preview.quoted.status.${quoted.status}`, quoted?.statusMessage || '')
    : (quoted?.statusMessage || '')

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
              {author.displayName || author.handle || t('notifications.preview.profileFallback', 'Profil')}
            </button>
          ) : (
            <p className='truncate font-semibold text-foreground'>{author.displayName || author.handle || t('notifications.preview.profileFallback', 'Profil')}</p>
          )}
          {timestamp ? <p className='text-xs text-foreground-muted'>{timestamp}</p> : null}
        </div>
      </div>
      {subject?.text ? (
        <div className='text-sm text-foreground'>
          <RichText
            text={subject.text}
            className='whitespace-pre-wrap break-words'
            hashtagContext={{ authorHandle: subject?.author?.handle, authorDid: subject?.author?.did }}
          />
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
              aria-label={videoOpenLabel}
              title={videoOpenLabel}
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
                    <span className='text-sm uppercase tracking-wide'>{videoBadgeLabel}</span>
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
          <p className='text-xs font-medium uppercase tracking-wide text-foreground-muted'>{originalPostLabel}</p>
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
              <p className='text-xs text-foreground-muted'>{quotedStatusMessage}</p>
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
                      <p className='text-xs text-foreground-muted'>{quotedAuthorMissingLabel}</p>
                    ) : null}
                    {quoted.author?.handle ? (
                      <p className='truncate text-xs text-foreground-muted'>@{quoted.author.handle}</p>
                    ) : null}
                  </div>
                </div>
                {quoted.text ? (
                  <div className='text-sm text-foreground'>
                    <RichText
                      text={quoted.text}
                      className='whitespace-pre-wrap break-words text-sm text-foreground'
                      hashtagContext={{ authorHandle: quoted?.author?.handle, authorDid: quoted?.author?.did }}
                    />
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
  const { t } = useTranslation()
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
    const videoOpenLabel = t('notifications.preview.videoOpen', 'Video öffnen')
    const videoBadgeLabel = t('notifications.preview.videoLabel', 'Video')
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
        aria-label={videoOpenLabel}
        title={videoOpenLabel}
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
              <span className='text-sm uppercase tracking-wide'>{videoBadgeLabel}</span>
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

export default function Notifications ({ activeTab = 'all', manualRefreshTick = 0, onRefreshStateChange = () => {} }) {
  const { t } = useTranslation()
  const { notificationsRefreshTick: refreshKey } = useAppState()
  const dispatch = useAppDispatch()
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()

  const [retryTick, setRetryTick] = useState(0)
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const loadMoreTriggerRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const prevManualRefreshTickRef = useRef(manualRefreshTick)
  const syncUnread = useCallback((count) => {
    setUnreadCount(count)
    dispatch({ type: 'SET_NOTIFICATIONS_UNREAD', payload: count })
  }, [dispatch])

  const getNotificationsKey = useCallback((pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-notifications', activeTab, refreshKey, retryTick, cursor]
  }, [activeTab, refreshKey, retryTick])

  const fetchNotificationsPage = useCallback(async ([, filter, _refresh, _retry, cursor]) => {
    const { items: notifications, cursor: nextCursor, unreadCount } = await fetchNotificationsApi({
      cursor: cursor || undefined,
      markSeen: filter === 'all' && !cursor,
      filter
    })
    return {
      items: notifications,
      cursor: nextCursor || null,
      unreadCount
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
  } = useSWRInfinite(getNotificationsKey, fetchNotificationsPage, {
    revalidateFirstPage: false
  })

  const pages = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data])
  const mergedItems = useMemo(() => {
    if (!pages.length) return []
    return pages.flatMap((page) => Array.isArray(page?.items) ? page.items : [])
  }, [pages])

  const lastPage = pages[pages.length - 1] || null
  const hasMore = Boolean(lastPage?.cursor)
  const isLoadingInitial = isLoading && pages.length === 0
  const isLoadingMore = !isLoadingInitial && isValidating && hasMore
  const isSoftRefreshing = !isLoadingInitial && isValidating && !isLoadingMore

  useEffect(() => {
    if (prevManualRefreshTickRef.current === manualRefreshTick) return
    prevManualRefreshTickRef.current = manualRefreshTick
    setManualRefreshing(true)
    mutate()
      .catch(() => {})
      .finally(() => {
        setManualRefreshing(false)
      })
  }, [manualRefreshTick, mutate])

  useEffect(() => {
    const nextState = isSoftRefreshing || manualRefreshing
    onRefreshStateChange(nextState)
  }, [isSoftRefreshing, manualRefreshing, onRefreshStateChange])

  useEffect(() => {
    const firstUnread = pages[0]?.unreadCount
    if (typeof firstUnread === 'number') {
      syncUnread(firstUnread)
    }
  }, [pages, syncUnread])

  const loadMore = useCallback(async () => {
    if (isLoadingInitial || isLoadingMore || !hasMore) return
    await setSize(size + 1)
  }, [hasMore, isLoadingInitial, isLoadingMore, setSize, size])

  const handleMarkRead = useCallback((notification) => {
    if (!notification || notification.isRead) return

    const targetId = getNotificationId(notification)
    if (!targetId) return

    mutate((previousPages) => {
      if (!Array.isArray(previousPages)) return previousPages
      let changed = false
      const updated = previousPages.map((page) => {
        if (!page || !Array.isArray(page.items)) return page
        let pageChanged = false
        const nextItems = page.items.map((entry) => {
          const entryId = getNotificationId(entry)
          if (entryId !== targetId) return entry
          if (entry.isRead) return entry
          pageChanged = true
          changed = true
          return { ...entry, isRead: true }
        })
        return pageChanged ? { ...page, items: nextItems } : page
      })
      return changed ? updated : previousPages
    }, false)

    setUnreadCount(current => {
      if (current <= 0) return 0
      const next = current - 1
      dispatch({ type: 'SET_NOTIFICATIONS_UNREAD', payload: next })
      return next
    })
  }, [dispatch])

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
    if (isLoadingInitial || isLoadingMore) return
    if (!hasMore) return
    const MIN_BUFFER = 8
    if (mergedItems.length >= MIN_BUFFER) return
    loadMore()
  }, [activeTab, hasMore, loadMore, mergedItems.length, isLoadingInitial, isLoadingMore])

  if (isLoadingInitial) {
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
    const fallback = t('notifications.status.loadError', 'Mitteilungen konnten nicht geladen werden.')
    return (
      <div className='space-y-3'>
        <p className='text-sm text-red-600'>{error?.message || fallback}</p>
        <Button variant='secondary' size='pill' onClick={() => setRetryTick(v => v + 1)}>
          {t('common.actions.retry', 'Erneut versuchen')}
        </Button>
      </div>
    )
  }

  if (mergedItems.length === 0) {
    return <p className='text-sm text-muted-foreground'>{t('notifications.status.empty', 'Keine Mitteilungen gefunden.')}</p>
  }

  return (
    <section className='space-y-4' data-component='BskyNotifications'>
      <ul className='space-y-3'>
        {mergedItems.map((item, idx) => {
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
          {isLoadingMore
            ? t('notifications.status.loading', 'Lade…')
            : t('notifications.status.autoLoading', 'Weitere Mitteilungen werden automatisch geladen…')}
        </div>
      ) : null}
    </section>
  )
}
