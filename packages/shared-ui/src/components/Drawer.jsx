import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { getPortalRoot } from '../utils/portal.js'

export default function Drawer ({
  open,
  title,
  children,
  onClose,
  side = 'left',
  panelClassName = '',
  fitContent = false
}) {
  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose?.()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return undefined
    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
    }
  }, [open])

  if (!open) return null

  const isRight = side === 'right'
  const positionClassName = isRight ? 'justify-end' : 'justify-start'
  const widthClassName = fitContent
    ? 'w-max max-w-[85vw]'
    : 'w-[min(320px,85vw)]'
  const edgeClassName = isRight ? 'rounded-l-2xl border-r-0' : 'rounded-r-2xl border-l-0'
  const defaultPanelClassName = `h-full ${widthClassName} rounded-none border border-border bg-background-elevated shadow-soft ${edgeClassName}`

  const content = (
    <div className={`fixed inset-0 z-[200] flex ${positionClassName}`}>
      <div className='absolute inset-0 bg-black/40' onClick={onClose} />
      <div className={`relative flex h-full flex-col ${defaultPanelClassName} ${panelClassName}`}>
        {title ? (
          <div className='border-b border-border/70 px-4 py-3'>
            <h3 className='text-base font-semibold text-foreground'>{title}</h3>
          </div>
        ) : null}
        <div className='min-h-0 flex-1 overflow-hidden p-4'>
          {children}
        </div>
      </div>
    </div>
  )

  const portalRoot = getPortalRoot()
  return createPortal(content, portalRoot || document.body)
}

Drawer.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  children: PropTypes.node,
  onClose: PropTypes.func,
  side: PropTypes.oneOf(['left', 'right']),
  panelClassName: PropTypes.string,
  fitContent: PropTypes.bool
}
