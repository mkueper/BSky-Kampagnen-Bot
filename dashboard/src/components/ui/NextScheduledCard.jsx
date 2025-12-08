import { useMemo } from 'react'
import { Card } from '@bsky-kampagnen-bot/shared-ui'

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
  const cardClassName = `${
    className || ''
  }${interactive ? ' cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''}`.trim()

  return (
    <Card padding='p-6' className={cardClassName || undefined} {...interactionHandlers}>
      <h3 className='text-lg font-semibold text-foreground'>
        {title}
      </h3>
      {hasSchedule ? (
        <div className='mt-3 space-y-2 text-sm'>
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
          <p className='text-foreground-muted'>
            {summary}
          </p>
        </div>
      ) : (
        <p className='mt-3 text-sm text-foreground-muted'>
          {emptyLabel}
        </p>
      )}
    </Card>
  )
}

export default NextScheduledCard
