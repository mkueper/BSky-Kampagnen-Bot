import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

export default function EmojiPicker ({ open, onClose, onPick, anchorRef }) {
  const popRef = useRef(null)
  const [position, setPosition] = useState({ top: -9999, left: -9999 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const updatePosition = () => {
    try {
      const anchor = anchorRef?.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = Math.min(360, Math.floor(vw * 0.95))
      const height = Math.min(520, Math.floor(vh * 0.85))
      let top = rect.bottom + 8
      let left = rect.left + rect.width / 2 - width / 2
      const margin = 8
      if (top + height > vh - margin) top = Math.max(margin, rect.top - 8 - height)
      if (left < margin) left = margin
      if (left + width > vw - margin) left = Math.max(margin, vw - margin - width)
      setPosition({ top, left })
      setReady(true)
    } catch {}
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open])

  useEffect(() => {
    if (!open) return
    const reflow = () => updatePosition()
    window.addEventListener('resize', reflow)
    window.addEventListener('scroll', reflow, true)
    return () => {
      window.removeEventListener('resize', reflow)
      window.removeEventListener('scroll', reflow, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      const pop = popRef.current
      const anchor = anchorRef?.current
      if (pop && pop.contains(e.target)) return
      if (anchor && anchor.contains(e.target)) return
      onClose?.()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose, anchorRef])

  function handlePick (emoji) {
    const value = emoji?.native || emoji?.shortcodes || emoji?.id
    if (value) onPick?.(value)
  }

  if (!open) return null

  const content = (
    <div className='fixed inset-0 z-50 pointer-events-none'>
      <div
        ref={popRef}
        className='pointer-events-auto rounded-2xl border border-border bg-background shadow-card'
        style={{ position: 'fixed', top: position.top, left: position.left, width: 'min(360px,95vw)', maxHeight: '85vh', visibility: ready ? 'visible' : 'hidden' }}
      >
        <Picker
          data={data}
          onEmojiSelect={handlePick}
          locale='de'
          theme='auto'
          navPosition='top'
          previewPosition='none'
          dynamicWidth={false}
          searchPosition='sticky'
        />
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
