import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bsky-client-config:v1'
const DEFAULT_CONFIG = {
  gifs: { tenorAvailable: false, tenorApiKey: '' },
  search: { advancedPrefixes: null, prefixHints: null },
  unroll: { showDividers: true }
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
  const next = {
    ...DEFAULT_CONFIG,
    ...(input || {}),
    gifs: { ...DEFAULT_CONFIG.gifs, ...(input?.gifs || {}) },
    search: { ...DEFAULT_CONFIG.search, ...(input?.search || {}) },
    unroll: { ...DEFAULT_CONFIG.unroll, ...(input?.unroll || {}) }
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
      gifs: { ...(base.gifs || {}), ...(patchObject?.gifs || {}) },
      search: { ...(base.search || {}), ...(patchObject?.search || {}) },
      unroll: { ...(base.unroll || {}), ...(patchObject?.unroll || {}) }
    }
    updateSnapshot(next)
  }, [])

  return { clientConfig, setClientConfig, loading: false, error: null }
}
