import { useEffect, useMemo, useState } from 'react'
import Button from './Button'

export default function Composer () {
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
        className='w-full rounded-md border bg-background p-3'
        placeholder='Was möchtest du posten?'
      />
      {previewUrl ? (
        <div className='rounded-xl border border-border bg-background-subtle'>
          <div className='flex gap-3 p-3 items-start'>
            {preview?.image ? (
              <img src={preview.image} alt='' className='h-20 w-28 shrink-0 rounded-lg border border-border object-cover' loading='lazy' />
            ) : null}
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold text-foreground'>{preview?.title || previewUrl}</p>
              {preview?.description ? (
                <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{preview.description}</p>
              ) : null}
              <p className='mt-1 text-xs text-foreground-subtle'>{preview?.domain || new URL(previewUrl).hostname.replace(/^www\./, '')}</p>
            </div>
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
