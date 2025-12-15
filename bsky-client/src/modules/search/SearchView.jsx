import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Card, RichText } from '../shared'
import SkeetItem from '../timeline/SkeetItem'
import { useThread } from '../../hooks/useThread'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useSearchContext } from './SearchContext.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { Cross1Icon } from '@radix-ui/react-icons'
import { useOptionalAppDispatch } from '../../context/AppContext'

export default function SearchView () {
  const {
    items,
    cursor,
    loading,
    loadingMore,
    error,
    recentSearchEntries,
    removeRecentSearch,
    clearRecentSearches,
    recentProfileEntries,
    removeRecentProfile,
    clearRecentProfiles,
    handleSelectRecent,
    rememberProfileVisit,
    loadMore,
    handleEngagementChange,
    hasQuery,
    activeTab
  } = useSearchContext()
  const dispatch = useOptionalAppDispatch()
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const loadMoreTriggerRef = useRef(null)
  const { t, locale } = useTranslation()

  const isPostsTab = activeTab === 'top' || activeTab === 'latest'

  const dateFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale || 'de', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    } catch {
      return new Intl.DateTimeFormat('de', { dateStyle: 'short', timeStyle: 'short' })
    }
  }, [locale])

  const formatLastSearchValue = useCallback((isoString) => {
    if (!isoString) return null
    try {
      return dateFormatter.format(new Date(isoString))
    } catch {
      return null
    }
  }, [dateFormatter])

  const openProfileViewer = useCallback((profile, { remember = false } = {}) => {
    if (!profile) return
    const actor = profile.did || profile.handle
    if (!actor) return
    if (remember) {
      rememberProfileVisit(profile)
    }
    if (dispatch) {
      dispatch({ type: 'OPEN_PROFILE_VIEWER', actor })
    }
  }, [dispatch, rememberProfileVisit])

  useEffect(() => {
    if (!cursor || !hasQuery || !loadMoreTriggerRef.current) return undefined
    const root = typeof document !== 'undefined'
      ? document.getElementById('bsky-scroll-container')
      : null
    if (!root) return undefined
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

  const handleSelectPost = useCallback((selectedItem, fallbackItem) => {
    if (typeof onSelectPost !== 'function') return
    const candidate = selectedItem && (selectedItem.uri || selectedItem?.raw?.post?.uri)
      ? selectedItem
      : fallbackItem
    if (!candidate || !(candidate.uri || candidate?.raw?.post?.uri)) return
    onSelectPost(candidate)
  }, [onSelectPost])

  const postsContent = useMemo(() => {
    if (!isPostsTab) return null
    const canSelectPosts = typeof onSelectPost === 'function'
    return (
      <ul className='space-y-4'>
        {items.map((item, idx) => (
          <li key={item.listEntryId || `${item.uri || item.cid || 'search'}-${idx}`}>
            <SkeetItem
              item={item}
              onReply={onReply}
              onQuote={onQuote}
              onViewMedia={onViewMedia}
              onSelect={canSelectPosts ? ((selected) => handleSelectPost(selected, item)) : undefined}
              onEngagementChange={handleEngagementChange}
              disableHashtagMenu
            />
          </li>
        ))}
      </ul>
    )
  }, [handleEngagementChange, handleSelectPost, isPostsTab, items, onReply, onQuote, onSelectPost, onViewMedia])

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
                      <RichText
                        text={person.description}
                        className='line-clamp-3 break-words'
                        hashtagContext={{ authorHandle: person.handle }}
                      />
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type='button'
                onClick={() => openProfileViewer(person, { remember: true })}
                className='inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60'
              >
                {t('common.actions.viewProfile', 'Profil ansehen')}
              </button>
            </Card>
          </li>
        ))}
      </ul>
    )
  }, [activeTab, items, openProfileViewer, t])

  const recentProfilesContent = useMemo(() => {
    const hasProfiles = recentProfileEntries.length > 0
    return (
      <div className='space-y-3 rounded-2xl border border-border p-4'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-semibold text-foreground'>
            {t('search.recent.profileTitle', 'Zuletzt angesehene Profile')}
          </p>
          {hasProfiles ? (
            <button
              type='button'
              onClick={clearRecentProfiles}
              className='text-xs font-medium text-foreground-muted underline-offset-2 hover:text-foreground hover:underline'
            >
              {t('search.recent.profileClear', 'Alle entfernen')}
            </button>
          ) : null}
        </div>
        {hasProfiles ? (
          <div className='flex flex-wrap gap-4'>
            {recentProfileEntries.map((entry) => {
              const label = entry.displayName || entry.handle || entry.did || '—'
              return (
                <div key={`${entry.did || entry.handle}`} className='relative w-20 text-center'>
                  <div className='relative mx-auto h-16 w-16'>
                    <button
                      type='button'
                      onClick={() => openProfileViewer(entry, { remember: true })}
                      className='group block h-16 w-16 rounded-full border border-border bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 overflow-hidden'
                      title={label}
                    >
                      {entry.avatar ? (
                        <img src={entry.avatar} alt='' className='h-full w-full object-cover' />
                      ) : null}
                    </button>
                    <button
                      type='button'
                      aria-label={t('search.recent.profileRemove', 'Profil entfernen')}
                      onClick={() => removeRecentProfile({ did: entry.did, handle: entry.handle })}
                      className='absolute -top-2 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition hover:bg-background-subtle'
                    >
                      <Cross1Icon className='h-3 w-3' />
                    </button>
                  </div>
                  <p className='mt-2 truncate text-xs text-foreground'>{label}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className='text-sm text-foreground-muted'>
            {t('search.recent.profileEmpty', 'Noch keine Profil-Historie vorhanden.')}
          </p>
        )}
      </div>
    )
  }, [clearRecentProfiles, openProfileViewer, recentProfileEntries, removeRecentProfile, t])

  const recentSearchesContent = useMemo(() => {
    const hasSearches = recentSearchEntries.length > 0
    return (
      <div className='space-y-3 rounded-2xl border border-border p-4'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-semibold text-foreground'>
            {t('search.recent.queryTitle', 'Letzte Suchanfragen')}
          </p>
          {hasSearches ? (
            <button
              type='button'
              onClick={clearRecentSearches}
              className='text-xs font-medium text-foreground-muted underline-offset-2 hover:text-foreground hover:underline'
            >
              {t('search.recent.queryClear', 'Verlauf löschen')}
            </button>
          ) : null}
        </div>
        {hasSearches ? (
          <div className='space-y-2'>
            {recentSearchEntries.map((entry) => {
              const formattedDate = formatLastSearchValue(entry.lastSearchedAt)
              const resultLabel = typeof entry.lastResultCount === 'number'
                ? t('search.recent.resultCount', '{count} Treffer', { count: entry.lastResultCount })
                : t('search.recent.resultCountUnknown', 'Treffer: –')
              const lastSearchLabel = formattedDate
                ? t('search.recent.lastSearchedAt', 'Zuletzt: {value}', { value: formattedDate })
                : t('search.recent.lastSearchedUnknown', 'Zuletzt: –')
              return (
                <div
                  key={entry.term}
                  className='flex items-center gap-2 rounded-2xl border border-border/70 bg-background-subtle/40 p-2'
                >
                  <button
                    type='button'
                    onClick={() => handleSelectRecent(entry.term)}
                    className='flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60'
                  >
                    <div className='flex flex-col'>
                      <span className='font-semibold text-foreground'>{entry.term}</span>
                    </div>
                    <div className='flex flex-col items-end text-xs text-foreground-muted'>
                      <span>{resultLabel}</span>
                      <span>{lastSearchLabel}</span>
                    </div>
                  </button>
                  <button
                    type='button'
                    aria-label={t('search.recent.queryRemove', 'Suche entfernen')}
                    onClick={() => removeRecentSearch(entry.term)}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground-muted transition hover:bg-background-subtle hover:text-foreground'
                  >
                    <Cross1Icon className='h-3.5 w-3.5' />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className='text-sm text-foreground-muted'>
            {t('search.recent.queryEmpty', 'Gib einen Suchbegriff ein, um Bluesky zu durchsuchen.')}
          </p>
        )}
      </div>
    )
  }, [clearRecentSearches, formatLastSearchValue, handleSelectRecent, recentSearchEntries, removeRecentSearch, t])

  const recentsOverview = useMemo(() => (
    <div className='space-y-6'>
      {recentProfilesContent}
      {recentSearchesContent}
    </div>
  ), [recentProfilesContent, recentSearchesContent])

  const renderResults = () => {
    if (!hasQuery) {
      return recentsOverview
    }
    if (loading) {
      return (
        <div className='flex min-h-[200px] items-center justify-center text-sm text-foreground-muted'>
          {t('common.status.searching', 'Suche läuft…')}
        </div>
      )
    }
    if (error) {
      const errorText = error?.message || (typeof error === 'string' ? error : '')
      return <p className='text-sm text-red-600'>{errorText || t('common.errors.generic', 'Es ist ein Fehler aufgetreten.')}</p>
    }
    if (!items.length) {
      return <p className='text-sm text-foreground-muted'>{t('common.status.noResults', 'Keine Ergebnisse gefunden.')}</p>
    }
    if (isPostsTab) return postsContent
    if (activeTab === 'people') return peopleContent
    return null
  }

  return (
    <div className='space-y-6' data-component='BskySearchView'>
      <div className='space-y-4'>
        {renderResults()}
        {cursor && hasQuery ? (
          <div
            ref={loadMoreTriggerRef}
            className='py-4 text-center text-sm text-foreground-muted'
          >
            {loadingMore
              ? t('common.status.loading', 'Lade…')
              : t('common.status.autoLoading', 'Weitere Ergebnisse werden automatisch geladen…')}
          </div>
        ) : null}
      </div>
    </div>
  )
}
