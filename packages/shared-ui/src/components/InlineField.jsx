import React from 'react'
import PropTypes from 'prop-types'

const WIDTH_MAP = {
  sm: 'w-full md:max-w-[14rem]',
  md: 'w-full md:max-w-[18rem]',
  lg: 'w-full md:max-w-[22rem]',
  full: 'w-full'
}

function classNames (...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * InlineField bündelt Label, optionale Beschreibung und das zugehörige
 * Form-Control in einer konsistenten Breite, damit Einzel-Felder nicht
 * die gesamte Seitenbreite nutzen müssen.
 */
function InlineField ({
  label,
  htmlFor,
  description = null,
  required = false,
  size = 'md',
  className = '',
  controlClassName = '',
  children
}) {
  const controlWidthClass = WIDTH_MAP[size] || WIDTH_MAP.md

  return (
    <div className={classNames('space-y-2', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className='text-sm font-semibold text-foreground'
        >
          {label}
          {required ? (
            <span aria-hidden='true' className='ml-1 text-destructive'>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {description ? (
        <p className='text-xs text-foreground-muted'>{description}</p>
      ) : null}
      <div className={classNames(controlWidthClass, controlClassName)}>
        {children}
      </div>
    </div>
  )
}

InlineField.propTypes = {
  label: PropTypes.node,
  htmlFor: PropTypes.string,
  description: PropTypes.node,
  required: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'full']),
  className: PropTypes.string,
  controlClassName: PropTypes.string,
  children: PropTypes.node.isRequired
}

export default InlineField
