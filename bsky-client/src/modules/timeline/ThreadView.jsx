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
  onViewMedia,
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
                onViewMedia={onViewMedia}
                onSelect={onSelect ? ((selected) => onSelect(selected || node)) : undefined}
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
                  onQuote={onQuote}
                  onViewMedia={onViewMedia}
                  onSelect={onSelect}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default function ThreadView ({ state, onReload, onReply, onQuote, onViewMedia, onSelectPost }) {
  const { loading, error, data } = state || {}
  const parents = Array.isArray(data?.parents) ? data.parents : []
  const focus = data?.focus || null

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
        <ThreadNodeList
          nodes={threadNodes}
          highlightUri={focus?.uri}
          onReply={onReply}
          onQuote={onQuote}
          onViewMedia={onViewMedia}
          onSelect={onSelectPost}
        />
      ) : null}
    </div>
  )
}
