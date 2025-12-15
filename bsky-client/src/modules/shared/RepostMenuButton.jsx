import { useState } from 'react'
import { LoopIcon, QuoteIcon } from '@radix-ui/react-icons'
import { InlineMenu, InlineMenuTrigger, InlineMenuContent, InlineMenuItem } from '@bsky-kampagnen-bot/shared-ui'

export default function RepostMenuButton ({
  count,
  hasReposted,
  hasQuoted,
  busy,
  style,
  onRepost,
  onUnrepost,
  onQuote,
  onUnquote
}) {
  const [open, setOpen] = useState(false)

  const handleRepost = () => {
    setOpen(false)
    onRepost?.()
  }

  const handleUnrepost = () => {
    setOpen(false)
    onUnrepost?.()
  }

  const handleQuote = () => {
    setOpen(false)
    onQuote?.()
  }

  const handleUnquote = () => {
    setOpen(false)
    onUnquote?.()
  }

  const showQuoteAction = Boolean(onQuote) && !hasQuoted

  return (
    <InlineMenu open={open} onOpenChange={setOpen}>
      <InlineMenuTrigger>
        <button
          type='button'
          className={`group inline-flex items-center gap-2 transition ${busy ? 'opacity-60' : ''}`}
          style={style}
          title={hasReposted ? 'Reskeet rückgängig machen' : 'Reskeet-Optionen'}
          aria-expanded={open}
          disabled={busy}
        >
          <LoopIcon className='h-5 w-5 md:h-6 md:w-6' />
          <span className='tabular-nums'>{count}</span>
        </button>
      </InlineMenuTrigger>
      <InlineMenuContent side='bottom' align='center' sideOffset={10} style={{ width: 220 }}>
        <div className='py-1 text-sm'>
          {!hasReposted ? (
            <InlineMenuItem icon={LoopIcon} onSelect={handleRepost}>
              Reposten
            </InlineMenuItem>
          ) : null}
          {hasReposted ? (
            <InlineMenuItem icon={LoopIcon} onSelect={handleUnrepost} disabled={!onUnrepost}>
              Reskeet zurückziehen
            </InlineMenuItem>
          ) : null}
          {hasQuoted ? (
            <InlineMenuItem icon={QuoteIcon} onSelect={handleUnquote} disabled={!onUnquote}>
              Zitierten Reskeet zurückziehen
            </InlineMenuItem>
          ) : null}
          {showQuoteAction ? (
            <InlineMenuItem icon={QuoteIcon} onSelect={handleQuote}>
              Post zitieren
            </InlineMenuItem>
          ) : null}
        </div>
      </InlineMenuContent>
    </InlineMenu>
  )
}
