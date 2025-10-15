import { useMemo } from 'react'

function extractImagesFromEmbed (item) {
  try {
    const post = item?.raw?.post || {}
    const e = post?.embed || {}
    /**
     * Possible shapes:
     * - { $type: 'app.bsky.embed.images#view', images: [{ thumb, fullsize, alt }] }
     * - { $type: 'app.bsky.embed.recordWithMedia#view', media: { $type: 'app.bsky.embed.images#view', images: [...] } }
     */
    const imgView = e?.$type?.startsWith('app.bsky.embed.images') ? e
      : (e?.media?.$type?.startsWith?.('app.bsky.embed.images') ? e.media : null)
    const images = Array.isArray(imgView?.images) ? imgView.images : []
    return images
      .map(img => ({
        src: img?.fullsize || img?.thumb || '',
        thumb: img?.thumb || img?.fullsize || '',
        alt: img?.alt || ''
      }))
      .filter(im => im.src)
      .slice(0, 4)
  } catch { return [] }
}

export default function SkeetItem({ item, variant = 'card' }) {
  const { author = {}, text = '', createdAt, stats = {} } = item || {}
  const images = useMemo(() => extractImagesFromEmbed(item), [item])
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

      {images.length > 0 ? (
        <div className='mt-3' data-component='BskySkeetImages'>
          {images.length === 1 ? (
            <img
              src={images[0].src}
              alt={images[0].alt || ''}
              className='w-full rounded-xl border border-border object-cover'
              style={{ aspectRatio: '16 / 9' }}
              loading='lazy'
            />
          ) : (
            <div className='grid gap-2'
              style={{ gridTemplateColumns: images.length === 2 ? '1fr 1fr' : '1fr 1fr', gridAutoRows: '1fr' }}
            >
              {images.map((im, idx) => (
                <img
                  key={idx}
                  src={im.src}
                  alt={im.alt || ''}
                  className='h-full w-full rounded-xl border border-border object-cover'
                  style={{ aspectRatio: images.length === 3 && idx === 0 ? '2 / 1' : '1 / 1' }}
                  loading='lazy'
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
      <footer className='mt-3 flex items-center gap-4 text-xs text-foreground-muted'>
        <span>❤ {stats.likeCount ?? 0}</span>
        <span>🔁 {stats.repostCount ?? 0}</span>
        <span>💬 {stats.replyCount ?? 0}</span>
      </footer>
    </Wrapper>
  )
}
