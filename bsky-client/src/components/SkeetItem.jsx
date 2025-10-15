export default function SkeetItem({ item, variant = 'card' }) {
  const { author = {}, text = '', createdAt, stats = {} } = item || {}
  const Wrapper = variant === 'card' ? 'article' : 'div'
  const baseCls = variant === 'card'
    ? 'rounded-2xl border border-border bg-background p-4 shadow-soft'
    : 'px-1'
  return (
    <Wrapper className={baseCls} data-variant={variant} data-component='BskySkeetItem'>
      <header className='flex items-center gap-3'>
        {author.avatar ? (
          <img src={author.avatar} alt='' className='h-10 w-10 shrink-0 rounded-full border border-border object-cover' />
        ) : (
          <div className='h-10 w-10 shrink-0 rounded-full border border-border bg-background-subtle' />
        )}
        <div className='min-w-0'>
          <p className='truncate font-semibold text-foreground'>{author.displayName || author.handle}</p>
          <p className='truncate text-sm text-foreground-muted'>@{author.handle}</p>
        </div>
        {createdAt ? (
          <time className='ml-auto whitespace-nowrap text-xs text-foreground-muted' dateTime={createdAt}>
            {new Date(createdAt).toLocaleString('de-DE')}
          </time>
        ) : null}
      </header>
      <p className='mt-3 whitespace-pre-wrap break-words text-sm text-foreground'>{text}</p>
      <footer className='mt-3 flex items-center gap-4 text-xs text-foreground-muted'>
        <span>❤ {stats.likeCount ?? 0}</span>
        <span>🔁 {stats.repostCount ?? 0}</span>
        <span>💬 {stats.replyCount ?? 0}</span>
      </footer>
    </Wrapper>
  )
}

