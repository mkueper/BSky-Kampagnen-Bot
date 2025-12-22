import React from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState, memo } from 'react'
import {
  ChatBubbleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeartFilledIcon,
  HeartIcon,
  TriangleRightIcon,
  Share2Icon,
  DotsHorizontalIcon,
  Link2Icon,
  CopyIcon,
  CodeIcon,
  GlobeIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  FaceIcon,
  SpeakerOffIcon,
  SpeakerModerateIcon,
  MixerVerticalIcon,
  EyeClosedIcon,
  ScissorsIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
  PinLeftIcon,
  TrashIcon,
  GearIcon
} from '@radix-ui/react-icons'
import {
  Button,
  Card,
  useBskyEngagement,
  RichText,
  RepostMenuButton,
  deletePost,
  ProfilePreviewTrigger,
  ActorProfileLink,
  InlineVideoPlayer,
  InlineMenu,
  InlineMenuTrigger,
  InlineMenuContent,
  InlineMenuItem,
  ConfirmDialog,
  useConfirmDialog
} from '../shared'
import { parseAspectRatioValue } from '../shared/utils/media.js'
import NotificationCardSkeleton from './NotificationCardSkeleton.jsx'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useCardConfig } from '../../context/CardConfigContext.jsx'
import { useThread } from '../../hooks/useThread.js'
import { useComposer } from '../../hooks/useComposer.js'
import { useMediaLightbox } from '../../hooks/useMediaLightbox.js'
import { useClientConfig } from '../../hooks/useClientConfig.js'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { AuthContext } from '../auth/AuthContext.jsx'
import { muteActor as apiMuteActor, blockActor as apiBlockActor } from '../shared/api/bsky'
import { runListRefresh, runListLoadMore, getListItemId } from '../listView/listService.js'
import { VirtualizedList } from '../listView/VirtualizedList.jsx'
import { useSWRConfig } from 'swr'
import { NOTIFICATION_UNREAD_SWR_KEY } from '../../hooks/useNotificationPolling.js'


const APP_BSKY_REASON_PREFIX = 'app.bsky.notification.'
const POST_RECORD_SEGMENT = '/app.bsky.feed.post/'
const DEFAULT_TRANSLATE_BASE = 'http://localhost:5000'

const parseBoolean = (value, fallback = null) => {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return fallback
}

const normalizeTranslateEndpoint = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  const trimmed = rawUrl.trim()
  if (!trimmed) return ''
  const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withProtocol)
    if (parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }
    if (!parsed.pathname.endsWith('/translate')) {
      parsed.pathname = `${parsed.pathname}/translate`
    }
    return parsed.toString()
  } catch {
    return ''
  }
}

const buildFallbackTranslateUrl = (service, language, content) => {
  const lang = language || 'en'
  const target = encodeURIComponent(String(content || '').trim())
  if (!target) return ''
  if (service === 'deepl') {
    return `https://www.deepl.com/translator#auto/${lang}/${target}`
  }
  if (service === 'bing') {
    return `https://www.bing.com/translator?from=auto&to=${lang}&text=${target}`
  }
  if (service === 'yandex') {
    return `https://translate.yandex.com/?lang=auto-${lang}&text=${target}`
  }
  if (service === 'google') {
    return `https://translate.google.com/?sl=auto&tl=${lang}&text=${target}`
  }
  return ''
}

const resolveTranslationConfig = (clientConfig, envBaseUrl, envEnabledRaw) => {
  const translationConfig = clientConfig?.translation || {}
  const baseFromConfig = typeof translationConfig.baseUrl === 'string' ? translationConfig.baseUrl.trim() : ''
  const baseFromEnv = typeof envBaseUrl === 'string' ? envBaseUrl.trim() : ''
  const allowGoogle = translationConfig.allowGoogle !== false
  const fallbackRaw = typeof translationConfig.fallbackService === 'string'
    ? translationConfig.fallbackService.trim().toLowerCase()
    : ''
  const fallbackOptions = new Set(['google', 'deepl', 'bing', 'yandex', 'none'])
  const fallbackService = fallbackOptions.has(fallbackRaw)
    ? fallbackRaw
    : (allowGoogle ? 'google' : 'none')
  const allowFallback = fallbackService !== 'none'
  const explicitEnabled = typeof translationConfig.enabled === 'boolean' ? translationConfig.enabled : null
  const envEnabled = parseBoolean(envEnabledRaw, null)
  let featureEnabled = true
  if (envEnabled !== null) {
    featureEnabled = envEnabled
  } else if (explicitEnabled !== null) {
    featureEnabled = explicitEnabled
  } else if (baseFromConfig || baseFromEnv) {
    featureEnabled = true
  } else {
    featureEnabled = false
  }
  if (!featureEnabled) {
    return { enabled: false, endpoint: null, allowFallback: false, fallbackService: 'none' }
  }
  const shouldFallbackToDefault = !(baseFromConfig || baseFromEnv) && !allowFallback
  const rawEndpoint = baseFromConfig || baseFromEnv || (shouldFallbackToDefault ? DEFAULT_TRANSLATE_BASE : '')
  const endpoint = normalizeTranslateEndpoint(rawEndpoint)
  return { enabled: true, endpoint, allowFallback, fallbackService }
}

