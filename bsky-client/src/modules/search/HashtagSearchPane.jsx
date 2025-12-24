import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { searchBsky } from '../shared'
import SkeetItem from '../timeline/SkeetItem'
import { useThread } from '../../hooks/useThread'
import { useComposer } from '../../hooks/useComposer'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { useAppDispatch } from '../../context/AppContext'
import { useUIState } from '../../context/UIContext.jsx'
import BskyDetailPane from '../layout/BskyDetailPane.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const HASHTAG_TABS = [
  { id: 'top', label: 'Top', labelKey: 'search.tabs.top' },
  { id: 'latest', label: 'Neueste', labelKey: 'search.tabs.latest' }
]

export default function HashtagSearchPane ({ registerLayoutHeader, renderHeaderInLayout = false }) {
  const { hashtagSearch } = useUIState()
  const dispatch = useAppDispatch()
  const { selectThreadFromItem } = useThread()
  const { openReplyComposer, openQuoteComposer } = useComposer()
  const { openMediaPreview } = useMediaLightbox()
  const { t } = useTranslation()

  const open = Boolean(hashtagSearch?.open && hashtagSearch?.query)
  const query = hashtagSearch?.query?.trim() || ''
  const label = hashtagSearch?.label || query
  const description = hashtagSearch?.description || ''
  const defaultTab = hashtagSearch?.tab === 'latest' ? 'latest' : 'top'

  const [activeTab, setActiveTab] = useState(defaultTab)
  const [reloadTick, setReloadTick] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const loadMoreTriggerRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE_HASHTAG_SEARCH' })
  }, [dispatch])

  useEffect(() => {
    if (!open) {
      setActiveTab('top')
      setReloadTick(0)
      return
    }
    setActiveTab(defaultTab)
    setReloadTick((tick) => tick + 1)
  }, [open, defaultTab, query])

  const getHashtagKey = useCallback((pageIndex, previousPageData) => {
    if (!open || !query) return null
    if (pageIndex > 0 && (!previousPageData || !previousPageData.cursor)) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['hashtag-search', query, activeTab, reloadTick, cursor]
  }, [open, query, activeTab, reloadTick])

  const fetchHashtagPage = useCallback(async ([, currentQuery, tab, , cursor]) => {
    const { items: nextItems, cursor: nextCursor } = await searchBsky({
      query: currentQuery,
      type: tab,
      cursor: cursor || undefined
    })
    return {
      items: nextItems,
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
  } = useSWRInfinite(getHashtagKey, fetchHashtagPage, {
    revalidateFirstPage: false
  })

  useEffect(() => {
    setErrorMessage(error?.message || '')
  }, [error])

  const pages = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data])
  const items = useMemo(() => {
    if (!pages.length) return []
    return pages.flatMap((page) => Array.isArray(page?.items) ? page.items : [])
  }, [pages])

  const lastPage = pages[pages.length - 1] || null
  const hasMore = Boolean(lastPage?.cursor)
  const isLoadingInitial = isLoading && pages.length === 0
  const isLoadingMore = !isLoadingInitial && isValidating && hasMore
  const showInlineError = Boolean(error && items.length > 0)

  const handleRetryInitial = useCallback(() => {
    setReloadTick((tick) => tick + 1)
  }, [])

  const loadMore = useCallback(async () => {
    if (!open || !hasMore || isLoadingInitial || isLoadingMore) return
    await setSize(size + 1)
  }, [open, hasMore, isLoadingInitial, isLoadingMore, setSize, size])

  useEffect(() => {
    const root = scrollContainerRef.current
    if (!open || !hasMore || !root || !loadMoreTriggerRef.current) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadMore()
      }
    }, {
      root,
      rootMargin: '200px 0px 200px 0px'
    })
    const target = loadMoreTriggerRef.current
    observer.observe(target)
    return () => observer.unobserve(target)
  }, [open, hasMore, loadMore])

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

  const postsList = useMemo(() => {
    if (!items || items.length === 0) return null
    return (
      <ul className='space-y-4'>
        {items.map((item, idx) => (
          <li key={item.listEntryId || `${item.uri || item.cid || 'hashtag'}-${idx}`}>
            <SkeetItem
              item={item}
              onReply={openReplyComposer}
              onQuote={openQuoteComposer}
              onViewMedia={openMediaPreview}
              onSelect={selectThreadFromItem ? ((selected) => selectThreadFromItem(selected || item)) : undefined}
              onEngagementChange={handleEngagementChange}
              disableHashtagMenu
            />
          </li>
        ))}
      </ul>
    )
  }, [items, openReplyComposer, openQuoteComposer, openMediaPreview, selectThreadFromItem, handleEngagementChange])

  if (!open) return null

  const normalizedLabel = (label || query || '').replace(/^#/, '')
  const normalizedDescription = description.trim()
  const isUserScoped = normalizedDescription.startsWith('@')
  const headerTitle = normalizedLabel
    ? t(
      isUserScoped ? 'search.hashtag.titleUser' : 'search.hashtag.titleAll',
      isUserScoped ? '#{tag} – Posts des Nutzers ansehen' : '#{tag} – Posts ansehen',
      { tag: normalizedLabel }
    )
    : t('search.hashtag.titleFallback', 'Hashtags – Posts ansehen')
  const headerSubtitle = isUserScoped ? normalizedDescription : t('search.hashtag.subtitleAll', 'Von allen Nutzern')

  return (
    <BskyDetailPane
      header={{
        title: headerTitle,
        subtitle: headerSubtitle,
        onBack: handleClose
      }}
      registerLayoutHeader={registerLayoutHeader}
      renderHeaderInLayout={renderHeaderInLayout}
    >
      <div className='h-full overflow-y-auto px-4 py-4 space-y-4' ref={scrollContainerRef}>
        <div className='flex flex-wrap gap-2'>
          {HASHTAG_TABS.map((tab) => (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transform transition-all duration-150 ease-out ${
                activeTab === tab.id ? 'border border-border bg-background-subtle text-foreground shadow-soft' : 'text-foreground-muted hover:bg-background-subtle/80 dark:hover:bg-primary/10 hover:text-foreground hover:shadow-lg hover:scale-[1.02]'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {t(tab.labelKey || 'search.tabs.fallback', tab.label)}
            </button>
          ))} 
        </div>
        {isLoadingInitial ? (
          <div className='flex min-h-[200px] items-center justify-center text-sm text-foreground-muted'>
            {t('common.status.searching', 'Suche läuft…')}
          </div>
        ) : error && items.length === 0 ? (
          <div className='space-y-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            <p className='font-semibold'>{t('search.hashtag.errorHeading', 'Fehler beim Laden der Hashtag-Suche.')}</p>
            <p>{errorMessage || t('search.hashtag.errorBody', 'Suche fehlgeschlagen.')}</p>
            <button
              type='button'
              onClick={handleRetryInitial}
              className='rounded-full border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100'
            >
              {t('common.actions.retry', 'Erneut versuchen')}
            </button>
          </div>
        ) : postsList ? (
          <>
            {postsList}
            {showInlineError ? (
              <div className='space-y-2 rounded-xl border border-border/70 bg-background-subtle p-3'>
                <p className='text-sm text-destructive'>{errorMessage || t('common.errors.loadMoreFailed', 'Weitere Ergebnisse konnten nicht geladen werden.')}</p>
                <button
                  type='button'
                  onClick={() => setSize(size + 1)}
                  disabled={isLoadingMore}
                  className='rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm' 
                >
                  {t('common.actions.retry', 'Erneut versuchen')}
                </button>
              </div>
            ) : null}
            {hasMore ? (
              <div
                ref={loadMoreTriggerRef}
                className='py-4 text-center text-sm text-foreground-muted'
              >
                {isLoadingMore
                  ? t('common.status.loading', 'Lade…')
                  : t('common.status.autoLoading', 'Weitere Ergebnisse werden automatisch geladen…')}
              </div>
            ) : null}
          </>
        ) : (
          <p className='text-sm text-foreground-muted'>{t('common.status.noResults', 'Keine Ergebnisse gefunden.')}</p>
        )}
      </div>
    </BskyDetailPane>
  )
}
