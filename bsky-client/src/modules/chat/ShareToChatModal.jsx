import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { MagnifyingGlassIcon, Cross2Icon } from '@radix-ui/react-icons'
import { Button, fetchChatConversations, fetchChatConversationForMembers, searchBsky } from '../shared'
import { Modal } from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { useBskyAuth } from '../auth/AuthContext.jsx'
import { useUIDispatch } from '../../context/UIContext.jsx'
import { buildConversationHandles, buildConversationTitle, getInitials } from './chatUtils.js'

const PAGE_SIZE = 30
const SEARCH_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

export default function ShareToChatModal ({ open, item, shareUrl = '', onClose }) {
  const { t } = useTranslation()
  const { session } = useBskyAuth()
  const dispatch = useUIDispatch()
  const viewerDid = session?.did || null
  const [query, setQuery] = useState('')
  const [openingId, setOpeningId] = useState('')
  const [error, setError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setError('')
    setOpeningId('')
    setReloadTick((tick) => tick + 1)
  }, [open])

  const getKey = useCallback((pageIndex, previousPageData) => {
    if (!open) return null
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-share-chat-convos', viewerDid, reloadTick, cursor]
  }, [open, viewerDid, reloadTick])

  const fetchPage = useCallback(async ([, , , cursor]) => {
    return fetchChatConversations({
      cursor: cursor || undefined,
      limit: PAGE_SIZE
    })
  }, [])

  const {
    data,
    error: loadError,
    isLoading,
    isValidating,
    size,
    setSize
  } = useSWRInfinite(getKey, fetchPage, { revalidateFirstPage: false })

  const pages = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data])
  const conversations = useMemo(() => {
    if (!pages.length) return []
    return pages.flatMap((page) => Array.isArray(page?.conversations) ? page.conversations : [])
  }, [pages])

  const lastPage = pages[pages.length - 1] || null
  const hasMore = Boolean(lastPage?.cursor)
  const isLoadingInitial = isLoading && pages.length === 0
  const isLoadingMore = !isLoadingInitial && isValidating && hasMore

  const inputQuery = query.trim()
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchQuery = debouncedQuery
  const normalizedQuery = inputQuery.toLowerCase()

  const filteredConversations = useMemo(() => {
    if (!normalizedQuery) return conversations
    return conversations.filter((conversation) => {
      const participants = Array.isArray(conversation?.members) ? conversation.members : []
      const otherMembers = viewerDid ? participants.filter((member) => member?.did !== viewerDid) : participants
      const visibleMembers = otherMembers.length > 0 ? otherMembers : participants
      const title = buildConversationTitle(visibleMembers, t).toLowerCase()
      const handles = buildConversationHandles(visibleMembers).toLowerCase()
      const dids = visibleMembers.map((member) => member?.did || '').join(' ').toLowerCase()
      return title.includes(normalizedQuery) || handles.includes(normalizedQuery) || dids.includes(normalizedQuery)
    })
  }, [conversations, normalizedQuery, t, viewerDid])

  useEffect(() => {
    if (!inputQuery) {
      setDebouncedQuery('')
      return
    }
    const handle = setTimeout(() => {
      setDebouncedQuery(inputQuery)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [inputQuery])

  const conversationByMemberDid = useMemo(() => {
    const map = new Map()
    conversations.forEach((conversation) => {
      const participants = Array.isArray(conversation?.members) ? conversation.members : []
      participants.forEach((member) => {
        if (!member?.did || member.did === viewerDid) return
        if (!map.has(member.did)) map.set(member.did, conversation)
      })
    })
    return map
  }, [conversations, viewerDid])

  const getSearchKey = useCallback((pageIndex, previousPageData) => {
    if (!open || !searchQuery) return null
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-share-chat-search', searchQuery, cursor]
  }, [open, searchQuery])

  const fetchSearchPage = useCallback(async ([, queryValue, cursor]) => {
    return searchBsky({
      query: queryValue,
      type: 'people',
      cursor: cursor || undefined,
      limit: SEARCH_PAGE_SIZE
    })
  }, [])

  const {
    data: searchData,
    error: searchError,
    isLoading: searchLoading,
    isValidating: searchValidating,
    size: searchSize,
    setSize: setSearchSize
  } = useSWRInfinite(getSearchKey, fetchSearchPage, { revalidateFirstPage: false })

  const searchPages = useMemo(() => (Array.isArray(searchData) ? searchData.filter(Boolean) : []), [searchData])
  const searchResults = useMemo(() => {
    if (!searchPages.length) return []
    const seen = new Set()
    const items = []
    searchPages.forEach((page) => {
      const entries = Array.isArray(page?.items) ? page.items : []
      entries.forEach((entry) => {
        const did = entry?.did || ''
        if (!did || seen.has(did)) return
        seen.add(did)
        items.push(entry)
      })
    })
    return items
  }, [searchPages])

  const lastSearchPage = searchPages[searchPages.length - 1] || null
  const searchHasMore = Boolean(lastSearchPage?.cursor)
  const isSearchLoadingInitial = searchLoading && searchPages.length === 0
  const isSearchLoadingMore = !isSearchLoadingInitial && searchValidating && searchHasMore
  const waitingForDebounce = Boolean(inputQuery) && inputQuery !== searchQuery

  useEffect(() => {
    if (!open) return
    if (!searchQuery) return
    setSearchSize(1)
  }, [open, searchQuery, setSearchSize])

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingInitial || isLoadingMore) return
    setSize(size + 1)
  }, [hasMore, isLoadingInitial, isLoadingMore, setSize, size])

  const handleLoadMoreSearch = useCallback(() => {
    if (!searchHasMore || isSearchLoadingInitial || isSearchLoadingMore) return
    setSearchSize(searchSize + 1)
  }, [searchHasMore, isSearchLoadingInitial, isSearchLoadingMore, searchSize, setSearchSize])

  const resolvedShareUrl = useMemo(() => {
    if (shareUrl) return shareUrl
    return typeof item?.uri === 'string' ? item.uri : ''
  }, [item?.uri, shareUrl])

  const openChat = useCallback((conversation) => {
    if (!conversation?.id) return
    dispatch({
      type: 'OPEN_CHAT_VIEWER',
      conversationId: conversation.id,
      conversation,
      prefillText: resolvedShareUrl,
      prefillKey: `${conversation.id}-${Date.now()}`
    })
    onClose?.()
  }, [dispatch, onClose, resolvedShareUrl])

  const handleOpenConversation = useCallback((conversation) => {
    if (!conversation?.id || openingId) return
    setError('')
    setOpeningId(conversation.id)
    openChat(conversation)
    setOpeningId('')
  }, [openChat, openingId])

  const handleOpenActor = useCallback(async (actor) => {
    if (!actor?.did || openingId) return
    setError('')
    setOpeningId(actor.did)
    const existingConversation = conversationByMemberDid.get(actor.did)
    if (existingConversation) {
      openChat(existingConversation)
      setOpeningId('')
      return
    }
    try {
      const response = await fetchChatConversationForMembers({ members: [actor.did] })
      if (!response?.conversation?.id) {
        throw new Error(t('chat.share.openFailed', 'Chat konnte nicht geöffnet werden.'))
      }
      openChat(response.conversation)
    } catch (err) {
      setError(err?.message || t('chat.share.openFailed', 'Chat konnte nicht geöffnet werden.'))
    } finally {
      setOpeningId('')
    }
  }, [conversationByMemberDid, openChat, openingId, t])

  const showSearch = Boolean(inputQuery)
  const displaySearchResults = waitingForDebounce ? [] : searchResults
  const displaySearchHasMore = waitingForDebounce ? false : searchHasMore
  const displaySearchLoadingInitial = isSearchLoadingInitial || waitingForDebounce

  return (
    <Modal
      open={open}
      onClose={onClose}
      panelClassName='w-full max-w-xl p-0'
      closeOnBackdrop={true}
    >
      <div className='flex items-center justify-between border-b border-border px-4 py-3'>
        <p className='text-base font-semibold text-foreground'>
          {t('chat.share.title', 'Post senden an...')}
        </p>
        <button
          type='button'
          className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background-subtle'
          aria-label={t('common.actions.close', 'Schliessen')}
          onClick={onClose}
        >
          <Cross2Icon className='h-4 w-4' />
        </button>
      </div>
      <div className='px-4 py-3'>
        <div className='relative'>
          <MagnifyingGlassIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted' />
          <input
            type='search'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('chat.share.searchPlaceholder', 'Suche')}
            className='h-11 w-full rounded-2xl border border-border bg-background px-10 text-sm text-foreground placeholder:text-foreground-muted shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
          />
        </div>
      </div>
      <div className='max-h-[60vh] overflow-y-auto border-t border-border'>
        {loadError ? (
          <div className='px-4 py-4 text-sm text-foreground'>
            {loadError?.message || t('chat.share.loadFailed', 'Chats konnten nicht geladen werden.')}
          </div>
        ) : null}
        {error ? (
          <div className='px-4 pb-2 text-sm text-destructive'>
            {error}
          </div>
        ) : null}
        {isLoadingInitial ? (
          <div className='px-4 py-4 text-sm text-foreground-muted'>
            {t('chat.share.loading', 'Chats werden geladen…')}
          </div>
        ) : null}
        {!isLoadingInitial && !showSearch && filteredConversations.length === 0 ? (
          <div className='px-4 py-6 text-sm text-foreground-muted'>
            {t('chat.share.empty', 'Keine Chats gefunden.')}
          </div>
        ) : null}
        {!showSearch && filteredConversations.length > 0 ? (
          <>
            <ul className='divide-y divide-border'>
              {filteredConversations.map((conversation) => {
                const participants = Array.isArray(conversation?.members) ? conversation.members : []
                const otherMembers = viewerDid ? participants.filter((member) => member?.did !== viewerDid) : participants
                const visibleMembers = otherMembers.length > 0 ? otherMembers : participants
                const primaryMember = visibleMembers[0] || participants[0] || null
                const avatarUrl = primaryMember?.avatar || null
                const initials = getInitials(primaryMember?.displayName || primaryMember?.handle || primaryMember?.did)
                const title = buildConversationTitle(visibleMembers, t)
                const subtitle = buildConversationHandles(visibleMembers)
                const isOpening = openingId === conversation.id

                return (
                  <li key={conversation.id} className='flex items-center px-2 py-1'>
                    <button
                      type='button'
                      className='flex flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-background-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                      onClick={() => handleOpenConversation(conversation)}
                      disabled={Boolean(openingId)}
                    >
                      <span className='inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-base font-semibold text-foreground'>
                        {avatarUrl
                          ? (<img src={avatarUrl} alt='' className='h-12 w-12 rounded-full object-cover' />)
                          : initials}
                      </span>
                      <div className='flex flex-1 flex-col'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='text-sm font-semibold text-foreground'>{title}</p>
                          {subtitle ? <span className='text-xs text-foreground-muted truncate'>{subtitle}</span> : null}
                          {isOpening ? (
                            <span className='ml-auto text-xs text-foreground-muted'>
                              {t('chat.share.opening', 'Öffne…')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
            {hasMore ? (
              <div className='flex justify-center border-t border-border bg-background-subtle p-3'>
                <Button variant='secondary' size='pill' onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? t('chat.share.loadingMore', 'Lädt…') : t('chat.share.loadMore', 'Mehr laden')}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        {showSearch ? (
          <>
            {filteredConversations.length > 0 ? (
              <div className='border-t border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
                {t('chat.share.sectionChats', 'Bestehende Chats')}
              </div>
            ) : null}
            {filteredConversations.length > 0 ? (
              <ul className='divide-y divide-border'>
                {filteredConversations.map((conversation) => {
                  const participants = Array.isArray(conversation?.members) ? conversation.members : []
                  const otherMembers = viewerDid ? participants.filter((member) => member?.did !== viewerDid) : participants
                  const visibleMembers = otherMembers.length > 0 ? otherMembers : participants
                  const primaryMember = visibleMembers[0] || participants[0] || null
                  const avatarUrl = primaryMember?.avatar || null
                  const initials = getInitials(primaryMember?.displayName || primaryMember?.handle || primaryMember?.did)
                  const title = buildConversationTitle(visibleMembers, t)
                  const subtitle = buildConversationHandles(visibleMembers)
                  const isOpening = openingId === conversation.id

                  return (
                    <li key={conversation.id} className='flex items-center px-2 py-1'>
                      <button
                        type='button'
                        className='flex flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-background-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                        onClick={() => handleOpenConversation(conversation)}
                        disabled={Boolean(openingId)}
                      >
                        <span className='inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-base font-semibold text-foreground'>
                          {avatarUrl
                            ? (<img src={avatarUrl} alt='' className='h-12 w-12 rounded-full object-cover' />)
                            : initials}
                        </span>
                        <div className='flex flex-1 flex-col'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <p className='text-sm font-semibold text-foreground'>{title}</p>
                            {subtitle ? <span className='text-xs text-foreground-muted truncate'>{subtitle}</span> : null}
                            {isOpening ? (
                              <span className='ml-auto text-xs text-foreground-muted'>
                                {t('chat.share.opening', 'Öffne…')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {filteredConversations.length > 0 && hasMore ? (
              <div className='flex justify-center border-t border-border bg-background-subtle p-3'>
                <Button variant='secondary' size='pill' onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? t('chat.share.loadingMore', 'Lädt…') : t('chat.share.loadMore', 'Mehr laden')}
                </Button>
              </div>
            ) : null}
            <div className='border-t border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
              {t('chat.share.sectionPeople', 'Personen')}
            </div>
            {!waitingForDebounce && searchError ? (
              <div className='px-4 py-3 text-sm text-foreground'>
                {searchError?.message || t('chat.share.searchFailed', 'Suche fehlgeschlagen.')}
              </div>
            ) : null}
            {displaySearchLoadingInitial ? (
              <div className='px-4 py-4 text-sm text-foreground-muted'>
                {t('chat.share.searchLoading', 'Suche läuft…')}
              </div>
            ) : null}
            {!displaySearchLoadingInitial && displaySearchResults.length === 0 ? (
              <div className='px-4 py-6 text-sm text-foreground-muted'>
                {t('chat.share.searchEmpty', 'Keine Personen gefunden.')}
              </div>
            ) : null}
            {displaySearchResults.length > 0 ? (
              <ul className='divide-y divide-border'>
                {displaySearchResults.map((actor) => {
                  const avatarUrl = actor?.avatar || null
                  const initials = getInitials(actor?.displayName || actor?.handle || actor?.did)
                  const title = actor?.displayName || actor?.handle || actor?.did || ''
                  const subtitle = actor?.handle ? `@${actor.handle}` : ''
                  const isOpening = openingId === actor?.did
                  const existingConversation = actor?.did ? conversationByMemberDid.get(actor.did) : null

                  return (
                    <li key={actor.did || actor.handle} className='flex items-center px-2 py-1'>
                      <button
                        type='button'
                        className='flex flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-background-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                        onClick={() => {
                          if (existingConversation) {
                            handleOpenConversation(existingConversation)
                            return
                          }
                          handleOpenActor(actor)
                        }}
                        disabled={Boolean(openingId)}
                      >
                        <span className='inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-base font-semibold text-foreground'>
                          {avatarUrl
                            ? (<img src={avatarUrl} alt='' className='h-12 w-12 rounded-full object-cover' />)
                            : initials}
                        </span>
                        <div className='flex flex-1 flex-col'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <p className='text-sm font-semibold text-foreground'>{title}</p>
                            {subtitle ? <span className='text-xs text-foreground-muted truncate'>{subtitle}</span> : null}
                            {isOpening ? (
                              <span className='ml-auto text-xs text-foreground-muted'>
                                {t('chat.share.opening', 'Öffne…')}
                              </span>
                            ) : existingConversation ? (
                              <span className='ml-auto text-xs text-foreground-muted'>
                                {t('chat.share.existingChat', 'Bestehender Chat')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {displaySearchHasMore ? (
              <div className='flex justify-center border-t border-border bg-background-subtle p-3'>
                <Button variant='secondary' size='pill' onClick={handleLoadMoreSearch} disabled={isSearchLoadingMore}>
                  {isSearchLoadingMore ? t('chat.share.loadingMore', 'Lädt…') : t('chat.share.loadMore', 'Mehr laden')}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  )
}
