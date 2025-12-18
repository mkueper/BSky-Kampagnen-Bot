import { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import { useAppDispatch } from '../../context/AppContext.jsx'
import { ProfilePreviewTrigger } from './ProfilePreview.jsx'

const noop = () => {}

const normalizeHandle = (value) => {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
}

export default function ActorProfileLink ({
  actor = '',
  handle = '',
  label = '',
  children = null,
  className = '',
  stopPropagation = true,
  title = '',
  disablePreview = false,
  onOpen = noop,
  anchor = null
}) {
  const dispatch = useAppDispatch()
  const actorIdentifier = (actor || handle || '').trim()
  const normalizedHandle = useMemo(() => normalizeHandle(handle), [handle])
  const fallbackLabel = label || (children ? '' : (normalizedHandle ? `@${normalizedHandle}` : actorIdentifier))
  const displayContent = children || fallbackLabel || ''
  const ariaLabel = title || (normalizedHandle ? `@${normalizedHandle}` : actorIdentifier) || undefined

  const handleClick = useCallback((event) => {
    if (stopPropagation) {
      event?.preventDefault?.()
      event?.stopPropagation?.()
    }
    if (!actorIdentifier) return
    dispatch({
      type: 'OPEN_PROFILE_VIEWER',
      actor: actorIdentifier,
      anchor: anchor || null
    })
    onOpen(actorIdentifier)
  }, [actorIdentifier, anchor, dispatch, onOpen, stopPropagation])

  if (!actorIdentifier) {
    return <span className={className}>{displayContent}</span>
  }

  const baseClass = 'inline-flex max-w-full items-center truncate text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
  const finalClass = className ? `${baseClass} ${className}` : baseClass

  const content = disablePreview
    ? displayContent
    : (
        <ProfilePreviewTrigger
          actor={actorIdentifier}
          fallback={{ handle: normalizedHandle || actorIdentifier }}
          as='span'
        >
          {displayContent}
        </ProfilePreviewTrigger>
      )

  return (
    <button
      type='button'
      onClick={handleClick}
      className={finalClass}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  )
}

ActorProfileLink.propTypes = {
  actor: PropTypes.string,
  handle: PropTypes.string,
  label: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  stopPropagation: PropTypes.bool,
  title: PropTypes.string,
  disablePreview: PropTypes.bool,
  onOpen: PropTypes.func,
  anchor: PropTypes.string
}
