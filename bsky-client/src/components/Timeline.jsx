import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SkeetItem from './SkeetItem'

export default function Timeline ({ tab = 'discover', renderMode, onReply }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const hasMore = useMemo(() => Boolean(cursor), [cursor])

  const variant = useMemo(() => {
    if (renderMode === 'flat' || renderMode === 'card') return renderMode
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('bsky.renderMode') : null
      if (stored === 'flat' || stored === 'card') return stored
    } catch {}
    return 'card'
  }, [renderMode])

  const fetchPage = useCallback(async ({ withCursor } = {}) => {
    const params = new URLSearchParams()
    if (tab) params.set('tab', tab)
    if (withCursor) params.set('cursor', withCursor)
    const res = await fetch(`/api/bsky/timeline?${params.toString()}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    const nextItems = Array.isArray(data?.feed) ? data.feed : []
    return { nextItems, nextCursor: data?.cursor || null }
  }, [tab])

  // Initial load and tab change
  useEffect(() => {
    let ignore = false
    async function load () {
      setLoading(true)
      setError('')
      try {
        const { nextItems, nextCursor } = await fetchPage()
        if (!ignore) {
          setItems(nextItems)
          setCursor(nextCursor)
        }
      } catch (e) {
        if (!ignore) setError(e?.message || String(e))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    setItems([])
    setCursor(null)
    load()
    return () => { ignore = true }
  }, [tab, fetchPage])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { nextItems, nextCursor } = await fetchPage({ withCursor: cursor })
      setItems(prev => [...prev, ...nextItems])
      setCursor(nextCursor)
    } catch (e) {
      // we don't surface as fatal; keep existing items
      console.error('Timeline loadMore failed:', e)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, fetchPage, hasMore, loading, loadingMore])

  // Scroll listener on the outer BSky scroll container to trigger loadMore
  useEffect(() => {
    const el = typeof document !== 'undefined' ? document.getElementById('bsky-scroll-container') : null
    if (!el) return
    const onScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = el
      if (scrollHeight <= 0) return
      const ratio = (scrollTop + clientHeight) / scrollHeight
      if (ratio >= 0.8) {
        // within last 20%
        loadMore()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [loadMore])

  if (loading) return <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='loading'>Lade Timeline…</p>
  if (error) return <p className='text-sm text-red-600' data-component='BskyTimeline' data-state='error'>Fehler: {error}</p>
  if (items.length === 0) return <p className='text-sm text-muted-foreground' data-component='BskyTimeline' data-state='empty'>Keine Einträge gefunden.</p>
  return (
    <ul className='space-y-3' data-component='BskyTimeline' data-tab={tab}>
      {items.map((it) => (
        <li key={it.uri || it.cid}>
          <SkeetItem item={it} variant={variant} onReply={onReply} />
        </li>
      ))}
      {loadingMore ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>Mehr laden…</li>
      ) : null}
      {!hasMore ? (
        <li className='py-3 text-center text-xs text-foreground-muted'>Ende erreicht</li>
      ) : null}
    </ul>
  )
}
