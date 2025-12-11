import React from 'react'
import PropTypes from 'prop-types'

const defaultLabels = {
  imageAlt: index => `Image ${index}`,
  altBadge: 'ALT',
  altAddBadge: '+ ALT',
  altEditTitle: 'Edit alt text',
  altAddTitle: 'Add alt text',
  removeTitle: 'Remove image',
  removeAria: 'Remove image'
}

function resolveItems (items, maxCount) {
  if (!Array.isArray(items)) return []
  if (Number.isFinite(maxCount) && maxCount > 0) {
    return items.slice(0, maxCount)
  }
  return items
}

export default function SegmentMediaGrid ({
  items,
  maxCount,
  onEditAlt,
  onRemove,
  labels = {},
  className = ''
}) {
  const availableItems = resolveItems(items, maxCount)
  if (!availableItems.length) {
    return null
  }
  const resolvedLabels = { ...defaultLabels, ...labels }
  const handleAlt = (event, item) => {
    event.preventDefault()
    event.stopPropagation()
    if (typeof onEditAlt === 'function') {
      onEditAlt(item)
    }
  }
  const handleRemove = (event, item) => {
    event.preventDefault()
    event.stopPropagation()
    if (typeof onRemove === 'function') {
      onRemove(item)
    }
  }

  return (
    <div className={`mt-2 grid grid-cols-2 gap-2 ${className}`}>
      {availableItems.map((item, idx) => {
        const key =
          item.id ??
          item.tempId ??
          `${item.type}-${item.pendingIndex ?? idx}-${idx}`
        const altText =
          item.alt || resolvedLabels.imageAlt(idx + 1)
        return (
          <div
            key={key}
            className='relative h-28 overflow-hidden rounded-xl border border-border bg-background-subtle'
          >
            <img
              src={item.src}
              alt={altText}
              className='absolute inset-0 h-full w-full object-contain'
            />
            {typeof onEditAlt === 'function' ? (
              <button
                type='button'
                className={`absolute left-1 top-1 z-10 rounded-full px-2 py-1 text-[10px] font-semibold text-white ${
                  item.alt
                    ? 'bg-black/60'
                    : 'bg-black/90 ring-1 ring-white/30'
                }`}
                title={
                  item.alt
                    ? resolvedLabels.altEditTitle
                    : resolvedLabels.altAddTitle
                }
                aria-label={
                  item.alt
                    ? resolvedLabels.altEditTitle
                    : resolvedLabels.altAddTitle
                }
                onClick={event => handleAlt(event, item)}
              >
                {item.alt ? resolvedLabels.altBadge : resolvedLabels.altAddBadge}
              </button>
            ) : null}
            {typeof onRemove === 'function' ? (
              <button
                type='button'
                className='absolute right-1 top-1 z-10 rounded-full bg-black/60 px-2 py-1 text-white hover:bg-black/80'
                title={resolvedLabels.removeTitle}
                aria-label={resolvedLabels.removeAria}
                onClick={event => handleRemove(event, item)}
              >
                ✕
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

SegmentMediaGrid.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['existing', 'pending']).isRequired,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      tempId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      src: PropTypes.string,
      alt: PropTypes.string,
      pendingIndex: PropTypes.number
    })
  ),
  maxCount: PropTypes.number,
  onEditAlt: PropTypes.func,
  onRemove: PropTypes.func,
  labels: PropTypes.shape({
    imageAlt: PropTypes.func,
    altBadge: PropTypes.string,
    altAddBadge: PropTypes.string,
    altEditTitle: PropTypes.string,
    altAddTitle: PropTypes.string,
    removeTitle: PropTypes.string,
    removeAria: PropTypes.string
  }),
  className: PropTypes.string
}
