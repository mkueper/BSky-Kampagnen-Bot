import { useEffect, useMemo, useState } from 'react'
import Button from './Button'
import SkeetItem from './SkeetItem'

function ReplyList ({ nodes = [], depth = 0, onReply, onQuote, onSelect }) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null
  return (
    <div className='space-y-4'>
      {nodes.map((node, idx) => {
        const key = node?.uri || node?.cid || `reply-${depth}-${idx}`
        return (
          <div key={key}>
            <div className={depth > 0 ? 'ml-3 border-l-2 border-border/80 pl-4' : ''}>
              <SkeetItem
                item={node}
                onReply={onReply}
                onQuote={onQuote ? ((item) => onQuote(item)) : undefined}
                onSelect={onSelect ? (() => onSelect(node)) : undefined}
              />
            </div>
            {node?.replies?.length ? (
              <div className='mt-4'>
                <ReplyList nodes={node.replies} depth={depth + 1} onReply={onReply} onQuote={onQuote} onSelect={onSelect} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default function ThreadView ({ state, onReload, onReply, onQuote, onSelectPost }) {
  const { loading, error, data, context } = state || {}
  const parents = Array.isArray(data?.parents) ? data.parents : []
  const focus = data?.focus || null
  const timelineContext = context?.timeline || null
  const rawTimelinePrev = Array.isArray(timelineContext?.previous) ? timelineContext.previous : []
  const timelinePrev = useMemo(() => rawTimelinePrev.filter(Boolean), [rawTimelinePrev])
  const timelinePrevKey = useMemo(() => timelinePrev.map((item) => item?.uri || item?.cid || '').join('|'), [timelinePrev])
  const [showAllTimelinePrev, setShowAllTimelinePrev] = useState(false)

  useEffect(() => {
    setShowAllTimelinePrev(false)
  }, [timelinePrevKey])

  const visibleTimelinePrev = useMemo(() => {
    if (!timelinePrev.length) return []
    if (showAllTimelinePrev) {
      return [...timelinePrev].reverse()
    }
    return [timelinePrev[timelinePrev.length - 1]]
  }, [timelinePrev, showAllTimelinePrev])
  return (
    <div className='space-y-5' data-component='BskyThreadView'>
      <div className='flex justify-end'>
        <Button variant='ghost' onClick={onReload} disabled={loading}>
          {loading ? 'Lade...' : 'Neu laden'}
        </Button>
      </div>
      {error ? (
        <div className='rounded-2xl border border-red-400 bg-red-50 p-4 text-red-700'>
          <p className='font-semibold'>Fehler beim Laden des Threads</p>
          <p className='mt-1 text-sm'>{error}</p>
          <Button className='mt-3' variant='primary' onClick={onReload}>Erneut versuchen</Button>
        </div>
      ) : null}
      {loading && !focus ? (
        <p className='text-sm text-foreground-muted'>Thread wird geladen...</p>
      ) : null}
      {!loading && !error && focus ? (
        <div className='space-y-6'>
          {visibleTimelinePrev.length > 0 ? (
            <section className='space-y-3'>
              <div className='flex items-center justify-between gap-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Vorher in der Timeline</p>
                {timelinePrev.length > 1 ? (
                  <button
                    type='button'
                    className='text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm transition'
                    onClick={() => setShowAllTimelinePrev((value) => !value)}
                  >
                    {showAllTimelinePrev ? 'Nur letzten anzeigen' : 'Weitere anzeigen'}
                  </button>
                ) : null}
              </div>
              <div className='space-y-3'>
                {visibleTimelinePrev.map((item) => (
                  <SkeetItem
                    key={item?.uri || item?.cid}
                    item={item}
                    onReply={onReply}
                    onQuote={onQuote}
                    onSelect={onSelectPost ? (() => onSelectPost(item)) : undefined}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {parents.length > 0 ? (
            <section className='space-y-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Vorherige Posts</p>
              {parents.map((parent) => (
                <SkeetItem
                  key={parent?.uri || parent?.cid}
                  item={parent}
                  onReply={onReply}
                  onQuote={onQuote}
                  onSelect={onSelectPost ? (() => onSelectPost(parent)) : undefined}
                />
              ))}
            </section>
          ) : null}
          <section className='space-y-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Ausgewählter Beitrag</p>
            <SkeetItem item={focus} onReply={onReply} onQuote={onQuote} />
          </section>
          <section className='space-y-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Antworten</p>
            {focus.replies?.length ? (
              <ReplyList nodes={focus.replies} onReply={onReply} onQuote={onQuote} onSelect={onSelectPost} />
            ) : (
              <p className='text-sm text-foreground-muted'>Noch keine Antworten.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}


