import PropTypes from 'prop-types'
import * as Popover from '@radix-ui/react-popover'
import { forwardRef } from 'react'

export function InlineMenuTrigger ({ asChild = true, children, ...rest }) {
  return (
    <Popover.Trigger asChild={asChild} {...rest}>
      {children}
    </Popover.Trigger>
  )
}

InlineMenuTrigger.propTypes = {
  asChild: PropTypes.bool,
  children: PropTypes.node
}

export const InlineMenuContent = forwardRef(function InlineMenuContent ({
  align = 'end',
  side = 'top',
  sideOffset = 8,
  withArrow = false,
  portalled = true,
  className = '',
  children,
  style,
  ...rest
}, ref) {
  const content = (
    <Popover.Content
      ref={ref}
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={`z-[250] rounded-2xl border border-border bg-background shadow-2xl focus-visible:outline-none ${className}`}
      style={{ minWidth: 160, ...style }}
      {...rest}
    >
      {children}
      {withArrow ? (
        <Popover.Arrow className='fill-background stroke-border' />
      ) : null}
    </Popover.Content>
  )
  return portalled ? <Popover.Portal>{content}</Popover.Portal> : content
})

InlineMenuContent.propTypes = {
  align: PropTypes.oneOf(['start', 'center', 'end']),
  side: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
  sideOffset: PropTypes.number,
  withArrow: PropTypes.bool,
  portalled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
  style: PropTypes.object
}

export function InlineMenuItem ({ icon: Icon, children, onSelect, disabled = false, variant = 'default' }) {
  const variantStyles = {
    default: {
      container: 'text-foreground hover:bg-background-subtle/80 dark:hover:bg-primary/10 hover:shadow-sm',
      icon: 'text-foreground-muted'
    },
    destructive: {
      container: 'text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/15',
      icon: 'text-destructive'
    },
    warning: {
      container: 'text-amber-900 bg-amber-100 font-semibold rounded-full hover:bg-amber-200 dark:text-amber-100 dark:bg-amber-400/20 dark:hover:bg-amber-300/30',
      icon: 'text-amber-700 dark:text-amber-200'
    }
  }
  const currentVariant = variantStyles[variant] || variantStyles.default
  return (
    <button
      type='button'
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${currentVariant.container} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {Icon ? <Icon className={`h-4 w-4 ${currentVariant.icon}`} /> : null}
      <span className={variant === 'destructive' ? 'text-destructive' : variant === 'warning' ? 'text-amber-900 dark:text-amber-100' : 'text-foreground'}>{children}</span>
    </button>
  )
}

InlineMenuItem.propTypes = {
  icon: PropTypes.elementType,
  children: PropTypes.node,
  onSelect: PropTypes.func,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'destructive', 'warning'])
}

export function InlineMenu ({ open, onOpenChange, children }) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Popover.Root>
  )
}

InlineMenu.propTypes = {
  open: PropTypes.bool,
  onOpenChange: PropTypes.func,
  children: PropTypes.node
}
