import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { searchBsky } from '../shared'
import { useClientConfig } from '../../hooks/useClientConfig'

const SEARCH_TABS = [
  { id: 'top', label: 'Top', labelKey: 'search.tabs.top' },
  { id: 'latest', label: 'Neueste', labelKey: 'search.tabs.latest' },
  { id: 'people', label: 'Personen', labelKey: 'search.tabs.people' }
]
const DEFAULT_ADVANCED_PREFIXES = [
  { id: 'from', prefix: 'from:', hint: '@handle oder „me“' },
  { id: 'mention', prefix: 'mention:', hint: '@handle oder „me“' },
  { id: 'mentions', prefix: 'mentions:', hint: '@handle oder „me“' },
  { id: 'to', prefix: 'to:', hint: '@handle oder „me“' },
  { id: 'domain', prefix: 'domain:', hint: 'example.com' },
  { id: 'lang', prefix: 'lang:', hint: 'de, en' },
  { id: 'since', prefix: 'since:', hint: 'YYYY-MM-DD' },
  { id: 'until', prefix: 'until:', hint: 'YYYY-MM-DD' }
]
const RECENT_SEARCH_STORAGE_KEY = 'bsky-search-recent'
const RECENT_SEARCH_LIMIT = 8
const RECENT_PROFILE_LIMIT = 8
const RECENT_STORAGE_VERSION = 1

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
  const [recentQueryEntries, setRecentQueryEntries] = useState([])
  const [recentProfileEntries, setRecentProfileEntries] = useState([])
  const recentQueryEntriesRef = useRef(recentQueryEntries)
  const recentProfileEntriesRef = useRef(recentProfileEntries)
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

  const advancedPrefixEntries = useMemo(
    () => normalizeAdvancedPrefixEntries(configuredAdvancedPrefixes),
    [configuredAdvancedPrefixes]
  )

  const lowerDraft = normalizedDraft.toLowerCase()
  const hasAdvancedFilter = useMemo(() => {
    if (!lowerDraft) return false
    return advancedPrefixEntries.some((entry) => lowerDraft.startsWith(entry.prefixLower))
  }, [advancedPrefixEntries, lowerDraft])

  const prefixTokenDetails = useMemo(() => getLastTokenDetails(draftQuery), [draftQuery])

  const usedPrefixes = useMemo(
    () => detectUsedPrefixes(draftQuery, advancedPrefixEntries),
    [draftQuery, advancedPrefixEntries]
  )

  const showPrefixPicker = prefixTokenDetails.token === ':'

  const prefixSuggestions = useMemo(() => {
    if (!showPrefixPicker) return []
    return advancedPrefixEntries.filter(entry => !usedPrefixes.has(entry.prefixLower))
  }, [advancedPrefixEntries, showPrefixPicker, usedPrefixes])

  const activePrefixEntry = useMemo(() => {
    if (!prefixTokenDetails.tokenLower) return null
    return advancedPrefixEntries.find(entry => prefixTokenDetails.tokenLower.startsWith(entry.prefixLower)) || null
  }, [advancedPrefixEntries, prefixTokenDetails.tokenLower])

  const activePrefixHint = activePrefixEntry?.hint || null
  const showPrefixSuggestions = showPrefixPicker && prefixSuggestions.length > 0
  const showInlinePrefixHint = Boolean(
    activePrefixEntry &&
    activePrefixHint &&
    prefixTokenDetails.tokenLower === activePrefixEntry.prefixLower
  )

  const applyPrefixSuggestion = useCallback((entry) => {
    if (!entry || !entry.prefix) return
    setDraftQuery((current) => {
      const details = getLastTokenDetails(current)
      if (details.token !== ':') return current
      const before = current.slice(0, details.startIndex)
      const after = current.slice(details.startIndex + details.token.length)
      return `${before}${entry.prefix}${after}`
    })
  }, [setDraftQuery])

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
      const parsed = parseStoredRecents(raw)
      setRecentQueryEntries(parsed.queries)
      setRecentProfileEntries(parsed.profiles)
    } catch {
      // ignore malformed storage
    }
  }, [])

  useEffect(() => {
    recentQueryEntriesRef.current = recentQueryEntries
  }, [recentQueryEntries])

  useEffect(() => {
    recentProfileEntriesRef.current = recentProfileEntries
  }, [recentProfileEntries])

  const persistRecents = useCallback((nextQueries, nextProfiles) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify({
        version: RECENT_STORAGE_VERSION,
        queries: nextQueries,
        profiles: nextProfiles
      }))
    } catch {
      // ignore storage errors
    }
  }, [])

  const rememberSearch = useCallback((term) => {
    const normalized = term.trim()
    if (!normalized) return
    const timestamp = new Date().toISOString()
    setRecentQueryEntries((prev) => {
      const filtered = prev.filter(item => item.term !== normalized)
      const existing = prev.find(item => item.term === normalized)
      const nextEntry = {
        term: normalized,
        lastSearchedAt: timestamp,
        lastResultCount: existing?.lastResultCount ?? null
      }
      const next = [nextEntry, ...filtered].slice(0, RECENT_SEARCH_LIMIT)
      persistRecents(next, recentProfileEntriesRef.current)
      return next
    })
  }, [persistRecents])

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

  useEffect(() => {
    if (!hasQuery || !normalizedQuery) return
    const count = mergedItems.length
    setRecentQueryEntries((prev) => {
      const index = prev.findIndex(entry => entry.term === normalizedQuery)
      if (index === -1) return prev
      const existing = prev[index]
      if (existing.lastResultCount === count) return prev
      const updatedEntry = { ...existing, lastResultCount: count }
      const next = [...prev]
      next[index] = updatedEntry
      persistRecents(next, recentProfileEntriesRef.current)
      return next
    })
  }, [hasQuery, mergedItems, normalizedQuery, persistRecents])

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

  const removeRecentSearch = useCallback((term) => {
    const normalized = typeof term === 'string' ? term.trim() : ''
    if (!normalized) return
    setRecentQueryEntries((prev) => {
      const next = prev.filter(entry => entry.term !== normalized)
      persistRecents(next, recentProfileEntriesRef.current)
      return next
    })
  }, [persistRecents])

  const clearRecentSearches = useCallback(() => {
    setRecentQueryEntries(() => {
      const next = []
      persistRecents(next, recentProfileEntriesRef.current)
      return next
    })
  }, [persistRecents])

  const rememberProfileVisit = useCallback((profile) => {
    if (!profile || typeof profile !== 'object') return
    const did = typeof profile.did === 'string' ? profile.did.trim() : ''
    const handle = typeof profile.handle === 'string' ? profile.handle.trim() : ''
    if (!did && !handle) return
    const entry = {
      did: did || null,
      handle: handle || null,
      displayName: typeof profile.displayName === 'string' ? profile.displayName : '',
      avatar: typeof profile.avatar === 'string' ? profile.avatar : '',
      lastVisitedAt: new Date().toISOString()
    }
    setRecentProfileEntries((prev) => {
      const filtered = prev.filter(existing => !profileEntryMatches(existing, did, handle))
      const next = [entry, ...filtered].slice(0, RECENT_PROFILE_LIMIT)
      persistRecents(recentQueryEntriesRef.current, next)
      return next
    })
  }, [persistRecents])

  const removeRecentProfile = useCallback((identifier) => {
    if (!identifier || typeof identifier !== 'object') return
    const did = typeof identifier.did === 'string' ? identifier.did.trim() : ''
    const handle = typeof identifier.handle === 'string' ? identifier.handle.trim() : ''
    if (!did && !handle) return
    setRecentProfileEntries((prev) => {
      const next = prev.filter(entry => !profileEntryMatches(entry, did, handle))
      persistRecents(recentQueryEntriesRef.current, next)
      return next
    })
  }, [persistRecents])

  const clearRecentProfiles = useCallback(() => {
    setRecentProfileEntries(() => {
      const next = []
      persistRecents(recentQueryEntriesRef.current, next)
      return next
    })
  }, [persistRecents])

  const recentSearchTerms = useMemo(
    () => recentQueryEntries.map(entry => entry.term),
    [recentQueryEntries]
  )

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
    recentSearches: recentSearchTerms,
    recentSearchEntries: recentQueryEntries,
    recentProfileEntries,
    handleSelectRecent,
    removeRecentSearch,
    clearRecentSearches,
    rememberProfileVisit,
    removeRecentProfile,
    clearRecentProfiles,
    prefixSuggestions,
    showPrefixSuggestions,
    activePrefixHint,
    showInlinePrefixHint,
    applyPrefixSuggestion,
    advancedPrefixes: advancedPrefixEntries,
    loadMore,
    handleEngagementChange
  }
}

