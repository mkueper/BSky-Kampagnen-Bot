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
  className = '',
  wrapInCard = true
}) {
  const headerInner = (
    <>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <button
            type='button'
            onClick={onBack}
            aria-label={backLabel}
            className='inline-flex items-center justify-center rounded-full border border-border px-3 py-2 text-sm text-foreground transition hover:bg-background-subtle'
          >
            <ArrowLeftIcon className='h-4 w-4' />
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
    </>
  )

  if (!wrapInCard) {
    return (
      <div className={clsx('flex flex-col gap-3', className)}>
        {headerInner}
      </div>
    )
  }

  return (
    <header
      className={clsx(
        'sticky top-0 z-20 mb-4 rounded-2xl border border-border bg-background-elevated/80 px-3 py-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60 sm:px-5 sm:py-4',
        className
      )}
      data-component='DetailPaneHeader'
    >
      {headerInner}
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
  className: PropTypes.string,
  wrapInCard: PropTypes.bool
}
