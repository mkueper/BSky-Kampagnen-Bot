import { useEffect, useState } from 'react'

const DEFAULT_PREVIEW_ENDPOINT = '/preview'

export function usePreviewProxyEndpoint () {
  const [endpoint, setEndpoint] = useState(DEFAULT_PREVIEW_ENDPOINT)

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()
    async function loadEndpoint () {
      try {
        const res = await fetch('/api/client-config', { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (ignore || !data) return
        if (typeof data.previewProxyUrl === 'string') {
          const trimmed = data.previewProxyUrl.trim()
          setEndpoint(trimmed || '')
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }
    loadEndpoint()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [])

  return endpoint || DEFAULT_PREVIEW_ENDPOINT
}
