import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LABELS, moderatePost } from '@atproto/api'
import {
  ChatBubbleIcon,
  HeartIcon,
  HeartFilledIcon,
  Share2Icon,
  DotsHorizontalIcon,
  Link2Icon,
  CopyIcon,
  CodeIcon,
  GlobeIcon,
  ExclamationTriangleIcon,
  FaceIcon,
  SpeakerOffIcon,
  SpeakerModerateIcon,
  MixerVerticalIcon,
  EyeClosedIcon,
  ScissorsIcon,
  TriangleRightIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
  PinLeftIcon,
  TrashIcon,
  GearIcon
} from '@radix-ui/react-icons'
import { useCardConfig } from '../../context/CardConfigContext.jsx'
import { useAppDispatch, useAppState } from '../../context/AppContext.jsx'
import {
  useBskyEngagement,
  deletePost,
  RichText,
  RepostMenuButton,
  ProfilePreviewTrigger,
  ActorProfileLink,
  Card,
  InlineMenu,
  InlineMenuTrigger,
  InlineMenuContent,
  InlineMenuItem,
  ConfirmDialog,
  useConfirmDialog
} from '../shared'
import InlineVideoPlayer from '../shared/InlineVideoPlayer.jsx'
import { parseAspectRatioValue } from '../shared/utils/media.js'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { useClientConfig } from '../../hooks/useClientConfig.js'
import { useModerationPreferences } from '../../hooks/useModerationPreferences.js'
import { muteActor as apiMuteActor, blockActor as apiBlockActor } from '../shared/api/bsky'
import { useBskyAuth } from '../auth/AuthContext.jsx'

const looksLikeGifUrl = (value) => typeof value === 'string' && /\.gif(?:$|\?)/i.test(value)
const normalizeExternalHost = (value) => {
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''
  try {
    const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return trimmed.split('/')[0].replace(/^www\./, '')
  }
}
const isAllowedHost = (host, allowList = []) =>
  allowList.some((entry) => host === entry || host.endsWith(`.${entry}`))
const extractYoutubeId = (value) => {
  if (!value || typeof value !== 'string') return ''
  try {
    const withProtocol = value.includes('://') ? value : `https://${value}`
    const parsed = new URL(withProtocol)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || ''
    }
    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v') || ''
      }
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts[0] === 'shorts' || parts[0] === 'embed') {
        return parts[1] || ''
      }
    }
  } catch {
    return ''
  }
  return ''
}
const buildYoutubeEmbedUrl = (id, { autoplay = false } = {}) => {
  const base = `https://www.youtube-nocookie.com/embed/${id}`
  return autoplay ? `${base}?autoplay=1` : base
}
const DEFAULT_SINGLE_IMAGE_RATIO = 4 / 3
const DEFAULT_MULTI_IMAGE_RATIO = 1

const truthyValues = new Set(['1', 'true', 'yes', 'on'])
const falsyValues = new Set(['0', 'false', 'no', 'off'])
const DEFAULT_TRANSLATE_BASE = 'http://localhost:5000'

const parseBoolean = (value, fallback = null) => {
  if (typeof value === 'boolean') return value
  if (value === undefined || value === null) return fallback
  const normalized = String(value).trim().toLowerCase()
  if (!normalized) return fallback
  if (truthyValues.has(normalized)) return true
  if (falsyValues.has(normalized)) return false
  return fallback
}

const isPrivateHost = (hostname) => {
  if (!hostname) return false
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (normalized === 'localhost' || normalized === '::1') return true
  if (normalized.startsWith('127.')) return true
  if (normalized.startsWith('10.')) return true
  if (normalized.startsWith('192.168.')) return true
  if (normalized.startsWith('172.')) {
    const parts = normalized.split('.')
    const second = Number(parts[1])
    if (parts.length >= 2 && Number.isFinite(second) && second >= 16 && second <= 31) {
      return true
    }
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  return false
}

const normalizeTranslateEndpoint = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  try {
    const parsed = new URL(rawUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (!isPrivateHost(parsed.hostname)) return null
    const trimmedPath = (parsed.pathname || '/').replace(/\/+$/, '')
    const hasTranslateSuffix = trimmedPath.toLowerCase().endsWith('/translate')
    const basePath = hasTranslateSuffix
      ? (trimmedPath || '/translate')
      : `${trimmedPath || ''}/translate`
    const finalPath = basePath.startsWith('/') ? basePath : `/${basePath}`
    return `${parsed.origin}${finalPath}`
  } catch {
    return null
  }
}

const buildFallbackTranslateUrl = (service, language, content) => {
  const target = encodeURIComponent(content || '')
  if (!target) return ''
  const lang = language || 'en'
  if (service === 'deepl') {
    return `https://www.deepl.com/translator#auto/${lang}/${target}`
  }
  if (service === 'bing') {
    return `https://www.bing.com/translator?from=auto&to=${lang}&text=${target}`
  }
  if (service === 'yandex') {
    return `https://translate.yandex.com/?source_lang=auto&target_lang=${lang}&text=${target}`
  }
  if (service === 'google') {
    return `https://translate.google.com/?sl=auto&tl=${lang}&text=${target}`
  }
  return ''
}

const RELATIVE_TIME_UNITS = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 }
]

