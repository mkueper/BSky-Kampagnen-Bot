import { Button } from '../shared'
import SkeetItem from './SkeetItem'

function ReplyList ({ nodes = [], depth = 0, onReply, onSelect }) {
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
                onSelect={onSelect ? (() => onSelect(node)) : undefined}
              />
            </div>
            {node?.replies?.length ? (
              <div className='mt-4'>
                <ReplyList nodes={node.replies} depth={depth + 1} onReply={onReply} onSelect={onSelect} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default function ThreadView ({ state, onReload, onReply, onSelectPost }) {
  const { loading, error, data } = state || {}
  const parents = Array.isArray(data?.parents) ? data.parents : []
  const focus = data?.focus || null
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
          {parents.length > 0 ? (
            <section className='space-y-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Vorherige Posts</p>
              {parents.map((parent) => (
                <SkeetItem
                  key={parent?.uri || parent?.cid}
                  item={parent}
                  onReply={onReply}
                  onSelect={onSelectPost ? (() => onSelectPost(parent)) : undefined}
                />
              ))}
            </section>
          ) : null}
          <section className='space-y-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Ausgewählter Beitrag</p>
            <SkeetItem item={focus} onReply={onReply} />
          </section>
          <section className='space-y-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Antworten</p>
            {focus.replies?.length ? (
              <ReplyList nodes={focus.replies} onReply={onReply} onSelect={onSelectPost} />
            ) : (
              <p className='text-sm text-foreground-muted'>Noch keine Antworten.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}







