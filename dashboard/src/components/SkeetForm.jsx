import { useEffect, useRef, useState } from 'react'
import { useToast } from '../hooks/useToast'
import Button from './ui/Button'
import MediaDialog from './MediaDialog'
import { useClientConfig } from '../hooks/useClientConfig'

const PLATFORM_LIMITS = {
  bluesky: 300,
  mastodon: 500
}

function resolveMaxLength (selectedPlatforms) {
  const limits = selectedPlatforms
    .map(platform => PLATFORM_LIMITS[platform])
    .filter(value => typeof value === 'number')

  if (limits.length === 0) {
    return PLATFORM_LIMITS.bluesky
  }

  return Math.min(...limits)
}

// Hilfsfunktion für Formatierung
function getDefaultDateTime () {
  const now = new Date()
  now.setDate(now.getDate() + 1) // morgen
  now.setHours(9, 0, 0, 0) // 9:00 Uhr
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(now.getTime() - offsetMs)
  return localDate.toISOString().slice(0, 16) // yyyy-MM-ddTHH:mm
}

function getDefaultDateParts () {
  const defaultDateTime = getDefaultDateTime()
  const [date, time] = defaultDateTime.split('T')
  return { date, time }
}

function toLocalDateParts (value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (isNaN(parsed)) {
    return null
  }

  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000
  const local = new Date(parsed.getTime() - offsetMs)
  const iso = local.toISOString().slice(0, 16)
  const [date, time] = iso.split('T')
  return { date, time }
}

/**
 * Formular zum Erstellen oder Bearbeiten eines Skeets.
 *
 * @param {Function} onSkeetSaved   Callback nach erfolgreichem Speichern (lädt Liste neu).
 * @param {Object|null} editingSkeet Aktueller Datensatz beim Bearbeiten, sonst null.
 * @param {Function} onCancelEdit   Wird beim Abbrechen aufgerufen (z. B. Tab-Wechsel).
 */
