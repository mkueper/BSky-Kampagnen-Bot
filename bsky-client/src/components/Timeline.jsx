import { useEffect, useState } from 'react'

export default function Timeline ({ tab = 'discover' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    async function load () {
      setLoading(true)
      setError('')
      try {
        // Placeholder: will call backend proxy /api/bsky/timeline?tab=...
        if (!ignore) setItems([])
      } catch (e) {
        if (!ignore) setError(e?.message || String(e))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [tab])

  if (loading) return <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='loading'>Lade Timeline…</p>
  if (error) return <p className='text-sm text-red-600' data-component='BskyTimeline' data-state='error'>Fehler: {error}</p>
  if (items.length === 0) return <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='empty'>Noch keine Timeline geladen. Proxy-Endpunkte folgen.</p>
  return (
    <ul className='space-y-3' data-component='BskyTimeline' data-tab={tab}>
      {items.map((it) => (
        <li key={it.id} className='rounded-xl border p-3'>{it.text}</li>
      ))}
    </ul>
  )
}
