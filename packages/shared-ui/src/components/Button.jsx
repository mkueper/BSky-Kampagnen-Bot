import React, { forwardRef } from 'react'
import PropTypes from 'prop-types'

const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60'

const sizeClasses = {
  md: 'px-4 py-2',
  pill: 'px-3 py-1',
  icon: 'h-9 w-9 rounded-full p-0'
}

const variantClasses = {
  primary: 'bg-primary text-primary-foreground shadow-soft hover:opacity-95',
  secondary: 'border border-border bg-background-subtle text-foreground hover:bg-background',
  ghost: 'text-foreground hover:bg-background-subtle',
  outline: 'border border-border bg-background text-foreground hover:bg-background-subtle',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  warning: 'border border-amber-400 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20',
  neutral: 'border border-border bg-background text-foreground hover:bg-background-subtle'
}

function classNames (...classes) {
  return classes.filter(Boolean).join(' ')
}

const isButtonTag = (Tag) => typeof Tag === 'string' && Tag.toLowerCase() === 'button'

const Button = forwardRef(function Button (
  {
    as: Tag = 'button',
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const resolvedSize = sizeClasses[size] || sizeClasses.md
  const resolvedVariant = variantClasses[variant] || variantClasses.primary
  const buttonClassName = classNames(baseClasses, resolvedSize, resolvedVariant, className)
  const props = {
    ref,
    className: buttonClassName,
    ...rest
  }

  if (isButtonTag(Tag)) {
    props.type = type
    props.disabled = disabled
  } else if (disabled) {
    props['aria-disabled'] = true
    if (props.tabIndex === undefined) props.tabIndex = -1
  }

  return (
    <Tag {...props}>{children}</Tag>
  )
})

Button.displayName = 'Button'

Button.propTypes = {
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'outline', 'destructive', 'warning', 'neutral']),
  size: PropTypes.oneOf(['md', 'pill', 'icon']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node
}

export default Button