function normalizeAdvancedPrefixEntries (value) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (Array.isArray(entry)) {
        const prefix = typeof entry[0] === 'string' ? entry[0].trim() : ''
        if (!prefix) return null
        const hint = typeof entry[1] === 'string' ? entry[1].trim() : ''
        const id = typeof entry[2] === 'string' ? entry[2].trim() : ''
        return { id: id || null, prefix, prefixLower: prefix.toLowerCase(), hint }
      }
      if (typeof entry === 'string') {
        const prefix = entry.trim()
        if (!prefix) return null
        return { id: null, prefix, prefixLower: prefix.toLowerCase(), hint: '' }
      }
      if (entry && typeof entry === 'object') {
        const prefix = typeof entry.prefix === 'string' ? entry.prefix.trim() : ''
        if (!prefix) return null
        const hint = typeof entry.hint === 'string' ? entry.hint.trim() : ''
        const id = typeof entry.id === 'string' ? entry.id.trim() : ''
        return { id: id || null, prefix, prefixLower: prefix.toLowerCase(), hint }
      }
      return null
    })
    .filter(Boolean)
}

function getLastTokenDetails (value) {
  const text = typeof value === 'string' ? value : ''
  if (!text) return { token: '', tokenLower: '', startIndex: 0 }
  const trailingWhitespace = /\s$/.test(text)
  if (trailingWhitespace) {
    return { token: '', tokenLower: '', startIndex: text.length }
  }
  const match = text.match(/(\S+)$/)
  if (!match) return { token: '', tokenLower: '', startIndex: text.length }
  const token = match[0]
  return {
    token,
    tokenLower: token.toLowerCase(),
    startIndex: text.length - token.length
  }
}

