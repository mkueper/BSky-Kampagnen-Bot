import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Button, Card } from '../shared/index.js'

function FeedCard ({ feed, actionState, onPin, onUnpin, onMove }) {
  const feedUri = feed.feedUri || feed.value
  const isPinned = Boolean(feed.pinned)
  const pinning = actionState?.pinning === feedUri
  const unpinning = actionState?.unpinning === feedUri
  const disabled = Boolean(actionState?.savingOrder)
  return (
    <Card background='subtle' padding='p-4' className='text-sm'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='text-base font-semibold text-foreground'>{feed.displayName || 'Feed'}</p>
          {feed.creator?.handle ? (
            <p className='text-xs text-foreground-muted'>von @{feed.creator.handle}</p>
          ) : null}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {isPinned ? (
            <>
              <Button
                type='button'
                variant='secondary'
                size='pill'
                disabled={disabled || pinning || unpinning}
                onClick={onUnpin ? () => onUnpin(feedUri) : undefined}
              >
                {unpinning ? 'Entferne...' : 'Unpin'}
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='pill'
                disabled={disabled || pinning || unpinning}
                onClick={onMove ? () => onMove(-1) : undefined}
                aria-label='Nach oben verschieben'
              >
                Up
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='pill'
                disabled={disabled || pinning || unpinning}
                onClick={onMove ? () => onMove(1) : undefined}
                aria-label='Nach unten verschieben'
              >
                Down
              </Button>
            </>
          ) : (
            <Button
              type='button'
              variant='primary'
              size='pill'
              disabled={pinning || unpinning}
              onClick={onPin ? () => onPin(feedUri) : undefined}
            >
              {pinning ? 'Pinne...' : 'Pin'}
            </Button>
          )}
        </div>
      </div>
      {feed.description ? (
        <p className='mt-2 text-foreground'>{feed.description}</p>
      ) : null}
      <div className='mt-2 flex flex-wrap gap-4 text-xs text-foreground-muted'>
        {feed.likeCount != null ? <span>{feed.likeCount} Likes</span> : null}
        {feed.status === 'error' ? <span className='text-amber-600'>Fehler beim Laden</span> : null}
      </div>
    </Card>
  )
}

FeedCard.propTypes = {
  feed: PropTypes.shape({
    id: PropTypes.string,
    displayName: PropTypes.string,
    description: PropTypes.string,
    creator: PropTypes.shape({
      handle: PropTypes.string
    }),
    likeCount: PropTypes.number,
    feedUri: PropTypes.string,
    value: PropTypes.string,
    pinned: PropTypes.bool,
    status: PropTypes.string
  }).isRequired,
  actionState: PropTypes.object,
  onPin: PropTypes.func,
  onUnpin: PropTypes.func,
  onMove: PropTypes.func
}

export default function FeedManager ({
  open,
  loading,
  error,
  feeds,
  onClose,
  onRefresh,
  onPin,
  onUnpin,
  onReorder
}) {
  const pinned = feeds?.pinned || []
  const saved = feeds?.saved || []
  const errors = feeds?.errors || []
  const actionState = feeds?.action || {}
  const managerErrors = useMemo(() => errors.filter(Boolean), [errors])

  if (!open) return null

  const handleMove = (delta, id) => {
    const index = pinned.findIndex((entry) => entry.id === id)
    if (index < 0) return
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= pinned.length) return
    const order = pinned.map((entry) => entry.id)
    const [removed] = order.splice(index, 1)
    order.splice(nextIndex, 0, removed)
    onReorder?.(order)
  }

  return (
    <div className='fixed inset-0 z-[120] flex items-center justify-center' data-component='BskyFeedManager'>
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} aria-hidden='true' />
      <div className='relative z-10 w-[min(960px,94vw)] max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-2xl'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-semibold text-foreground'>Feed-Manager</h2>
            <p className='text-sm text-foreground-muted'>Gepinnte Feeds erscheinen als Tabs in der Timeline.</p>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='secondary' size='pill' onClick={onRefresh} disabled={loading}>
              {loading ? 'Aktualisiere...' : 'Aktualisieren'}
            </Button>
            <Button variant='ghost' size='pill' onClick={onClose}>Schliessen</Button>
          </div>
        </div>

        {error ? (
          <p className='mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700'>{error}</p>
        ) : null}

        {managerErrors.length > 0 ? (
          <div className='mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 space-y-1'>
            {managerErrors.map((entry, idx) => (
              <p key={entry?.feedUri || idx}>{entry?.message || 'Feed konnte nicht geladen werden.'}</p>
            ))}
          </div>
        ) : null}

        <section className='mt-6 space-y-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-foreground'>Gepinnte Feeds</h3>
            {pinned.length > 1 ? (
              <p className='text-xs text-foreground-muted'>Reihenfolge via Pfeile anpassen.</p>
            ) : null}
          </div>
          {pinned.length === 0 ? (
            <p className='text-sm text-foreground-muted'>Noch keine Feeds angepinnt.</p>
          ) : (
            <div className='space-y-3'>
              {pinned.map((feed) => (
                <FeedCard
                  key={feed.id}
                  feed={feed}
                  actionState={actionState}
                  onUnpin={onUnpin}
                  onMove={(delta) => handleMove(delta, feed.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className='mt-8 space-y-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-foreground'>Gespeicherte Feeds</h3>
            <p className='text-xs text-foreground-muted'>Pinne Feeds, um sie oben anzuzeigen.</p>
          </div>
          {saved.length === 0 ? (
            <p className='text-sm text-foreground-muted'>Keine weiteren gespeicherten Feeds vorhanden.</p>
          ) : (
            <div className='space-y-3'>
              {saved.map((feed) => (
                <FeedCard
                  key={feed.id}
                  feed={feed}
                  actionState={actionState}
                  onPin={onPin}
                />
              ))}
            </div>
          )}
        </section>
      </div>
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
  onClose: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onPin: PropTypes.func.isRequired,
  onUnpin: PropTypes.func.isRequired,
  onReorder: PropTypes.func
}

FeedManager.defaultProps = {
  open: false,
  loading: false,
  error: '',
  feeds: { pinned: [], saved: [], errors: [], action: {} },
  onReorder: undefined
}
