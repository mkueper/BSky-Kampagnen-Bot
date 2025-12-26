import PropTypes from 'prop-types'
import { RichText } from '../shared'

export default function ReplyPreviewCard ({ info, t, className = '' }) {
  if (!info) return null
  const label = info.author.displayName || info.author.handle || t('compose.context.authorMissing', 'Autorinformationen wurden nicht mitgeliefert.')
  const authorMissing = !(info.author.displayName || info.author.handle)

  return (
    <div className={`rounded-2xl border border-border bg-background-subtle px-3 py-3 text-sm text-foreground ${className}`.trim()}>
      <div className='mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
        {t('compose.context.replyLabel', 'Antwort auf')}
      </div>
      <div className='flex items-start gap-3'>
        {info.author.avatar ? (
          <img
            src={info.author.avatar}
            alt=''
            className='h-10 w-10 shrink-0 rounded-full border border-border object-cover'
          />
        ) : (
          <div className='h-10 w-10 shrink-0 rounded-full border border-border bg-background-subtle' />
        )}
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-semibold text-foreground'>
            {label}
          </p>
          {authorMissing ? (
            <p className='text-xs text-foreground-muted'>
              {t('compose.context.authorMissing', 'Autorinformationen wurden nicht mitgeliefert.')}
            </p>
          ) : null}
          {info.author.handle ? (
            <p className='truncate text-xs text-foreground-muted'>@{info.author.handle}</p>
          ) : null}
          {info.text ? (
            <div className='mt-2 text-sm text-foreground'>
              <RichText
                text={info.text}
                className='whitespace-pre-wrap break-words text-sm text-foreground'
                hashtagContext={{ authorHandle: info?.author?.handle }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

ReplyPreviewCard.propTypes = {
  info: PropTypes.shape({
    author: PropTypes.shape({
      displayName: PropTypes.string,
      handle: PropTypes.string,
      avatar: PropTypes.string
    }),
    text: PropTypes.string
  }),
  t: PropTypes.func.isRequired,
  className: PropTypes.string
}
