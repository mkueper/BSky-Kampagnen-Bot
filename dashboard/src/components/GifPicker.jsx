import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'

// Modal zum Durchsuchen des Tenor-Katalogs. Holt initial Featured-GIFs und kann
// bei Bedarf weitere Seiten nachladen (Infinite Scrolling).
export default function GifPicker({ open, onClose, onPick, maxBytes = 8 * 1024 * 1024 }) {
  // Suchfeld, Ergebnisliste und Ladezustände
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [nextPos, setNextPos] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [mode, setMode] = useState('featured')
  const [currentQuery, setCurrentQuery] = useState('')
  const listRef = useRef(null)

  // Normalisiert die Tenor-Antwort in ein Format, das die UI direkt verwenden kann.
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
        nanogif: mf.nanogif || null
      }
    }
  }), [])

  // Kapselt den Tenor-Fetch. Unterscheidet zwischen „featured“ und „search“
  // und liefert neben den Items auch die nächste Cursor-Position.
  const fetchPage = useCallback(async ({ mode: nextMode, query = '', pos = null }) => {
    const limit = nextMode === 'featured' ? '24' : '48'
    const params = new URLSearchParams({ limit })
    if (pos) params.set('pos', pos)
    if (nextMode === 'search' && query) params.set('q', query)
    const endpoint = nextMode === 'featured' ? 'featured' : 'search'
    const url = `/api/tenor/${endpoint}?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const results = Array.isArray(data?.results) ? data.results : []
    const next = typeof data?.next === 'string' && data.next ? data.next : null
    return { items: mapResults(results), next }
  }, [mapResults])

  useEffect(() => {
    // Picker wurde geschlossen -> lokale Zustände zurücksetzen.
    if (!open) {
      setQ('')
      setItems([])
      setLoading(false)
      setLoadingMore(false)
      setError('')
      setNextPos(null)
      setHasMore(false)
      setMode('featured')
      setCurrentQuery('')
      return
    }
    let cancelled = false
    const loadFeatured = async () => {
      // Initial-Load: Featured-GIFs via Backend-Proxy holen.
      setLoading(true)
      setError('')
      try {
        const res = await fetchPage({ mode: 'featured', query: '', pos: null })
        if (cancelled) return
        setItems(res.items)
        setNextPos(res.next)
        setHasMore(Boolean(res.next))
        setMode('featured')
        setCurrentQuery('')
        if (listRef.current) listRef.current.scrollTop = 0
      } catch (e) {
        if (!cancelled) {
          setItems([])
          setNextPos(null)
          setHasMore(false)
          setError(e?.message || String(e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadFeatured()
    return () => { cancelled = true }
  }, [open, fetchPage])

  // Startet eine Tenor-Suche basierend auf dem eingegebenen Begriff.
  async function doSearch() {
    const query = q.trim()
    if (!query) return
    setLoading(true)
    setError('')
    setHasMore(false)
    try {
      const res = await fetchPage({ mode: 'search', query, pos: null })
      setItems(res.items)
      setNextPos(res.next)
      setHasMore(Boolean(res.next))
      setMode('search')
      setCurrentQuery(query)
      if (listRef.current) listRef.current.scrollTop = 0
    } catch (e) {
      setError(e?.message || String(e))
      setItems([])
      setNextPos(null)
      setHasMore(false)
      setMode('search')
      setCurrentQuery(query)
    } finally {
      setLoading(false)
    }
  }

  // Nächste Seite nachladen, sobald das Ende der Liste erreicht ist.
  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return
    if (!hasMore || !nextPos) return
    setLoadingMore(true)
    try {
      const res = await fetchPage({ mode, query: currentQuery, pos: nextPos })
      setItems((prev) => prev.concat(res.items))
      setNextPos(res.next)
      setHasMore(Boolean(res.next))
    } catch (e) {
      setError(e?.message || String(e))
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [currentQuery, fetchPage, hasMore, loading, loadingMore, mode, nextPos])

  // Scroll-Listener für den Container. Sobald der Nutzer in die Nähe des Endes
  // kommt, wird automatisch loadMore ausgelöst.
  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200
    if (nearBottom) {
      loadMore()
    }
  }, [loadMore])

  useEffect(() => {
    // Wenn die vorhandenen Einträge nicht genug höhe haben, direkt nachladen.
    if (!open) return
    if (!hasMore) return
    if (loading || loadingMore) return
    const el = listRef.current
    if (!el) return
    if (el.scrollHeight <= el.clientHeight + 48) {
      loadMore()
    }
  }, [open, items, hasMore, loading, loadingMore, loadMore])

  // Tenor liefert Größen teils als Strings mit Einheiten – diese Funktion sorgt
  // für einen robusten Zahlenwert.
  function parseSize(val) {
    if (val == null) return 0
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const n = parseInt(val.replace(/[^0-9]/g, ''), 10)
      return Number.isFinite(n) ? n : 0
    }
    return 0
  }

  // Wählt die bestmögliche GIF-Variante unterhalb der erlaubten Dateigröße.
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

  // Modal-Layout: Suchfeld, Ergebnisgrid und unauffällige Statusmeldungen.

  return (
    <Modal
      open={open}
      onClose={onClose}
      title='GIF suchen (Tenor)'
      actions={(
        <>
          <Button variant='secondary' onClick={onClose}>Schließen</Button>
          <Button variant='primary' onClick={() => doSearch()} disabled={loading || !q.trim()}>Suchen</Button>
        </>
      )}
    >
      <div className='space-y-3'>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q.trim() && !loading) {
              e.preventDefault()
              doSearch()
            }
          }}
          placeholder='Suchbegriff'
          className='w-full rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground'
        />
        {error ? <p className='text-sm text-destructive'>Fehler: {error}</p> : null}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className='max-h-[420px] space-y-3 overflow-y-auto pr-1'
          aria-busy={loading}
        >
          {loading && items.length === 0 ? (
            <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className='h-32 w-full animate-pulse rounded-xl border border-border bg-background-subtle' />
              ))}
            </div>
          ) : null}
          {!loading && items.length === 0 ? (
            <p className='text-sm text-foreground-muted'>
              {mode === 'search' ? 'Keine GIFs gefunden. Bitte anderen Suchbegriff probieren.' : 'Keine GIFs verfügbar.'}
            </p>
          ) : null}
          {items.length > 0 ? (
            <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
              {items.map((it) => (
                <button
                  key={it.id}
                  type='button'
                  className='overflow-hidden rounded-xl border border-border bg-background-subtle'
                  onClick={() => {
                    const chosen = pickVariant(it.variants, maxBytes) || {}
                    if (!chosen.url) return
                    onPick?.({ id: it.id, downloadUrl: chosen.url, previewUrl: it.previewUrl || chosen.url })
                  }}
                >
                  <img src={it.previewUrl} alt='GIF' className='h-32 w-full object-cover' />
                </button>
              ))}
            </div>
          ) : null}
          {loadingMore ? (
            <p className='text-xs text-foreground-muted'>Weitere GIFs werden geladen…</p>
          ) : null}
          {!loading && !loadingMore && hasMore && items.length > 0 ? (
            <p className='text-xs text-foreground-muted'>Scroll weiter nach unten, um mehr GIFs zu laden.</p>
          ) : null}
        </div>
        {!loading && !loadingMore && !hasMore && items.length > 0 ? (
          <div className='text-right text-xs text-foreground-muted'>Keine weiteren GIFs verfügbar.</div>
        ) : null}
      </div>
    </Modal>
  )
}
