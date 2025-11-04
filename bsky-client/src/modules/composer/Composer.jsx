import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, RichText } from '../shared'
import { GifPicker, EmojiPicker } from '@kampagnen-bot/media-pickers'
import { VideoIcon } from '@radix-ui/react-icons'

const MAX_MEDIA_COUNT = 4
const MAX_GIF_BYTES = 8 * 1024 * 1024

export default function Composer ({ reply = null, quote = null, onCancelQuote, onSent }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [pendingMedia, setPendingMedia] = useState([]) // [{ tempId, previewUrl, mime }]
  const imageInputRef = useRef(null)
  const textareaRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const cursorRef = useRef({ start: 0, end: 0 })
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [tenorAvailable, setTenorAvailable] = useState(false)
  const quoteInfo = useMemo(() => {
    if (!quote || !quote.uri || !quote.cid) return null
    const author = quote.author || {}
    return {
      uri: String(quote.uri),
      cid: String(quote.cid),
      text: String(quote.text || ''),
      author: {
        displayName: author.displayName || author.handle || '',
        handle: author.handle || '',
        avatar: author.avatar || null
      }
    }
  }, [quote])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch('/api/client-config')
        const data = await res.json().catch(() => ({}))
        if (!ignore && res.ok) {
          setTenorAvailable(Boolean(data?.gifs?.tenorAvailable))
        }
      } catch { /* ignore */ }
    })()
    return () => { ignore = true }
  }, [])

  const firstUrl = useMemo(() => {
    try {
      const m = String(text || '').match(/https?:\/\/\S+/i)
      return m ? m[0] : ''
    } catch { return '' }
  }, [text])

  useEffect(() => {
    let ignore = false
    setPreview(null)
    setPreviewError('')
    if (!firstUrl) { setPreviewUrl(''); return }
    setPreviewUrl(firstUrl)
    setPreviewLoading(true)
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    fetch(`/api/preview?url=${encodeURIComponent(firstUrl)}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (ignore) return
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        setPreview(data)
      })
      .catch((e) => { if (!ignore) setPreviewError(e?.message || 'Preview fehlgeschlagen') })
      .finally(() => { if (!ignore) setPreviewLoading(false); clearTimeout(t) })
    return () => { ignore = true; try { controller.abort() } catch {}; clearTimeout(t) }
  }, [firstUrl])

  function updateCursorFromTextarea (target) {
    if (!target) return
    const start = target.selectionStart ?? target.value.length
    const end = target.selectionEnd ?? start
    cursorRef.current = { start, end }
  }

  function insertAtCursor (snippet) {
    if (!snippet) return
    setText((prev) => {
      const el = textareaRef.current
      const start = el?.selectionStart ?? cursorRef.current.start ?? prev.length
      const end = el?.selectionEnd ?? cursorRef.current.end ?? start
      const safeStart = clampSelection(start, prev.length)
      const safeEnd = clampSelection(end, prev.length)
      const before = prev.slice(0, safeStart)
      const after = prev.slice(safeEnd)
      const next = `${before}${snippet}${after}`
      requestAnimationFrame(() => {
        try {
          if (el) {
            el.focus()
            const pos = safeStart + String(snippet).length
            el.setSelectionRange(pos, pos)
            cursorRef.current = { start: pos, end: pos }
          }
        } catch {}
      })
      return next
    })
  }

  async function uploadTempMedia (file, fallbackPreview = '') {
    if (!file) throw new Error('Keine Datei ausgewählt')
    if (pendingMedia.length >= MAX_MEDIA_COUNT) throw new Error(`Maximal ${MAX_MEDIA_COUNT} Medien je Post`)
    const dataUrl = await blobToDataUrl(file)
    const res = await fetch('/api/uploads/temp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, mime: file.type || 'application/octet-stream', data: dataUrl })
    })
    const info = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(info?.error || 'Upload fehlgeschlagen')
    let added = false
    setPendingMedia((arr) => {
      if (arr.length >= MAX_MEDIA_COUNT) return arr
      added = true
      return [...arr, { tempId: info.tempId, previewUrl: info.previewUrl || fallbackPreview, mime: info.mime }]
    })
    if (!added) throw new Error(`Maximal ${MAX_MEDIA_COUNT} Medien je Post`)
    return info
  }

  async function handleLocalFile (file) {
    if (!file) return
    setMessage('')
    try {
      await uploadTempMedia(file)
    } catch (e) {
      setMessage(e?.message || 'Upload fehlgeschlagen')
    }
  }

  async function handleGifPick ({ id, downloadUrl, previewUrl }) {
    setGifPickerOpen(false)
    if (!downloadUrl) return
    setMessage('')
    try {
      if (pendingMedia.length >= MAX_MEDIA_COUNT) {
        throw new Error(`Maximal ${MAX_MEDIA_COUNT} Medien je Post`)
      }
      const res = await fetch(downloadUrl)
      if (!res.ok) throw new Error('GIF konnte nicht geladen werden')
      const blob = await res.blob()
      if (blob.size > MAX_GIF_BYTES) throw new Error('GIF ist zu groß (max. ~8 MB).')
      const type = blob.type || 'image/gif'
      const name = `tenor-${id || 'gif'}.gif`
      const file = new File([blob], name, { type })
      await uploadTempMedia(file, previewUrl)
    } catch (e) {
      setMessage(e?.message || 'GIF konnte nicht geladen werden')
    } finally {
      requestAnimationFrame(() => {
        try { textareaRef.current?.focus() } catch {}
      })
    }
  }

  async function handleSendNow (e) {
    e.preventDefault()
    setMessage('')
    const content = String(text || '').trim()
    if (!content && !quoteInfo) {
      setMessage('Bitte Text eingeben oder ein Zitat verwenden.')
      return
    }
    setSending(true)
    try {
      if (reply && reply.uri && reply.cid) {
        const res = await fetch('/api/bsky/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: content,
            root: { uri: reply.uri, cid: reply.cid },
            parent: { uri: reply.uri, cid: reply.cid },
            media: pendingMedia.map(m => ({ tempId: m.tempId, mime: m.mime }))
          })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Antwort senden fehlgeschlagen.')
        setMessage('Gesendet.')
        setText('')
        setPendingMedia([])
        if (typeof onSent === 'function') onSent()
      } else {
        const res = await fetch('/api/bsky/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: content,
            media: pendingMedia.map(m => ({ tempId: m.tempId, mime: m.mime })),
            quote: quoteInfo ? { uri: quoteInfo.uri, cid: quoteInfo.cid } : undefined
          })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Senden fehlgeschlagen.')
        setMessage('Gesendet.')
        setText('')
        setPendingMedia([])
        if (typeof onSent === 'function') onSent()
      }
    } catch (err) {
      setMessage(err?.message || String(err))
    } finally {
      setSending(false)
    }
  }

  const mediaDisabled = pendingMedia.length >= MAX_MEDIA_COUNT

  return (
    <form id='bsky-composer-form' onSubmit={handleSendNow} className='space-y-4' data-component='BskyComposer'>
      <label className='block text-sm font-medium'>Inhalt</label>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); updateCursorFromTextarea(e.target) }}
        onSelect={(e) => updateCursorFromTextarea(e.target)}
        onClick={(e) => updateCursorFromTextarea(e.target)}
        onKeyUp={(e) => updateCursorFromTextarea(e.target)}
        rows={6}
        className='max-h-48 w-full overflow-auto rounded-md border bg-background p-3'
        placeholder='Was möchtest du posten?'
      />
      {quoteInfo ? (
        <div className='rounded-xl border border-border bg-background-subtle px-3 py-3 text-sm text-foreground'>
          <div className='flex items-start gap-3'>
            {quoteInfo.author.avatar ? (
              <img
                src={quoteInfo.author.avatar}
                alt=''
                className='h-10 w-10 shrink-0 rounded-full border border-border object-cover'
              />
            ) : (
              <div className='h-10 w-10 shrink-0 rounded-full border border-border bg-background-subtle' />
            )}
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold text-foreground'>
                {quoteInfo.author.displayName || quoteInfo.author.handle || 'Unbekannt'}
              </p>
              {quoteInfo.author.handle ? (
                <p className='truncate text-xs text-foreground-muted'>@{quoteInfo.author.handle}</p>
              ) : null}
              {quoteInfo.text ? (
                <div className='mt-2 text-sm text-foreground'>
                  <RichText text={quoteInfo.text} className='whitespace-pre-wrap break-words text-sm text-foreground' />
                </div>
              ) : null}
            </div>
            {onCancelQuote ? (
              <button
                type='button'
                className='ml-2 rounded-full border border-border px-2 py-1 text-xs text-foreground-muted hover:text-foreground'
                onClick={onCancelQuote}
                title='Zitat entfernen'
              >
                Entfernen
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {pendingMedia.length > 0 ? (
        <div className='mt-2 grid grid-cols-2 gap-2'>
          {pendingMedia.map((m, idx) => (
            <div key={m.tempId || idx} className='relative rounded-lg border border-border bg-background-subtle'>
              <img src={m.previewUrl} alt='' className='w-full rounded-lg object-contain' style={{ maxHeight: 160 }} />
              <button
                type='button'
                className='absolute right-1 top-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white'
                title='Bild entfernen'
                onClick={() => setPendingMedia(arr => arr.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className='flex items-center gap-2'>
        <input
          ref={imageInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={(e) => {
            const file = e.target.files && e.target.files[0]
            handleLocalFile(file)
            try { e.target.value = '' } catch {}
          }}
        />
        <Button
          type='button'
          variant='outline'
          onClick={() => imageInputRef.current?.click()}
          disabled={mediaDisabled}
          title={mediaDisabled ? `Maximal ${MAX_MEDIA_COUNT} Medien je Skeet erreicht` : 'Bild oder GIF hochladen'}
        >
          <span className='text-base leading-none md:text-lg'>🖼️</span>
        </Button>
        {tenorAvailable ? (
          <Button
            type='button'
            variant='outline'
            disabled={mediaDisabled}
            onClick={() => setGifPickerOpen(true)}
            title={mediaDisabled ? `Maximal ${MAX_MEDIA_COUNT} Medien je Skeet erreicht` : 'GIF aus Tenor einfügen'}
          >
            <VideoIcon className='h-4 w-4' aria-hidden='true' />
            <span>GIF</span>
          </Button>
        ) : null}
        <Button
          ref={emojiButtonRef}
          type='button'
          variant='outline'
          onClick={() => setEmojiPickerOpen((v) => !v)}
          title='Emoji auswählen'
          aria-expanded={emojiPickerOpen}
        >
          <span className='text-base leading-none md:text-lg'>😊</span>
        </Button>
      </div>
      {previewUrl ? (
        <div className='mt-2'>
          {preview?.image ? (
            <img
              src={preview.image}
              alt=''
              className='w-full rounded-lg border border-border object-contain'
              style={{ maxHeight: 180 }}
              loading='lazy'
            />
          ) : null}
          <div className='mt-2 min-w-0'>
            <p className='truncate text-sm font-semibold text-foreground'>{preview?.title || previewUrl}</p>
            {preview?.description ? (
              <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{preview.description}</p>
            ) : null}
            <p className='mt-1 text-xs text-foreground-subtle'>{preview?.domain || new URL(previewUrl).hostname.replace(/^www\./, '')}</p>
            <div className='text-xs text-foreground-muted'>
              {previewLoading ? 'Lade…' : (previewError ? 'Kein Preview' : '')}
            </div>
          </div>
        </div>
      ) : null}
      <div className='flex items-center justify-between'>
        <button
          type='button'
          className='inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-background-elevated'
          title='Interaktions-Einstellungen'
          onClick={() => {
            // Platzhalter für künftigen Dialog
          }}
        >
          Jeder kann interagieren
        </button>
        {message ? (
          <span className='text-xs text-muted-foreground'>{message}</span>
        ) : null}
      </div>
      {tenorAvailable ? (
        <GifPicker
          open={gifPickerOpen}
          styles={{ panel: { width: '70vw', maxWidth: '1200px' }}}
          onClose={() => setGifPickerOpen(false)}
          onPick={handleGifPick}
          maxBytes={MAX_GIF_BYTES}
        />
      ) : null}
      <EmojiPicker
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        anchorRef={emojiButtonRef}
        onPick={(emoji) => {
          const value = emoji?.native || emoji?.shortcodes || emoji?.id
          if (!value) return
          insertAtCursor(value)
          setEmojiPickerOpen(false)
        }}
      />
    </form>
  )
}

function clampSelection (pos, length) {
  if (!Number.isFinite(pos)) return length
  if (pos < 0) return 0
  if (pos > length) return length
  return pos
}

function blobToDataUrl (blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.readAsDataURL(blob)
  })
}
