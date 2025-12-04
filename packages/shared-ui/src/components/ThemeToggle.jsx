import PropTypes from 'prop-types'
import { SunIcon } from '@radix-ui/react-icons'

function classNames (...parts) {
  return parts.filter(Boolean).join(' ')
}

const baseClasses = 'inline-flex items-center gap-3 rounded-2xl border border-border bg-background-subtle text-sm font-medium text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50'

const variantClasses = {
  default: 'w-full px-4 py-2',
  compact: 'px-3 py-1.5',
  icon: 'h-11 w-11 p-0 justify-center'
}

export default function ThemeToggle ({
  icon: Icon = SunIcon,
  label = 'Theme',
  modeLabel = '',
  nextColor,
  nextBorderColor,
  onToggle,
  ariaLabel,
  disabled = false,
  className = '',
  variant = 'default'
}) {
  const indicatorColor = nextColor || 'var(--theme-toggle-next, currentColor)'
  const indicatorBorder = nextBorderColor || indicatorColor
  const resolvedVariant = variantClasses[variant] || variantClasses.default
  const isIconVariant = variant === 'icon'

  return (
    <button
      type='button'
      onClick={onToggle}
      disabled={disabled}
      aria-label={ariaLabel}
      className={classNames(baseClasses, resolvedVariant, className)}
    >
      {Icon ? (
        <span className={classNames('inline-flex items-center justify-center rounded-2xl border border-border bg-background p-1 text-foreground', isIconVariant ? 'h-9 w-9' : 'h-10 w-10 shrink-0')}>
          <Icon className={classNames('h-4 w-4', isIconVariant ? '' : 'md:h-5 md:w-5')} />
        </span>
      ) : null}

      {!isIconVariant ? (
        <span className='flex min-w-0 flex-col leading-tight'>
          <span className='text-xs font-medium uppercase tracking-wide text-foreground-muted'>{label}</span>
          <span className='text-sm font-semibold text-foreground truncate'>{modeLabel || '—'}</span>
        </span>
      ) : (
        <span className='sr-only'>{label}: {modeLabel || '—'}</span>
      )}
      <span className='ml-auto flex items-center gap-2'>        
        <span
          className='inline-flex h-4 w-4 rounded-full border'
          style={{ backgroundColor: indicatorColor, borderColor: indicatorBorder }}
          aria-hidden='true'
        />
      </span>
    </button>
  )
}

ThemeToggle.propTypes = {
  icon: PropTypes.elementType,
  label: PropTypes.string,
  modeLabel: PropTypes.string,
  nextColor: PropTypes.string,
  nextBorderColor: PropTypes.string,
  onToggle: PropTypes.func,
  ariaLabel: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'compact', 'icon'])
}
