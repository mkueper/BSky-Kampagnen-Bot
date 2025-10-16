import { useEffect, useMemo, useState } from 'react'
import Button from './Button'

export default function Composer ({ reply = null, onSent }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

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
            parent: { uri: reply.uri, cid: reply.cid }
          })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Antwort senden fehlgeschlagen.')
        setMessage('Gesendet.')
        setText('')
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
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className='w-full rounded-md border bg-background p-3 max-h-48 overflow-auto'
        placeholder='Was möchtest du posten?'
      />
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