function buildShareUrl (item) {
  try {
    const uri = item?.uri || ''
    const author = item?.author || {}
    const handle = author?.handle || author?.did || ''
    if (!uri || !handle) return uri
    const parts = uri.split('/')
    const rkey = parts[parts.length - 1]
    if (!rkey) return uri
    return `https://bsky.app/profile/${handle}/post/${rkey}`
  } catch {
    return item?.uri || ''
  }
}



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
      statusMessage: ''
    }
  }
  if (viewType.endsWith('#viewNotFound')) {
    return {
      status: 'not_found',
      statusMessage: ''
    }
  }
  if (viewType.endsWith('#viewDetached')) {
    return {
      status: 'detached',
      statusMessage: ''
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

export const NotificationCard = memo(function NotificationCard ({ item, onSelectItem, onSelectSubject, onReply, onQuote, onMarkRead, onViewMedia, inlineVideoEnabled = false }) {
  const dispatch = useAppDispatch()
  const { quoteReposts } = useAppState()
  const { t, locale } = useTranslation()
  const authContext = useContext(AuthContext)
  const session = authContext?.session || null
  const { clientConfig } = useClientConfig()
  const { dialog: confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()
  const cardRef = useRef(null)
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
    const fallbackMap = { post: 'Beitrag', reply: 'Antwort', repost: 'Repost' }
    const fallback = fallbackMap[subjectType] || fallbackMap.post
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
  const timestamp = indexedAt ? new Date(indexedAt).toLocaleString(locale || 'de-DE') : ''
  const recordText = record?.text || ''
  const isReply = reason === 'reply'
  const envTranslateBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TRANSLATION_BASE_URL)
    ? import.meta.env.VITE_TRANSLATION_BASE_URL
    : ''
  const envTranslateEnabled = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TRANSLATION_ENABLED)
    ? import.meta.env.VITE_TRANSLATION_ENABLED
    : null
  const translationPreferences = useMemo(
    () => resolveTranslationConfig(clientConfig, envTranslateBaseUrl, envTranslateEnabled),
    [clientConfig, envTranslateBaseUrl, envTranslateEnabled]
  )
  const translationAbortRef = useRef(null)
  const detectAbortRef = useRef(null)
  const [translationResult, setTranslationResult] = useState(null)
  const [translationError, setTranslationError] = useState('')
  const [translating, setTranslating] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [detectingLanguage, setDetectingLanguage] = useState(false)
  const profileActor = author?.did || author?.handle || ''
  const resolvedActors = useMemo(() => {
    if (Array.isArray(item?.actors) && item.actors.length) return item.actors
    if (author?.did || author?.handle || author?.displayName || author?.avatar) return [author]
    return []
  }, [author, item?.actors])
  const maxActors = 5
  const visibleActors = resolvedActors.slice(0, maxActors)
  const overflowCount = Math.max(0, resolvedActors.length - maxActors)
  const canExpandActors = resolvedActors.length > 1

  const replyMedia = useMemo(() => {
    if (!isReply) return null
    return extractReplyMedia({ record, authorDid: author.did })
  }, [isReply, record])

  const canOpenProfileViewer = Boolean(profileActor)
  const actionUri = item?.uri || record?.uri || item?.raw?.post?.uri || item?.reasonSubject || null
  const actionCid = item?.cid || record?.cid || item?.raw?.post?.cid || null
  const actionAuthor = item?.raw?.post?.author || record?.author || author || {}
  const actorDid = actionAuthor?.did || ''

  const {
    likeCount,
    repostCount,
    hasLiked,
    hasReposted,
    isBookmarked,
    busy,
    bookmarking,
    error: actionError,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    clearError,
  } = useBskyEngagement({
    uri: actionUri,
    cid: actionCid,
    initialLikes: item?.record?.stats?.likeCount || item?.stats?.likeCount || record?.stats?.likeCount || item?.raw?.post?.record?.stats?.likeCount || item?.raw?.post?.stats?.likeCount,
    initialReposts: item?.record?.stats?.repostCount || item?.stats?.repostCount || record?.stats?.repostCount || item?.raw?.post?.record?.stats?.repostCount || item?.raw?.post?.stats?.repostCount,
    viewer: item?.raw?.post?.viewer || item?.viewer || record?.viewer || item?.raw?.post?.record?.viewer,
  })

  const likeStyle = hasLiked ? { color: '#e11d48' } : undefined
  const repostStyle = hasReposted ? { color: '#0ea5e9' } : undefined
  const bookmarkStyle = isBookmarked ? { color: '#f97316' } : undefined
  const quotePostUri = actionUri ? (quoteReposts?.[actionUri] || null) : null
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [quoteMessage, setQuoteMessage] = useState('')
  const [quoteMessageIsError, setQuoteMessageIsError] = useState(false)
  const [actorsExpanded, setActorsExpanded] = useState(false)
  const replyCountStat = Number(
    item?.stats?.replyCount ??
    item?.record?.stats?.replyCount ??
    item?.raw?.post?.replyCount ??
    record?.stats?.replyCount ??
    item?.replyCount ??
    0
  )
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [mutingAccount, setMutingAccount] = useState(false)
  const [blockingAccount, setBlockingAccount] = useState(false)
  const [menuActionError, setMenuActionError] = useState('')
  const [deletingPost, setDeletingPost] = useState(false)

  const markAsRead = useCallback(() => {
    if (!isRead && typeof onMarkRead === 'function') {
      onMarkRead(item)
    }
  }, [isRead, onMarkRead, item])

  useEffect(() => {
    if (isRead) return undefined
    const target = cardRef.current
    if (!target) return undefined

    if (typeof IntersectionObserver !== 'function') {
      markAsRead()
      return undefined
    }

    const root = typeof document !== 'undefined'
      ? document.getElementById('bsky-scroll-container')
      : null

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      if (entry.isIntersecting) {
        markAsRead()
        observer.disconnect()
      }
    }, {
      root,
      threshold: 0.35
    })
    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [isRead, markAsRead])

  const shareUrl = useMemo(
    () => buildShareUrl({ uri: actionUri || '', author: actionAuthor }),
    [actionAuthor, actionUri]
  )

  useEffect(() => {
    return () => {
      translationAbortRef.current?.abort?.()
    }
  }, [])
  useEffect(() => {
    return () => {
      detectAbortRef.current?.abort?.()
    }
  }, [])

  useEffect(() => {
    setTranslationResult(null)
    setTranslationError('')
  }, [recordText, item?.uri])

  const targetLanguage = useMemo(() => {
    const base = (locale || navigator?.language || 'en').split('-')[0] || 'en'
    return base.toLowerCase()
  }, [locale])
  const translationEndpoint = translationPreferences.endpoint
  const translationEnabled = translationPreferences.enabled !== false
  const fallbackService = translationPreferences.fallbackService || 'none'
  const allowFallback = translationPreferences.allowFallback === true
  const canInlineTranslate = Boolean(translationEndpoint)
  const translateUnavailable = !canInlineTranslate && !allowFallback
  const detectEndpoint = useMemo(() => {
    if (!translationEndpoint) return null
    return translationEndpoint.replace(/\/translate$/i, '/detect')
  }, [translationEndpoint])
  const sameLanguageDetected = detectedLanguage && detectedLanguage === targetLanguage
  const translateButtonDisabled = translateUnavailable ||
    !recordText ||
    !recordText.trim() ||
    (canInlineTranslate && translating) ||
    (sameLanguageDetected && !detectingLanguage)

  useEffect(() => {
    detectAbortRef.current?.abort?.()
    if (!translationEnabled || !canInlineTranslate || !detectEndpoint || !recordText?.trim()) {
      setDetectingLanguage(false)
      setDetectedLanguage(null)
      return
    }
    const controller = new AbortController()
    detectAbortRef.current = controller
    setDetectingLanguage(true)
    const payload = JSON.stringify({ q: recordText })
    fetch(detectEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: payload,
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Detect failed')
        const data = await response.json()
        const entry = Array.isArray(data)
          ? data[0]
          : Array.isArray(data?.detections) ? data.detections[0] : null
        const lang = typeof entry?.language === 'string'
          ? entry.language
          : (typeof entry?.languageCode === 'string' ? entry.languageCode : null)
        setDetectedLanguage(lang ? lang.toLowerCase() : null)
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return
        setDetectedLanguage(null)
      })
      .finally(() => {
        setDetectingLanguage(false)
      })
  }, [canInlineTranslate, detectEndpoint, recordText, translationEnabled])

  const copyToClipboard = async (value, successMessage = t('skeet.actions.copySuccess', 'Kopiert')) => {
    if (!value) return
    const fallback = () => window.prompt(t('skeet.actions.copyPrompt', 'Zum Kopieren'), value)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        setFeedbackMessage(successMessage)
        window.setTimeout(() => setFeedbackMessage(''), 2400)
      } else {
        fallback()
      }
    } catch {
      fallback()
    }
  }

  const showPlaceholder = useCallback((label) => {
    setFeedbackMessage(t('skeet.actions.placeholder', '{label} ist noch nicht verfügbar.', { label }))
    window.setTimeout(() => setFeedbackMessage(''), 2400)
  }, [t])

  const showMenuError = useCallback((message) => {
    setMenuActionError(message)
    window.setTimeout(() => setMenuActionError(''), 3200)
  }, [])

  const openExternalTranslate = useCallback(() => {
    if (!allowFallback) {
      showPlaceholder(t('skeet.actions.translate', 'Übersetzen'))
      return
    }
    const url = buildFallbackTranslateUrl(fallbackService, targetLanguage || 'en', recordText || '')
    if (!url) {
      showPlaceholder(t('skeet.actions.translate', 'Übersetzen'))
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [allowFallback, fallbackService, showPlaceholder, t, targetLanguage, recordText])

  const handleInlineTranslate = useCallback(async () => {
    if (!translationEnabled || !canInlineTranslate) {
      return
    }
    if (!recordText || !recordText.trim()) {
      setTranslationError(t('skeet.translation.error', 'Übersetzung konnte nicht abgerufen werden.'))
      return
    }
    if (translating) return
    translationAbortRef.current?.abort?.()
    const controller = new AbortController()
    translationAbortRef.current = controller
    setTranslating(true)
    setTranslationError('')
    try {
      const response = await fetch(translationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          q: recordText,
          source: 'auto',
          target: targetLanguage || 'en',
          format: 'text'
        }),
        signal: controller.signal
      })
      if (!response.ok) {
        throw new Error(t('skeet.translation.error', 'Übersetzung konnte nicht abgerufen werden.'))
      }
      const payload = await response.json()
      const translated = (payload?.translatedText || payload?.translation || '').trim()
      if (!translated) {
        throw new Error(t('skeet.translation.error', 'Übersetzung konnte nicht abgerufen werden.'))
      }
      setTranslationResult({
        text: translated,
        detected: payload?.detectedLanguage?.language || payload?.detectedLanguage || null
      })
      setFeedbackMessage(t('skeet.translation.success', 'Übersetzung eingefügt.'))
    } catch (error) {
      if (error?.name === 'AbortError') return
      if (allowFallback) {
        openExternalTranslate()
        return
      }
      setTranslationError(error?.message || t('skeet.translation.error', 'Übersetzung konnte nicht abgerufen werden.'))
    } finally {
      setTranslating(false)
    }
  }, [
    allowFallback,
    canInlineTranslate,
    openExternalTranslate,
    t,
    targetLanguage,
    recordText,
    translationEnabled,
    translationEndpoint,
    translating
  ])

  const handleTranslateAction = useCallback(() => {
    if (!translationEnabled) {
      showPlaceholder(t('skeet.actions.translate', 'Übersetzen'))
      return
    }
    if (canInlineTranslate) {
      handleInlineTranslate()
      return
    }
    if (allowFallback) {
      openExternalTranslate()
      return
    }
    showPlaceholder(t('skeet.actions.translate', 'Übersetzen'))
  }, [
    allowFallback,
    canInlineTranslate,
    handleInlineTranslate,
    openExternalTranslate,
    showPlaceholder,
    t,
    translationEnabled
  ])

  const handleClearTranslation = useCallback(() => {
    translationAbortRef.current?.abort?.()
    setTranslationResult(null)
    setTranslationError('')
  }, [])

  const handleMuteAccount = useCallback(async () => {
    if (!actorDid) {
      showPlaceholder(t('skeet.actions.muteAccount', 'Account stummschalten'))
      return
    }
    if (mutingAccount) return
    setMenuActionError('')
    setMutingAccount(true)
    try {
      await apiMuteActor(actorDid)
      setFeedbackMessage(t('skeet.actions.muteAccountSuccess', 'Account wurde stummgeschaltet.'))
      window.setTimeout(() => setFeedbackMessage(''), 2400)
    } catch (error) {
      showMenuError(error?.message || t('skeet.actions.muteAccountError', 'Account konnte nicht stummgeschaltet werden.'))
    } finally {
      setMutingAccount(false)
    }
  }, [actorDid, mutingAccount, showMenuError, showPlaceholder, t])

  const handleBlockAccount = useCallback(async () => {
    if (!actorDid) {
      showPlaceholder(t('skeet.actions.blockAccount', 'Account blockieren'))
      return
    }
    if (blockingAccount) return
    setMenuActionError('')
    setBlockingAccount(true)
    try {
      await apiBlockActor(actorDid)
      setFeedbackMessage(t('skeet.actions.blockAccountSuccess', 'Account wurde blockiert.'))
      window.setTimeout(() => setFeedbackMessage(''), 2400)
    } catch (error) {
      showMenuError(error?.message || t('skeet.actions.blockAccountError', 'Account konnte nicht blockiert werden.'))
    } finally {
      setBlockingAccount(false)
    }
  }, [actorDid, blockingAccount, showMenuError, showPlaceholder, t])

  const isOwnPost = Boolean(session?.did && actorDid && session.did === actorDid)

  const handleDeleteOwnPost = useCallback(async () => {
    if (!actionUri || deletingPost) return
    openConfirm({
      title: t('skeet.actions.confirmDeleteTitle', 'Post löschen?'),
      description: t('skeet.actions.confirmDeleteDescription', 'Dieser Schritt ist endgültig. Der Post wird dauerhaft entfernt.'),
      confirmLabel: t('skeet.actions.deletePost', 'Post löschen'),
      cancelLabel: t('compose.cancel', 'Abbrechen'),
      variant: 'destructive',
      onConfirm: async () => {
        setMenuActionError('')
        setDeletingPost(true)
        try {
          await deletePost({ uri: actionUri })
          dispatch({ type: 'REMOVE_POST', payload: actionUri })
          setFeedbackMessage(t('skeet.actions.deletePostSuccess', 'Post gelöscht.'))
          window.setTimeout(() => setFeedbackMessage(''), 2400)
        } catch (error) {
          showMenuError(error?.message || t('skeet.actions.deletePostError', 'Post konnte nicht gelöscht werden.'))
        } finally {
          setDeletingPost(false)
        }
      }
    })
  }, [actionUri, deletePost, deletingPost, dispatch, openConfirm, showMenuError, t])

  const menuActions = useMemo(() => {
    const base = [
      {
        key: 'copy-text',
        label: t('skeet.actions.copyText', 'Post-Text kopieren'),
        icon: CopyIcon,
        action: () => copyToClipboard(String(recordText || ''), t('skeet.actions.copyTextSuccess', 'Text kopiert'))
      }
    ]

    if (isOwnPost) {
      return [
        ...base,
        {
          key: 'pin-post',
          label: t('skeet.actions.pinPost', 'An dein Profil anheften'),
          icon: PinLeftIcon,
          action: () => showPlaceholder(t('skeet.actions.pinPost', 'Post anheften')),
          disabled: true
        },
        {
          key: 'edit-interactions',
          label: t('skeet.actions.editInteractions', 'Interaktionseinstellungen bearbeiten'),
          icon: GearIcon,
          action: () => showPlaceholder(t('skeet.actions.editInteractions', 'Interaktionseinstellungen bearbeiten')),
          disabled: true
        },
        {
          key: 'delete-post',
          label: t('skeet.actions.deletePost', 'Post löschen'),
          icon: TrashIcon,
          action: handleDeleteOwnPost,
          disabled: deletingPost,
          variant: 'destructive'
        }
      ]
    }

    return [
      ...base,
      {
        key: 'show-more',
        label: t('skeet.actions.showMore', 'Mehr davon anzeigen'),
        icon: FaceIcon,
        action: () => showPlaceholder(t('skeet.actions.showMore', 'Mehr davon anzeigen')),
        disabled: true
      },
      {
        key: 'show-less',
        label: t('skeet.actions.showLess', 'Weniger davon anzeigen'),
        icon: FaceIcon,
        action: () => showPlaceholder(t('skeet.actions.showLess', 'Weniger davon anzeigen')),
        disabled: true
      },
      {
        key: 'mute-thread',
        label: t('skeet.actions.muteThread', 'Thread stummschalten'),
        icon: SpeakerOffIcon,
        action: () => showPlaceholder(t('skeet.actions.muteThread', 'Thread stummschalten')),
        disabled: true
      },
      {
        key: 'mute-words',
        label: t('skeet.actions.muteWords', 'Wörter und Tags stummschalten'),
        icon: MixerVerticalIcon,
        action: () => showPlaceholder(t('skeet.actions.muteWords', 'Wörter und Tags stummschalten')),
        disabled: true
      },
      {
        key: 'hide-post',
        label: t('skeet.actions.hidePost', 'Post für mich ausblenden'),
        icon: EyeClosedIcon,
        action: () => showPlaceholder(t('skeet.actions.hidePost', 'Post für mich ausblenden')),
        disabled: true
      },
      {
        key: 'mute-account',
        label: t('skeet.actions.muteAccount', 'Account stummschalten'),
        icon: SpeakerModerateIcon,
        action: handleMuteAccount,
        disabled: mutingAccount
      },
      {
        key: 'block-account',
        label: t('skeet.actions.blockAccount', 'Account blockieren'),
        icon: ScissorsIcon,
        action: handleBlockAccount,
        disabled: blockingAccount,
        variant: 'destructive'
      },
      {
        key: 'report-post',
        label: t('skeet.actions.reportPost', 'Post melden'),
        icon: ExclamationTriangleIcon,
        action: () => showPlaceholder(t('skeet.actions.reportPost', 'Post melden')),
        disabled: true
      }
    ]
  }, [blockingAccount, copyToClipboard, deletingPost, handleBlockAccount, handleDeleteOwnPost, handleMuteAccount, isOwnPost, mutingAccount, recordText, showPlaceholder, t])

  const handleToggleLike = useCallback(async () => {
    clearError()
    const result = await toggleLike()
    if (result && actionUri) {
      dispatch({ type: 'PATCH_POST_ENGAGEMENT', payload: { uri: actionUri, patch: { likeUri: result.likeUri, likeCount: result.likeCount } } })
    }
  }, [actionUri, clearError, dispatch, toggleLike])

  const handleToggleRepost = useCallback(async () => {
    clearError()
    const result = await toggleRepost()
    if (result && actionUri) {
      dispatch({ type: 'PATCH_POST_ENGAGEMENT', payload: { uri: actionUri, patch: { repostUri: result.repostUri, repostCount: result.repostCount } } })
    }
  }, [actionUri, clearError, dispatch, toggleRepost])

  const handleToggleBookmark = useCallback(async () => {
    clearError()
    const result = await toggleBookmark()
    if (result && actionUri) {
      dispatch({ type: 'PATCH_POST_ENGAGEMENT', payload: { uri: actionUri, patch: { bookmarked: result.bookmarked } } })
    }
  }, [actionUri, clearError, dispatch, toggleBookmark])

  const handleUndoQuote = useCallback(async () => {
    if (!actionUri || !quotePostUri || quoteBusy) return
    setQuoteBusy(true)
    setQuoteMessage('')
    setQuoteMessageIsError(false)
    try {
      await deletePost({ uri: quotePostUri })
      dispatch({ type: 'CLEAR_QUOTE_REPOST', payload: actionUri })
      setQuoteMessage(t('notifications.card.actions.quoteUndoSuccess', 'Zitat zurückgezogen.'))
    } catch (error) {
      setQuoteMessage(error?.message || t('notifications.card.actions.quoteUndoError', 'Zitat konnte nicht zurückgezogen werden.'))
      setQuoteMessageIsError(true)
    } finally {
      setQuoteBusy(false)
      window.setTimeout(() => {
        setQuoteMessage('')
        setQuoteMessageIsError(false)
      }, 2400)
    }
  }, [actionUri, deletePost, dispatch, quoteBusy, quotePostUri, t])

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
  const actionTarget = useMemo(() => {
    const baseTarget = (reason === 'like' || reason === 'repost')
      ? (subject || item)
      : (item || subject)
    if (!baseTarget) return null
    const built = buildThreadTarget(baseTarget)
    if (!built?.uri || !isPostUri(built.uri)) return null
    return built
  }, [buildThreadTarget, item, reason, subject])
  const showFooter = Boolean(actionTarget)

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

  useEffect(() => {
    setActorsExpanded(false)
  }, [item?.listEntryId])

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

  const renderAuthorLabel = useCallback((variant = 'button') => {
    const textClass = `block truncate font-semibold ${variant === 'button' ? '' : 'text-foreground'}`
    const content = (
      <span className={textClass} title={authorLabel}>
        {authorLabel}
      </span>
    )
    if (profileActor) {
      return (
        <ProfilePreviewTrigger actor={profileActor} fallback={author} as='span' className='block max-w-full'>
          {content}
        </ProfilePreviewTrigger>
      )
    }
    return content
  }, [author, authorLabel, profileActor])

  const toggleActorsExpanded = useCallback(() => {
    if (!canExpandActors) return
    setActorsExpanded((prev) => !prev)
  }, [canExpandActors])

  const renderActorAvatar = useCallback((actor, index) => {
    const actorHandle = actor?.handle || ''
    const actorId = actor?.did || actorHandle
    const actorLabel = actor?.displayName || actorHandle || fallbackAuthorLabel
    const avatarVisual = actor?.avatar
      ? <img src={actor.avatar} alt='' className='h-8 w-8 rounded-full object-cover' />
      : <div className='h-8 w-8 rounded-full bg-background-subtle' />
    const wrapperClass = index === 0 ? '' : '-ml-2'
    if (!actorId) {
      return (
        <span key={`actor-${index}`} className={`${wrapperClass} inline-flex h-8 w-8 items-center justify-center rounded-full border border-border`}>
          {avatarVisual}
        </span>
      )
    }
    return (
      <span key={`${actorId}-${index}`} className={wrapperClass}>
        <ActorProfileLink
          actor={actorId}
          handle={actorHandle}
          label={actorLabel}
          onOpen={markAsRead}
          className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background transition hover:ring-2 hover:ring-primary/40'
        >
          {avatarVisual}
        </ActorProfileLink>
      </span>
    )
  }, [fallbackAuthorLabel, markAsRead])

  const avatarVisual = author.avatar ? (
    <img src={author.avatar} alt='' className='h-12 w-12 rounded-full border border-border object-cover' />
  ) : (
    <div className='h-12 w-12 rounded-full border border-border bg-background-subtle' />
  )

  const avatarWithPreview = profileActor
    ? (
      <ProfilePreviewTrigger actor={profileActor} fallback={author}>
        {avatarVisual}
      </ProfilePreviewTrigger>
      )
    : avatarVisual

  const actorStack = (
    <div className='flex items-center gap-2'>
      <div className='flex items-center'>{visibleActors.map(renderActorAvatar)}</div>
      <Button
        type='button'
        variant='ghost'
        size='pill'
        onClick={toggleActorsExpanded}
        aria-label={actorsExpanded
          ? t('notifications.actors.collapse', 'Ausblenden')
          : (overflowCount > 0
              ? t('notifications.actors.expandLabel', '{count} weitere anzeigen', { count: overflowCount })
              : t('notifications.actors.expand', 'Weitere anzeigen'))}
        className={`notification-toggle-button h-8 px-2 text-xs font-semibold ${
          canExpandActors ? 'text-foreground-muted hover:text-foreground' : 'cursor-not-allowed text-foreground-muted/60'
        }`}
        disabled={!canExpandActors}
      >
        {!actorsExpanded && overflowCount > 0 ? <span>{`+${overflowCount}`}</span> : null}
        {actorsExpanded ? <ChevronUpIcon className='h-4 w-4' /> : <ChevronDownIcon className='h-4 w-4' />}
      </Button>
    </div>
  )

  const showActorList = canExpandActors && actorsExpanded
  const useActorStackLayout = true

  const contentBody = (
    <>
      {authorFallbackHint ? (
        <p className='text-xs text-foreground-muted'>{authorFallbackHint}</p>
      ) : null}
      {reasonDescription ? (
        <p className='text-sm text-foreground break-words'>{reasonDescription}</p>
      ) : null}
      {showActorList ? (
        <div className='space-y-1.5 rounded-2xl border border-border bg-background-subtle p-2'>
          {resolvedActors.map((actor, index) => {
            const actorHandle = actor?.handle || ''
            const actorId = actor?.did || actorHandle
            const actorLabel = actor?.displayName || actorHandle || fallbackAuthorLabel
            const actorAvatar = actor?.avatar
              ? <img src={actor.avatar} alt='' className='h-9 w-9 rounded-full border border-border object-cover' />
              : <div className='h-9 w-9 rounded-full border border-border bg-background' />
            if (!actorId) {
              return (
                <div key={`actor-row-${index}`} className='flex items-center gap-3 px-2 py-1'>
                  {actorAvatar}
                  <span className='text-sm font-semibold text-foreground'>{actorLabel}</span>
                </div>
              )
            }
            return (
              <ActorProfileLink
                key={`${actorId}-${index}`}
                actor={actorId}
                handle={actorHandle}
                label={actorLabel}
                onOpen={markAsRead}
                className='flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-background'
              >
                {actorAvatar}
                <span className='flex min-w-0 items-center gap-2'>
                  <span className='truncate text-sm font-semibold text-foreground'>{actorLabel}</span>
                  {actorHandle ? (
                    <span className='truncate text-sm font-semibold text-foreground-muted'>@{actorHandle}</span>
                  ) : null}
                </span>
              </ActorProfileLink>
            )
          })}
        </div>
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
      {translationResult ? (
        <div className='rounded-2xl border border-border bg-background-subtle/60 p-3 text-sm text-foreground' data-component='BskyTranslationPreview'>
          <div className='mb-1 flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-foreground-muted'>
            <span>{t('skeet.translation.title', 'Übersetzung')}</span>
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-foreground-muted hover:bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
              onClick={handleClearTranslation}
            >
              <Cross2Icon className='h-3 w-3' />
              {t('skeet.translation.close', 'Schließen')}
            </button>
          </div>
          <p className='whitespace-pre-wrap break-words'>{translationResult.text}</p>
          <p className='mt-2 text-[11px] uppercase tracking-wide text-foreground-muted'>
            {translationResult.detected
              ? t('skeet.translation.detected', 'Erkannt: {language}', { language: translationResult.detected.toUpperCase() })
              : null}
            <span className='ml-2'>{t('skeet.translation.via', 'Automatisch übersetzt via LibreTranslate')}</span>
          </p>
        </div>
      ) : null}
      {isReply && replyMedia?.media?.length > 0 ? (
        <div className='rounded-2xl border border-border bg-background-subtle p-2'>
          <ReplyMediaPreview
            media={replyMedia.media}
            onViewMedia={onViewMedia}
            inlineVideoEnabled={inlineVideoEnabled}
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
          inlineVideoEnabled={inlineVideoEnabled}
        />
      ) : null}
      {timestamp ? (
        <time className='block text-xs text-foreground-muted' dateTime={indexedAt}>{timestamp}</time>
      ) : null}
    </>
  )

  return (
    <Card
      ref={cardRef}
      as='article'
      padding='p-4'
      hover={false}
      className={`${unreadHighlight} ${canOpenItem ? 'cursor-pointer hover:bg-background-subtle/70 dark:hover:bg-primary/10 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60' : ''}`}
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
      aria-label={canOpenItem ? t('notifications.card.openThread', 'Thread öffnen') : undefined}
    >
      {useActorStackLayout ? (
        <div className='space-y-2'>
          <div className='flex flex-wrap items-center gap-2 min-w-0'>
            {actorStack}
            {canOpenProfileViewer ? (
              <button
                type='button'
                onClick={handleProfileClick}
                className='truncate text-left font-semibold leading-none text-foreground transition hover:text-primary'
                title={authorLabel}
              >
                {renderAuthorLabel('button')}
              </button>
            ) : (
              renderAuthorLabel('static')
            )}
            <span className='rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-foreground-muted ml-auto'>
              {reasonLabel}
            </span>
          </div>
          {contentBody}
        </div>
      ) : (
        <div className='flex items-start gap-3'>
          {canOpenProfileViewer ? (
            <button type='button' onClick={handleProfileClick} className='h-12 w-12 rounded-full border border-border transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'>
              {avatarWithPreview}
            </button>
          ) : (
            avatarWithPreview
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
                  {renderAuthorLabel('button')}
                </button>
              ) : (
                renderAuthorLabel('static')
              )}
              <span className='rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-foreground-muted ml-auto'>
                {reasonLabel}
              </span>
            </div>
            {contentBody}
          </div>
        </div>
      )}
      {showFooter ? (
        <>
          <footer className='mt-3 flex flex-wrap items-center gap-3 text-sm text-foreground-muted sm:gap-5'>
            <button
              type='button'
              className='group inline-flex items-center gap-2 hover:text-foreground transition'
              title={t('notifications.card.actions.reply', 'Antworten')}
              onClick={() => {
                if (typeof onReply === 'function' && actionTarget) {
                  clearError()
                  onReply(actionTarget)
                }
              }}
            >
              <ChatBubbleIcon className='h-5 w-5' />
              <span className='tabular-nums'>{replyCountStat}</span>
            </button>
            <RepostMenuButton
              count={repostCount}
              hasReposted={hasReposted}
              hasQuoted={Boolean(quotePostUri)}
              busy={busy || quoteBusy}
              style={repostStyle}
              onRepost={() => {
                handleToggleRepost()
              }}
              onUnrepost={() => {
                handleToggleRepost()
              }}
              onUnquote={quotePostUri ? handleUndoQuote : undefined}
              onQuote={onQuote && actionTarget ? (() => {
                clearError()
                onQuote(actionTarget)
              }) : undefined}
            />
            <button
              type='button'
              className={`group inline-flex items-center gap-2 transition ${busy ? 'opacity-60' : ''}`}
              style={likeStyle}
              title={t('notifications.card.actions.like', 'Gefällt mir')}
              aria-pressed={hasLiked}
              disabled={busy}
              onClick={handleToggleLike}
            >
              {hasLiked ? (
                <HeartFilledIcon className='h-5 w-5' />
              ) : (
                <HeartIcon className='h-5 w-5' />
              )}
              <span className='tabular-nums'>{likeCount}</span>
            </button>
            <div className='relative ml-auto flex items-center gap-1'>
              <button
                type='button'
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-background-subtle transition ${bookmarking ? 'opacity-60' : ''}`}
                style={bookmarkStyle}
                title={isBookmarked ? t('skeet.actions.bookmarkRemove', 'Gespeichert') : t('skeet.actions.bookmarkAdd', 'Merken')}
                aria-pressed={isBookmarked}
                disabled={bookmarking}
                onClick={handleToggleBookmark}
              >
                {isBookmarked ? (
                  <BookmarkFilledIcon className='h-4 w-4' />
                ) : (
                  <BookmarkIcon className='h-4 w-4' />
                )}
              </button>
              <InlineMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
                <InlineMenuTrigger>
                  <button
                    type='button'
                    className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-background-subtle'
                    title={t('skeet.actions.share', 'Teilen')}
                    aria-label={t('skeet.actions.shareAria', 'Beitrag teilen')}
                  >
                    <Share2Icon className='h-4 w-4' />
                  </button>
                </InlineMenuTrigger>
                <InlineMenuContent side='bottom' align='end' sideOffset={10}>
                  <div className='py-1'>
                    <InlineMenuItem
                      icon={CopyIcon}
                      onSelect={(event) => {
                        event?.preventDefault?.()
                        copyToClipboard(shareUrl, t('skeet.share.linkCopied', 'Link zum Post kopiert'))
                        setShareMenuOpen(false)
                      }}
                    >
                      {t('skeet.share.copyLink', 'Link zum Post kopieren')}
                    </InlineMenuItem>
                    <InlineMenuItem
                      icon={Link2Icon}
                      onSelect={(event) => {
                        event?.preventDefault?.()
                        showPlaceholder(t('skeet.share.directMessage', 'Direktnachricht'))
                        setShareMenuOpen(false)
                      }}
                    >
                      {t('skeet.share.directMessageAction', 'Per Direktnachricht senden')}
                    </InlineMenuItem>
                    <InlineMenuItem
                      icon={CodeIcon}
                      onSelect={(event) => {
                        event?.preventDefault?.()
                        showPlaceholder(t('skeet.share.embed', 'Embed'))
                        setShareMenuOpen(false)
                      }}
                    >
                      {t('skeet.share.embedAction', 'Post einbetten')}
                    </InlineMenuItem>
                  </div>
                </InlineMenuContent>
              </InlineMenu>
              {translationEnabled ? (
                <button
                  type='button'
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-background-subtle ${translateButtonDisabled ? 'opacity-60' : ''}`}
                  title={translating && canInlineTranslate ? t('skeet.actions.translating', 'Übersetze…') : t('skeet.actions.translate', 'Übersetzen')}
                  aria-label={t('skeet.actions.translate', 'Übersetzen')}
                  onClick={handleTranslateAction}
                  disabled={translateButtonDisabled}
                >
                  {translating && canInlineTranslate ? (
                    <span className='h-4 w-4 animate-spin rounded-full border-2 border-border border-t-transparent' aria-hidden='true' />
                  ) : (
                    <GlobeIcon className='h-4 w-4' />
                  )}
                </button>
              ) : null}
              <InlineMenu open={optionsOpen} onOpenChange={setOptionsOpen}>
                <InlineMenuTrigger>
                  <button
                    type='button'
                    className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground-muted hover:bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
                    aria-label={t('skeet.actions.moreOptions', 'Mehr Optionen')}
                  >
                    <DotsHorizontalIcon className='h-5 w-5' />
                  </button>
                </InlineMenuTrigger>
                <InlineMenuContent align='end' side='top' sideOffset={10} style={{ width: 240 }}>
                  <div className='py-1 text-sm'>
                    {menuActions.map((entry) => {
                      const Icon = entry.icon
                      return (
                        <InlineMenuItem
                          key={entry.key || entry.label}
                          icon={Icon}
                          disabled={entry.disabled}
                          variant={entry.variant || 'default'}
                          onSelect={(event) => {
                            event?.preventDefault?.()
                            if (entry.disabled) return
                            try {
                              entry.action()
                            } catch {
                              /* ignore menu action errors */
                            }
                            setOptionsOpen(false)
                          }}
                        >
                          {entry.label}
                        </InlineMenuItem>
                      )
                    })}
                  </div>
                </InlineMenuContent>
              </InlineMenu>
            </div>
          </footer>
          {feedbackMessage ? (
            <p className='mt-2 text-xs text-emerald-600'>{feedbackMessage}</p>
          ) : null}
          {translationError ? (
            <p className='mt-2 text-xs text-red-600'>{translationError}</p>
          ) : null}
          {actionError ? (
            <p className='mt-2 text-xs text-red-600'>{actionError}</p>
          ) : null}
          {menuActionError ? (
            <p className='mt-2 text-xs text-red-600'>{menuActionError}</p>
          ) : null}
          {quoteMessage ? (
            <p className={`mt-2 text-xs ${quoteMessageIsError ? 'text-red-600' : 'text-foreground-muted'}`}>{quoteMessage}</p>
          ) : null}
        </>
      ) : null}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        variant={confirmDialog.variant || 'primary'}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </Card>
  )
})

