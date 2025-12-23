import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bsky-client-config:v1'
const SUPPORTED_LOCALES = ['de', 'en']
const DEFAULT_CONFIG = {
  locale: 'de',
  gifs: { tenorAvailable: false, tenorApiKey: '' },
  search: { advancedPrefixes: null, prefixHints: null },
  unroll: { showDividers: true },
  translation: { enabled: null, baseUrl: '', allowGoogle: true, fallbackService: 'google' },
  composer: { showReplyPreview: true },
  layout: {
    autoPlayGifs: false,
    inlineVideo: false,
    requireAltText: false,
    videoAllowListEnabled: true,
    videoAllowList: ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'tiktok.com'],
    timeFormat: 'relative'
  }
}

let currentConfig = null
const subscribers = new Set()

const subscribe = (listener) => {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

const readFromStorage = () => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG
    return parsed
  } catch {
    return DEFAULT_CONFIG
  }
}

const normalizeConfig = (input = {}) => {
  const legacyLayout = input?.layout || {}
  const legacyInlineVideo = legacyLayout?.inlineYoutube
  const legacyAllowList = legacyLayout?.youtubeAllowList
  const next = {
    ...DEFAULT_CONFIG,
    ...(input || {}),
    locale: input?.locale,
    gifs: { ...DEFAULT_CONFIG.gifs, ...(input?.gifs || {}) },
    search: { ...DEFAULT_CONFIG.search, ...(input?.search || {}) },
    unroll: { ...DEFAULT_CONFIG.unroll, ...(input?.unroll || {}) },
    translation: { ...DEFAULT_CONFIG.translation, ...(input?.translation || {}) },
    composer: { ...DEFAULT_CONFIG.composer, ...(input?.composer || {}) },
    layout: { ...DEFAULT_CONFIG.layout, ...(input?.layout || {}) }
  }
  if (next.search.advancedPrefixes && !Array.isArray(next.search.advancedPrefixes)) {
    next.search.advancedPrefixes = null
  }
  if (next.search.prefixHints && (typeof next.search.prefixHints !== 'object' || Array.isArray(next.search.prefixHints))) {
    next.search.prefixHints = null
  }
  next.gifs.tenorAvailable = Boolean(next.gifs.tenorAvailable)
  next.gifs.tenorApiKey = typeof next.gifs.tenorApiKey === 'string' ? next.gifs.tenorApiKey.trim() : ''
  next.unroll.showDividers = next.unroll.showDividers !== false
  const enabledFlag = next.translation.enabled
  if (enabledFlag !== true && enabledFlag !== false) {
    next.translation.enabled = null
  }
  next.translation.baseUrl = typeof next.translation.baseUrl === 'string'
    ? next.translation.baseUrl.trim()
    : ''
  next.translation.allowGoogle = next.translation.allowGoogle !== false
  const rawFallback = typeof next.translation.fallbackService === 'string'
    ? next.translation.fallbackService.trim().toLowerCase()
    : ''
  const fallbackOptions = new Set(['google', 'deepl', 'bing', 'yandex', 'none'])
  if (fallbackOptions.has(rawFallback)) {
    next.translation.fallbackService = rawFallback
  } else {
    next.translation.fallbackService = next.translation.allowGoogle ? 'google' : 'none'
  }
  next.composer.showReplyPreview = next.composer.showReplyPreview !== false
  next.layout.autoPlayGifs = next.layout.autoPlayGifs === true
  if (next.layout.inlineVideo === undefined && legacyInlineVideo !== undefined) {
    next.layout.inlineVideo = legacyInlineVideo
  }
  next.layout.inlineVideo = next.layout.inlineVideo === true
  next.layout.requireAltText = next.layout.requireAltText === true
  if (next.layout.videoAllowListEnabled === undefined) {
    next.layout.videoAllowListEnabled = true
  }
  next.layout.videoAllowListEnabled = next.layout.videoAllowListEnabled !== false
  if (next.layout.timeFormat !== 'absolute' && next.layout.timeFormat !== 'relative') {
    next.layout.timeFormat = DEFAULT_CONFIG.layout.timeFormat
  }
  const rawAllowList = Array.isArray(next.layout.videoAllowList)
    ? next.layout.videoAllowList
    : (Array.isArray(legacyAllowList) ? legacyAllowList : DEFAULT_CONFIG.layout.videoAllowList)
  const normalizedAllowList = rawAllowList
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter(Boolean)
  next.layout.videoAllowList = Array.from(new Set(normalizedAllowList)).slice(0, 10)
  const normalizedLocale = typeof next.locale === 'string' ? next.locale.trim().toLowerCase() : ''
  next.locale = SUPPORTED_LOCALES.includes(normalizedLocale) ? normalizedLocale : DEFAULT_CONFIG.locale
  return next
}

const getSnapshot = () => {
  if (!currentConfig) {
    currentConfig = normalizeConfig(readFromStorage())
  }
  return currentConfig
}

const updateSnapshot = (nextConfig) => {
  currentConfig = normalizeConfig(nextConfig)
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig))
    }
  } catch {
    // ignore storage errors
  }
  subscribers.forEach((listener) => listener())
}

export function useClientConfig () {
  const clientConfig = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_CONFIG)

  const setClientConfig = useCallback((patch = {}) => {
    const base = getSnapshot()
    const patchObject = typeof patch === 'function' ? patch(base) : patch
    const next = {
      ...base,
      ...(patchObject || {}),
      locale: patchObject?.locale || base.locale,
      gifs: { ...(base.gifs || {}), ...(patchObject?.gifs || {}) },
      search: { ...(base.search || {}), ...(patchObject?.search || {}) },
      unroll: { ...(base.unroll || {}), ...(patchObject?.unroll || {}) },
      translation: { ...(base.translation || {}), ...(patchObject?.translation || {}) },
      composer: { ...(base.composer || {}), ...(patchObject?.composer || {}) },
      layout: { ...(base.layout || {}), ...(patchObject?.layout || {}) }
    }
    updateSnapshot(next)
  }, [])

  return { clientConfig, setClientConfig, loading: false, error: null }
}
