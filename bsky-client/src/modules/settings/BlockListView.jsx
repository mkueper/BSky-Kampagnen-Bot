import { useCallback, useMemo, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { Button, Card, fetchBlocks } from '../shared'
import { useAppDispatch } from '../../context/AppContext'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const PAGE_SIZE = 50

export default function BlockListView () {
  const dispatch = useAppDispatch()
  const [reloadTick, setReloadTick] = useState(0)
  const { t } = useTranslation()

  const getBlocksKey = useCallback((pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-blocks', reloadTick, cursor]
  }, [reloadTick])

  const fetchBlocksPage = useCallback(async ([, _reload, cursor]) => {
    const { blocks, cursor: nextCursor } = await fetchBlocks({
      cursor: cursor || undefined,
      limit: PAGE_SIZE
    })
    return {
      items: blocks,
      cursor: nextCursor || null
    }
  }, [])

  const {
    data,
    error,
    size,
    setSize,
    isLoading,
    isValidating
  } = useSWRInfinite(getBlocksKey, fetchBlocksPage, {
    revalidateFirstPage: false
  })

  const pages = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data])
  const blocks = useMemo(() => {
    if (!pages.length) return []
    return pages.flatMap((page) => Array.isArray(page?.items) ? page.items : [])
  }, [pages])

  const lastPage = pages[pages.length - 1] || null
  const hasMore = Boolean(lastPage?.cursor)
  const isLoadingInitial = isLoading && pages.length === 0
  const isLoadingMore = !isLoadingInitial && isValidating && hasMore

  const handleReload = useCallback(() => {
    setReloadTick((tick) => tick + 1)
    setSize(1)
  }, [setSize])

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingInitial || isLoadingMore) return
    setSize(size + 1)
  }, [hasMore, isLoadingInitial, isLoadingMore, setSize, size])

  const handleOpenProfile = useCallback((actor) => {
    if (!actor) return
    dispatch({ type: 'OPEN_PROFILE_VIEWER', actor })
  }, [dispatch])

  const hasBlocks = blocks.length > 0

  return (
    <div className='space-y-5' data-component='BskyBlockListView'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-base font-semibold text-foreground'>{t('blocks.title', 'Blockliste')}</p>
          <p className='text-sm text-foreground-muted'>{t('blocks.subtitle', 'Alle Accounts, die du aktuell blockierst.')}</p>
        </div>
      </div>

      {error ? (
        <Card padding='p-4' className='border border-red-200 bg-red-50 text-sm text-red-700'>
          <p className='font-semibold'>{t('blocks.errorTitle', 'Fehler beim Laden deiner Blockliste.')}</p>
          <p className='mt-1'>{error?.message || t('blocks.errorBody', 'Blockliste konnte nicht geladen werden.')}</p>
          <Button className='mt-3' variant='primary' size='pill' onClick={handleReload}>
            {t('common.actions.retry', 'Erneut versuchen')}
          </Button>
        </Card>
      ) : null}

      {isLoadingInitial && !hasBlocks ? (
        <p className='text-sm text-foreground-muted'>{t('blocks.loading', 'Blockliste wird geladen…')}</p>
      ) : null}

      {!isLoadingInitial && !isLoading && !error && !hasBlocks ? (
        <p className='text-sm text-foreground-muted'>{t('blocks.empty', 'Du hast aktuell keine Accounts blockiert.')}</p>
      ) : null}

      <div className='space-y-3'>
        {blocks.map((entry) => (
          <Card
            key={entry.listEntryId || entry.did || entry.handle}
            padding='p-3'
            className='flex flex-col gap-3'
          >
            <button
              type='button'
              className='flex items-start gap-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
              onClick={() => handleOpenProfile(entry.did || entry.handle)}
            >
              {entry.avatar ? (
                <img src={entry.avatar} alt='' className='h-12 w-12 rounded-full border border-border object-cover' />
              ) : (
                <div className='h-12 w-12 rounded-full border border-border bg-background-subtle' />
              )}
              <div className='min-w-0'>
                <p className='font-semibold text-foreground truncate'>{entry.displayName || entry.handle}</p>
                <p className='text-sm text-foreground-muted truncate'>@{entry.handle || entry.did}</p>
                {entry.description ? (
                  <p className='mt-2 text-sm text-foreground line-clamp-2'>{entry.description}</p>
                ) : null}
              </div>
            </button>
          </Card>
        ))}
      </div>

      {hasMore ? (
        <div className='flex justify-center pt-2'>
          <Button variant='secondary' onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? t('blocks.loadingMore', 'Lädt…') : t('blocks.loadMore', 'Mehr laden')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
