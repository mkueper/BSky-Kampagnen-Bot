import { useEffect, useMemo, useState } from 'react'
import { usePreviewProxyEndpoint } from './usePreviewProxyEndpoint'

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/i
const TRAILING_PUNCTUATION = /[),.;!?]+$/
const PREVIEW_TIMEOUT_MS = 9000

function sanitizeUrl (raw = '') {
  if (!raw) return ''
  const trimmed = raw.replace(TRAILING_PUNCTUATION, '')
  try {
    const parsed = new URL(trimmed)
    if (!/^https?:$/.test(parsed.protocol)) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

export function extractFirstUrl (text) {
  if (!text) return ''
  const match = String(text).match(URL_REGEX)
  return match ? sanitizeUrl(match[0]) : ''
}

const DEFAULT_UNAVAILABLE_MESSAGE = 'Link-Vorschau ist im Standalone-Modus derzeit nicht verfügbar.'

function buildRequestUrl (endpoint, targetUrl) {
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

export function useLinkPreview (
  text,
  {
    enabled = true,
    unavailableMessage = DEFAULT_UNAVAILABLE_MESSAGE,
    timeoutMessage = DEFAULT_UNAVAILABLE_MESSAGE
  } = {}
) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const previewEndpoint = usePreviewProxyEndpoint()

  const candidateUrl = useMemo(() => (enabled ? extractFirstUrl(text) : ''), [text, enabled])

  useEffect(() => {
    setPreviewUrl(candidateUrl)
    setPreview(null)
    setError('')
    if (!candidateUrl) {
      setLoading(false)
      return
    }

    if (!previewEndpoint) {
      setLoading(false)
      setError(unavailableMessage || DEFAULT_UNAVAILABLE_MESSAGE)
      return
    }

    const requestUrl = buildRequestUrl(previewEndpoint, candidateUrl)
    if (!requestUrl) {
      setLoading(false)
      setError(unavailableMessage || DEFAULT_UNAVAILABLE_MESSAGE)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS)
    setLoading(true)
    fetch(requestUrl, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || data.error || 'Preview request failed.')
        }
        return res.json()
      })
      .then((payload) => {
        setPreview(payload || null)
        setError('')
      })
      .catch((err) => {
        if (err?.name === 'AbortError') {
          setError(timeoutMessage || DEFAULT_UNAVAILABLE_MESSAGE)
          return
        }
        setError(err?.message || DEFAULT_UNAVAILABLE_MESSAGE)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [candidateUrl, previewEndpoint, unavailableMessage])

  return {
    previewUrl,
    preview,
    loading,
    error,
  }
}
