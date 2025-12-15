import { useEffect, useMemo, useState } from 'react'

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/i
const TRAILING_PUNCTUATION = /[),.;!?]+$/

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

export function useLinkPreview (text, { enabled = true, unavailableMessage = DEFAULT_UNAVAILABLE_MESSAGE } = {}) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const candidateUrl = useMemo(() => (enabled ? extractFirstUrl(text) : ''), [text, enabled])

  useEffect(() => {
    setPreviewUrl(candidateUrl)
    setPreview(null)
    setError('')
    if (!candidateUrl) {
      setLoading(false)
      return
    }

    setLoading(false)
    setError(unavailableMessage || DEFAULT_UNAVAILABLE_MESSAGE)
  }, [candidateUrl, unavailableMessage])

  return {
    previewUrl,
    preview,
    loading,
    error,
  }
}
