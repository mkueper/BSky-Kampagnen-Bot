import { useEffect, useState } from 'react'

export default function GifPicker({ open, onClose, onPick, apiKey, maxBytes = 8*1024*1024 }) {
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
    // On open, preload featured/trending items (10) if API key exists
    if (open && apiKey) {
      (async () => {
        try {
          setLoading(true)
          const params = new URLSearchParams({ key: apiKey, client_key: 'threadwriter', limit: '10', media_filter: 'gif,tinygif,nanogif' })
          const url = `https://tenor.googleapis.com/v2/featured?${params.toString()}`
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
    if (!apiKey) {
      setError('Kein Tenor API‑Key konfiguriert (VITE_TENOR_API_KEY).')
      return
    }
    const query = q.trim()
    if (!query) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        key: apiKey,
        q: query,
        client_key: 'threadwriter',
        limit: '24',
        media_filter: 'gif,tinygif,nanogif'
      })
      if (!reset && nextPos) params.set('pos', nextPos)
      const url = `https://tenor.googleapis.com/v2/search?${params.toString()}`
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
      // Many Tenor fields are numeric strings, sometimes with non-digit suffix
      const n = parseInt(val.replace(/[^0-9]/g, ''), 10)
      return Number.isFinite(n) ? n : 0
    }
    return 0
  }

  function pickVariant(v, max) {
    // Prefer smaller variants first to reduce download size.
    // Try nanogif -> tinygif -> gif, but respect maxBytes when size is known.
    const order = ['nanogif', 'tinygif', 'gif']
    for (const key of order) {
      const entry = v[key]
      if (!entry || !entry.url) continue
      const size = parseSize(entry.size)
      if (!size || size <= max) return entry
    }
    // Fallback: first available variant
    for (const key of order) {
      const entry = v[key]
      if (entry && entry.url) return entry
    }
    return null
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 'min(960px, 92vw)', maxHeight: '88vh', background: '#fff', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,.2)', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', gap: 8 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim() && !loading) { e.preventDefault(); doSearch(true) } }} placeholder="GIF suchen (Tenor)" style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }} />
          <button onClick={() => doSearch(true)} disabled={loading || !apiKey || !q.trim()} style={{ padding: '8px 12px', borderRadius: 8, background: '#0a66c2', color: '#fff', border: 'none' }}>Suchen</button>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: '#eee', border: '1px solid #ddd' }}>Schließen</button>
        </div>
        <div style={{ overflow: 'auto', padding: 12 }} aria-busy={loading}>
          {error ? <p style={{ color: '#900', fontSize: 12 }}>Fehler: {error}</p> : null}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ height: 100, background: '#f2f2f2', border: '1px solid #eee', borderRadius: 10 }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 13, color: '#666' }}>{apiKey ? 'Suchbegriff eingeben und Suchen klicken.' : 'VITE_TENOR_API_KEY fehlt.'}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {items.map((it) => (
                <button key={it.id} onClick={() => {
                  const chosen = pickVariant(it.variants, maxBytes) || {}
                  if (!chosen.url) return
                  onPick({ id: it.id, downloadUrl: chosen.url, previewUrl: it.previewUrl || chosen.url })
                }} style={{ border: '1px solid #eee', borderRadius: 10, padding: 6, background: '#fff', cursor: 'pointer' }}>
                  <img src={it.previewUrl} alt="GIF" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6 }} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#666' }}>{loading ? 'Lädt…' : `${items.length} Ergebnisse${nextPos ? '…' : ''}`}</span>
          <button onClick={() => doSearch(false)} disabled={!nextPos || loading} style={{ padding: '8px 12px', borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>Mehr laden</button>
        </div>
      </div>
    </div>
  )
}
