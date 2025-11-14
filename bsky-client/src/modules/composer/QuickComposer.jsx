import { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from '../shared'
import { useComposer } from '../../hooks/useComposer'

export default function QuickComposer ({ onSent }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const { openComposer } = useComposer()

  const handleSubmit = async (event) => {
    event?.preventDefault()
    const content = text.trim()
    if (!content) {
      setMessage('Bitte Text eingeben.')
      return
    }
    setSending(true)
    setMessage('')
    try {
      const res = await fetch('/api/bsky/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Senden fehlgeschlagen.')
      setText('')
      setMessage('Gesendet.')
      if (typeof onSent === 'function') onSent(data)
    } catch (error) {
      setMessage(error?.message || 'Senden fehlgeschlagen.')
    } finally {
      setSending(false)
    }
  }

  const handleOpenFullComposer = () => {
    openComposer()
  }

  return (
    <article className='rounded-2xl border border-border bg-background p-4 shadow-soft' data-component='BskyQuickComposer'>
      <form onSubmit={handleSubmit} className='space-y-3'>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            if (message) setMessage('')
          }}
          placeholder='Was moechtest du posten?'
          className='w-full resize-none rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground outline-none focus:border-primary'
          rows={3}
          maxLength={1000}
        />
        <div className='flex flex-wrap items-center gap-2'>
          <Button type='submit' variant='primary' size='pill' disabled={sending || !text.trim()}>
            {sending ? 'Sende...' : 'Posten'}
          </Button>
          <Button type='button' variant='secondary' size='pill' onClick={handleOpenFullComposer}>
            Mehr Optionen
          </Button>
          {message ? (
            <span className='text-xs text-foreground-muted'>{message}</span>
          ) : null}
        </div>
      </form>
    </article>
  )
}

QuickComposer.propTypes = {
  onSent: PropTypes.func
}

QuickComposer.defaultProps = {
  onSent: undefined
}
