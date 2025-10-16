import { useEffect, useMemo, useRef, useState } from 'react'
import Button from './Button'

export default function Composer ({ reply = null, onSent }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [pendingMedia, setPendingMedia] = useState([]) // [{ tempId, previewUrl, mime }]
  const imageInputRef = useRef(null)
  const gifInputRef = useRef(null)
  const textareaRef = useRef(null)

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
    return () => { ignore = true; try { controller.abort() } catch {} }
  }, [firstUrl])

  async function handleSendNow (e) {
    e.preventDefault()
    setMessage('')
    const content = String(text || '').trim()
    if (!content) {
      setMessage('Bitte Text eingeben.')
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
        const payload = {
          content,
          repeat: 'none',
          scheduledAt: new Date().toISOString(),
          targetPlatforms: ['bluesky']
        }
        const res = await fetch('/api/skeets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Senden fehlgeschlagen.')
        setMessage('Geplant: Der Scheduler sendet in Kürze (bis ~1 Min).')
        setText('')
      }
    } catch (err) {
      setMessage(err?.message || String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSendNow} className='space-y-4' data-component='BskyComposer'>
      <label className='block text-sm font-medium'>Inhalt</label>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className='w-full rounded-md border bg-background p-3 max-h-48 overflow-auto'
        placeholder='Was möchtest du posten?'
      />
      {/* Bilder-Vorschau unter der Eingabe, linksbündig, skaliert */}
      {pendingMedia.length > 0 ? (
        <div className='mt-2 grid grid-cols-2 gap-2'>
          {pendingMedia.map((m, idx) => (
            <div key={m.tempId || idx} className='relative rounded-lg border border-border bg-background-subtle'>
              <img src={m.previewUrl} alt='' className='w-full object-contain rounded-lg' style={{ maxHeight: 160 }} />
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
        <input ref={imageInputRef} type='file' accept='image/*' className='hidden' onChange={(e) => {
          const file = e.target.files && e.target.files[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = async () => {
            try {
              const base64 = reader.result
              const res = await fetch('/api/uploads/temp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, mime: file.type, data: base64 })
              })
              const info = await res.json().catch(() => ({}))
              if (!res.ok) throw new Error(info?.error || 'Upload fehlgeschlagen')
              setPendingMedia(arr => [...arr, { tempId: info.tempId, previewUrl: info.previewUrl, mime: info.mime }])
            } catch (e) {
              setMessage(e?.message || 'Bild-Upload fehlgeschlagen')
            } finally {
              try { e.target.value = '' } catch {}
            }
          }
          reader.readAsDataURL(file)
        }} />
        <input ref={gifInputRef} type='file' accept='image/gif' className='hidden' onChange={(e) => {
          const file = e.target.files && e.target.files[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = async () => {
            try {
              const base64 = reader.result
              const res = await fetch('/api/uploads/temp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, mime: file.type || 'image/gif', data: base64 })
              })
              const info = await res.json().catch(() => ({}))
              if (!res.ok) throw new Error(info?.error || 'Upload fehlgeschlagen')
              setPendingMedia(arr => [...arr, { tempId: info.tempId, previewUrl: info.previewUrl, mime: info.mime }])
            } catch (e) {
              setMessage(e?.message || 'GIF-Upload fehlgeschlagen')
            } finally {
              try { e.target.value = '' } catch {}
            }
          }
          reader.readAsDataURL(file)
        }} />
        {(() => {
          const maxCount = 4
          const count = pendingMedia.length
          const disabled = count >= maxCount
          return (
            <>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() => imageInputRef.current && imageInputRef.current.click()}
                disabled={disabled}
                title={disabled ? `Maximal ${maxCount} Bilder je Skeet erreicht` : 'Bild hinzufügen'}
              >
                <span className='text-base md:text-lg leading-none'>🖼️</span>
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() => gifInputRef.current && gifInputRef.current.click()}
                disabled={disabled}
                title={disabled ? `Maximal ${maxCount} Bilder je Skeet erreicht` : 'GIF hinzufügen'}
              >
                GIF
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                onClick={() => {
                  try {
                    const emoji = '😊'
                    setText((v) => (v ? v + ' ' + emoji : emoji))
                    if (textareaRef.current) textareaRef.current.focus()
                  } catch {}
                }}
                title='Emoji einfügen'
              >
                <span className='text-base md:text-lg leading-none'>😊</span>
              </button>
            </>
          )
        })()}
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
      <div className='flex items-center gap-3'>
        <Button type='submit' variant='primary' disabled={sending}>
          {sending ? 'Sende…' : 'Jetzt senden'}
        </Button>
        {message ? (
          <span className='text-sm text-muted-foreground'>{message}</span>
        ) : null}
      </div>
    </form>
  )
}
