import PropTypes from 'prop-types'
import { SunIcon } from '@radix-ui/react-icons'

function classNames (...parts) {
  return parts.filter(Boolean).join(' ')
}

const baseClasses = 'inline-flex items-center gap-3 rounded-2xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50'

const sizeClasses = {
  default: 'w-full px-4 py-2',
  compact: 'px-3 py-1.5',
  icon: 'h-11 w-11 p-0 justify-center',
  sidebar: 'h-12 w-12 p-0 justify-center lg:h-auto lg:px-4 lg:py-3'
}

const appearanceClasses = {
  default: 'border border-border bg-background-subtle text-foreground hover:bg-background dark:hover:bg-primary/10 focus-visible:ring-primary/60',
  inverted: 'border border-foreground bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-background/60',
  subtle: 'border border-border/60 bg-transparent text-foreground hover:bg-background-subtle dark:hover:bg-primary/10 focus-visible:ring-foreground/40'
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
  variant = 'default',
  size = 'default',
  layout = 'detailed',
  hideIcon = false,
  iconStyle = 'boxed',
  showIndicator = true
}) {
  const indicatorColor = nextColor || 'var(--theme-toggle-next, currentColor)'
  const indicatorBorder = nextBorderColor || indicatorColor
  const isAppearanceVariant = Boolean(appearanceClasses[variant])
  const resolvedAppearance = isAppearanceVariant ? variant : 'default'
  const inferredSize = !isAppearanceVariant && sizeClasses[variant] ? variant : size
  const resolvedSize = sizeClasses[inferredSize] ? inferredSize : 'default'
  const sizeClassName = sizeClasses[resolvedSize] || sizeClasses.default
  const appearanceClassName = appearanceClasses[resolvedAppearance] || appearanceClasses.default
  const isIconSize = resolvedSize === 'icon'
  const showSimpleLayout = !isIconSize && layout === 'simple'
  const accessibleLabel = `${label}: ${modeLabel || '—'}`
  const resolvedAriaLabel = ariaLabel || accessibleLabel
  const showIcon = Boolean(Icon) && !hideIcon
  const useBoxedIcon = iconStyle !== 'inline' || isIconSize
  const iconWrapperClassName = useBoxedIcon
    ? classNames(
      'inline-flex items-center justify-center rounded-2xl border border-border bg-background p-1 text-foreground',
      isIconSize || showSimpleLayout ? 'h-8 w-8' : 'h-10 w-10 shrink-0'
    )
    : 'inline-flex h-4 w-4 shrink-0 items-center justify-center text-foreground'
  const iconInnerClassName = classNames('h-4 w-4', isIconSize ? '' : 'md:h-5 md:w-5')

  return (
    <button
      type='button'
      onClick={onToggle}
      disabled={disabled}
      aria-label={resolvedAriaLabel}
      className={classNames(baseClasses, sizeClassName, appearanceClassName, className)}
    >
      {showIcon ? (
        <span className={iconWrapperClassName}>
          <Icon className={iconInnerClassName} />
        </span>
      ) : null}

      {!isIconSize ? (
        showSimpleLayout ? (
          <span className='inline-flex flex-1 items-center justify-between gap-2'>
            <span className='text-sm font-semibold text-foreground'>{label}</span>
            <span className='text-xs font-medium text-foreground-muted'>{modeLabel || '—'}</span>
          </span>
        ) : (
          <span className='flex min-w-0 flex-col leading-tight'>
            <span className='text-xs font-medium uppercase tracking-wide text-foreground-muted'>{label}</span>
          </span>
        )
      ) : (
        <span className='sr-only'>{accessibleLabel}</span>
      )}
      {showIndicator ? (
        <span className='ml-auto flex items-center gap-2'>
          <span
            className='inline-flex h-4 w-4 rounded-full border'
            style={{ backgroundColor: indicatorColor, borderColor: indicatorBorder }}
            aria-hidden='true'
          />
        </span>
      ) : null}
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
  variant: PropTypes.oneOf(['default', 'inverted', 'subtle', 'compact', 'icon']),
  size: PropTypes.oneOf(['default', 'compact', 'icon', 'sidebar']),
  layout: PropTypes.oneOf(['detailed', 'simple']),
  hideIcon: PropTypes.bool,
  iconStyle: PropTypes.oneOf(['boxed', 'inline']),
  showIndicator: PropTypes.bool
}
