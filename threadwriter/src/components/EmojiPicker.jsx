import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

// Reusable Emoji picker for ThreadWriter as a Popover.
// API: <EmojiPicker open onClose onPick={(emoji)=>{}} anchorRef />

export default function EmojiPicker({ open, onClose, onPick, anchorRef }) {

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Position as Popover near anchor
  const popRef = useRef(null)
  const [pos, setPos] = useState({ top: -9999, left: -9999 })
  const [positioned, setPositioned] = useState(false)

  // Initial synchronous position (prevents flash at 0,0)
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      try {
        const a = anchorRef?.current
        if (!a) return
        const r = a.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight
        const width = Math.min(354, Math.floor(vw * 0.92))
        const height = Math.min(560, Math.floor(vh * 0.8))
        // Place the top edge around the vertical middle of the textarea
        let top = r.top + r.height / 2
        let left = r.left + r.width / 2 - width / 2
        const margin = 8
        if (top < margin) top = margin
        if (left < margin) left = margin
        if (top + height > vh - margin) top = Math.max(margin, vh - margin - height)
        if (left + width > vw - margin) left = Math.max(margin, vw - margin - width)
        setPos({ top, left })
        setPositioned(true)
      } catch {}
    }
    update()
  }, [open, anchorRef])

  // Reposition on resize/scroll
  useEffect(() => {
    if (!open) return
    const update = () => {
      try {
        const a = anchorRef?.current
        if (!a) return
        const r = a.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight
        const width = Math.min(354, Math.floor(vw * 0.92))
        const height = Math.min(560, Math.floor(vh * 0.8))
        let top = r.top + r.height / 2
        let left = r.left + r.width / 2 - width / 2
        const margin = 8
        if (top < margin) top = margin
        if (left < margin) left = margin
        if (top + height > vh - margin) top = Math.max(margin, vh - margin - height)
        if (left + width > vw - margin) left = Math.max(margin, vw - margin - width)
        setPos({ top, left })
      } catch {}
    }
    const onScroll = () => update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, anchorRef])
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      const pop = popRef.current
      const a = anchorRef?.current
      if (pop && pop.contains(e.target)) return
      if (a && a.contains(e.target)) return
      onClose?.()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose, anchorRef])

  function handlePick(em) {
    try {
      // emoji-mart speichert eigene Recents; lokale Persistenz nicht nötig
    } catch {}
    onPick?.(em)
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      <div
        ref={popRef}
        className='panel em-picker-wrap'
        style={{ position: 'fixed', top: pos.top, left: pos.left, width: 'min(92vw, 354px)', maxHeight: '80vh', pointerEvents: 'auto', visibility: positioned ? 'visible' : 'hidden' }}
      >
        <Picker
          data={data}
          onEmojiSelect={(e) => handlePick(e?.native || e?.shortcodes || e?.id)}
          locale='de'
          theme='auto'
          dynamicWidth={false}
          navPosition='top'
          previewPosition='none'
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}
