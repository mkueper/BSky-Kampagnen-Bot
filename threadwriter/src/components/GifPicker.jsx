import { useCallback, useEffect, useRef, useState } from 'react'

export default function GifPicker({ open, onClose, onPick, browserKey: propBrowserKey, maxBytes = 8 * 1024 * 1024 }) {
  const browserKey = (propBrowserKey ?? import.meta.env.VITE_TENOR_API_KEY) || ''
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [paging, setPaging] = useState({ mode: 'featured', query: '', pos: null, source: null })
  const listRef = useRef(null)

  const mapResults = useCallback((results) => results.map((r) => {
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
  }), [])

  const fetchPage = useCallback(async ({ mode, query = '', pos = null, sourceHint = null }) => {
    const limit = mode === 'featured' ? '24' : '48'
    const params = new URLSearchParams({ limit })
    if (pos) params.set('pos', pos)
    if (mode === 'search' && query) params.set('q', query)
    const endpoint = mode === 'featured' ? 'featured' : 'search'

    let data = null
    let usedSource = null

    if (sourceHint !== 'direct') {
      try {
        const url = `/api/tenor/${endpoint}?${params.toString()}`
        const res = await fetch(url)
        if (res.ok) {
          data = await res.json()
          usedSource = 'proxy'
        }
      } catch {}
    }

    if (!data && browserKey) {
      const params2 = new URLSearchParams({
        key: browserKey,
        client_key: 'threadwriter',
        limit,
        media_filter: 'gif,tinygif,nanogif'
      })
      if (pos) params2.set('pos', pos)
      if (mode === 'search' && query) params2.set('q', query)
      const url2 = `https://tenor.googleapis.com/v2/${endpoint}?${params2.toString()}`
      const res2 = await fetch(url2)
      if (!res2.ok) {
        const errText = await res2.text().catch(() => '')
        throw new Error(`Tenor nicht erreichbar (HTTP ${res2.status}${errText ? ` · ${errText}` : ''})`)
      }
      data = await res2.json()
      usedSource = 'direct'
    }

    if (!data) {
      throw new Error('Tenor nicht erreichbar. Backend‑Proxy oder Browser‑Key nötig.')
    }

    const results = Array.isArray(data?.results) ? data.results : []
    const next = typeof data?.next === 'string' && data.next ? data.next : null
    return { items: mapResults(results), next, source: usedSource || sourceHint || null }
  }, [browserKey, mapResults])

  useEffect(() => {
    if (!open) {
      setQ('')
      setItems([])
      setLoading(false)
      setLoadingMore(false)
      setError('')
      setHasMore(false)
      setPaging({ mode: 'featured', query: '', pos: null, source: null })
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetchPage({ mode: 'featured', pos: null })
        if (cancelled) return
        setItems(res.items)
        setPaging({ mode: 'featured', query: '', pos: res.next, source: res.source })
        setHasMore(Boolean(res.next))
      } catch (e) {
        if (!cancelled) {
          setItems([])
          setPaging({ mode: 'featured', query: '', pos: null, source: null })
          setHasMore(false)
          setError(e?.message || String(e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, fetchPage])

  async function doSearch() {
    const query = q.trim()
    if (!query) return
    setLoading(true)
    setError('')
    setHasMore(false)
    try {
      const res = await fetchPage({ mode: 'search', query, pos: null })
      setItems(res.items)
      setPaging({ mode: 'search', query, pos: res.next, source: res.source })
      setHasMore(Boolean(res.next))
    } catch (e) {
      setError(e?.message || String(e))
      setItems([])
      setPaging({ mode: 'search', query, pos: null, source: null })
    } finally {
      setLoading(false)
    }
  }

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return
    if (!hasMore) return
    if (!paging.pos) return
    setLoadingMore(true)
    try {
      const res = await fetchPage({ mode: paging.mode, query: paging.query, pos: paging.pos, sourceHint: paging.source })
      setItems((prev) => prev.concat(res.items))
      setPaging((prev) => ({
        mode: prev.mode,
        query: prev.query,
        pos: res.next,
        source: res.source || prev.source
      }))
      setHasMore(Boolean(res.next))
    } catch (e) {
      setError(e?.message || String(e))
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loading, loadingMore, paging])

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200
    if (nearBottom) {
      loadMore()
    }
  }, [loadMore])

  useEffect(() => {
    if (!open) return
    if (!hasMore) return
    if (loading || loadingMore) return
    const el = listRef.current
    if (!el) return
    if (el.scrollHeight <= el.clientHeight + 48) {
      loadMore()
    }
  }, [open, items, hasMore, loading, loadingMore, loadMore])

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
      <div style={{ width: 'min(960px, 92vw)', maxHeight: '88vh', background: '#fff', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,.2)', display: 'grid', gridTemplateRows: 'auto 1fr' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', gap: 8 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim() && !loading) { e.preventDefault(); doSearch() } }} placeholder="GIF suchen (Tenor)" style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }} />
          <button onClick={() => doSearch()} disabled={loading || !q.trim()} style={{ padding: '8px 12px', borderRadius: 8, background: '#0a66c2', color: '#fff', border: 'none' }}>Suchen</button>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: '#eee', border: '1px solid #ddd' }}>Schließen</button>
        </div>
        <div ref={listRef} onScroll={handleScroll} style={{ overflow: 'auto', padding: 12 }} aria-busy={loading}>
          {error ? <p style={{ color: '#900', fontSize: 12 }}>Fehler: {error}</p> : null}
          {loading && items.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ height: 100, background: '#f2f2f2', border: '1px solid #eee', borderRadius: 10 }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 13, color: '#666' }}>{paging.mode === 'search' ? 'Keine GIFs gefunden. Anderen Suchbegriff probieren.' : 'Keine GIFs verfügbar.'}</p>
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
          {loadingMore ? (
            <p style={{ fontSize: 12, color: '#555', marginTop: 12 }}>Weitere GIFs werden geladen…</p>
          ) : null}
          {!loading && !loadingMore && hasMore && items.length > 0 ? (
            <p style={{ fontSize: 12, color: '#777', marginTop: 12 }}>Scroll weiter, um mehr GIFs zu laden.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
