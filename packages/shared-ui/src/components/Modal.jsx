import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'

export default function Modal ({ open, title, children, onClose, actions, panelClassName, closeOnBackdrop = true }) {
  useEffect(() => {
    const onKey = (event) => {
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

  const content = (
    <div className='fixed inset-0 z-[200] flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/40'
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={['relative rounded-2xl border border-border bg-background-elevated p-4 shadow-soft', panelClassName || 'w-full max-w-md'].join(' ')}>
        {title ? <h3 className='text-base font-semibold text-foreground'>{title}</h3> : null}
        <div className='mt-2'>{children}</div>
        <div className='mt-3 flex justify-end gap-2'>{actions}</div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

Modal.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  children: PropTypes.node,
  onClose: PropTypes.func,
  actions: PropTypes.node,
  panelClassName: PropTypes.string,
  closeOnBackdrop: PropTypes.bool
}
