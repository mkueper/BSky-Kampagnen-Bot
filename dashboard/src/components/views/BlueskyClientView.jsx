import { useState } from 'react'
import Button from '../ui/Button'

export default function BlueskyClientView () {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

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
    <div className='space-y-6'>
      <header>
        <h2 className='text-xl font-semibold'>Bluesky Direkt-Client</h2>
        <p className='text-sm text-muted-foreground'>
          Sende einen Text-Skeet direkt über den Scheduler. Nutzt bestehende
          Credentials und Zielplattform „Bluesky“. Für sofortige Ausführung wird
          der Termin auf jetzt gesetzt; der Scheduler greift innerhalb seiner
          Prüf-Intervalle (Standard: 1 Minute).
        </p>
      </header>

      <form onSubmit={handleSendNow} className='space-y-4'>
        <label className='block text-sm font-medium'>Inhalt</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className='w-full rounded-md border bg-background p-3'
          placeholder='Was möchtest du posten?'
        />
        <div className='flex items-center gap-3'>
          <Button type='submit' variant='primary' disabled={sending}>
            {sending ? 'Sende…' : 'Jetzt senden'}
          </Button>
          {message ? (
            <span className='text-sm text-muted-foreground'>{message}</span>
          ) : null}
        </div>
      </form>
    </div>
  )
}

