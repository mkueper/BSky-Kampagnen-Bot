import { useMemo } from 'react'
import { ChatBubbleIcon, LoopIcon, HeartIcon, HeartFilledIcon } from '@radix-ui/react-icons'
import { useCardConfig } from '../../context/CardConfigContext.jsx'
import { useBskyEngagement } from '../shared'

function extractImagesFromEmbed (item) {
  try {
    const post = item?.raw?.post || {}
    const e = post?.embed || {}
    /**
     * Possible shapes:
     * - { $type: 'app.bsky.embed.images#view', images: [{ thumb, fullsize, alt }] }
     * - { $type: 'app.bsky.embed.recordWithMedia#view', media: { $type: 'app.bsky.embed.images#view', images: [...] } }
     */
    const t1 = e?.$type
    const t2 = e?.media?.$type
    const isImg1 = typeof t1 === 'string' && t1.startsWith('app.bsky.embed.images')
    const isImg2 = typeof t2 === 'string' && t2.startsWith('app.bsky.embed.images')
    const imgView = isImg1 ? e : (isImg2 ? e.media : null)
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

function extractExternalFromEmbed (item) {
  try {
    const post = item?.raw?.post || {}
    const e = post?.embed || {}
    const t1 = e?.$type
    const t2 = e?.media?.$type
    const isExt1 = typeof t1 === 'string' && t1.startsWith('app.bsky.embed.external')
    const isExt2 = typeof t2 === 'string' && t2.startsWith('app.bsky.embed.external')
    const extView = isExt1 ? e : (isExt2 ? e.media : null)
    const ext = extView?.external || null
    if (!ext || !ext?.uri) return null
    const url = new URL(ext.uri)
    const domain = url.hostname.replace(/^www\./, '')
    return {
      uri: ext.uri,
      title: ext.title || domain,
      description: ext.description || '',
      thumb: ext.thumb || '',
      domain
    }
  } catch { return null }
}

export default function SkeetItem({ item, variant = 'card', onReply, onSelect }) {
  const { author = {}, text = '', createdAt, stats = {} } = item || {}
  const images = useMemo(() => extractImagesFromEmbed(item), [item])
  const external = useMemo(() => extractExternalFromEmbed(item), [item])
  const { config } = useCardConfig()
  const {
    likeCount,
    repostCount,
    hasLiked,
    hasReposted,
    busy,
    refreshing,
    error: actionError,
    toggleLike,
    toggleRepost,
    refresh,
    clearError,
  } = useBskyEngagement({
    uri: item?.uri,
    cid: item?.cid || item?.raw?.post?.cid,
    initialLikes: stats?.likeCount,
    initialReposts: stats?.repostCount,
    viewer: item?.raw?.post?.viewer || item?.viewer,
  })
  const likeStyle = hasLiked ? { color: '#e11d48' } : undefined // rose-600
  const repostStyle = hasReposted ? { color: '#0ea5e9' } : undefined // sky-500
  const Wrapper = variant === 'card' ? 'article' : 'div'
  const baseCls = variant === 'card'
    ? 'rounded-2xl border border-border bg-background p-4 shadow-soft'
    : 'px-1'
  const handleSelect = (event) => {
    if (typeof onSelect !== 'function') return
    if (event) {
      const target = event.target
      if (target?.closest?.('button, a, input, textarea')) return
      event.preventDefault()
    }
    onSelect(item)
  }

  const body = (
    <>
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
              className='w-full rounded-xl border border-border'
              style={{
                ...(config?.mode === 'fixed'
                  ? { height: (config?.singleMax ?? 360), maxHeight: (config?.singleMax ?? 360) }
                  : { maxHeight: (config?.singleMax ?? 360) }),
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                backgroundColor: 'var(--background-subtle, #f6f6f6)'
              }}
              loading='lazy'
            />
          ) : (
            <div className='grid gap-2'
              style={{ gridTemplateColumns: images.length === 2 ? '1fr 1fr' : '1fr 1fr' }}
            >
              {images.map((im, idx) => (
                <img
                  key={idx}
                  src={im.src}
                  alt={im.alt || ''}
                  className='w-full rounded-xl border border-border'
                  style={{
                    ...(config?.mode === 'fixed'
                      ? { height: (config?.multiMax ?? 180), maxHeight: (config?.multiMax ?? 180) }
                      : { maxHeight: (config?.multiMax ?? 180) }),
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain',
                    backgroundColor: 'var(--background-subtle, #f6f6f6)'
                  }}
                  loading='lazy'
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {external && images.length === 0 ? (
        <a
          href={external.uri}
          target='_blank'
          rel='noopener noreferrer nofollow'
          className='mt-3 block rounded-xl border border-border bg-background-subtle hover:bg-background-subtle/80 transition'
          data-component='BskyExternalCard'
        >
          <div className='flex gap-3 p-3 items-start'>
            {external.thumb ? (
              <img
                src={external.thumb}
                alt=''
                className='h-20 w-28 shrink-0 rounded-lg border border-border object-cover'
                loading='lazy'
              />
            ) : null}
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold text-foreground'>{external.title}</p>
              {external.description ? (
                <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{external.description}</p>
              ) : null}
              <p className='mt-1 text-xs text-foreground-subtle'>{external.domain}</p>
            </div>
          </div>
        </a>
      ) : null}
    </>
  )

  return (
    <Wrapper className={baseCls} data-variant={variant} data-component='BskySkeetItem'>
      {typeof onSelect === 'function' ? (
        <div
          role='button'
          tabIndex={0}
          className='-mx-1 rounded-xl px-1 py-0.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70 hover:bg-background-subtle/50 cursor-pointer'
          onClick={handleSelect}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              handleSelect(event)
            }
          }}
        >
          {body}
        </div>
      ) : body}
      <footer className='mt-3 flex items-center gap-5 text-sm text-foreground-muted'>
        <button
          type='button'
          className='group inline-flex items-center gap-2 hover:text-foreground transition'
          title='Antworten'
          onClick={() => {
            if (typeof onReply === 'function') {
              clearError()
              onReply({ uri: item?.uri, cid: item?.cid || item?.raw?.post?.cid })
            }
          }}
        >
          <ChatBubbleIcon className='h-5 w-5 md:h-6 md:w-6' />
          <span className='tabular-nums'>{Number(item?.stats?.replyCount ?? 0)}</span>
        </button>
        <button
          type='button'
          className={`group inline-flex items-center gap-2 transition ${busy ? 'opacity-60' : ''}`}
          style={repostStyle}
          title='Reskeet'
          aria-pressed={hasReposted}
          disabled={busy}
          onClick={toggleRepost}
        >
          <LoopIcon className='h-5 w-5 md:h-6 md:w-6' />
          <span className='tabular-nums'>{repostCount}</span>
        </button>
        <button
          type='button'
          className={`group inline-flex items-center gap-2 transition ${busy ? 'opacity-60' : ''}`}
          style={likeStyle}
          title='Gefällt mir'
          aria-pressed={hasLiked}
          disabled={busy}
          onClick={toggleLike}
        >
          {hasLiked ? (
            <HeartFilledIcon className='h-5 w-5 md:h-6 md:w-6' />
          ) : (
            <HeartIcon className='h-5 w-5 md:h-6 md:w-6' />
          )}
          <span className='tabular-nums'>{likeCount}</span>
        </button>
        <button
          type='button'
          className={`ml-auto inline-flex items-center gap-2 rounded-full border border-border px-2 py-1 text-xs hover:bg-background-subtle ${refreshing ? 'opacity-60' : ''}`}
          onClick={refresh}
        >
          {refreshing ? 'Aktualisiere…' : 'Aktualisieren'}
        </button>
      </footer>
      {actionError ? (
        <p className='mt-2 text-xs text-red-600'>{actionError}</p>
      ) : null}
    </Wrapper>
  )
}
