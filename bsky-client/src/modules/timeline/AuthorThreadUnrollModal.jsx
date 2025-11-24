import { useMemo } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useMediaLightbox } from '../../hooks/useMediaLightbox'
import { buildAuthorTimeline } from './threadUtils'
import { RichText } from '../shared'

function extractImages (item) {
  const embed = item?.raw?.post?.embed || item?.embed || {}
  const images = Array.isArray(embed?.images)
    ? embed.images
    : Array.isArray(embed?.media?.images)
      ? embed.media.images
      : []
  return images
    .map((img) => {
      const src = img?.fullsize || img?.thumb || ''
      if (!src) return null
      return {
        src,
        thumb: img?.thumb || src,
        alt: img?.alt || ''
      }
    })
    .filter(Boolean)
}

function sanitizeThreadText (node) {
  const rawText = node?.text || node?.raw?.post?.record?.text || ''
  if (!rawText) return ''
  const lines = rawText.split(/\r?\n/)
  if (lines.length > 0 && /^\s*(?:[-*•]?\s*)?\d+\s*\/\s*\d+/.test(lines[0])) {
    lines.shift()
  }
  let cleaned = lines.join('\n').trim()
  cleaned = cleaned.replace(/\n{2,}/g, '\n')
  cleaned = cleaned.replace(/\b\d+\s*\/\s*\d+\b/g, '')
  return cleaned
}

export default function AuthorThreadUnrollModal () {
  const dispatch = useAppDispatch()
  const { threadState, threadUnroll } = useAppState()
  const { openMediaPreview } = useMediaLightbox()

  const { data } = threadState || {}
  const authorTimeline = useMemo(() => buildAuthorTimeline(data), [data])
  const author = authorTimeline[authorTimeline.length - 1]?.author || data?.focus?.author || null

  const handleClose = () => {
    dispatch({ type: 'CLOSE_THREAD_UNROLL' })
  }

  if (!threadUnroll?.open || !threadState?.isAuthorThread) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={handleClose} aria-hidden='true' />
      <div className='relative z-50 flex h-[calc(100%-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-soft'>
        <header className='flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-6'>
          <button
            type='button'
            className='inline-flex items-center justify-center rounded-full border border-border px-3 py-2 text-sm text-foreground transition hover:bg-background-subtle'
            onClick={handleClose}
          >
            Zurück
          </button>
          <p className='text-sm font-semibold text-foreground'>Autor-Thread lesen</p>
        </header>
        <div className='flex-1 overflow-y-auto px-4 py-6 sm:px-6'>
          {author ? (
            <div className='flex items-center gap-4'>
              {author.avatar ? (
                <img src={author.avatar} alt='' className='h-12 w-12 rounded-full border border-border object-cover' />
              ) : (
                <div className='h-12 w-12 rounded-full border border-border bg-background-subtle' />
              )}
              <div className='min-w-0'>
                <p className='text-base font-semibold text-foreground truncate'>{author.displayName || author.handle}</p>
                <p className='text-sm text-foreground-muted truncate'>@{author.handle}</p>
              </div>
            </div>
          ) : null}
          <div className='divide-y-2 divide-border'>
            {authorTimeline.map((node) => {
              const images = extractImages(node)
              const sanitizedText = sanitizeThreadText(node)
              return (
                <article
                  key={node?.listEntryId || node?.uri || node?.cid}
                  className='space-y-2 py-4 first:pt-5 last:pb-0'
                >
                  {sanitizedText ? (
                    <RichText
                      text={sanitizedText}
                      facets={node?.raw?.post?.record?.facets}
                      className='whitespace-pre-wrap break-words text-sm text-foreground'
                    />
                  ) : null}
                  {images.length ? (
                    <div className='space-y-2'>
                      {images.map((img, idx) => (
                        <button
                          key={`${node?.uri || idx}-${idx}`}
                          type='button'
                          className='block w-full overflow-hidden rounded-2xl border border-border'
                          onClick={() => openMediaPreview([{ src: img.src, alt: img.alt }], 0)}
                        >
                          <img src={img.src} alt={img.alt} className='w-full' loading='lazy' />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
