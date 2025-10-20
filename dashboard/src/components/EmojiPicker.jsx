// Leichtgewichtiger Emoji-Picker als Popover, angeheftet an einen Trigger-Button.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

export default function EmojiPicker({ open, onClose, onPick, anchorRef }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Popover position relative to anchor
  const popRef = useRef(null)
  const [pos, setPos] = useState({ top: -9999, left: -9999 })
  const [positioned, setPositioned] = useState(false)
  // Positionierungshelfer (breiten-/höhenbegrenzt, mit Rand)
  // Berechnet die Popover-Position und hält das Panel innerhalb des Viewports.
  const updatePosition = (setReady = false) => {
    try {
      const a = anchorRef?.current
      if (!a) return
      const r = a.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = Math.min(354, Math.floor(vw * 0.92))
      const height = Math.min(560, Math.floor(vh * 0.8))
      const margin = 8
      // Horizontal: mittig relativ zur Textarea, dann clampen
      let left = r.left + r.width / 2 - width / 2
      if (left < margin) left = margin
      if (left + width > vw - margin) left = Math.max(margin, vw - margin - width)
      // Vertikal: Oberkante auf die Mitte der Textarea legen, dann clampen
      let top = r.top + r.height / 2
      if (top < margin) top = margin
      if (top + height > vh - margin) top = Math.max(margin, vh - margin - height)
      setPos({ top, left })
      if (setReady) setPositioned(true)
    } catch {}
  }
  // Hinweis: Kein explizites Zurücksetzen von `positioned` bei open,
  // um Race Conditions in StrictMode zu vermeiden.
  useLayoutEffect(() => {
    if (!open) return
    updatePosition(true)
  }, [open, anchorRef])
  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePosition(false)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, anchorRef])

  // Outside close
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

  if (!open) return null
  // Overlay wird als Portals zentriertes Popover gerendert; pointer-events-none
  // verhindert ungewollte Klicks außerhalb des Dialogs.
  return (
    <div className='fixed inset-0 z-[1000] pointer-events-none' role='presentation' aria-hidden>
      <div
        ref={popRef}
        className='pointer-events-auto rounded-2xl bg-background-elevated shadow-soft'
        role='dialog'
        aria-modal='true'
        aria-label='Emoji auswählen'
        style={{ position: 'fixed', top: pos.top, left: pos.left, width: 'min(92vw, 354px)', maxHeight: '80vh', overflow: 'auto', visibility: positioned ? 'visible' : 'hidden' }}
      >
        <Picker
          data={data}
          onEmojiSelect={(e) => onPick?.(e?.native || e?.shortcodes || e?.id)}
          locale='de'
          theme='auto'
          navPosition='top'
          previewPosition='none'
          searchPosition='sticky'
        />
      </div>
    </div>
  )
}