const formatRelativeTime = (value, locale) => {
  const parsed = new Date(value)
  const timestamp = parsed.getTime()
  if (!Number.isFinite(timestamp)) return ''
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000)
  const absoluteSeconds = Math.abs(deltaSeconds)
  const formatter = new Intl.RelativeTimeFormat(locale || 'de-DE', { numeric: 'auto' })
  for (const entry of RELATIVE_TIME_UNITS) {
    if (absoluteSeconds >= entry.seconds || entry.unit === 'second') {
      const amount = Math.round(deltaSeconds / entry.seconds)
      return formatter.format(amount, entry.unit)
    }
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

function extractMediaFromEmbed (item) {
  try {
    const post = item?.raw?.post || {}
    const embed = post?.embed || {}
    const imageSources = []
    const videoSources = []

    const collectImages = (candidate) => {
      if (!candidate || typeof candidate !== 'object') return
      const type = String(candidate.$type || '').toLowerCase()
      if (type.startsWith('app.bsky.embed.images') && Array.isArray(candidate.images)) {
        imageSources.push(...candidate.images)
      } else if (Array.isArray(candidate?.images)) {
        imageSources.push(...candidate.images)
      }
    }

    const collectVideos = (candidate) => {
      if (!candidate || typeof candidate !== 'object') return
      const type = String(candidate.$type || '').toLowerCase()
      if (type.includes('app.bsky.embed.video')) {
        videoSources.push(candidate)
      } else if (candidate.video && typeof candidate.video === 'object') {
        videoSources.push(candidate.video)
      }
      if (Array.isArray(candidate?.videos)) {
        videoSources.push(...candidate.videos)
      }
    }

    collectImages(embed)
    collectImages(embed?.media)
    collectVideos(embed)
    collectVideos(embed?.media)

    const imageItems = imageSources
      .map(img => {
        const src = img?.fullsize || img?.thumb || ''
        if (!src) return null
        return {
          type: 'image',
          src,
          thumb: img?.thumb || img?.fullsize || src,
          alt: img?.alt || '',
          aspectRatio: parseAspectRatioValue(img?.aspectRatio) || null
        }
      })
      .filter(Boolean)
      .slice(0, 4)

    const videoItems = videoSources
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

    const mediaItems = [...imageItems, ...videoItems].map((entry, idx) => ({
      ...entry,
      mediaIndex: idx
    }))
    return {
      media: mediaItems,
      images: mediaItems.filter(entry => entry.type === 'image'),
      videos: mediaItems.filter(entry => entry.type === 'video')
    }
  } catch {
    return { media: [], images: [], videos: [] }
  }
}

function extractExternalFromEmbed (item) {
  try {
    const post = item?.raw?.post || {}
    const e = post?.embed || {}
    const t1 = e?.$type
    const t2 = e?.media?.$type
    const isExt1 = typeof t1 === 'string' && t1.startsWith('app.bsky.embed.external')
    const isExt2 = typeof t2 === 'string' && t2.startsWith('app.bsky.embed.external')
    const extView = isExt1 ? e : (isExt2 ? e.media : null)
    const ext = extView?.external || null
    if (!ext || !ext?.uri) return null
    const url = new URL(ext.uri)
    const domain = url.hostname.replace(/^www\./, '')
    return {
      uri: ext.uri,
      title: ext.title || domain,
      description: ext.description || '',
      thumb: ext.thumb || '',
      domain
    }
  } catch { return null }
}

function extractQuoteFromEmbed (item, translateFn) {
  const translate = typeof translateFn === 'function' ? translateFn : (_key, fallback) => fallback
  try {
    const post = item?.raw?.post || {}
    const e = post?.embed || {}
    const t = e?.$type
    let recordView = null
    if (typeof t === 'string') {
      if (t.startsWith('app.bsky.embed.recordWithMedia')) {
        recordView = e?.record || null
      } else if (t.startsWith('app.bsky.embed.record')) {
        recordView = e
      }
    }
    if (!recordView) return null
    const view = recordView?.record && recordView?.record?.$type
      ? recordView.record
      : recordView
    const viewType = view?.$type || ''
    if (viewType.endsWith('#viewBlocked')) {
      return {
        uri: view?.uri || null,
        cid: view?.cid || null,
        text: '',
        author: {},
        status: 'blocked',
        statusMessage: translate('skeet.quote.status.blocked', 'Dieser Beitrag ist geschützt oder blockiert.')
      }
    }
    if (viewType.endsWith('#viewNotFound')) {
      return {
        uri: view?.uri || null,
        cid: view?.cid || null,
        text: '',
        author: {},
        status: 'not_found',
        statusMessage: translate('skeet.quote.status.not_found', 'Der Original-Beitrag wurde entfernt oder ist nicht mehr verfügbar.')
      }
    }
    if (viewType.endsWith('#viewDetached')) {
      return {
        uri: view?.uri || null,
        cid: view?.cid || null,
        text: '',
        author: {},
        status: 'detached',
        statusMessage: translate('skeet.quote.status.detached', 'Der Original-Beitrag wurde losgelöst und kann nicht angezeigt werden.')
      }
    }
    const author = view?.author || {}
    const value = view?.value || {}
    return {
      uri: view?.uri || null,
      cid: view?.cid || null,
      text: typeof value?.text === 'string' ? value.text : '',
      author: {
        handle: author?.handle || '',
        displayName: author?.displayName || author?.handle || '',
        avatar: author?.avatar || null
      },
      status: 'ok',
      statusMessage: ''
    }
  } catch { return null }
}

function extractReasonContext (item) {
  try {
    const reason = item?.raw?.reason || item?.reason || null
    if (!reason || typeof reason !== 'object') return null
    const type = String(reason?.$type || reason?.type || '').toLowerCase()
    const actor = reason?.by || reason?.actor || {}
    const actorLabel = actor.displayName || actor.handle || actor.did || ''
    if (type.includes('repost')) {
      return { type: 'repost', actorLabel }
    }
    if (type.includes('like')) {
      return { type: 'like', actorLabel }
    }
    return null
  } catch {
    return null
  }
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

export default function SkeetItem({ item, variant = 'card', onReply, onQuote, onViewMedia, onSelect, onEngagementChange, showActions = true, disableHashtagMenu = false, isUnread = false, onMarkRead }) {
  const { t, locale } = useTranslation()
  const { session } = useBskyAuth()
  const { clientConfig } = useClientConfig()
  const { prefs: moderationPrefs, labelDefs, loading: moderationLoading } = useModerationPreferences({
    enabled: Boolean(session?.did)
  })
  const { author = {}, text = '', createdAt, stats = {} } = item || {}
  const media = useMemo(() => extractMediaFromEmbed(item), [item])
  const mediaItems = media.media
  const images = media.images
  const videos = media.videos
  const external = useMemo(() => extractExternalFromEmbed(item), [item])
  const videoAllowList = useMemo(() => {
    const raw = Array.isArray(clientConfig?.layout?.videoAllowList)
      ? clientConfig.layout.videoAllowList
      : (Array.isArray(clientConfig?.layout?.youtubeAllowList) ? clientConfig.layout.youtubeAllowList : [])
    return raw
      .map((entry) => String(entry || '').trim().toLowerCase())
      .filter(Boolean)
  }, [clientConfig?.layout?.videoAllowList, clientConfig?.layout?.youtubeAllowList])
  const videoAllowListEnabled = clientConfig?.layout?.videoAllowListEnabled !== false
  const gifPreview = useMemo(() => {
    if (!external) return null
    const domain = (external.domain || '').toLowerCase()
    const isTenor = domain.includes('tenor')
    const thumbGif = looksLikeGifUrl(external.thumb)
    const uriGif = looksLikeGifUrl(external.uri)
    if (!isTenor && !thumbGif && !uriGif) return null
    const src = thumbGif ? external.thumb : (uriGif ? external.uri : external.thumb)
    if (!src) return null
    return {
      src,
      thumb: external.thumb || src,
      alt: external.title
        ? t('skeet.media.gifAltTitle', 'GIF: {title}', { title: external.title })
        : t('skeet.media.gifAlt', 'GIF'),
      title: external.title || '',
      domain: external.domain,
      originalUrl: external.uri
    }
  }, [external, t])
  const youtubePreview = useMemo(() => {
    if (!external) return null
    if (!videoAllowListEnabled) return null
    const host = normalizeExternalHost(external.uri || external.domain || '')
    if (!host || !isAllowedHost(host, videoAllowList)) return null
    const id = extractYoutubeId(external.uri || '')
    if (!id) return null
    return {
      id,
      title: external.title || '',
      description: external.description || '',
      thumb: external.thumb || '',
      url: external.uri || '',
      domain: external.domain || host
    }
  }, [external, videoAllowList, videoAllowListEnabled])
  useEffect(() => {
    setYoutubeInlineOpen(false)
  }, [youtubePreview?.id])
  const handleOpenInlineVideo = useCallback((key) => {
    setInlineVideoOpen((current) => {
      if (current.has(key)) return current
      const next = new Set(current)
      next.add(key)
      return next
    })
  }, [])
  const handleCloseInlineVideo = useCallback((key) => {
    setInlineVideoOpen((current) => {
      if (!current.has(key)) return current
      const next = new Set(current)
      next.delete(key)
      return next
    })
  }, [])
  const quoted = useMemo(() => extractQuoteFromEmbed(item, t), [item, t])
  const replyCountStat = Number(
    item?.stats?.replyCount ??
    item?.raw?.post?.replyCount ??
    item?.raw?.item?.replyCount ??
    item?.replyCount ??
    0
  )
  const contextInfo = useMemo(() => extractReasonContext(item), [item])
  const contextLabel = useMemo(() => {
    if (!contextInfo) return null
    const actorLabel = contextInfo.actorLabel || t('skeet.context.unknownActor', 'Jemand')
    if (contextInfo.type === 'repost') {
      return t('skeet.context.repost', '{actor} hat repostet', { actor: actorLabel })
    }
    if (contextInfo.type === 'like') {
      return t('skeet.context.like', '{actor} gefällt das', { actor: actorLabel })
    }
    return null
  }, [contextInfo, t])
  const quotedAuthorLabel = quoted
    ? (quoted.author?.displayName || quoted.author?.handle || t('skeet.quote.authorUnknown', 'Unbekannt'))
    : ''
  const quotedAuthorMissing = quoted ? !(quoted.author?.displayName || quoted.author?.handle) : false
  const quotedStatusMessage = quoted && quoted.status && quoted.status !== 'ok'
    ? t(`skeet.quote.status.${quoted.status}`, quoted.statusMessage || t('skeet.quote.status.unavailable', 'Der Original-Beitrag kann nicht angezeigt werden.'))
    : ''
  const quoteClickable = !quotedStatusMessage && quoted?.uri && typeof onSelect === 'function'
  const { config } = useCardConfig()
  const getImageContainerStyle = useCallback(
    (image, { single = true } = {}) => {
      const fallbackRatio = single ? DEFAULT_SINGLE_IMAGE_RATIO : DEFAULT_MULTI_IMAGE_RATIO
      const ratio = image?.aspectRatio || fallbackRatio
      const limit = single ? (config?.singleMax ?? 360) : (config?.multiMax ?? 180)
      const baseStyle = {
        width: '100%',
        backgroundColor: 'var(--background-subtle, #f6f6f6)'
      }
      if (config?.mode === 'fixed') {
        return { ...baseStyle, height: limit, maxHeight: limit }
      }
      return { ...baseStyle, aspectRatio: ratio, maxHeight: limit }
    },
    [config]
  )
  const { quoteReposts } = useAppState()
  const autoPlayGifs = clientConfig?.layout?.autoPlayGifs === true
  const inlineVideoEnabled = clientConfig?.layout?.inlineVideo === true || clientConfig?.layout?.inlineYoutube === true
  const inlineVideoUploads = inlineVideoEnabled
  const inlineVideoExternal = inlineVideoEnabled && videoAllowListEnabled
  const timeFormat = clientConfig?.layout?.timeFormat === 'absolute' ? 'absolute' : 'relative'
  const timeLabel = useMemo(() => {
    if (!createdAt) return ''
    if (timeFormat === 'absolute') {
      return new Date(createdAt).toLocaleString(locale || 'de-DE')
    }
    return formatRelativeTime(createdAt, locale || 'de-DE')
  }, [createdAt, locale, timeFormat])
  const envTranslateBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_LIBRETRANSLATE_BASE_URL) ? import.meta.env.VITE_LIBRETRANSLATE_BASE_URL : ''
  const envTranslateEnabled = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TRANSLATION_ENABLED) ? import.meta.env.VITE_TRANSLATION_ENABLED : null
  const translationPreferences = useMemo(
    () => resolveTranslationConfig(clientConfig, envTranslateBaseUrl, envTranslateEnabled),
    [clientConfig, envTranslateBaseUrl, envTranslateEnabled]
  )
  const translationAbortRef = useRef(null)
  const detectAbortRef = useRef(null)
  const [translating, setTranslating] = useState(false)
  const [translationResult, setTranslationResult] = useState(null)
  const [translationError, setTranslationError] = useState('')
  const [detectingLanguage, setDetectingLanguage] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [inlineVideoOpen, setInlineVideoOpen] = useState(() => new Set())
  const inlineVideoRefs = useRef(new Map())
  const [youtubeInlineOpen, setYoutubeInlineOpen] = useState(false)
  const youtubeInlineRef = useRef(null)
  useEffect(() => {
    setInlineVideoOpen(new Set())
    inlineVideoRefs.current = new Map()
  }, [item?.uri])
  useEffect(() => {
    if (!inlineVideoOpen.size) return
    const observers = []
    inlineVideoOpen.forEach((key) => {
      const node = inlineVideoRefs.current.get(key)
      if (!node || typeof IntersectionObserver === 'undefined') return
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) {
            setInlineVideoOpen((current) => {
              if (!current.has(key)) return current
              const next = new Set(current)
              next.delete(key)
              return next
            })
          }
        },
        { threshold: 0.2 }
      )
      observer.observe(node)
      observers.push(observer)
    })
    return () => observers.forEach((observer) => observer.disconnect())
  }, [inlineVideoOpen])
  const dispatch = useAppDispatch()
  const quotePostUri = item?.uri ? (quoteReposts?.[item.uri] || null) : null
  const { dialog: confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()
  const [quoteBusy, setQuoteBusy] = useState(false)
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
    uri: item?.uri,
    cid: item?.cid || item?.raw?.post?.cid,
    initialLikes: stats?.likeCount,
    initialReposts: stats?.repostCount,
    viewer: item?.raw?.post?.viewer || item?.raw?.item?.viewer || item?.viewer,
  })
  const likeStyle = hasLiked ? { color: '#e11d48' } : undefined // rose-600
  const repostStyle = hasReposted ? { color: '#0ea5e9' } : undefined // sky-500
  const bookmarkStyle = isBookmarked ? { color: '#f97316' } : undefined // orange-500

  const handleToggleLike = useCallback(async () => {
    clearError()
    const result = await toggleLike()
    if (result && item?.uri) {
      dispatch({ type: 'PATCH_POST_ENGAGEMENT', payload: { uri: item.uri, patch: { likeUri: result.likeUri, likeCount: result.likeCount } } })
    }
    if (result && onEngagementChange) {
      const targetId = item?.listEntryId || item?.uri || item?.cid
      if (targetId) {
        onEngagementChange(targetId, { likeUri: result.likeUri, likeCount: result.likeCount })
      }
    }
  }, [clearError, dispatch, item?.cid, item?.listEntryId, item?.uri, onEngagementChange, toggleLike])

  const handleToggleRepost = useCallback(async () => {
    clearError()
    const result = await toggleRepost()
    if (result && item?.uri) {
      dispatch({ type: 'PATCH_POST_ENGAGEMENT', payload: { uri: item.uri, patch: { repostUri: result.repostUri, repostCount: result.repostCount } } })
    }
    if (result && onEngagementChange) {
      const targetId = item?.listEntryId || item?.uri || item?.cid
      if (targetId) {
        onEngagementChange(targetId, { repostUri: result.repostUri, repostCount: result.repostCount })
      }
    }
  }, [clearError, dispatch, item?.cid, item?.listEntryId, item?.uri, onEngagementChange, toggleRepost])

  const handleToggleBookmark = useCallback(async () => {
    clearError()
    const result = await toggleBookmark()
    if (result && item?.uri) {
      dispatch({ type: 'PATCH_POST_ENGAGEMENT', payload: { uri: item.uri, patch: { bookmarked: result.bookmarked } } })
    }
    if (result && onEngagementChange) {
      const targetId = item?.listEntryId || item?.uri || item?.cid
      if (targetId) {
        onEngagementChange(targetId, { bookmarked: result.bookmarked })
      }
    }
  }, [clearError, dispatch, item?.cid, item?.listEntryId, item?.uri, onEngagementChange, toggleBookmark])

  useEffect(() => {
    if (!youtubeInlineOpen) return
    const node = youtubeInlineRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          setYoutubeInlineOpen(false)
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [youtubeInlineOpen])

  const handleUndoQuote = useCallback(async () => {
    if (!item?.uri || !quotePostUri || quoteBusy) return
    setQuoteBusy(true)
    try {
      await deletePost({ uri: quotePostUri })
      dispatch({ type: 'CLEAR_QUOTE_REPOST', payload: item.uri })
      setFeedbackMessage(t('skeet.quote.undoSuccess', 'Zitat zurückgezogen.'))
      window.setTimeout(() => setFeedbackMessage(''), 2400)
    } catch (error) {
      setFeedbackMessage(error?.message || t('skeet.quote.undoError', 'Zitat konnte nicht zurückgezogen werden.'))
      window.setTimeout(() => setFeedbackMessage(''), 2400)
    } finally {
      setQuoteBusy(false)
    }
  }, [deletePost, dispatch, item?.uri, quoteBusy, quotePostUri, t])
  const Wrapper = variant === 'card' ? Card : 'div'
  const unreadClassName = isUnread
    ? 'border-primary/70 bg-primary/5 shadow-[0_10px_35px_-20px_rgba(14,165,233,0.45)] dark:bg-primary/15 dark:border-primary/80 dark:shadow-[0_10px_35px_-20px_rgba(56,189,248,0.6)]'
    : ''
  const wrapperClassName = variant === 'card' ? `relative ${unreadClassName}` : `relative px-1 ${unreadClassName}`
  const wrapperProps = variant === 'card'
    ? { as: 'article', padding: 'p-3 sm:p-5' }
    : {}
  const handleMarkRead = useCallback(() => {
    if (!isUnread || typeof onMarkRead !== 'function') return
    onMarkRead(item)
  }, [isUnread, onMarkRead, item])
  const handleSelect = (event) => {
    if (typeof onSelect !== 'function') return
    if (event) {
      const target = event.target
      if (target?.closest?.('button, a, input, textarea')) return
      event.preventDefault()
    }
    handleMarkRead()
    onSelect(item)
  }

  const handleMediaPreview = (event, index = 0) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (typeof onViewMedia === 'function' && mediaItems.length > 0) {
      const safeIndex = Math.max(0, Math.min(index, mediaItems.length - 1))
      onViewMedia(mediaItems, safeIndex)
    }
  }

  const handleExternalMediaPreview = (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!gifPreview || typeof onViewMedia !== 'function') return
    onViewMedia([{
      src: gifPreview.src,
      thumb: gifPreview.thumb,
      alt: gifPreview.alt
    }], 0)
  }

  const handleMediaKeyDown = (event, index = 0) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleMediaPreview(event, index)
    }
  }

  const handleSelectQuoted = (event) => {
    if (typeof onSelect !== 'function') return
    if (!quoted?.uri || quotedStatusMessage) return
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    onSelect({
      uri: quoted.uri,
      cid: quoted.cid,
      text: quoted.text,
      author: quoted.author,
      raw: { post: { uri: quoted.uri, cid: quoted.cid, author: quoted.author, record: { text: quoted.text } } }
    })
  }

  const actorDid = author?.did || ''
  const actorIdentifier = actorDid || author?.handle || ''
  const shareUrl = useMemo(() => buildShareUrl(item), [item])
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [mutingAccount, setMutingAccount] = useState(false)
  const [blockingAccount, setBlockingAccount] = useState(false)
  const [menuActionError, setMenuActionError] = useState('')
  const menuRef = useRef(null)
  const [moderationRevealed, setModerationRevealed] = useState(false)


  useEffect(() => {
    if (!optionsOpen) return undefined
    const handler = (event) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target)) {
        setOptionsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => {
      document.removeEventListener('pointerdown', handler)
    }
  }, [optionsOpen])

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
  }, [text, item?.uri])
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
  const moderationDecision = useMemo(() => {
    if (!moderationPrefs || !labelDefs || !item?.raw) return null
    const postView = item?.raw?.post || item?.raw?.item || item?.raw?.record || null
    if (!postView) return null
    try {
      return moderatePost(postView, {
        userDid: session?.did || null,
        prefs: moderationPrefs,
        labelDefs
      })
    } catch {
      return null
    }
  }, [item?.raw, labelDefs, moderationPrefs, session?.did])
  const moderationListUi = useMemo(() => {
    if (!moderationDecision) return null
    return moderationDecision.ui('contentList')
  }, [moderationDecision])
  const moderationMediaUi = useMemo(() => {
    if (!moderationDecision) return null
    return moderationDecision.ui('contentMedia')
  }, [moderationDecision])
  const isOfficialModerationLabel = useCallback((cause) => {
    const label = cause?.label?.val || cause?.label?.identifier || ''
    if (!label) return true
    return Object.prototype.hasOwnProperty.call(LABELS, label)
  }, [])
  const moderationAlerts = (moderationListUi?.alerts || []).filter(isOfficialModerationLabel)
  const moderationInforms = (moderationListUi?.informs || []).filter(isOfficialModerationLabel)
  const moderationListBlurs = (moderationListUi?.blurs || []).filter(isOfficialModerationLabel)
  const moderationMediaBlurs = (moderationMediaUi?.blurs || []).filter(isOfficialModerationLabel)
  const moderationFilters = (moderationListUi?.filters || []).filter(isOfficialModerationLabel)
  const moderationBlocked = moderationFilters.length > 0
  const moderationNoOverride = Boolean(moderationListUi?.noOverride || moderationMediaUi?.noOverride)
  const moderationHasWarning = moderationAlerts.length > 0 ||
    moderationInforms.length > 0 ||
    moderationListBlurs.length > 0 ||
    moderationMediaBlurs.length > 0
  const moderationNeedsBlur = moderationListBlurs.length > 0
  const moderationMediaNeedsBlur = moderationMediaBlurs.length > 0
  const moderationHasBlur = moderationNeedsBlur || moderationMediaNeedsBlur
  const moderationSummary = useMemo(() => {
    const causes = [...moderationAlerts, ...moderationInforms, ...moderationListBlurs, ...moderationMediaBlurs]
    const labels = causes
      .map((cause) => cause?.label?.val || cause?.label?.identifier || '')
      .filter(Boolean)
    const filtered = labels.filter((label) => {
      if (!label) return false
      return Object.prototype.hasOwnProperty.call(LABELS, label)
    })
    if (!filtered.length) return ''
    const unique = Array.from(new Set(filtered))
    if (unique.length === 1) {
      return unique[0]
    }
    return t('skeet.moderation.multiLabel', '{count} Kennzeichnungen', { count: unique.length })
  }, [moderationAlerts, moderationInforms, moderationListBlurs, moderationMediaBlurs, t])
  useEffect(() => {
    setModerationRevealed(false)
  }, [item?.uri, moderationSummary])
  const detectEndpoint = useMemo(() => {
    if (!translationEndpoint) return null
    return translationEndpoint.replace(/\/translate$/i, '/detect')
  }, [translationEndpoint])
  const sameLanguageDetected = detectedLanguage && detectedLanguage === targetLanguage
  const translateButtonDisabled = !translationResult && (translateUnavailable ||
    !text ||
    !text.trim() ||
    (canInlineTranslate && translating) ||
    (sameLanguageDetected && !detectingLanguage))

  useEffect(() => {
    detectAbortRef.current?.abort?.()
    if (!translationEnabled || !canInlineTranslate || !detectEndpoint || !text?.trim()) {
      setDetectingLanguage(false)
      setDetectedLanguage(null)
      return
    }
    const controller = new AbortController()
    detectAbortRef.current = controller
    setDetectingLanguage(true)
    const payload = JSON.stringify({ q: text })
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
  }, [canInlineTranslate, detectEndpoint, text, translationEnabled])

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
    const url = buildFallbackTranslateUrl(fallbackService, targetLanguage || 'en', text || '')
    if (!url) {
      showPlaceholder(t('skeet.actions.translate', 'Übersetzen'))
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [allowFallback, fallbackService, showPlaceholder, t, targetLanguage, text])

  const handleInlineTranslate = useCallback(async () => {
    if (!translationEnabled || !canInlineTranslate) {
      return
    }
    if (!text || !text.trim()) {
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
          q: text,
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
    text,
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

  const authorDid = author?.did || null
  const isOwnPost = Boolean(session?.did && authorDid && session.did === authorDid)
  const [deletingPost, setDeletingPost] = useState(false)

  const handleDeleteOwnPost = useCallback(async () => {
    if (!item?.uri || deletingPost) return
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
          await deletePost({ uri: item.uri })
          dispatch({ type: 'REMOVE_POST', payload: item.uri })
          setFeedbackMessage(t('skeet.actions.deletePostSuccess', 'Post gelöscht.'))
          window.setTimeout(() => setFeedbackMessage(''), 2400)
        } catch (error) {
          showMenuError(error?.message || t('skeet.actions.deletePostError', 'Post konnte nicht gelöscht werden.'))
        } finally {
          setDeletingPost(false)
        }
      }
    })
  }, [deletePost, dispatch, item?.uri, deletingPost, openConfirm, showMenuError, t])

  const menuActions = useMemo(() => {
    const base = [
      {
        key: 'copy-text',
        label: t('skeet.actions.copyText', 'Post-Text kopieren'),
        icon: CopyIcon,
        action: () => copyToClipboard(String(text || ''), t('skeet.actions.copyTextSuccess', 'Text kopiert'))
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
  }, [blockingAccount, deletingPost, handleBlockAccount, handleDeleteOwnPost, handleMuteAccount, isOwnPost, mutingAccount, showPlaceholder, t, text, copyToClipboard])

  const handleProfileClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!actorIdentifier) return
    dispatch({
      type: 'OPEN_PROFILE_VIEWER',
      actor: actorIdentifier,
      anchor: item?.uri || null
    })
  }

  const moderationHasToggle = moderationHasBlur && !moderationBlocked && !moderationNoOverride
  const moderationHeader = moderationBlocked ? (
    <div className='rounded-2xl border border-border bg-background-subtle px-3 py-3 text-sm text-foreground'>
      <p className='font-semibold text-foreground'>{t('skeet.moderation.filteredTitle', 'Ausgeblendeter Beitrag')}</p>
      <p className='mt-1 text-xs text-foreground-muted'>
        {t('skeet.moderation.filteredBody', 'Dieser Beitrag ist durch deine Moderationseinstellungen ausgeblendet.')}
      </p>
    </div>
  ) : moderationHasBlur && moderationHasWarning ? (
    <button
      type='button'
      className='w-full rounded-2xl border border-border bg-background-subtle px-3 py-3 text-left text-sm text-foreground hover:bg-background'
      onClick={moderationHasToggle ? (() => setModerationRevealed((current) => !current)) : undefined}
      aria-expanded={moderationHasToggle ? moderationRevealed : undefined}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='font-semibold text-foreground'>{t('skeet.moderation.warningTitle', 'Inhalt ausgeblendet')}</p>
          <p className='mt-1 text-xs text-foreground-muted'>
            {moderationSummary
              ? t('skeet.moderation.warningLabel', 'Label: {label}', { label: moderationSummary })
              : t('skeet.moderation.warningBody', 'Dieser Beitrag wurde wegen deiner Moderationseinstellungen ausgeblendet.')}
          </p>
        </div>
        {moderationHasToggle ? (
          <span className='text-xs font-semibold text-foreground'>
            {moderationRevealed
              ? t('skeet.moderation.hide', 'Ausblenden')
              : t('skeet.moderation.show', 'Anzeigen')}
          </span>
        ) : null}
      </div>
    </button>
  ) : moderationHasWarning ? (
    <div className='rounded-2xl border border-border bg-background-subtle px-3 py-2 text-xs text-foreground-muted'>
      {moderationSummary
        ? t('skeet.moderation.noticeLabel', 'Label: {label}', { label: moderationSummary })
        : t('skeet.moderation.noticeBody', 'Hinweis aus Moderationseinstellungen.')}
    </div>
  ) : null

  const moderationCoverAll = moderationNeedsBlur && !moderationBlocked && !moderationRevealed
  const moderationCoverMedia = moderationMediaNeedsBlur && !moderationBlocked && !moderationRevealed && !moderationCoverAll
  const moderationMutedOverlay = moderationCoverAll
    ? (
      <div className='pointer-events-none absolute inset-0 rounded-2xl bg-background/50 backdrop-blur-md' />
    )
    : null
  const moderationMediaOverlay = moderationCoverMedia
    ? <div className='pointer-events-none absolute inset-0 rounded-xl bg-background' />
    : null
  const moderationHideMedia = moderationCoverMedia

  const body = (
    <>
      {!moderationBlocked ? (
        <div className='relative'>
          <div className={moderationCoverAll ? 'pointer-events-none select-none' : ''}>
            {contextLabel ? (
              <p className='mb-2 text-xs font-semibold text-foreground-muted'>{contextLabel}</p>
            ) : null}
            <header className='flex items-center gap-3'>
            <button type='button' onClick={handleProfileClick} className='inline-flex rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'>
              <ProfilePreviewTrigger actor={actorIdentifier} fallback={author}>
                {author.avatar ? (
                  <img src={author.avatar} alt='' className='h-10 w-10 shrink-0 rounded-full border border-border object-cover' />
                ) : (
                  <div className='h-10 w-10 shrink-0 rounded-full border border-border bg-background-subtle' />
                )}
              </ProfilePreviewTrigger>
            </button>
            <div className='min-w-0 flex-1'>
              <ActorProfileLink
                actor={actorIdentifier}
                handle={author?.handle || ''}
                anchor={item?.uri || null}
                className='inline-flex max-w-full flex-col min-w-0 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
              >
                <span className='inline-flex flex-col text-left'>
                  <span className='truncate font-semibold text-foreground'>{author.displayName || author.handle}</span>
                  {author.handle ? (
                    <span className='truncate text-sm text-foreground-muted'>@{author.handle}</span>
                  ) : null}
                </span>
              </ActorProfileLink>
            </div>
            <div className='ml-auto flex items-center gap-1'>
              {createdAt ? (
                <time className='whitespace-nowrap text-xs text-foreground-muted' dateTime={createdAt}>
                  {timeLabel}
                </time>
              ) : null}
            </div>
          </header>
            <div className='mt-3 text-sm text-foreground'>
              <RichText
                text={text}
                facets={item?.raw?.post?.record?.facets}
                className='whitespace-pre-wrap break-words'
                hashtagContext={{ authorHandle: author?.handle, authorDid: author?.did }}
                disableHashtagMenu={disableHashtagMenu}
              />
            </div>
            {moderationHeader ? (
              <div className='mt-3'>{moderationHeader}</div>
            ) : null}
            {translationResult ? (
            <div className='mt-3 rounded-2xl border border-border bg-background-subtle/60 p-3 text-sm text-foreground' data-component='BskyTranslationPreview'>
              <div className='mb-1 flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-foreground-muted'>
                <span>{t('skeet.translation.title', 'Übersetzung')}</span>
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

          {quoted && !moderationBlocked ? (
        <div
          className={`mt-3 rounded-2xl border border-border bg-background-subtle px-3 py-3 text-sm text-foreground opacity-70 ${
            quoteClickable
              ? 'cursor-pointer transition hover:bg-background-subtle/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
              : ''
          }`}
          data-component='BskyQuoteCard'
          role={quoteClickable ? 'button' : undefined}
          tabIndex={quoteClickable ? 0 : undefined}
          onClick={quoteClickable ? handleSelectQuoted : undefined}
          onKeyDown={
            quoteClickable
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    handleSelectQuoted(event)
                  }
                }
              : undefined
          }
        >
          {quotedStatusMessage ? (
            <p className='text-sm text-foreground-muted'>{quotedStatusMessage}</p>
          ) : (
            <div className='flex items-start gap-3'>
              {quoted.author?.avatar ? (
                <img src={quoted.author.avatar} alt='' className='h-10 w-10 shrink-0 rounded-full border border-border object-cover' />
              ) : (
                <div className='h-10 w-10 shrink-0 rounded-full border border-border bg-background-subtle' />
              )}
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-semibold text-foreground'>{quotedAuthorLabel}</p>
                    {quotedAuthorMissing ? (
                      <p className='text-xs text-foreground-muted'>{t('skeet.quote.authorMissing', 'Autorinformationen wurden nicht mitgeliefert.')}</p>
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
                {quoted.text ? (
                  <div className='mt-2 text-sm text-foreground'>
                    <RichText
                      text={quoted.text}
                      facets={quoted?.raw?.record?.facets}
                      className='whitespace-pre-wrap break-words text-sm text-foreground'
                      hashtagContext={{ authorHandle: quoted?.author?.handle, authorDid: quoted?.author?.did }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
          ) : null}

          {images.length > 0 && !moderationBlocked && !moderationCoverMedia ? (
        <div className='mt-3' data-component='BskySkeetImages'>
          {images.length === 1 ? (
            <div
              role={moderationCoverAll || moderationCoverMedia ? undefined : 'button'}
              tabIndex={moderationCoverAll || moderationCoverMedia ? undefined : 0}
              className={`group block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 ${
                moderationCoverAll || moderationCoverMedia ? 'cursor-default' : 'cursor-zoom-in'
              }`}
              onClick={moderationCoverAll || moderationCoverMedia
                ? undefined
                : (event) => handleMediaPreview(event, images[0].mediaIndex ?? 0)}
              onKeyDown={moderationCoverAll || moderationCoverMedia
                ? undefined
                : (event) => handleMediaKeyDown(event, images[0].mediaIndex ?? 0)}
              aria-label={t('skeet.media.imageOpen', 'Bild vergrößert anzeigen')}
            >
              <div
                className='relative w-full overflow-hidden rounded-xl border border-border'
                style={getImageContainerStyle(images[0], { single: true })}
              >
                <img
                  src={images[0].src}
                  alt={images[0].alt || ''}
                  className={`h-full w-full object-contain${moderationHideMedia ? ' opacity-0' : ''}`}
                  loading='lazy'
                />
                {moderationMediaOverlay}
              </div>
            </div>
          ) : (
            <div className='grid gap-2'
              style={{ gridTemplateColumns: images.length === 2 ? '1fr 1fr' : '1fr 1fr' }}
            >
              {images.map((im, idx) => (
                <div
                  key={idx}
                  role={moderationCoverAll || moderationCoverMedia ? undefined : 'button'}
                  tabIndex={moderationCoverAll || moderationCoverMedia ? undefined : 0}
                  className={`rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 ${
                    moderationCoverAll || moderationCoverMedia ? 'cursor-default' : 'cursor-zoom-in'
                  }`}
                  onClick={moderationCoverAll || moderationCoverMedia
                    ? undefined
                    : (event) => handleMediaPreview(event, im.mediaIndex ?? idx)}
                  onKeyDown={moderationCoverAll || moderationCoverMedia
                    ? undefined
                    : (event) => handleMediaKeyDown(event, im.mediaIndex ?? idx)}
                  aria-label={t('skeet.media.imageOpen', 'Bild vergrößert anzeigen')}
                >
                  <div
                    className='relative w-full overflow-hidden rounded-xl border border-border'
                    style={getImageContainerStyle(im, { single: false })}
                  >
                    <img
                      src={im.src}
                      alt={im.alt || ''}
                      className={`h-full w-full object-contain${moderationHideMedia ? ' opacity-0' : ''}`}
                      loading='lazy'
                    />
                    {moderationMediaOverlay}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          ) : null}

          {videos.length > 0 && !moderationBlocked ? (
        <div className='mt-3 space-y-2' data-component='BskySkeetVideos'>
          {videos.map((video, index) => {
            const singleMediaMax = config?.singleMax ?? 360
            const previewStyle = getImageContainerStyle(
              { aspectRatio: parseAspectRatioValue(video.aspectRatio), type: 'video' },
              { single: true }
            )
            const containerStyle = {
              ...previewStyle,
              width: '100%',
              maxHeight: singleMediaMax,
              backgroundColor: 'var(--background-subtle, #000)'
            }
            const inlineKey = String(video.mediaIndex ?? video.src ?? index)
            const inlineOpen = inlineVideoOpen.has(inlineKey)
            const canInline = inlineVideoUploads && !moderationCoverAll && !moderationCoverMedia
            const handleInlineOpen = (event) => {
              if (!canInline) return
              event?.preventDefault()
              event?.stopPropagation()
              handleOpenInlineVideo(inlineKey)
            }
            const handleMediaClick = (event) => {
              if (moderationCoverAll || moderationCoverMedia) return
              if (canInline) {
                handleInlineOpen(event)
                return
              }
              handleMediaPreview(event, video.mediaIndex ?? 0)
            }
            const handleMediaKeyDown = (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleMediaClick(event)
              }
            }
            if (canInline && inlineOpen) {
              const setInlineRef = (node) => {
                if (node) {
                  inlineVideoRefs.current.set(inlineKey, node)
                } else {
                  inlineVideoRefs.current.delete(inlineKey)
                }
              }
              return (
                <div
                  key={video.mediaIndex ?? video.src}
                  ref={setInlineRef}
                  className='space-y-2 rounded-xl border border-border bg-background-subtle p-3'
                >
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-sm font-semibold text-foreground'>
                      {t('skeet.media.videoLabel', 'Video')}
                    </p>
                    <button
                      type='button'
                      className='rounded-full border border-border px-2 py-1 text-xs text-foreground-muted hover:text-foreground'
                      onClick={() => handleCloseInlineVideo(inlineKey)}
                    >
                      {t('common.actions.close', 'Schließen')}
                    </button>
                  </div>
                  <div
                    className='relative w-full overflow-hidden rounded-lg border border-border bg-black'
                    style={{ aspectRatio: parseAspectRatioValue(video.aspectRatio) || (16 / 9) }}
                  >
                    <InlineVideoPlayer
                      src={video.src}
                      poster={video.poster}
                      autoPlay
                      className='absolute inset-0 h-full w-full'
                    />
                  </div>
                </div>
              )
            }
            return (
              <button
                key={video.mediaIndex ?? video.src}
                type='button'
                className='relative block w-full overflow-hidden rounded-xl border border-border bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
                onClick={moderationCoverAll || moderationCoverMedia ? undefined : handleMediaClick}
                onKeyDown={moderationCoverAll || moderationCoverMedia ? undefined : handleMediaKeyDown}
                title={t('skeet.media.videoOpen', 'Video öffnen')}
                aria-label={t('skeet.media.videoOpen', 'Video öffnen')}
              >
                <div
                  className='relative w-full overflow-hidden rounded-xl'
                  style={containerStyle}
                >
                  {video.poster ? (
                    <img
                      src={video.poster}
                      alt={video.alt || ''}
                      className={`h-full w-full object-contain opacity-80${moderationHideMedia ? ' opacity-0' : ''}`}
                      loading='lazy'
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-black/80 to-gray-800 text-white'>
                      <span className='text-sm uppercase tracking-wide'>{t('skeet.media.videoLabel', 'Video')}</span>
                    </div>
                  )}
                  <span className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                    <span className='flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white'>
                      <TriangleRightIcon className='h-6 w-6 translate-x-[1px]' />
                    </span>
                  </span>
                  {moderationMediaOverlay}
                </div>
              </button>
            )
          })}
        </div>
          ) : null}

          {external && mediaItems.length === 0 && !moderationBlocked ? (
        youtubePreview ? (
          inlineVideoExternal ? (
            youtubeInlineOpen ? (
              <div ref={youtubeInlineRef} className='mt-3 space-y-2 rounded-xl border border-border bg-background-subtle p-3'>
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-sm font-semibold text-foreground'>
                    {youtubePreview.title || external.title || 'YouTube'}
                  </p>
                  <button
                    type='button'
                    className='rounded-full border border-border px-2 py-1 text-xs text-foreground-muted hover:text-foreground'
                    onClick={() => setYoutubeInlineOpen(false)}
                  >
                    {t('common.actions.close', 'Schließen')}
                  </button>
                </div>
                <div className='relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black'>
                  <iframe
                    src={buildYoutubeEmbedUrl(youtubePreview.id, { autoplay: true })}
                    title={youtubePreview.title || external.title || 'YouTube'}
                    className='absolute inset-0 h-full w-full'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                    loading='lazy'
                  />
                </div>
                {youtubePreview.url ? (
                  <a
                    href={youtubePreview.url}
                    target='_blank'
                    rel='noopener noreferrer nofollow'
                    className='text-xs text-foreground-muted underline underline-offset-2 hover:text-foreground'
                  >
                    {t('skeet.media.openOriginal', 'Original öffnen')}
                  </a>
                ) : null}
              </div>
            ) : (
              <div className='mt-3 rounded-xl border border-border bg-background-subtle p-3 transition hover:bg-background-subtle/80 dark:hover:bg-primary/10 hover:shadow-sm'>
                <button
                  type='button'
                  className='flex w-full gap-3 text-left'
                  onClick={() => setYoutubeInlineOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      setYoutubeInlineOpen(true)
                    }
                  }}
                >
                  <div className='relative h-20 w-28 shrink-0'>
                    <span className='absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white'>
                      YouTube
                    </span>
                    {youtubePreview.thumb ? (
                      <img
                        src={youtubePreview.thumb}
                        alt=''
                        className='h-full w-full rounded-lg border border-border object-cover'
                        loading='lazy'
                      />
                    ) : (
                      <div className='flex h-full w-full items-center justify-center rounded-lg border border-border bg-black/70 text-xs font-semibold text-white'>
                        YouTube
                      </div>
                    )}
                  </div>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-foreground'>{youtubePreview.title || external.title}</p>
                    {external.description ? (
                      <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{external.description}</p>
                    ) : null}
                    <p className='mt-1 text-xs text-foreground-subtle'>{youtubePreview.domain || external.domain}</p>
                    <p className='mt-2 text-xs font-semibold text-primary'>
                      {t('skeet.media.youtubeInlineHint', 'Klicken zum Abspielen')}
                    </p>
                  </div>
                </button>
              </div>
            )
          ) : (
            <a
              href={youtubePreview.url || external.uri}
              target='_blank'
              rel='noopener noreferrer nofollow'
              className='mt-3 block rounded-xl border border-border bg-background-subtle hover:bg-background-subtle/80 transition'
              data-component='BskyExternalCard'
            >
              <div className='flex items-start gap-3 p-3'>
                {youtubePreview.thumb ? (
                  <img
                    src={youtubePreview.thumb}
                    alt=''
                    className='h-20 w-28 shrink-0 rounded-lg border border-border object-cover'
                    loading='lazy'
                  />
                ) : null}
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold text-foreground'>{youtubePreview.title || external.title}</p>
                  {external.description ? (
                    <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{external.description}</p>
                  ) : null}
                  <p className='mt-1 text-xs text-foreground-subtle'>{youtubePreview.domain || external.domain}</p>
                </div>
              </div>
            </a>
          )
        ) : (
          gifPreview && typeof onViewMedia === 'function'
            ? autoPlayGifs
              ? (
                <div className='mt-3 rounded-xl border border-border bg-background-subtle p-3'>
                  <button
                    type='button'
                    className='flex w-full gap-3 text-left'
                    onClick={handleExternalMediaPreview}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        handleExternalMediaPreview(event)
                      }
                    }}
                  >
                    <div className='relative h-20 w-28 shrink-0'>
                      <span className='absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white'>
                        {t('skeet.media.gifBadge', 'GIF')}
                      </span>
                      <img
                        src={gifPreview.src}
                        alt={gifPreview.alt}
                        className='h-full w-full rounded-lg border border-border object-cover'
                        loading='lazy'
                      />
                    </div>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-foreground'>{gifPreview.title || external.title}</p>
                      {external.description ? (
                        <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{external.description}</p>
                      ) : null}
                      <p className='mt-1 text-xs text-foreground-subtle'>{gifPreview.domain || external.domain}</p>
                      <p className='mt-2 text-xs font-semibold text-primary'>
                        {t('skeet.media.gifHint', 'Klicken zum Anzeigen')}
                      </p>
                    </div>
                  </button>
                  {gifPreview.originalUrl ? (
                    <a
                      href={gifPreview.originalUrl}
                      target='_blank'
                      rel='noopener noreferrer nofollow'
                      className='text-xs text-foreground-muted underline underline-offset-2 hover:text-foreground'
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t('skeet.media.openOriginal', 'Original öffnen')}
                    </a>
                  ) : null}
                </div>
                )
              : (
                <div
                  className='mt-3 space-y-2 rounded-xl border border-border bg-background-subtle p-3 transition hover:bg-background-subtle/80 dark:hover:bg-primary/10 hover:shadow-sm focus-within:outline focus-within:outline-2 focus-within:outline-primary/70'
                >
                  <button
                    type='button'
                    className='flex w-full gap-3 text-left'
                    onClick={handleExternalMediaPreview}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        handleExternalMediaPreview(event)
                      }
                    }}
                  >
                    {gifPreview.thumb ? (
                      <div className='relative h-20 w-28 shrink-0'>
                        <span className='absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white'>
                          {t('skeet.media.gifBadge', 'GIF')}
                        </span>
                        <img
                          src={gifPreview.thumb}
                          alt=''
                          className='h-full w-full rounded-lg border border-border object-cover'
                          loading='lazy'
                        />
                      </div>
                    ) : null}
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-foreground'>{gifPreview.title || external.title}</p>
                      {external.description ? (
                        <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{external.description}</p>
                      ) : null}
                      <p className='mt-1 text-xs text-foreground-subtle'>{gifPreview.domain || external.domain}</p>
                      <p className='mt-2 text-xs font-semibold text-primary'>
                        {t('skeet.media.gifHint', 'Klicken zum Anzeigen')}
                      </p>
                    </div>
                  </button>
                  {gifPreview.originalUrl ? (
                    <a
                      href={gifPreview.originalUrl}
                      target='_blank'
                      rel='noopener noreferrer nofollow'
                      className='text-xs text-foreground-muted underline underline-offset-2 hover:text-foreground'
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t('skeet.media.openOriginal', 'Original öffnen')}
                    </a>
                  ) : null}
                </div>
                )
            : (
              <a
                href={external.uri}
                target='_blank'
                rel='noopener noreferrer nofollow'
                className='mt-3 block rounded-xl border border-border bg-background-subtle hover:bg-background-subtle/80 transition'
                data-component='BskyExternalCard'
              >
                <div className='flex items-start gap-3 p-3'>
                  {external.thumb ? (
                    <img
                      src={external.thumb}
                      alt=''
                      className='h-20 w-28 shrink-0 rounded-lg border border-border object-cover'
                      loading='lazy'
                    />
                  ) : null}
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-foreground'>{external.title}</p>
                    {external.description ? (
                      <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{external.description}</p>
                    ) : null}
                    <p className='mt-1 text-xs text-foreground-subtle'>{external.domain}</p>
                  </div>
                </div>
              </a>
              )
        )
          ) : null}
          </div>
          {moderationMutedOverlay}
        </div>
      ) : null}
    </>
  )

  return (
    <Wrapper className={wrapperClassName} data-variant={variant} data-component='BskySkeetItem' {...wrapperProps}>
      {typeof onSelect === 'function' ? (
        <div
          role='button'
          tabIndex={0}
          className='-mx-1 rounded-xl px-1 py-0.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70 hover:bg-background-subtle/50 dark:hover:bg-primary/10 hover:shadow-sm cursor-pointer' 
          onClick={handleSelect}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              handleSelect(event)
            }
          }}
        >
          {body}
        </div>
      ) : body}
      {showActions && !moderationBlocked ? (
        <>
          <footer className='mt-3 flex flex-wrap items-center gap-3 text-sm text-foreground-muted sm:gap-5'>
            <button
              type='button'
              className='group inline-flex items-center gap-2 hover:text-foreground transition'
              title={t('skeet.actions.reply', 'Antworten')}
              onClick={() => {
                if (typeof onReply === 'function') {
                  handleMarkRead()
                  clearError()
                  onReply(item)
                }
              }}
            >
              <ChatBubbleIcon className='h-5 w-5 md:h-6 md:w-6' />
              <span className='tabular-nums'>{replyCountStat}</span>
            </button>
            <RepostMenuButton
              count={repostCount}
              hasReposted={hasReposted}
              hasQuoted={Boolean(quotePostUri)}
              busy={busy || quoteBusy}
              style={repostStyle}
              onRepost={() => {
                handleMarkRead()
                handleToggleRepost()
              }}
              onUnrepost={() => {
                handleMarkRead()
                handleToggleRepost()
              }}
              onUnquote={quotePostUri ? handleUndoQuote : undefined}
              onQuote={onQuote ? (() => {
                handleMarkRead()
                clearError()
                onQuote(item)
              }) : undefined}
            />
            <button
              type='button'
              className={`group inline-flex items-center gap-2 transition ${busy ? 'opacity-60' : ''}`}
              style={likeStyle}
              title={t('skeet.actions.like', 'Gefällt mir')}
              aria-pressed={hasLiked}
              disabled={busy}
              onClick={() => {
                handleMarkRead()
                handleToggleLike()
              }}
            >
              {hasLiked ? (
                <HeartFilledIcon className='h-5 w-5 md:h-6 md:w-6' />
              ) : (
                <HeartIcon className='h-5 w-5 md:h-6 md:w-6' />
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
                onClick={() => {
                  handleMarkRead()
                  handleToggleBookmark()
                }}
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
                    onClick={handleMarkRead}
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
                        handleMarkRead()
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
                        handleMarkRead()
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
                        handleMarkRead()
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
                  title={
                    translationResult
                      ? t('skeet.translation.close', 'Schließen')
                      : (translating && canInlineTranslate
                        ? t('skeet.actions.translating', 'Übersetze…')
                        : t('skeet.actions.translate', 'Übersetzen'))
                  }
                  aria-label={translationResult ? t('skeet.translation.close', 'Schließen') : t('skeet.actions.translate', 'Übersetzen')}
                  onClick={(event) => {
                    handleMarkRead()
                    if (translationResult) {
                      handleClearTranslation()
                      return
                    }
                    handleTranslateAction(event)
                  }}
                  disabled={translateButtonDisabled}
                >
                  {translating && canInlineTranslate && !translationResult ? (
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
                    onClick={handleMarkRead}
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
                            handleMarkRead()
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
        </>
      ) : null}
      {moderationLoading ? (
        <p className='mt-2 text-xs text-foreground-muted'>{t('skeet.moderation.loading', 'Moderation wird geladen…')}</p>
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
    </Wrapper>
  )
}
