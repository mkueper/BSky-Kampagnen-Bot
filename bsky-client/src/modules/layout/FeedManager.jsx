import { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { ArrowDownIcon, ArrowUpIcon, DrawingPinFilledIcon, DrawingPinIcon, LayersIcon } from '@radix-ui/react-icons'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const ACTION_BUTTON_CLASS = 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-background-subtle disabled:pointer-events-none disabled:opacity-60'

function FeedRow ({ feed, actions }) {
  const { t } = useTranslation()
  const label = feed.displayName || t('layout.feeds.feedFallback', 'Feed')
  const creatorHandle = feed.creator?.handle ? t('layout.feeds.byCreator', 'von @{handle}', { handle: feed.creator.handle }) : ''
  const showError = feed.status === 'error'

  return (
    <div className='flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-center gap-4'>
        {feed.avatar ? (
          <img
            src={feed.avatar}
            alt=''
            className='h-12 w-12 rounded-xl border border-border object-cover'
          />
        ) : (
          <div className='flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background-subtle text-primary'>
            <LayersIcon className='h-6 w-6' />
          </div>
        )}
        <div>
          <p className={`text-base font-semibold ${showError ? 'text-amber-700' : 'text-foreground'}`}>
            {showError ? t('layout.feeds.feedErrorLabel', 'Feed nicht geladen') : label}
          </p>
          {creatorHandle ? (
            <p className='text-sm text-foreground-muted'>{creatorHandle}</p>
          ) : null}
        </div>
      </div>
      <div className='flex flex-wrap items-center justify-end gap-2'>
        {actions}
      </div>
    </div>
  )
}

FeedRow.propTypes = {
  feed: PropTypes.shape({
    avatar: PropTypes.string,
    creator: PropTypes.shape({
      handle: PropTypes.string
    }),
    displayName: PropTypes.string,
    status: PropTypes.string
  }).isRequired,
  actions: PropTypes.node
}

export default function FeedManager ({
  open,
  loading,
  error,
  feeds,
  onRefresh,
  onPin,
  onUnpin,
  onReorder
}) {
  const { t } = useTranslation()
  const draftPinned = Array.isArray(feeds?.draft?.pinned) ? feeds.draft.pinned : null
  const draftSaved = Array.isArray(feeds?.draft?.saved) ? feeds.draft.saved : null
  const pinned = draftPinned ?? (feeds?.pinned || [])
  const saved = draftSaved ?? (feeds?.saved || [])
  const errors = feeds?.errors || []
  const actionState = feeds?.action || {}
  const managerErrors = useMemo(() => errors.filter(Boolean), [errors])
  useEffect(() => {
    if (!open) return
    onRefresh?.()
  }, [open, onRefresh])

  if (!open) return null

  const handleMove = (delta, key) => {
    const index = pinned.findIndex((entry) => (entry.id || entry.feedUri || entry.value) === key)
    if (index < 0) return
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= pinned.length) return
    const nextPinned = [...pinned]
    const [removed] = nextPinned.splice(index, 1)
    nextPinned.splice(nextIndex, 0, removed)
    onReorder?.(nextPinned)
  }

  return (
    <div className='space-y-6' data-component='BskyFeedManager'>
      {error ? (
        <p className='rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700'>{error}</p>
      ) : null}

      {managerErrors.length > 0 ? (
        <div className='rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 space-y-1'>
          {managerErrors.map((entry, idx) => (
            <p key={entry?.feedUri || idx}>
              {entry?.message || t('layout.feeds.feedError', 'Feed konnte nicht geladen werden.')}
            </p>
          ))}
        </div>
      ) : null}

      <section className='overflow-hidden rounded-3xl border border-border bg-background shadow-soft'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3'>
          <h3 className='text-base font-semibold text-foreground'>
            {t('layout.feeds.pinnedTitle', 'Gepinnte Feeds')}
          </h3>
          {pinned.length > 1 ? (
            <p className='text-xs text-foreground-muted'>
              {t('layout.feeds.pinnedHint', 'Reihenfolge via Pfeile anpassen.')}
            </p>
          ) : null}
        </div>
        {pinned.length === 0 ? (
          <p className='px-4 py-4 text-sm text-foreground-muted'>
            {t('layout.feeds.pinnedEmpty', 'Noch keine Feeds angepinnt.')}
          </p>
        ) : (
          <div className='divide-y divide-border'>
            {pinned.map((feed, index) => {
              const feedUri = feed.feedUri || feed.value
              const feedKey = feed.id || feedUri
              const pinning = actionState?.pinning === feedUri
              const unpinning = actionState?.unpinning === feedUri
              const disabled = Boolean(actionState?.savingOrder)
              const canMoveUp = index > 0
              const canMoveDown = index < pinned.length - 1
              return (
                <FeedRow
                  key={feedKey}
                  feed={feed}
                  actions={(
                    <>
                      <button
                        type='button'
                        className={ACTION_BUTTON_CLASS}
                        onClick={() => handleMove(-1, feedKey)}
                        disabled={!canMoveUp || disabled || pinning || unpinning}
                        aria-label={t('layout.feeds.moveUp', 'Nach oben verschieben')}
                      >
                        <ArrowUpIcon className='h-5 w-5' aria-hidden='true' />
                      </button>
                      <button
                        type='button'
                        className={ACTION_BUTTON_CLASS}
                        onClick={() => handleMove(1, feedKey)}
                        disabled={!canMoveDown || disabled || pinning || unpinning}
                        aria-label={t('layout.feeds.moveDown', 'Nach unten verschieben')}
                      >
                        <ArrowDownIcon className='h-5 w-5' aria-hidden='true' />
                      </button>
                      <button
                        type='button'
                        className={ACTION_BUTTON_CLASS}
                        onClick={onUnpin ? () => onUnpin(feed) : undefined}
                        disabled={disabled || pinning || unpinning}
                        aria-label={t('layout.feeds.unpin', 'Unpin')}
                        title={t('layout.feeds.unpin', 'Unpin')}
                      >
                        <DrawingPinFilledIcon className='h-5 w-5 text-primary' aria-hidden='true' />
                      </button>
                    </>
                  )}
                />
              )
            })}
          </div>
        )}
      </section>

      <section className='overflow-hidden rounded-3xl border border-border bg-background shadow-soft'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3'>
          <h3 className='text-base font-semibold text-foreground'>
            {t('layout.feeds.savedTitle', 'Gespeicherte Feeds')}
          </h3>
          <p className='text-xs text-foreground-muted'>
            {t('layout.feeds.savedHint', 'Pinne Feeds, um sie oben anzuzeigen.')}
          </p>
        </div>
        {saved.length === 0 ? (
          <p className='px-4 py-4 text-sm text-foreground-muted'>
            {t('layout.feeds.savedEmpty', 'Keine weiteren gespeicherten Feeds vorhanden.')}
          </p>
        ) : (
          <div className='divide-y divide-border'>
            {saved.map((feed) => {
              const feedUri = feed.feedUri || feed.value
              const feedKey = feed.id || feedUri
              const pinning = actionState?.pinning === feedUri
              const unpinning = actionState?.unpinning === feedUri
              return (
                <FeedRow
                  key={feedKey}
                  feed={feed}
                  actions={(
                    <button
                      type='button'
                      className={ACTION_BUTTON_CLASS}
                      onClick={onPin ? () => onPin(feed) : undefined}
                      disabled={pinning || unpinning || loading}
                      aria-label={t('layout.feeds.attach', 'Anheften')}
                      title={t('layout.feeds.attach', 'Anheften')}
                    >
                      <DrawingPinIcon className='h-5 w-5' aria-hidden='true' />
                    </button>
                  )}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

FeedManager.propTypes = {
  open: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.string,
  feeds: PropTypes.shape({
    pinned: PropTypes.array,
    saved: PropTypes.array,
    errors: PropTypes.array,
    action: PropTypes.object
  }),
  onRefresh: PropTypes.func,
  onPin: PropTypes.func,
  onUnpin: PropTypes.func,
  onReorder: PropTypes.func
}

FeedManager.defaultProps = {
  open: false,
  loading: false,
  error: '',
  feeds: { pinned: [], saved: [], errors: [], action: {} }
}