function SkeetForm ({ onSkeetSaved, editingSkeet, onCancelEdit }) {
  const { date: defaultDate, time: defaultTime } = getDefaultDateParts()

  const [content, setContent] = useState('')
  const [targetPlatforms, setTargetPlatforms] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('defaultPlatforms')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr) && arr.length) {
            const uniq = Array.from(
              new Set(arr.map(v => String(v).toLowerCase()))
            )
            const allowed = uniq.filter(
              v => v === 'bluesky' || v === 'mastodon'
            )
            if (allowed.length) return allowed
          }
        }
      }
    } catch {}
    // Fallback: beide Plattformen
    return ['bluesky', 'mastodon']
  })
  const [scheduledDate, setScheduledDate] = useState(defaultDate)
  const [scheduledTime, setScheduledTime] = useState(defaultTime)
  const [repeat, setRepeat] = useState('none')
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(null)
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(null)

  const isEditing = Boolean(editingSkeet)
  const maxContentLength = resolveMaxLength(targetPlatforms)
  const toast = useToast()
  const { config: clientConfig } = useClientConfig()
  const imagePolicy = clientConfig?.images || {
    maxCount: 4,
    maxBytes: 8 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    requireAltText: false
  }
  const [pendingMedia, setPendingMedia] = useState([])
  const [mediaDialog, setMediaDialog] = useState({ open: false })
  const [editedMediaAlt, setEditedMediaAlt] = useState({})
  const [removedMedia, setRemovedMedia] = useState({})
  const [altDialog, setAltDialog] = useState({ open: false, item: null })
  const textareaRef = useRef(null)
  const previewRef = useRef(null)
  const [coupledHeight, setCoupledHeight] = useState(null)

  useEffect(
    () => {
      if (!textareaRef.current || !previewRef.current) return

      const update = () => {
        const h = textareaRef.current.offsetHeight // gerenderte Höhe (inkl. Padding/Border)
        previewRef.current.style.height = `${h}px`
      }

      update()

      let ro
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(update)
        ro.observe(textareaRef.current)
      }
      window.addEventListener('resize', update)

      return () => {
        if (ro) ro.disconnect()
        window.removeEventListener('resize', update)
      }
    },
    [
      /* optional: content */
    ]
  )

  function resetToDefaults () {
    setContent('')
    setTargetPlatforms(['bluesky'])
    setRepeat('none')
    setRepeatDayOfWeek(null)
    setRepeatDayOfMonth(null)
    setPendingMedia([])
    const defaults = getDefaultDateParts()
    setScheduledDate(defaults.date)
    setScheduledTime(defaults.time)
  }

  useEffect(() => {
    if (editingSkeet) {
      setContent(editingSkeet.content ?? '')
      setTargetPlatforms(
        Array.isArray(editingSkeet.targetPlatforms) &&
          editingSkeet.targetPlatforms.length > 0
          ? editingSkeet.targetPlatforms
          : ['bluesky']
      )
      setRepeat(editingSkeet.repeat ?? 'none')
      setRepeatDayOfWeek(
        editingSkeet.repeat === 'weekly' && editingSkeet.repeatDayOfWeek != null
          ? Number(editingSkeet.repeatDayOfWeek)
          : null
      )
      setRepeatDayOfMonth(
        editingSkeet.repeat === 'monthly' &&
          editingSkeet.repeatDayOfMonth != null
          ? Number(editingSkeet.repeatDayOfMonth)
          : null
      )

      const parts =
        toLocalDateParts(editingSkeet.scheduledAt) ?? getDefaultDateParts()
      setScheduledDate(parts.date)
      setScheduledTime(parts.time)
      // TODO: Medienanzeige für bestehende Skeets (bearbeiten) kann optional ergänzt werden
    } else {
      resetToDefaults()
    }
  }, [editingSkeet])

  function togglePlatform (name) {
    setTargetPlatforms(prev => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev
        return prev.filter(p => p !== name)
      }
      return [...prev, name]
    })
  }

  const scheduledDateTime =
    scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`)
      : null

  const handleSubmit = async e => {
    e.preventDefault()

    const normalizedPlatforms = Array.from(new Set(targetPlatforms))
    const submissionLimit = resolveMaxLength(normalizedPlatforms)

    if (content.length > submissionLimit) {
      toast.error({
        title: 'Zeichenlimit überschritten',
        description: `Der Skeet darf maximal ${submissionLimit} Zeichen für die ausgewählten Plattformen enthalten.`
      })
      return
    }

    if (repeat === 'none') {
      if (!scheduledDateTime || isNaN(scheduledDateTime.getTime())) {
        toast.error({
          title: 'Ungültige Planung',
          description: 'Bitte Datum und Uhrzeit prüfen.'
        })
        return
      }
    }

    if (normalizedPlatforms.length === 0) {
      toast.error({
        title: 'Keine Plattform gewählt',
        description: 'Bitte mindestens eine Zielplattform auswählen.'
      })
      return
    }

    const payload = {
      content,
      scheduledAt:
        scheduledDateTime && !isNaN(scheduledDateTime.getTime())
          ? scheduledDateTime
          : null,
      repeat,
      repeatDayOfWeek,
      repeatDayOfMonth,
      targetPlatforms: normalizedPlatforms,
      media: pendingMedia
    }

    const url = isEditing ? `/api/skeets/${editingSkeet.id}` : '/api/skeets'
    const method = isEditing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      if (!isEditing) {
        resetToDefaults()
      }
      if (onSkeetSaved) onSkeetSaved()
      toast.success({
        title: isEditing ? 'Skeet aktualisiert' : 'Skeet gespeichert',
        description: 'Die Änderungen wurden übernommen.'
      })
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error({
        title: 'Speichern fehlgeschlagen',
        description: data.error || 'Fehler beim Speichern des Skeets.'
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6 space-x-2'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-foreground'>
            {isEditing ? 'Skeet bearbeiten' : 'Neuen Skeet planen'}
          </h2>
          <p className='mt-1 text-sm text-foreground-muted'>
            Maximal {maxContentLength} Zeichen für die gewählten Plattformen.
          </p>
        </div>
        <div
          className='flex flex-wrap items-center gap-2'
          role='group'
          aria-label='Plattformen wählen'
        >
          {['bluesky', 'mastodon'].map(platform => {
            const isActive = targetPlatforms.includes(platform)
            return (
              <label
                key={platform}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow-soft'
                    : 'border-border text-foreground-muted hover:border-primary/50'
                }`}
              >
                <input
                  type='checkbox'
                  className='sr-only'
                  checked={isActive}
                  onChange={() => togglePlatform(platform)}
                />
                <span className='capitalize'>{platform}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className='space-y-3'>
        {/* Überschriftenzeile für Desktop: Texte auf einer Ebene */}
        <div className='hidden lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6'>
          <label
            htmlFor='skeet-content'
            className='text-sm font-semibold text-foreground self-end'
          >
            Skeet-Text
          </label>
          <div />
          <label className='text-sm font-semibold text-foreground self-end'>
            Vorschau
          </label>
        </div>
        <div className='grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'>
          {/* Editor */}
          <div>
            {/* Mobile-Label für Editor */}
            <label
              htmlFor='skeet-content'
              className='text-sm font-semibold text-foreground lg:hidden'
            >
              Skeet-Text
            </label>
            <textarea
              ref={textareaRef}
              id='skeet-content'
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder='Was möchtest du veröffentlichen?'
              rows={10}
              className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-base leading-relaxed text-foreground shadow-soft transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
            />
            <div
              className={`mt-2 text-sm ${
                content.length > maxContentLength
                  ? 'text-destructive'
                  : 'text-foreground-muted'
              }`}
            >
              {content.length}/{maxContentLength} Zeichen
            </div>
            <div className='mt-2 flex items-center gap-2 lg:hidden'>
              <button
                type='button'
                className='rounded-full border border-border bg-primary px-3 py-1 text-xs text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/*',
                    title: 'Bild hinzufügen'
                  })
                }
                disabled={
                  content.trim().length === 0 ||
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                }
                title={
                  content.trim().length === 0
                    ? 'Bitte zuerst Text eingeben'
                    : pendingMedia.length >= (imagePolicy.maxCount || 4)
                    ? `Maximal ${imagePolicy.maxCount} Bilder`
                    : 'Bild hinzufügen'
                }
              >
                🖼️
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-primary px-3 py-1 text-xs text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/gif',
                    title: 'GIF hinzufügen'
                  })
                }
                disabled={
                  content.trim().length === 0 ||
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                }
                title={
                  content.trim().length === 0
                    ? 'Bitte zuerst Text eingeben'
                    : pendingMedia.length >= (imagePolicy.maxCount || 4)
                    ? `Maximal ${imagePolicy.maxCount} Bilder`
                    : 'GIF hinzufügen'
                }
              >
                GIF
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-primary px-3 py-1 text-xs text-foreground hover:bg-background'
                aria-label='Emoji einfügen'
                onClick={() => {}}
              >
                😊
              </button>
            </div>
          </div>
          {/* Vertikale Toolbar (nur Desktop) */}
          <div className='hidden items-center justify-center lg:flex'>
            <div className='flex flex-col items-center gap-2'>
              <button
                type='button'
                className='rounded-full border border-border bg-primary px-3 py-2 text-xs text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/*',
                    title: 'Bild hinzufügen'
                  })
                }
                disabled={
                  content.trim().length === 0 ||
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                }
                aria-label='Bild hinzufügen'
                title='Bild hinzufügen'
              >
                🖼️
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-primary px-3 py-2 text-xs text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/gif',
                    title: 'GIF hinzufügen'
                  })
                }
                disabled={
                  content.trim().length === 0 ||
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                }
                aria-label='GIF hinzufügen'
                title='GIF hinzufügen'
              >
                GIF
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-primary px-3 py-2 text-xs text-foreground hover:bg-background'
                aria-label='Emoji einfügen'
                onClick={() => {
                  /* Emoji Picker später */
                }}
              >
                😊
              </button>
            </div>
          </div>
          {/* Vorschau */}
          <div>
            {/* Mobile-Label für Vorschau (auf Desktop via Headerzeile geregelt) */}
            <label className='text-sm font-semibold text-foreground lg:hidden'>
              Vorschau
            </label>
            <div
              ref={previewRef}
              className='rounded-2xl border border-border bg-background py-3 px-4 shadow-soft flex flex-col overflow-hidden'
              style={coupledHeight ? { height: `${coupledHeight}px` } : {}}
            >
              <div className='flex-1 overflow-auto pr-2'>
                <p className='whitespace-pre-wrap break-words leading-relaxed text-foreground'>
                  {content || '(kein Inhalt)'}
                </p>
                {(() => {
                  const list = []
                  if (isEditing && Array.isArray(editingSkeet?.media)) {
                    editingSkeet.media.forEach(m => {
                      if (!removedMedia[m.id] && m.previewUrl)
                        list.push({
                          src: m.previewUrl,
                          alt: editedMediaAlt[m.id] ?? (m.altText || '')
                        })
                    })
                  }
                  pendingMedia.forEach(m =>
                    list.push({
                      src: m.previewUrl || m.data,
                      alt: m.altText || ''
                    })
                  )
                  const items = list.slice(0, imagePolicy.maxCount || 4)
                  if (items.length === 0) return null
                  const hClass = items.length > 2 ? 'h-20' : 'h-28'
                  return (
                    <div className='mt-2 grid grid-cols-2 gap-2'>
                      {items.map((it, idx) => (
                        <div
                          key={idx}
                          className={`relative ${hClass} overflow-hidden rounded-xl border border-border bg-background-subtle`}
                        >
                          <img
                            src={it.src}
                            alt={it.alt || `Bild ${idx + 1}`}
                            className='absolute inset-0 h-full w-full object-contain'
                          />
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
            <div className='mt-2 text-sm text-foreground-muted'>
              Medien{' '}
              {(isEditing && Array.isArray(editingSkeet?.media)
                ? editingSkeet.media.filter(m => !removedMedia[m.id]).length
                : 0) + pendingMedia.length}
              /{imagePolicy.maxCount}
            </div>
          </div>
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <div className='space-y-2'>
          <label
            htmlFor='repeat'
            className='text-sm font-semibold text-foreground'
          >
            Wiederholungsmuster
          </label>
          <select
            id='repeat'
            value={repeat}
            onChange={e => {
              const value = e.target.value
              setRepeat(value)
              setRepeatDayOfWeek(null)
              setRepeatDayOfMonth(null)
            }}
            className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
          >
            <option value='none'>Keine Wiederholung</option>
            <option value='daily'>Täglich</option>
            <option value='weekly'>Wöchentlich</option>
            <option value='monthly'>Monatlich</option>
          </select>
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='time'
            className='text-sm font-semibold text-foreground'
          >
            Geplante Uhrzeit
          </label>
          <input
            id='time'
            type='time'
            value={scheduledTime}
            onChange={e => setScheduledTime(e.target.value)}
            className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
          />
        </div>

        {repeat === 'weekly' && (
          <div className='space-y-2'>
            <label
              htmlFor='repeatDayOfWeek'
              className='text-sm font-semibold text-foreground'
            >
              Wochentag
            </label>
            <select
              id='repeatDayOfWeek'
              value={repeatDayOfWeek ?? ''}
              onChange={e => {
                const value = e.target.value
                setRepeatDayOfWeek(value === '' ? null : Number(value))
              }}
              className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
            >
              <option value=''>Bitte wählen</option>
              <option value='1'>Montag</option>
              <option value='2'>Dienstag</option>
              <option value='3'>Mittwoch</option>
              <option value='4'>Donnerstag</option>
              <option value='5'>Freitag</option>
              <option value='6'>Samstag</option>
              <option value='0'>Sonntag</option>
            </select>
          </div>
        )}

        {repeat === 'monthly' && (
          <div className='space-y-2'>
            <label
              htmlFor='repeatDayOfMonth'
              className='text-sm font-semibold text-foreground'
            >
              Tag im Monat (1–31)
            </label>
            <input
              id='repeatDayOfMonth'
              type='number'
              min='1'
              max='31'
              value={repeatDayOfMonth ?? ''}
              onChange={e => {
                const value = e.target.value
                setRepeatDayOfMonth(value === '' ? null : Number(value))
              }}
              className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
            />
          </div>
        )}

        {repeat === 'none' && (
          <div className='space-y-2'>
            <label
              htmlFor='date'
              className='text-sm font-semibold text-foreground'
            >
              Geplantes Datum
            </label>
            <input
              id='date'
              type='date'
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
            />
          </div>
        )}
      </div>

      <div className='flex flex-wrap justify-end gap-3'>
        {isEditing && (
          <Button
            type='button'
            variant='secondary'
            onClick={() => onCancelEdit && onCancelEdit()}
          >
            Abbrechen
          </Button>
        )}
        <Button type='submit' variant='primary'>
          {isEditing ? 'Skeet aktualisieren' : 'Skeet speichern'}
        </Button>
      </div>
      <MediaDialog
        mode='upload'
        open={Boolean(mediaDialog.open)}
        title={mediaDialog.title || 'Bild hinzufügen'}
        accept={mediaDialog.accept || 'image/*'}
        requireAltText={Boolean(imagePolicy.requireAltText)}
        maxBytes={imagePolicy.maxBytes}
        allowedMimes={imagePolicy.allowedMimes}
        onConfirm={(file, alt) => {
          const reader = new FileReader()
          reader.onload = () => {
            setPendingMedia(arr => [
              ...arr,
              {
                filename: file.name,
                mime: file.type,
                data: reader.result,
                altText: alt || ''
              }
            ])
          }
          reader.readAsDataURL(file)
          setMediaDialog({ open: false })
        }}
        onClose={() => setMediaDialog({ open: false })}
      />
      {altDialog.open && altDialog.item ? (
        <MediaDialog
          open={altDialog.open}
          mode='alt'
          title={
            altDialog.item.alt ? 'Alt‑Text bearbeiten' : 'Alt‑Text hinzufügen'
          }
          previewSrc={altDialog.item.src}
          initialAlt={altDialog.item.alt || ''}
          requireAltText={Boolean(imagePolicy.requireAltText)}
          onConfirm={async (_file, newAlt) => {
            const it = altDialog.item
            try {
              if (it.type === 'existing' && it.id) {
                const res = await fetch(`/api/skeet-media/${it.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ altText: newAlt })
                })
                if (!res.ok)
                  throw new Error(
                    (await res.json().catch(() => ({}))).error ||
                      'Alt‑Text konnte nicht gespeichert werden.'
                  )
                setEditedMediaAlt(s => ({ ...s, [it.id]: newAlt }))
              } else if (it.type === 'pending') {
                setPendingMedia(arr => {
                  const clone = arr.slice()
                  if (clone[it.pendingIndex])
                    clone[it.pendingIndex] = {
                      ...clone[it.pendingIndex],
                      altText: newAlt
                    }
                  return clone
                })
              }
              toast.success({ title: 'Alt‑Text gespeichert' })
            } catch (e) {
              toast.error({
                title: 'Fehler beim Alt‑Text',
                description: e?.message || 'Unbekannter Fehler'
              })
            } finally {
              setAltDialog({ open: false, item: null })
            }
          }}
          onClose={() => setAltDialog({ open: false, item: null })}
        />
      ) : null}
    </form>
  )
}

export default SkeetForm
