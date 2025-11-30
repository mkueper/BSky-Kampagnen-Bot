import { useEffect, useState } from 'react'

/**
 * Client Hook zum Laden der Sendehistorie eines Skeets
 * @param {number|string|null} skeetId
 * @param {{ enabled?: boolean }} options
 * @returns {{ data: any[], isLoading: boolean, isError: boolean }}
 */
export function useSkeetHistory (skeetId, { enabled = true } = {}) {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const canLoad = enabled && Boolean(skeetId)
    if (!canLoad) {
      setIsLoading(false)
      setIsError(false)
      setData([])
      return undefined
    }

    const controller = new AbortController()
    let active = true

    setIsLoading(true)
    setIsError(false)

    ;(async () => {
      try {
        const res = await fetch(`/api/skeets/${skeetId}/history`, {
          signal: controller.signal
        })
        const payload = await res.json().catch(() => ([]))
        if (!res.ok) {
          const message = payload?.error || 'Sendehistorie konnte nicht geladen werden.'
          throw new Error(message)
        }
        const history = Array.isArray(payload) ? payload : []
        if (!active) return
        setData(history)
        setIsError(false)
      } catch (error) {
        if (controller.signal.aborted) return
        console.warn('useSkeetHistory: Fehler beim Laden der Sendehistorie.', error)
        if (!active) return
        setData([])
        setIsError(true)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [enabled, skeetId])

  return { data, isLoading, isError }
}

export default useSkeetHistory