function detectUsedPrefixes (value, entries) {
  const used = new Set()
  if (!value || !Array.isArray(entries) || entries.length === 0) {
    return used
  }
  const lower = value.toLowerCase()
  entries.forEach((entry) => {
    if (!entry?.prefixLower) return
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(entry.prefixLower)}`, 'g')
    if (pattern.test(lower)) {
      used.add(entry.prefixLower)
    }
  })
  return used
}

function escapeRegExp (value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseStoredRecents (value) {
  try {
    const raw = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(raw)) {
      return {
        queries: normalizeQueryEntries(raw),
        profiles: []
      }
    }
    if (raw && typeof raw === 'object') {
      return {
        queries: normalizeQueryEntries(raw.queries),
        profiles: normalizeProfileEntries(raw.profiles)
      }
    }
  } catch {
    // ignore malformed storage
  }
  return { queries: [], profiles: [] }
}

function normalizeQueryEntries (value) {
  if (!Array.isArray(value)) {
    return []
  }
  const normalized = value
    .map(entry => {
      if (typeof entry === 'string') {
        const term = entry.trim()
        return term ? { term, lastSearchedAt: null, lastResultCount: null } : null
      }
      if (entry && typeof entry === 'object') {
        const term = typeof entry.term === 'string' ? entry.term.trim() : ''
        if (!term) return null
        const lastSearchedAt = typeof entry.lastSearchedAt === 'string' ? entry.lastSearchedAt : null
        const lastResultCount = typeof entry.lastResultCount === 'number' && entry.lastResultCount >= 0
          ? entry.lastResultCount
          : null
        return { term, lastSearchedAt, lastResultCount }
      }
      return null
    })
    .filter(Boolean)
  return normalized.slice(0, RECENT_SEARCH_LIMIT)
}

function normalizeProfileEntries (value) {
  if (!Array.isArray(value)) {
    return []
  }
  const normalized = value
    .map(entry => {
      if (!entry || typeof entry !== 'object') return null
      const did = typeof entry.did === 'string' ? entry.did.trim() : ''
      const handle = typeof entry.handle === 'string' ? entry.handle.trim() : ''
      if (!did && !handle) return null
      return {
        did: did || null,
        handle: handle || null,
        displayName: typeof entry.displayName === 'string' ? entry.displayName : '',
        avatar: typeof entry.avatar === 'string' ? entry.avatar : '',
        lastVisitedAt: typeof entry.lastVisitedAt === 'string' ? entry.lastVisitedAt : null
      }
    })
    .filter(Boolean)
  return normalized.slice(0, RECENT_PROFILE_LIMIT)
}

function profileEntryMatches (entry, did, handle) {
  if (!entry) return false
  if (entry.did && did) return entry.did === did
  if (entry.handle && handle) return entry.handle === handle
  return false
}