function NotificationSubjectPreview ({ subject, reason, onSelect, onSelectQuoted, threadTarget, onViewMedia, inlineVideoEnabled = false }) {
  const dispatch = useAppDispatch()
  const { t, locale } = useTranslation()
  const { config } = useCardConfig()
  const author = subject?.author || {}
  const preview = extractSubjectPreview(subject)
  const previewMedia = preview?.media || []
  const timestamp = subject?.createdAt ? new Date(subject.createdAt).toLocaleString(locale || 'de-DE') : ''
  const profileActor = author?.did || author?.handle || ''
  const canOpenProfileViewer = Boolean(profileActor)
  const showQuoted = isViaRepostReason(reason)
  const quoted = showQuoted ? extractQuotedPost(subject) : null
  const quotedAuthorLabel = quoted?.author
    ? (quoted.author.displayName || quoted.author.handle || t('notifications.card.authorUnknown', 'Unbekannt'))
    : ''
  const quotedAuthorMissing = quoted?.author ? !(quoted.author.displayName || quoted.author.handle) : false
  const subjectAuthorLabel = author.displayName || author.handle || t('notifications.preview.profileFallback', 'Profil')
  const canOpenSubject = typeof onSelect === 'function' && Boolean(threadTarget || subject)
  const canOpenQuoted = typeof onSelectQuoted === 'function' && quoted?.uri && quoted.status === 'ok'
  const videoOpenLabel = t('notifications.preview.videoOpen', 'Video öffnen')
  const videoBadgeLabel = t('notifications.preview.videoLabel', 'Video')
  const originalPostLabel = t('notifications.preview.originalPost', 'Originaler Beitrag')
  const quotedAuthorMissingLabel = t('notifications.preview.quoted.authorMissing', 'Autorinformationen wurden nicht mitgeliefert.')
  const quotedStatusMessage = quoted?.status
    ? t(`notifications.preview.quoted.status.${quoted.status}`, quoted?.statusMessage || '')
    : (quoted?.statusMessage || '')
  const [inlineVideoOpen, setInlineVideoOpen] = useState(false)
  const inlineVideoRef = useRef(null)

  useEffect(() => {
    setInlineVideoOpen(false)
  }, [preview?.video?.src])
  useEffect(() => {
    if (!inlineVideoOpen) return
    const node = inlineVideoRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          setInlineVideoOpen(false)
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [inlineVideoOpen])

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

  const subjectAvatarVisual = author.avatar
    ? (
        <img src={author.avatar} alt='' className='h-8 w-8 rounded-full border border-border object-cover' />
      )
    : (
        <div className='h-8 w-8 rounded-full border border-border bg-background' />
      )

  const subjectAvatarWithPreview = profileActor
    ? (
      <ProfilePreviewTrigger actor={profileActor} fallback={author}>
        {subjectAvatarVisual}
      </ProfilePreviewTrigger>
      )
    : subjectAvatarVisual

  const renderSubjectAuthorLabel = useCallback((variant = 'button') => {
    const textClass = `block truncate font-semibold ${variant === 'button' ? '' : 'text-foreground'}`
    const content = (
      <span className={textClass} title={subjectAuthorLabel}>
        {subjectAuthorLabel}
      </span>
    )
    if (profileActor) {
      return (
        <ProfilePreviewTrigger actor={profileActor} fallback={author} as='span' className='block max-w-full'>
          {content}
        </ProfilePreviewTrigger>
      )
    }
    return content
  }, [author, profileActor, subjectAuthorLabel])

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
        {canOpenProfileViewer ? (
          <button type='button' onClick={openSubjectAuthor} className='h-8 w-8 rounded-full border border-border transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'>
            {subjectAvatarWithPreview}
          </button>
        ) : subjectAvatarWithPreview}
        <div className='min-w-0 flex-1'>
          {canOpenProfileViewer ? (
            <button
              type='button'
              onClick={openSubjectAuthor}
              className='block w-full truncate text-left font-semibold text-foreground transition hover:text-primary'
            >
              {renderSubjectAuthorLabel('button')}
            </button>
          ) : (
            renderSubjectAuthorLabel('static')
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
          const previewStyle = {
            aspectRatio: ratio,
            width: '100%',
            maxHeight: singleMax,
            minHeight: singleMax,
            backgroundColor: 'var(--background-subtle, #000)'
          }
          if (inlineVideoEnabled && inlineVideoOpen) {
            return (
              <div ref={inlineVideoRef} className='space-y-2 rounded-xl border border-border bg-background-subtle p-3'>
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-sm font-semibold text-foreground'>{videoBadgeLabel}</p>
                  <button
                    type='button'
                    className='rounded-full border border-border px-2 py-1 text-xs text-foreground-muted hover:text-foreground'
                    onClick={() => setInlineVideoOpen(false)}
                  >
                    {t('common.actions.close', 'Schließen')}
                  </button>
                </div>
                <div
                  className='relative w-full overflow-hidden rounded-lg border border-border bg-black'
                  style={{ aspectRatio: ratio }}
                >
                  <InlineVideoPlayer
                    src={preview.video.src}
                    poster={preview.video.poster}
                    autoPlay
                    className='absolute inset-0 h-full w-full'
                  />
                </div>
              </div>
            )
          }
          return (
            <button
              type='button'
              onClick={(event) => {
                if (inlineVideoEnabled) {
                  event.preventDefault()
                  event.stopPropagation()
                  setInlineVideoOpen(true)
                  return
                }
                handlePreviewMediaClick(event, preview.videoIndex ?? 0)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  if (inlineVideoEnabled) {
                    event.preventDefault()
                    event.stopPropagation()
                    setInlineVideoOpen(true)
                    return
                  }
                  handlePreviewMediaClick(event, preview.videoIndex ?? 0)
                }
              }}
              className='relative block w-full overflow-hidden rounded-xl border border-border bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
              aria-label={videoOpenLabel}
              title={videoOpenLabel}
            >
              <div
                className='relative w-full overflow-hidden rounded-xl'
                style={previewStyle}
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
                      <ActorProfileLink
                        actor={quoted.author?.did || quoted.author?.handle}
                        handle={quoted.author?.handle}
                        className='truncate text-xs text-foreground-muted text-left hover:text-primary'
                      >
                        @{quoted.author.handle}
                      </ActorProfileLink>
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

function ReplyMediaPreview ({ media = [], onViewMedia, inlineVideoEnabled = false }) {
  const { config } = useCardConfig()
  const { t } = useTranslation()
  const [inlineVideoOpen, setInlineVideoOpen] = useState(false)
  const inlineVideoRef = useRef(null)
  const handleMediaClick = useCallback((event, mediaIndex = 0) => {
    if (typeof onViewMedia !== 'function') return
    if (!Array.isArray(media) || media.length === 0) return
    event?.preventDefault()
    event?.stopPropagation()
    const safeIndex = Math.max(0, Math.min(mediaIndex, media.length - 1))
    onViewMedia(media, safeIndex)
  }, [onViewMedia, media])

  const hasMedia = Array.isArray(media) && media.length > 0
  const firstImage = hasMedia ? media.find(m => m.type === 'image') : null
  const firstVideo = hasMedia ? media.find(m => m.type === 'video') : null

  useEffect(() => {
    if (!hasMedia) return
    setInlineVideoOpen(false)
  }, [firstVideo?.src, hasMedia])
  useEffect(() => {
    if (!hasMedia) return
    if (!inlineVideoOpen) return
    const node = inlineVideoRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          setInlineVideoOpen(false)
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMedia, inlineVideoOpen])

  if (!hasMedia) return null

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
    if (inlineVideoEnabled && inlineVideoOpen) {
      return (
        <div ref={inlineVideoRef} className='space-y-2 rounded-xl border border-border bg-background-subtle p-3'>
          <div className='flex items-center justify-between gap-3'>
            <p className='text-sm font-semibold text-foreground'>{videoBadgeLabel}</p>
            <button
              type='button'
              className='rounded-full border border-border px-2 py-1 text-xs text-foreground-muted hover:text-foreground'
              onClick={() => setInlineVideoOpen(false)}
            >
              {t('common.actions.close', 'Schließen')}
            </button>
          </div>
          <div
            className='relative w-full overflow-hidden rounded-lg border border-border bg-black'
            style={{ aspectRatio: ratio }}
          >
            <InlineVideoPlayer
              src={firstVideo.src}
              poster={firstVideo.poster}
              autoPlay
              className='absolute inset-0 h-full w-full'
            />
          </div>
        </div>
      )
    }
    return (
      <button
        type='button'
        onClick={(event) => {
          if (inlineVideoEnabled) {
            event.preventDefault()
            event.stopPropagation()
            setInlineVideoOpen(true)
            return
          }
          handleMediaClick(event, videoIndex)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            if (inlineVideoEnabled) {
              event.preventDefault()
              event.stopPropagation()
              setInlineVideoOpen(true)
              return
            }
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

export default function Notifications ({ activeTab = 'all', listKey = 'notifs:all' }) {
  const { t } = useTranslation()
  const { clientConfig } = useClientConfig()
  const { lists, notificationsUnread } = useAppState()
  const dispatch = useAppDispatch()
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const { mutate } = useSWRConfig()
  const inlineVideoEnabled = clientConfig?.layout?.inlineVideo === true || clientConfig?.layout?.inlineYoutube === true

  const list = listKey ? lists?.[listKey] : null
  const listRef = useRef(list)
  useEffect(() => {
    listRef.current = list
  }, [list])
  const items = useMemo(() => (Array.isArray(list?.items) ? list.items : []), [list?.items])
  const [retryTick, setRetryTick] = useState(0)
  const [error, setError] = useState(null)
  const loadMoreTriggerRef = useRef(null)
  const [mentionsAutoLoadAttempts, setMentionsAutoLoadAttempts] = useState(0)
  const mentionsAutoLoadRef = useRef({
    key: null,
    attempts: 0,
    running: false
  })
  const updateUnread = useCallback((count) => {
    const normalized = Math.max(0, count || 0)
    dispatch({ type: 'SET_NOTIFICATIONS_UNREAD', payload: normalized })
    mutate(NOTIFICATION_UNREAD_SWR_KEY, { unreadCount: normalized }, false)
  }, [dispatch, mutate])

  const isLoadingInitial = !list || !list.loaded
  const isLoadingMore = Boolean(list?.isLoadingMore)
  const hasMore = Boolean(list?.cursor)
  const mentionsPageSize = 80

  useEffect(() => {
    setError(null)
  }, [listKey, retryTick])

  useEffect(() => {
    if (!listKey || !list || !list.data) return
    if (list.isRefreshing) return
    if (list.loaded && retryTick === 0) return
    let cancelled = false
    runListRefresh({
      list,
      dispatch,
      ...(activeTab === 'mentions' ? { limit: mentionsPageSize } : {})
    })
      .then((page) => {
        if (cancelled) return
        if (typeof page?.unreadCount === 'number') {
          updateUnread(page.unreadCount)
        }
        if (retryTick !== 0) {
          setRetryTick(0)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => { cancelled = true }
  }, [activeTab, listKey, list, dispatch, retryTick, updateUnread])

  const loadMore = useCallback(async () => {
    if (!list || isLoadingInitial || isLoadingMore || !hasMore) return
    try {
      await runListLoadMore({
        list,
        dispatch,
        ...(activeTab === 'mentions' ? { limit: mentionsPageSize } : {})
      })
    } catch (err) {
      console.error('Failed to load more notifications', err)
    }
  }, [activeTab, list, dispatch, hasMore, isLoadingInitial, isLoadingMore])

  const handleMarkRead = useCallback((notification) => {
    if (!notification || notification.isRead || !list) return
    const targetId = getNotificationId(notification)
    if (!targetId) return
    const updated = (list.items || []).map((entry) => {
      const entryId = getNotificationId(entry)
      if (entryId !== targetId) return entry
      if (entry.isRead) return entry
      return { ...entry, isRead: true }
    })
    dispatch({
      type: 'LIST_LOADED',
      payload: {
        key: listKey,
        items: updated,
        cursor: list.cursor,
        topId: list.topId,
        meta: { data: list.data },
        keepHasNew: true
      }
    })
    const nextUnread = Math.max(0, (notificationsUnread || 0) - 1)
    updateUnread(nextUnread)
  }, [dispatch, list, listKey, notificationsUnread, updateUnread])

  useEffect(() => {
    if (!hasMore || !loadMoreTriggerRef.current) return
    const root = typeof document !== 'undefined'
      ? document.getElementById('bsky-scroll-container')
      : null
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      if (!hasMore) return
      if (isLoadingMore) return
      if (activeTab === 'mentions' && root) {
        const isScrollable = root.scrollHeight > root.clientHeight + 32
        if (!isScrollable) return
      }
      loadMore()
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
  }, [activeTab, hasMore, isLoadingMore, loadMore])

  useEffect(() => {
    if (activeTab !== 'mentions') return
    if (!listKey) return
    const state = mentionsAutoLoadRef.current
    if (state.key !== listKey) {
      state.key = listKey
      state.attempts = 0
      state.running = false
      setMentionsAutoLoadAttempts(0)
    }
  }, [activeTab, listKey])

  useEffect(() => {
    if (activeTab !== 'mentions') return
    if (isLoadingInitial || isLoadingMore) return
    if (!hasMore) return

    const state = mentionsAutoLoadRef.current
    if (state.running) return

    const root = typeof document !== 'undefined'
      ? document.getElementById('bsky-scroll-container')
      : null
    const rootHeight = root?.clientHeight || 0
    const estimatedCardHeight = 96
    const bufferCards = 6
    const minTarget = 10
    const targetCount = Math.max(
      minTarget,
      rootHeight > 0 ? Math.ceil(rootHeight / estimatedCardHeight) + bufferCards : minTarget
    )
    if (items.length >= targetCount) return

    const MAX_AUTOPAGES = 5
    state.running = true

    ;(async () => {
      try {
        while (state.attempts < MAX_AUTOPAGES) {
          const currentList = listRef.current
          if (!currentList?.cursor) return
          if (currentList.isLoadingMore || currentList.isRefreshing) return
          const beforeCursor = currentList.cursor
          const beforeCount = Array.isArray(currentList.items) ? currentList.items.length : 0

          state.attempts += 1
          setMentionsAutoLoadAttempts(state.attempts)
          await runListLoadMore({ list: currentList, dispatch, limit: mentionsPageSize })

          const afterList = listRef.current
          const afterCursor = afterList?.cursor || null
          const afterCount = Array.isArray(afterList?.items) ? afterList.items.length : beforeCount

          if (afterCount >= targetCount) return
          if (!afterCursor) return
          if (afterCursor === beforeCursor && afterCount === beforeCount) return
        }
      } catch (err) {
        console.warn('mentions auto-load failed', err)
      } finally {
        state.running = false
      }
    })()
  }, [activeTab, dispatch, hasMore, isLoadingInitial, isLoadingMore, items.length])

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

  if (items.length === 0) {
    return <p className='text-sm text-muted-foreground'>{t('notifications.status.empty', 'Keine Mitteilungen gefunden.')}</p>
  }

  return (
    <section className='space-y-4' data-component='BskyNotifications'>
      <VirtualizedList
        className='space-y-3'
        items={items}
        itemHeight={200}
        virtualizationThreshold={100}
        overscan={4}
        getItemId={getListItemId}
        renderItem={(item) => (
          <NotificationCard
            item={item}
            onSelectItem={onSelectPost ? ((selected) => onSelectPost(selected || item)) : undefined}
            onSelectSubject={onSelectPost ? ((subject) => onSelectPost(subject)) : undefined}
            onReply={onReply}
            onQuote={onQuote}
            onMarkRead={handleMarkRead}
            onViewMedia={onViewMedia}
            inlineVideoEnabled={inlineVideoEnabled}
          />
        )}
      />
      {hasMore ? (
        <div
          ref={loadMoreTriggerRef}
          className='py-4 text-center text-sm text-foreground-muted'
        >
          {isLoadingMore
            ? t('notifications.status.loading', 'Lade…')
            : activeTab === 'mentions' && mentionsAutoLoadAttempts >= 5
                ? (
                    <Button variant='secondary' size='pill' onClick={loadMore}>
                      {t('notifications.actions.loadMore', 'Mehr laden…')}
                    </Button>
                  )
                : t('notifications.status.autoLoading', 'Weitere Mitteilungen werden automatisch geladen…')}
        </div>
      ) : null}
    </section>
  )
}
