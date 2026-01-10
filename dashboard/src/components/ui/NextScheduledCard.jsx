import { useMemo } from 'react'
import { Card } from '@bsky-kampagnen-bot/shared-ui'
import ContentWithLinkPreview from '../ContentWithLinkPreview.jsx'

function formatDateParts (value, locale) {
  if (!value) {
    return { dateText: '', timeText: '' }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { dateText: value, timeText: '' }
  }

  const dateText = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
  const timeText = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)

  return { dateText, timeText }
}

function NextScheduledCard ({
  title,
  scheduledAt,
  content,
  media = [],
  showMedia = false,
  useLinkPreview = false,
  maxLines,
  emptyLabel,
  noContentLabel,
  onActivate,
  ariaLabel,
  className
}) {
  const locale =
    typeof navigator !== 'undefined' && navigator.language
      ? navigator.language
      : 'de-DE'
  const { dateText, timeText } = useMemo(
    () => formatDateParts(scheduledAt, locale),
    [scheduledAt, locale]
  )
  const hasSchedule = Boolean(scheduledAt)
  const normalizedMaxLines = Number(maxLines)
  const clampStyle = Number.isFinite(normalizedMaxLines)
    ? {
        display: '-webkit-box',
        WebkitLineClamp: normalizedMaxLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    : undefined
  const mediaItems = Array.isArray(media) ? media : []
  const hasMedia = showMedia && mediaItems.length > 0
  const summary =
    (content ?? '')
      .toString()
      .trim() || noContentLabel

  const interactive = typeof onActivate === 'function'
  const interactionHandlers = interactive
    ? {
        onClick: onActivate,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onActivate()
          }
        },
        role: 'button',
        tabIndex: 0,
        'aria-label': ariaLabel || title,
        title: ariaLabel || title
      }
    : {}
  const baseClasses = 'border-border-muted bg-background-subtle/60'
  const cardClassName = `${baseClasses} ${className || ''}${
    interactive ? ' cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''
  }`.trim()

  return (
    <Card padding='p-6' className={cardClassName || undefined} {...interactionHandlers}>
      <h3 className='text-lg font-semibold text-foreground'>
        {title}
      </h3>
      {hasSchedule ? (
        <div className='mt-4 space-y-3 text-sm'>
          <div className='flex flex-col'>
            <p className='text-base font-semibold text-foreground leading-tight break-words'>
              {dateText}
            </p>
            {timeText ? (
              <p className='text-sm text-foreground-muted leading-snug'>
                {timeText} Uhr
              </p>
            ) : null}
          </div>
          {useLinkPreview ? (
            <div className='space-y-3'>
              <ContentWithLinkPreview
                content={(content ?? '').toString()}
                className='text-foreground-muted whitespace-pre-wrap break-words'
                mediaCount={hasMedia ? mediaItems.length : 0}
                textStyle={clampStyle}
              />
              {hasMedia ? (
                <div className='grid grid-cols-2 gap-2'>
                  {mediaItems.slice(0, 4).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className='relative h-24 overflow-hidden rounded-xl border border-border bg-background-subtle/70'
                    >
                      <img
                        src={item.previewUrl || ''}
                        alt={item.altText || `Bild ${idx + 1}`}
                        className='absolute inset-0 h-full w-full object-contain'
                        loading='lazy'
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p
              className='text-foreground-muted whitespace-pre-wrap break-words'
              style={clampStyle}
            >
              {summary}
            </p>
          )}
        </div>
      ) : (
        <p className='mt-4 text-sm text-foreground-muted'>
          {emptyLabel}
        </p>
      )}
    </Card>
  )
}

export default NextScheduledCard
