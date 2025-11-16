import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Button, Card, searchBsky, RichText } from '../shared'
import SkeetItem from '../timeline/SkeetItem'

const SEARCH_TABS = [
  { id: 'top', label: 'Top' },
  { id: 'latest', label: 'Neueste' },
  { id: 'people', label: 'Personen' },
  { id: 'feeds', label: 'Feeds' }
]

const RECENT_SEARCH_STORAGE_KEY = 'bsky-search-recent'
const RECENT_SEARCH_LIMIT = 8

const buildFeedUrl = (feed) => {
  if (!feed?.uri) return null
  const parts = String(feed.uri).split('/')
  const rkey = parts[parts.length - 1]
  if (!rkey) return null
  const did = parts[2]
  const profileSegment = feed?.creator?.handle || did
  if (!profileSegment) return null
  return `https://bsky.app/profile/${profileSegment}/feed/${rkey}`
}

export default function SearchView ({ onSelectPost, onReply, onQuote, onViewMedia }) {
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('top')
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const loadMoreTriggerRef = useRef(null)

  const normalizedDraft = draftQuery.trim()
  const normalizedQuery = query.trim()
  const hasQuery = normalizedQuery.length > 0
  const isPostsTab = activeTab === 'top' || activeTab === 'latest'
  const isAuthorSearch = normalizedDraft.startsWith('from:')
  const availableTabs = useMemo(() => {
    if (!isAuthorSearch) return SEARCH_TABS
    return SEARCH_TABS.filter(tab => tab.id === 'top' || tab.id === 'latest')
  }, [isAuthorSearch])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map(item => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
          .slice(0, RECENT_SEARCH_LIMIT)
        setRecentSearches(normalized)
      }
    } catch {
      // ignore malformed storage
    }
  }, [])

  const rememberSearch = useCallback((term) => {
    const normalized = term.trim()
    if (!normalized) return
    setRecentSearches((prev) => {
      const next = [normalized, ...prev.filter(item => item !== normalized)].slice(0, RECENT_SEARCH_LIMIT)
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // ignore storage errors
        }
      }
      return next
    })
  }, [])

  const handleSelectRecent = useCallback((term) => {
    rememberSearch(term)
    setDraftQuery(term)
    setQuery(term)
  }, [rememberSearch])

  useEffect(() => {
    if (!query) return
    if (draftQuery.trim().length === 0) {
      setQuery('')
    }
  }, [draftQuery, query])

  useEffect(() => {
    if (!hasQuery) {
      setItems([])
      setCursor(null)
      setError('')
      return
    }
    let ignore = false
    async function fetchResults () {
      setLoading(true)
      setError('')
      try {
        const { items: nextItems, cursor: nextCursor } = await searchBsky({ query, type: activeTab })
        if (!ignore) {
          setItems(nextItems)
          setCursor(nextCursor)
        }
      } catch (err) {
        if (!ignore) setError(err?.message || 'Suche fehlgeschlagen.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    fetchResults()
    return () => { ignore = true }
  }, [query, activeTab, hasQuery])

  const submitSearch = useCallback((event) => {
    event?.preventDefault()
    const trimmed = draftQuery.trim()
    if (!trimmed) return
    rememberSearch(trimmed)
    setQuery(trimmed)
  }, [draftQuery, rememberSearch])

 const loadMore = useCallback(async () => {
   if (!cursor || loading || loadingMore || !hasQuery) return
   setLoadingMore(true)
    try {
      const { items: nextItems, cursor: nextCursor } = await searchBsky({ query, type: activeTab, cursor })
      setItems(prev => [...prev, ...nextItems])
      setCursor(nextCursor)
    } catch (err) {
      setError(err?.message || 'Weitere Ergebnisse konnten nicht geladen werden.')
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loading, loadingMore, hasQuery, query, activeTab])

  useEffect(() => {
    if (!cursor || !hasQuery || !loadMoreTriggerRef.current) return
    const root = typeof document !== 'undefined'
      ? document.getElementById('bsky-scroll-container')
      : null
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        loadMore()
      }
    }, {
      root,
      rootMargin: '200px 0px 200px 0px'
    })
    const target = loadMoreTriggerRef.current
    observer.observe(target)
    return () => observer.unobserve(target)
  }, [cursor, hasQuery, loadMore])

  const postsContent = useMemo(() => {
    if (!isPostsTab) return null
    return (
      <ul className='space-y-4'>
        {items.map((item) => (
          <li key={item.uri || item.cid}>
            <SkeetItem
              item={item}
              onReply={onReply}
              onQuote={onQuote}
              onViewMedia={onViewMedia}
              onSelect={onSelectPost ? ((selected) => onSelectPost(selected || item)) : undefined}
            />
          </li>
        ))}
      </ul>
    )
  }, [items, isPostsTab, onReply, onQuote, onViewMedia, onSelectPost])

  const peopleContent = useMemo(() => {
    if (activeTab !== 'people') return null
    return (
      <ul className='space-y-3'>
        {items.map((person) => (
          <li key={person.did || person.handle}>
            <Card padding='p-4' className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-start gap-3'>
                {person.avatar ? (
                  <img src={person.avatar} alt='' className='h-14 w-14 rounded-full border border-border object-cover' />
                ) : (
                  <div className='h-14 w-14 rounded-full border border-border bg-background-subtle' />
                )}
                <div className='min-w-0'>
                  <p className='font-semibold text-foreground truncate'>{person.displayName || person.handle}</p>
                  <p className='text-sm text-foreground-muted truncate'>@{person.handle}</p>
                  {person.description ? (
                    <p className='mt-2 text-sm text-foreground'>
                      <RichText text={person.description} className='line-clamp-3 break-words' />
                    </p>
                  ) : null}
                </div>
              </div>
              <a
                href={person.handle ? `https://bsky.app/profile/${person.handle}` : '#'}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-background-subtle'
              >
                Profil ansehen
              </a>
            </Card>
          </li>
        ))}
      </ul>
    )
  }, [activeTab, items])

  const feedsContent = useMemo(() => {
    if (activeTab !== 'feeds') return null
    return (
      <ul className='space-y-3'>
        {items.map((feed) => (
          <li key={feed.uri || feed.cid}>
            <Card padding='p-4' className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-start gap-3'>
                {feed.avatar ? (
                  <img src={feed.avatar} alt='' className='h-12 w-12 rounded-2xl border border-border object-cover' />
                ) : (
                  <div className='h-12 w-12 rounded-2xl border border-border bg-background-subtle' />
                )}
                <div className='min-w-0'>
                  <p className='font-semibold text-foreground truncate'>{feed.displayName || 'Feed'}</p>
                  {feed.description ? (
                    <p className='mt-1 text-sm text-foreground-muted line-clamp-3'>{feed.description}</p>
                  ) : null}
                  {feed.creator?.handle ? (
                    <p className='mt-1 text-xs text-foreground-muted truncate'>
                      von {feed.creator.displayName || feed.creator.handle} · @{feed.creator.handle}
                    </p>
                  ) : null}
                </div>
              </div>
              {(() => {
                const href = buildFeedUrl(feed)
                return (
                  <a
                    href={href || '#'}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold transition ${
                      href ? 'text-foreground hover:bg-background-subtle' : 'text-foreground-muted cursor-not-allowed opacity-60'
                    }`}
                    aria-disabled={!href}
                  >
                    Feed öffnen
                  </a>
                )
              })()}
            </Card>
          </li>
        ))}
      </ul>
    )
  }, [activeTab, items])

  const recentSearchesContent = useMemo(() => {
    if (!recentSearches.length) {
      return <p className='text-sm text-foreground-muted'>Gib einen Suchbegriff ein, um Bluesky zu durchsuchen.</p>
    }
    return (
      <div className='space-y-3'>
        <p className='text-sm font-semibold text-foreground'>Letzte Suchanfragen</p>
        <div className='flex flex-wrap gap-2'>
          {recentSearches.map((term) => (
            <button
              key={term}
              type='button'
              onClick={() => handleSelectRecent(term)}
              className='rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:bg-background-subtle'
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    )
  }, [recentSearches, handleSelectRecent])

  const renderResults = () => {
    if (!hasQuery) {
      return recentSearchesContent
    }
    if (loading) {
      return (
        <div className='flex min-h-[200px] items-center justify-center text-sm text-foreground-muted'>
          Suche läuft…
        </div>
      )
    }
    if (error) {
      return <p className='text-sm text-red-600'>{error}</p>
    }
    if (!items.length) {
      return <p className='text-sm text-foreground-muted'>Keine Ergebnisse gefunden.</p>
    }
    if (isPostsTab) return postsContent
    if (activeTab === 'people') return peopleContent
    if (activeTab === 'feeds') return feedsContent
    return null
  }

  return (
    <div className='space-y-6' data-component='BskySearchView'>
      <form
        className='flex flex-col gap-3 rounded-2xl border border-border bg-background-elevated/80 px-3 py-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4'
        onSubmit={submitSearch}
      >
        <div className='flex flex-1 items-center gap-3 rounded-2xl border border-border bg-background-subtle px-3'>
          <MagnifyingGlassIcon className='h-5 w-5 text-foreground-muted' />
          <input
            type='search'
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder='Nach Posts, Personen oder Feeds suchen…'
            className='flex-1 bg-transparent py-2 text-sm outline-none'
          />
        </div>
        <Button type='submit' variant='primary' size='pill' disabled={!draftQuery.trim()}>
          Suchen
        </Button>
      </form>

      <div className='flex flex-wrap gap-2'>
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            type='button'
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-background-subtle text-foreground shadow-soft' : 'text-foreground-muted hover:text-foreground'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className='space-y-4'>
        {renderResults()}
        {cursor && hasQuery ? (
          <div
            ref={loadMoreTriggerRef}
            className='py-4 text-center text-sm text-foreground-muted'
          >
            {loadingMore ? 'Lade…' : 'Weitere Ergebnisse werden automatisch geladen…'}
          </div>
        ) : null}
      </div>
    </div>
  )
}
