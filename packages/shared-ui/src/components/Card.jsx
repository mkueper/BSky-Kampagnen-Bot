import { forwardRef } from 'react'
import PropTypes from 'prop-types'

const backgroundVariants = {
  default: 'bg-background',
  subtle: 'bg-background-subtle',
  elevated: 'bg-background-elevated',
  transparent: ''
}

const hoverClasses = 'hover:-translate-y-0.5 hover:bg-background-elevated hover:shadow-card'

function classNames (...classes) {
  return classes.filter(Boolean).join(' ')
}

const Card = forwardRef(function Card (
  {
    as: Tag = 'article',
    background = 'default',
    padding = 'p-5',
    hover = false,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const resolvedBackground = backgroundVariants[background] ?? background ?? ''
  const resolvedHover = hover ? hoverClasses : ''
  const cardClassName = classNames(
    'group rounded-2xl border border-border shadow-soft transition',
    resolvedBackground,
    padding,
    resolvedHover,
    className
  )

  return (
    <Tag ref={ref} className={cardClassName} {...rest}>
      {children}
    </Tag>
  )
})

Card.displayName = 'Card'

Card.propTypes = {
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  background: PropTypes.string,
  padding: PropTypes.string,
  hover: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node
}

export default Card
