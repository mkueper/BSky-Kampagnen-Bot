import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { searchBsky } from '../shared'
import { useClientConfig } from '../../hooks/useClientConfig'

const SEARCH_TABS = [
  { id: 'top', label: 'Top' },
  { id: 'latest', label: 'Neueste' },
  { id: 'people', label: 'Personen' }
]
const DEFAULT_ADVANCED_PREFIXES = ['from:', 'mention:', 'mentions:', 'domain:']
const RECENT_SEARCH_STORAGE_KEY = 'bsky-search-recent'
const RECENT_SEARCH_LIMIT = 8

const SearchContext = createContext(null)

export function SearchProvider ({ children }) {
  const value = useProvideSearchContext()
  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearchContext () {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearchContext muss innerhalb eines SearchProvider verwendet werden.')
  }
  return context
}

function useProvideSearchContext () {
  const { clientConfig } = useClientConfig()
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('top')
  const [errorMessage, setErrorMessage] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const searchSignatureRef = useRef('')

  const normalizedDraft = draftQuery.trim()
  const normalizedQuery = query.trim()
  const hasQuery = normalizedQuery.length > 0

  const configuredAdvancedPrefixes = useMemo(() => {
    if (Array.isArray(clientConfig?.search?.advancedPrefixes) && clientConfig.search.advancedPrefixes.length > 0) {
      return clientConfig.search.advancedPrefixes
    }
    return DEFAULT_ADVANCED_PREFIXES
  }, [clientConfig?.search?.advancedPrefixes])

  const normalizedPrefixes = useMemo(
    () => configuredAdvancedPrefixes
      .map(prefix => (typeof prefix === 'string' ? prefix.trim().toLowerCase() : ''))
      .filter(Boolean),
    [configuredAdvancedPrefixes]
  )

  const lowerDraft = normalizedDraft.toLowerCase()
  const hasAdvancedFilter = normalizedPrefixes.some((prefix) => lowerDraft.startsWith(prefix))

  const availableTabs = useMemo(() => {
    if (!hasAdvancedFilter) return SEARCH_TABS
    return SEARCH_TABS.filter(tab => tab.id === 'top' || tab.id === 'latest')
  }, [hasAdvancedFilter])

  useEffect(() => {
    if (availableTabs.some(tab => tab.id === activeTab)) return
    if (availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id)
    }
  }, [availableTabs, activeTab])

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
    if (typeof window === 'undefined') return undefined
    const handlePrefill = (event) => {
      const detail = event?.detail || {}
      const rawQuery = typeof detail.query === 'string' ? detail.query : ''
      const trimmed = rawQuery.trim()
      if (!trimmed) return
      setDraftQuery(trimmed)
      const nextTab = typeof detail.tab === 'string' ? detail.tab : null
      if (nextTab) {
        setActiveTab(nextTab)
      }
      if (detail.execute === false) return
      rememberSearch(trimmed)
      setQuery(trimmed)
    }
    window.addEventListener('bsky:search:set-query', handlePrefill)
    return () => {
      window.removeEventListener('bsky:search:set-query', handlePrefill)
    }
  }, [rememberSearch])

  useEffect(() => {
    if (!query) return
    if (draftQuery.trim().length === 0) {
      setQuery('')
    }
  }, [draftQuery, query])

  const getSearchKey = useCallback((pageIndex, previousPageData) => {
    if (!hasQuery) return null
    if (pageIndex > 0 && (!previousPageData || !previousPageData.cursor)) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-search', normalizedQuery, activeTab, cursor]
  }, [hasQuery, normalizedQuery, activeTab])

  const fetchSearchPage = useCallback(async ([, currentQuery, tab, cursor]) => {
    const { items, cursor: nextCursor } = await searchBsky({
      query: currentQuery,
      type: tab,
      cursor: cursor || undefined
    })
    return {
      items,
      cursor: nextCursor || null
    }
  }, [])

  const {
    data,
    error,
    size,
    setSize,
    mutate,
    isLoading,
    isValidating
  } = useSWRInfinite(getSearchKey, fetchSearchPage, {
    revalidateFirstPage: false
  })

  useEffect(() => {
    setErrorMessage(error?.message || '')
  }, [error])

  const pages = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data])
  const mergedItems = useMemo(() => {
    if (!pages.length) return []
    return pages.flatMap((page) => Array.isArray(page?.items) ? page.items : [])
  }, [pages])

  const lastPage = pages[pages.length - 1] || null
  const cursor = hasQuery ? (lastPage?.cursor || null) : null
  const hasMore = hasQuery && Boolean(cursor)
  const loading = hasQuery && (isLoading && pages.length === 0)
  const loadingMore = hasQuery && !loading && isValidating && hasMore

  useEffect(() => {
    const signature = `${query}::${activeTab}`
    searchSignatureRef.current = signature
  }, [query, activeTab])

  const submitSearch = useCallback((event) => {
    event?.preventDefault()
    const trimmed = draftQuery.trim()
    if (!trimmed) return
    rememberSearch(trimmed)
    setQuery(trimmed)
  }, [draftQuery, rememberSearch])

  const loadMore = useCallback(async () => {
    if (!hasQuery || !hasMore || loading || loadingMore) return
    await setSize(size + 1)
  }, [hasQuery, hasMore, loading, loadingMore, setSize, size])

  const handleEngagementChange = useCallback((targetId, patch = {}) => {
    if (!targetId) return
    mutate((previousPages) => {
      if (!Array.isArray(previousPages)) return previousPages
      let changed = false
      const updated = previousPages.map((page) => {
        if (!page || !Array.isArray(page.items)) return page
        let pageChanged = false
        const nextItems = page.items.map((entry) => {
          const entryId = entry.listEntryId || entry.uri || entry.cid
          if (entryId !== targetId) return entry
          pageChanged = true
          changed = true
          const nextStats = { ...(entry.stats || {}) }
          if (patch.likeCount != null) nextStats.likeCount = patch.likeCount
          if (patch.repostCount != null) nextStats.repostCount = patch.repostCount
          const baseViewer = entry.viewer || entry?.raw?.post?.viewer || entry?.raw?.item?.viewer || {}
          const nextViewer = { ...baseViewer }
          if (patch.likeUri !== undefined) nextViewer.like = patch.likeUri
          if (patch.repostUri !== undefined) nextViewer.repost = patch.repostUri
          if (patch.bookmarked !== undefined) nextViewer.bookmarked = patch.bookmarked
          const nextRaw = entry.raw ? { ...entry.raw } : null
          if (nextRaw?.post) nextRaw.post = { ...nextRaw.post, viewer: nextViewer }
          else if (nextRaw?.item) nextRaw.item = { ...nextRaw.item, viewer: nextViewer }
          return {
            ...entry,
            stats: nextStats,
            viewer: nextViewer,
            raw: nextRaw || entry.raw
          }
        })
        return pageChanged ? { ...page, items: nextItems } : page
      })
      return changed ? updated : previousPages
    }, false)
  }, [mutate])

  return {
    draftQuery,
    setDraftQuery,
    submitSearch,
    activeTab,
    setActiveTab,
    availableTabs,
    hasQuery,
    items: hasQuery ? mergedItems : [],
    cursor,
    loading,
    loadingMore,
    error: errorMessage,
    recentSearches,
    handleSelectRecent,
    loadMore,
    handleEngagementChange
  }
}
