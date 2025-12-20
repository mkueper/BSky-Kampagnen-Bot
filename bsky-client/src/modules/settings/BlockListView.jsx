import { useCallback, useMemo, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { Button, Card, InlineMenu, InlineMenuTrigger, InlineMenuContent, InlineMenuItem, ConfirmDialog, fetchBlocks, unblockActor, useConfirmDialog } from '../shared'
import { useAppDispatch } from '../../context/AppContext'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { CheckCircledIcon, DotsHorizontalIcon, Link2Icon, PersonIcon } from '@radix-ui/react-icons'

const PAGE_SIZE = 50

export default function BlockListView () {
  const dispatch = useAppDispatch()
  const [reloadTick, setReloadTick] = useState(0)
  const [actionBusyId, setActionBusyId] = useState(null)
  const { t } = useTranslation()
  const { dialog: confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

  const getBlocksKey = useCallback((pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-blocks', reloadTick, cursor]
  }, [reloadTick])

  const fetchBlocksPage = useCallback(async ([, , cursor]) => {
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

  const buildProfileUrl = useCallback((entry) => {
    if (!entry) return ''
    const slug = entry.handle || entry.did
    if (!slug) return ''
    return `https://bsky.app/profile/${encodeURIComponent(slug)}`
  }, [])

  const handleCopyProfileLink = useCallback(async (entry) => {
    const url = buildProfileUrl(entry)
    if (!url || typeof navigator === 'undefined') return
    try {
      await navigator.clipboard.writeText(url)
    } catch (error) {
      console.error('Profil-Link konnte nicht kopiert werden:', error)
    }
  }, [buildProfileUrl])

  const confirmUnblock = useCallback((entry) => {
    if (!entry) return
    const identifier = entry.did || entry.handle
    if (!identifier) return
    const busyId = entry.listEntryId || identifier
    openConfirm({
      title: t('blocks.confirmation.unblockTitle', 'Blockierung aufheben?'),
      description: t('blocks.confirmation.unblockDescription', 'Der Account kann danach wieder mit dir interagieren und deine Beiträge sehen.'),
      confirmLabel: t('blocks.confirmation.confirm', 'Blockierung aufheben'),
      cancelLabel: t('blocks.confirmation.cancel', 'Abbrechen'),
      variant: 'secondary',
      onConfirm: async () => {
        setActionBusyId(busyId)
        try {
          await unblockActor(identifier, { blockUri: entry.blockUri })
          handleReload()
        } catch (error) {
          console.error('Blockierung konnte nicht aufgehoben werden:', error)
        } finally {
          setActionBusyId((current) => (current === busyId ? null : current))
        }
      }
    })
  }, [handleReload, openConfirm, t])

  const hasBlocks = blocks.length > 0

  return (
    <div className='space-y-5' data-component='BskyBlockListView'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm text-foreground-muted'>{t('blocks.subtitle', 'Alle Accounts, die du blockierst.')}</p>
        </div>
      </div>

      <div className='rounded-lg border border-border bg-background-subtle p-4 text-sm text-foreground'>
        {t(
          'blocks.note',
          'Blockierte Accounts können nicht in deinen Threads antworten, dich erwähnen oder anderweitig mit dir interagieren. Du wirst ihre Inhalte nicht sehen und sie werden daran gehindert, deine zu sehen.'
        )}
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
        {blocks.map((entry) => {
          const profileIdentifier = entry.did || entry.handle
          const entryKey = entry.listEntryId || profileIdentifier || 'block-entry'
          const isBusy = actionBusyId === entryKey
          const canCopyLink = Boolean(buildProfileUrl(entry))
          return (
            <Card
              key={entryKey}
              padding='p-3'
              className='flex flex-col gap-3'
            >
              <div className='flex items-start gap-3'>
                <button
                  type='button'
                  className='flex flex-1 items-start gap-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
                  onClick={() => handleOpenProfile(profileIdentifier)}
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
                <BlockEntryMenu
                  entry={entry}
                  isBusy={isBusy}
                  canCopyLink={canCopyLink}
                  onViewProfile={handleOpenProfile}
                  onCopyLink={handleCopyProfileLink}
                  onUnblock={confirmUnblock}
                  t={t}
                />
              </div>
            </Card>
          )
        })}
      </div>

      {hasMore ? (
        <div className='flex justify-center pt-2'>
          <Button variant='secondary' onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? t('blocks.loadingMore', 'Lädt…') : t('blocks.loadMore', 'Mehr laden')}
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}

function BlockEntryMenu ({ entry, isBusy, canCopyLink, onViewProfile, onCopyLink, onUnblock, t }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const profileIdentifier = entry?.did || entry?.handle
  const moreLabel = t('blocks.actions.more', 'Weitere Aktionen')
  const isBlockedBy = Boolean(entry?.viewer?.blockedBy)

  const handleViewProfile = () => {
    if (!profileIdentifier) return
    onViewProfile(profileIdentifier)
  }

  const handleCopyLink = () => {
    if (!canCopyLink) return
    onCopyLink(entry)
  }

  const handleUnblock = () => {
    if (isBusy) return
    onUnblock(entry)
  }

  return (
    <InlineMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <InlineMenuTrigger>
        <button
          type='button'
          aria-label={moreLabel}
          title={moreLabel}
          className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm'
          disabled={isBusy}
        >
          <DotsHorizontalIcon className='h-4 w-4' />
        </button>
      </InlineMenuTrigger>
      <InlineMenuContent align='end' side='top' sideOffset={8} style={{ width: 220 }}>
        <InlineMenuItem icon={PersonIcon} onSelect={handleViewProfile} disabled={!profileIdentifier}>
          {t('blocks.actions.viewProfile', 'Profil anzeigen')}
        </InlineMenuItem>
        <InlineMenuItem icon={Link2Icon} onSelect={handleCopyLink} disabled={!canCopyLink}>
          {t('blocks.actions.copyLink', 'Link zum Profil kopieren')}
        </InlineMenuItem>
        <div className='my-1 border-t border-border/60' />
        <InlineMenuItem
          icon={CheckCircledIcon}
          onSelect={handleUnblock}
          disabled={isBusy}
          variant={isBlockedBy ? 'warning' : undefined}
        >
          {isBusy
            ? t('blocks.actions.unblocking', 'Blockierung wird aufgehoben…')
            : t('blocks.actions.unblock', 'Blockierung aufheben')}
        </InlineMenuItem>
      </InlineMenuContent>
    </InlineMenu>
  )
}
