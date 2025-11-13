import { useEffect, useMemo, useRef, useState } from 'react'

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

export function useLinkPreview (text, { enabled = true } = {}) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  const candidateUrl = useMemo(() => (enabled ? extractFirstUrl(text) : ''), [text, enabled])

  useEffect(() => {
    setPreviewUrl(candidateUrl)
    setPreview(null)
    setError('')
    if (!candidateUrl) {
      setLoading(false)
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)

    fetch(`/api/preview?url=${encodeURIComponent(candidateUrl)}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || `Preview fehlgeschlagen (HTTP ${res.status})`)
        }
        setPreview(data || null)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err?.message || 'Preview konnte nicht geladen werden.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      })

    return () => {
      controller.abort()
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }, [candidateUrl])

  return {
    previewUrl,
    preview,
    loading,
    error,
  }
}
