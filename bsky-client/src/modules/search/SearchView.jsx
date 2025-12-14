import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Card, RichText } from '../shared'
import SkeetItem from '../timeline/SkeetItem'
import { useThread } from '../../hooks/useThread'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useSearchContext } from './SearchContext.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

export default function SearchView () {
  const {
    items,
    cursor,
    loading,
    loadingMore,
    error,
    recentSearches,
    handleSelectRecent,
    loadMore,
    handleEngagementChange,
    hasQuery,
    activeTab
  } = useSearchContext()
  const { selectThreadFromItem: onSelectPost } = useThread()
  const { openReplyComposer: onReply, openQuoteComposer: onQuote } = useComposer()
  const { openMediaPreview: onViewMedia } = useMediaLightbox()
  const loadMoreTriggerRef = useRef(null)
  const { t } = useTranslation()

  const isPostsTab = activeTab === 'top' || activeTab === 'latest'

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
              <a
                href={person.handle ? `https://bsky.app/profile/${person.handle}` : '#'}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm' 
              >
                {t('common.actions.viewProfile', 'Profil ansehen')}
              </a>
            </Card>
          </li>
        ))}
      </ul>
    )
  }, [activeTab, items])

  const recentSearchesContent = useMemo(() => {
    if (!recentSearches.length) {
      return <p className='text-sm text-foreground-muted'>{t('search.recent.empty', 'Gib einen Suchbegriff ein, um Bluesky zu durchsuchen.')}</p>
    }
    return (
      <div className='space-y-3'>
        <p className='text-sm font-semibold text-foreground'>{t('search.recent.title', 'Letzte Suchanfragen')}</p>
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
