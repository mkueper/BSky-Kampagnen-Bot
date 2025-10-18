import { useEffect, useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'

export default function GifPicker({ open, onClose, onPick, maxBytes = 8 * 1024 * 1024 }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nextPos, setNextPos] = useState(null)

  useEffect(() => {
    if (!open) {
      setQ('')
      setItems([])
      setLoading(false)
      setError('')
      setNextPos(null)
    }
    // Preload featured GIFs (10) on open via backend proxy
    if (open) {
      (async () => {
        try {
          setLoading(true)
          const params = new URLSearchParams({ limit: '10' })
          const url = `/api/tenor/featured?${params.toString()}`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            const results = Array.isArray(data?.results) ? data.results : []
            const mapped = results.map((r) => {
              const mf = r.media_formats || {}
              const tiny = mf.tinygif || mf.nanogif || mf.gif
              const gif = mf.gif || mf.tinygif || mf.nanogif
              return { id: r.id, previewUrl: tiny?.url || gif?.url, variants: { gif: mf.gif || null, tinygif: mf.tinygif || null, nanogif: mf.nanogif || null } }
            })
            setItems(mapped)
            setNextPos(data?.next || null)
            setError('')
          }
        } catch (e) {
          // ignore preload errors
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [open])

  async function doSearch(reset = true) {
    const query = q.trim()
    if (!query) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '24'
      })
      if (!reset && nextPos) params.set('pos', nextPos)
      const url = `/api/tenor/search?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const results = Array.isArray(data?.results) ? data.results : []
      const mapped = results.map((r) => {
        const mf = r.media_formats || {}
        const tiny = mf.tinygif || mf.nanogif || mf.gif
        const gif = mf.gif || mf.tinygif || mf.nanogif
        return {
          id: r.id,
          previewUrl: tiny?.url || gif?.url,
          variants: {
            gif: mf.gif || null,
            tinygif: mf.tinygif || null,
            nanogif: mf.nanogif || null,
          }
        }
      })
      setItems((s) => (reset ? mapped : s.concat(mapped)))
      setNextPos(data?.next || null)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  function parseSize(val) {
    if (val == null) return 0
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const n = parseInt(val.replace(/[^0-9]/g, ''), 10)
      return Number.isFinite(n) ? n : 0
    }
    return 0
  }

  function pickVariant(v, max) {
    const order = ['nanogif', 'tinygif', 'gif']
    for (const key of order) {
      const entry = v[key]
      if (!entry || !entry.url) continue
      const size = parseSize(entry.size)
      if (!size || size <= max) return entry
    }
    for (const key of order) {
      const entry = v[key]
      if (entry && entry.url) return entry
    }
    return null
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title='GIF suchen (Tenor)'
      actions={(
        <>
          <Button variant='secondary' onClick={onClose}>Schließen</Button>
          <Button variant='primary' onClick={() => doSearch(true)} disabled={loading || !q.trim()}>Suchen</Button>
        </>
      )}
    >
      <div className='space-y-3'>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && q.trim() && !loading) { e.preventDefault(); doSearch(true) } }}
          placeholder='Suchbegriff'
          className='w-full rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground'
        />
        {error ? <p className='text-sm text-destructive'>Fehler: {error}</p> : null}
        {loading ? (
          <div className='grid grid-cols-2 gap-2 md:grid-cols-4' aria-busy='true'>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className='h-32 w-full animate-pulse rounded-xl border border-border bg-background-subtle' />
            ))}
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
            {items.map((it) => (
              <button key={it.id} type='button' className='overflow-hidden rounded-xl border border-border bg-background-subtle' onClick={() => {
                const chosen = pickVariant(it.variants, maxBytes) || {}
                if (!chosen.url) return
                onPick?.({ id: it.id, downloadUrl: chosen.url, previewUrl: it.previewUrl || chosen.url })
              }}>
                <img src={it.previewUrl} alt='GIF' className='h-32 w-full object-cover' />
              </button>
            ))}
          </div>
        )}
        <div className='flex justify-end'>
          <div className='mr-auto text-xs text-foreground-muted'>{loading ? 'Lädt…' : null}</div>
          <Button variant='secondary' onClick={() => doSearch(false)} disabled={!nextPos || loading}>Mehr laden</Button>
        </div>
        {/* Hinweis entfällt: Key liegt serverseitig */}
      </div>
    </Modal>
  )
}
