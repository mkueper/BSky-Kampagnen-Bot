import { useMemo, useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'

const DEFAULTS = [
  '😀','😁','😂','🤣','😊','😍','😘','😉','🙂','🙃','😎','🤓','😇','🥳','🤩',
  '👍','👎','👏','🙌','🙏','💪','🔥','✨','💡','🚀','🎉','✅','❌','⚠️','❗','❓',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💖','💔','💯','⭐','🌟','🤝','👋'
]

export default function EmojiPicker({ open, onClose, onPick }) {
  const [q, setQ] = useState('')
  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return DEFAULTS
    // naive filter by unicode name is not available; support simple alias keywords
    const map = {
      love: ['❤️','💖','💜','💙','💚','💛','🧡','🤍','🤎','💔'],
      party: ['🎉','🥳','✨'],
      ok: ['👍','✅'],
      no: ['👎','❌'],
      warn: ['⚠️','❗'],
      star: ['⭐','🌟'],
      fire: ['🔥'],
      rocket: ['🚀'],
      clap: ['👏','🙌'],
      smile: ['😀','😁','😂','🤣','😊','🙂','🙃'],
      cool: ['😎'],
      nerd: ['🤓'],
    }
    const hit = Object.entries(map).find(([k]) => k.includes(query))
    if (hit) return hit[1]
    return DEFAULTS
  }, [q])

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title='Emoji auswählen'
      actions={(
        <>
          <Button variant='secondary' onClick={onClose}>Schließen</Button>
        </>
      )}
    >
      <div className='space-y-3'>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Suche (z. B. love, party, ok, fire)' className='w-full rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground' />
        <div className='grid grid-cols-8 gap-2'>
          {items.map((em, idx) => (
            <button key={idx} type='button' className='h-10 w-10 rounded-xl border border-border bg-background-subtle text-xl' onClick={() => onPick?.(em)}>{em}</button>
          ))}
        </div>
        <p className='text-xs text-foreground-muted'>Hinweis: Für eine vollständige Emoji‑Suche können wir später eine Bibliothek wie emoji‑mart integrieren.</p>
      </div>
    </Modal>
  )
}

