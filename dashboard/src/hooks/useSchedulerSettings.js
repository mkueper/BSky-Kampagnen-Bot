import { useEffect, useState } from 'react'

export function useSchedulerSettings () {
  const [randomOffsetMinutes, setRandomOffsetMinutes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function load () {
      try {
        const res = await fetch('/api/settings/scheduler')
        if (!res.ok) {
          throw new Error('Scheduler settings unavailable')
        }
        const data = await res.json()
        const value =
          data?.values?.randomOffsetMinutes ?? data?.defaults?.randomOffsetMinutes ?? 0
        if (alive) {
          setRandomOffsetMinutes(Number.isFinite(Number(value)) ? Number(value) : 0)
        }
      } catch {
        if (alive) {
          setRandomOffsetMinutes(0)
        }
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  return { randomOffsetMinutes, loading }
}
