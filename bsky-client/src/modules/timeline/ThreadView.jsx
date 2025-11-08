import { useEffect, useMemo, useState } from 'react'
import { Button } from '../shared'
import SkeetItem from './SkeetItem'

const CONNECTOR_OFFSET = 28
const INDENT_STEP = 30

function ThreadNodeList ({
  nodes = [],
  depth = 0,
  highlightUri,
  onReply,
  onQuote,
  onSelect
}) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null

  return (
    <div className='space-y-4'>
      {nodes.map((node, idx) => {
        const key = node?.uri || node?.cid || `thread-node-${depth}-${idx}`
        const isLast = idx === nodes.length - 1
        const hasChildren = Array.isArray(node?.replies) && node.replies.length > 0
        const showConnector = depth > 0 || !isLast || hasChildren
        const appliedIndent = depth * INDENT_STEP
        const isFocus = highlightUri && node?.uri === highlightUri
        const verticalStyle = {
          top: depth === 0 ? `${CONNECTOR_OFFSET}px` : '0px',
          height: hasChildren || !isLast ? 'calc(100% + 16px)' : `${CONNECTOR_OFFSET}px`
        }
        const horizontalStyle = {
          top: `${CONNECTOR_OFFSET}px`
        }

        return (
          <div key={key} className='relative space-y-4' style={{ marginLeft: appliedIndent }}>
            <div className='relative pl-8'>
              {showConnector ? (
                <>
                  <span
                    aria-hidden='true'
                    className='pointer-events-none absolute left-2 w-px bg-border/50'
                    style={verticalStyle}
                  />
                  <span
                    aria-hidden='true'
                    className='pointer-events-none absolute left-2 w-4 border-t border-border/50'
                    style={horizontalStyle}
                  />
                </>
              ) : null}

              <div className={isFocus ? 'rounded-2xl ring-2 ring-primary/40' : ''}>
                <SkeetItem
                  item={node}
                  onReply={onReply}
                  onQuote={onQuote}
                  onSelect={onSelect ? (() => onSelect(node)) : undefined}
                />
              </div>
            </div>

            {hasChildren ? (
              <div className='mt-2'>
                <ThreadNodeList
                  nodes={node.replies}
                  depth={depth + 1}
                  highlightUri={highlightUri}
                  onReply={onReply}
                  onSelect={onSelect}
                  onQuote={onQuote}
                />
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
    if (showAllTimelinePrev) return [...timelinePrev].reverse()
    return [timelinePrev[timelinePrev.length - 1]]
  }, [timelinePrev, showAllTimelinePrev])

  const threadNodes = (() => {
    if (!focus) return parents.map((parent) => ({ ...parent, replies: [] }))

    const focusNode = {
      ...focus,
      replies: Array.isArray(focus.replies) ? focus.replies : []
    }

    if (parents.length === 0) {
      return [focusNode]
    }

    const parentClones = parents.map((parent) => ({ ...parent, replies: [] }))
    for (let i = parentClones.length - 1; i >= 0; i -= 1) {
      const current = parentClones[i]
      if (i === parentClones.length - 1) {
        current.replies = [focusNode]
      } else {
        current.replies = [parentClones[i + 1]]
      }
    }
    return [parentClones[0]]
  })()

  return (
    <div className='space-y-5' data-component='BskyThreadView'>
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
          <ThreadNodeList
            nodes={threadNodes}
            highlightUri={focus?.uri}
            onReply={onReply}
            onQuote={onQuote}
            onSelect={onSelectPost}
          />
        </div>
      ) : null}
    </div>
  )
}
