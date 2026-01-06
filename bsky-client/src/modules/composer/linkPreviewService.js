const PREVIEW_TIMEOUT_MS = 9000

function createPreviewError(message, code) {
  const error = new Error(message)
  if (code) error.code = code
  return error
}

function resolvePreviewFetcher() {
  if (typeof window !== 'undefined') {
    const customFetcher = window.__BSKY_PREVIEW_FETCH__
    if (typeof customFetcher === 'function') {
      return { type: 'function', fn: customFetcher }
    }
    const runtimeEndpoint = typeof window.__BSKY_PREVIEW_ENDPOINT__ === 'string'
      ? window.__BSKY_PREVIEW_ENDPOINT__.trim()
      : ''
    if (runtimeEndpoint) {
      return { type: 'endpoint', url: runtimeEndpoint }
    }
    const storageEndpoint = readPreviewProxyFromStorage()
    if (storageEndpoint) {
      return { type: 'endpoint', url: storageEndpoint }
    }
  }
  const envEndpoint = typeof import.meta !== 'undefined' && import.meta.env
    ? String(import.meta.env.VITE_PREVIEW_PROXY_URL || '').trim()
    : ''
  if (envEndpoint) {
    return { type: 'endpoint', url: envEndpoint }
  }
  return { type: 'endpoint', url: '/preview' }
}

function readPreviewProxyFromStorage() {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage.getItem('bsky-client-config:v1')
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return ''
    const value = typeof parsed.previewProxyUrl === 'string'
      ? parsed.previewProxyUrl.trim()
      : ''
    return value
  } catch {
    return ''
  }
}

function normalizeUrl(targetUrl) {
  if (!targetUrl) return ''
  try {
    const parsed = new URL(targetUrl)
    if (!/^https?:$/.test(parsed.protocol)) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function buildRequestUrl(endpoint, targetUrl) {
  if (!endpoint) return ''
  try {
    const baseOrigin = (typeof window !== 'undefined' && window.location?.origin)
      ? window.location.origin
      : 'http://localhost'
    const baseUrl = new URL(endpoint, baseOrigin)
    baseUrl.searchParams.set('url', targetUrl)
    return baseUrl.toString()
  } catch {
    return ''
  }
}

function normalizePreviewPayload(payload, fallbackUrl) {
  if (!payload || typeof payload !== 'object') {
    return {
      uri: fallbackUrl,
      title: '',
      description: '',
      image: '',
      domain: ''
    }
  }
  return {
    uri: payload.uri || fallbackUrl,
    title: payload.title || '',
    description: payload.description || '',
    image: payload.image || '',
    domain: payload.domain || ''
  }
}

export async function fetchLinkPreviewMetadata(targetUrl) {
  const normalizedUrl = normalizeUrl(targetUrl)
  if (!normalizedUrl) {
    throw createPreviewError('Ungültige URL.', 'PREVIEW_INVALID_URL')
  }

  const config = resolvePreviewFetcher()
  if (!config) {
    throw createPreviewError('Preview service unavailable.', 'PREVIEW_UNAVAILABLE')
  }

  if (config.type === 'function') {
    const result = await config.fn(normalizedUrl)
    return normalizePreviewPayload(result, normalizedUrl)
  }

  const requestUrl = buildRequestUrl(config.url, normalizedUrl)
  if (!requestUrl) {
    throw createPreviewError('Preview endpoint misconfigured.', 'PREVIEW_UNAVAILABLE')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS)
  try {
    const response = await fetch(requestUrl, { signal: controller.signal })
    if (!response.ok) {
      throw createPreviewError(`Preview request failed (${response.status})`, 'PREVIEW_HTTP_ERROR')
    }
    const payload = await response.json()
    return normalizePreviewPayload(payload, normalizedUrl)
  } catch (error) {
    if (error?.code) throw error
    if (error?.name === 'AbortError') {
      throw createPreviewError('Preview request timed out.', 'PREVIEW_TIMEOUT')
    }
    throw createPreviewError(error?.message || 'Preview request failed.', 'PREVIEW_ERROR')
  } finally {
    clearTimeout(timeout)
  }
}

export function hasPreviewFetcher() {
  return Boolean(resolvePreviewFetcher())
}
