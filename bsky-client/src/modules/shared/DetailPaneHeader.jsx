import PropTypes from 'prop-types'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import clsx from 'clsx'

export default function DetailPaneHeader ({
  eyebrow = '',
  title,
  subtitle = '',
  onBack,
  backLabel = 'Zurück',
  actions = null,
  children = null,
  className = ''
}) {
  return (
    <header
      className={clsx(
        'sticky top-0 z-20 mb-4 rounded-2xl border border-border bg-background-elevated/80 px-3 py-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 sm:px-5 sm:py-4',
        className
      )}
      data-component='DetailPaneHeader'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <button
            type='button'
            onClick={onBack}
            aria-label={backLabel}
            className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition hover:border-foreground/70'
          >
            <ArrowLeftIcon className='h-5 w-5' />
          </button>
          <div className='min-w-0 flex-1'>
            {eyebrow ? (
              <p className='text-xs font-semibold uppercase tracking-wide text-foreground-muted'>
                {eyebrow}
              </p>
            ) : null}
            <p className='truncate text-base font-semibold text-foreground'>{title}</p>
            {subtitle ? (
              <p className='truncate text-sm text-foreground-muted'>{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className='flex flex-wrap items-center gap-2'>
            {actions}
          </div>
        ) : null}
      </div>
      {children ? (
        <div className='mt-3'>
          {children}
        </div>
      ) : null}
    </header>
  )
}

DetailPaneHeader.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  backLabel: PropTypes.string,
  actions: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string
}
