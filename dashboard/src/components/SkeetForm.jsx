import { useEffect, useRef, useState } from 'react'
import { useToast } from '../hooks/useToast'
import Button from './ui/Button'
import MediaDialog from './MediaDialog'
import { useClientConfig } from '../hooks/useClientConfig'
import { weekdayOrder, weekdayLabel } from '../utils/weekday'
import Modal from './ui/Modal'
import { InfoCircledIcon } from '@radix-ui/react-icons'

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
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState([]) // number[]: 0=So … 6=Sa
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
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'de-DE'
  const order = weekdayOrder(locale)
  const [infoContentOpen, setInfoContentOpen] = useState(false)
  const [infoPreviewOpen, setInfoPreviewOpen] = useState(false)

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
      setRepeat(editingSkeet.repeat ?? 'none')
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

    if (repeat === 'weekly') {
      if (!repeatDaysOfWeek || repeatDaysOfWeek.length === 0) {
        toast.error({
          title: 'Bitte Wochentage wählen',
          description: 'Mindestens einen Tag markieren.'
        })
        return
      }
    }

    if (repeat === 'monthly') {
      const d = Number(repeatDayOfMonth)
      if (!Number.isInteger(d) || d < 1 || d > 31) {
        toast.error({
          title: 'Ungültiger Monatstag',
          description: 'Bitte einen Wert von 1 bis 31 wählen.'
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
      repeatDaysOfWeek,
      repeatDayOfMonth,
      repeatDayOfWeek:
        Array.isArray(repeatDaysOfWeek) && repeatDaysOfWeek.length
          ? repeatDaysOfWeek[0]
          : null,
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
        {/* Überschriftenzeile für Desktop: mit Info-Buttons, sauber neben den Labels ausgerichtet */}
        <div className='hidden lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6'>
          <div className='flex items-center justify-between self-end'>
            <label htmlFor='skeet-content' className='text-lg font-semibold text-foreground'>
              Skeet-Text
            </label>
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
              aria-label='Hinweis zu Skeet-Text anzeigen'
              onClick={() => setInfoContentOpen(true)}
              title='Hinweis anzeigen'
            >
              <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fill-rule='evenodd' clip-rule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
              Info
            </button>
          </div>
          <div />
          <div className='flex items-center justify-between self-end'>
            <label className='text-lg font-semibold text-foreground'>
              Vorschau
            </label>
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
              aria-label='Hinweis zur Vorschau anzeigen'
              onClick={() => setInfoPreviewOpen(true)}
              title='Hinweis anzeigen'
            >
              <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fill-rule='evenodd' clip-rule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
              Info
            </button>
          </div>
        </div>
        <div className='grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'>
          {/* Editor */}
          <div>
            {/* Mobile-Label für Editor + Info */}
            <div className='flex items-center justify-between lg:hidden'>
              <label
                htmlFor='skeet-content'
                className='text-lg font-semibold text-foreground'
              >
                Skeet-Text
              </label>
              <button
                type='button'
                className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label='Hinweis zu Skeet-Text anzeigen'
                onClick={() => setInfoContentOpen(true)}
                title='Hinweis anzeigen'
              >
                <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fill-rule='evenodd' clip-rule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
                Info
              </button>
            </div>
            <textarea
              ref={textareaRef}
              id='skeet-content'
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
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/*',
                    title: 'Bild hinzufügen'
                  })
                }
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                title={
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                    ? `Maximal ${imagePolicy.maxCount} Bilder`
                    : 'Bild hinzufügen'
                }
              >
                <span className='text-base md:text-lg leading-none'>🖼️</span>
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/gif',
                    title: 'GIF hinzufügen'
                  })
                }
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                title={
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                    ? `Maximal ${imagePolicy.maxCount} Bilder`
                    : 'GIF hinzufügen'
                }
              >
                GIF
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label='Emoji einfügen'
                onClick={() => {}}
              >
                <span className='text-base md:text-lg leading-none'>😊</span>
              </button>
            </div>
          </div>
          {/* Vertikale Toolbar (nur Desktop) */}
          <div className='hidden items-center justify-center lg:flex'>
            <div className='flex flex-col items-center gap-2'>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/*',
                    title: 'Bild hinzufügen'
                  })
                }
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                aria-label='Bild hinzufügen'
                title='Bild hinzufügen'
              >
                <span className='text-base md:text-lg leading-none'>🖼️</span>
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/gif',
                    title: 'GIF hinzufügen'
                  })
                }
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                aria-label='GIF hinzufügen'
                title='GIF hinzufügen'
              >
                GIF
              </button>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-background-elevated'
                aria-label='Emoji einfügen'
                onClick={() => {
                  /* Emoji Picker später */
                }}
              >
                <span className='text-base md:text-lg leading-none'>😊</span>
              </button>
            </div>
          </div>
          {/* Vorschau */}
          <div>
            {/* Mobile-Label + Info */}
            <div className='flex items-center justify-between lg:hidden'>
              <label className='text-lg font-semibold text-foreground'>
                Vorschau
              </label>
              <button
                type='button'
                className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label='Hinweis zur Vorschau anzeigen'
                onClick={() => setInfoPreviewOpen(true)}
                title='Hinweis anzeigen'
              >
                <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fill-rule='evenodd' clip-rule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
                Info
              </button>
            </div>
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
              setRepeatDaysOfWeek([])
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
            <label className='text-sm font-semibold text-foreground'>
              Wochentage
            </label>
            <div className='grid grid-cols-7 gap-2'>
              {order.map(idx => {
                const active = repeatDaysOfWeek.includes(idx)
                return (
                  <label
                    key={idx}
                    className={`inline-flex justify-center rounded-xl border px-2 py-1 text-sm cursor-pointer
                    ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground-muted hover:border-primary/50'
                    }`}
                    aria-pressed={active}
                  >
                    <input
                      type='checkbox'
                      className='sr-only'
                      checked={active}
                      onChange={() =>
                        setRepeatDaysOfWeek(prev =>
                          prev.includes(idx)
                            ? prev.filter(d => d !== idx)
                            : [...prev, idx]
                        )
                      }
                      aria-label={weekdayLabel(idx, locale, 'long')}
                    />
                    {
                      weekdayLabel(
                        idx,
                        locale,
                        'short'
                      ) /* z. B. "Mo", "Di", … */
                    }
                  </label>
                )
              })}
            </div>
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
      {/* Info: Skeet-Text */}
      {infoContentOpen ? (
        <Modal
          open={infoContentOpen}
          title='Hinweis: Skeet-Text'
          onClose={() => setInfoContentOpen(false)}
          actions={<Button variant='primary' onClick={() => setInfoContentOpen(false)}>OK</Button>}
        >
          <div className='space-y-2 text-sm text-foreground'>
            <p>
              Zielplattformen bestimmen das Zeichenlimit. Der kleinste Wert (z. B. Bluesky 300, Mastodon 500) gilt.
            </p>
            <p>
              Für Wiederholungen wähle bitte das passende Muster (keine/wöchentlich/monatlich) und gib die erforderlichen Felder an.
            </p>
          </div>
        </Modal>
      ) : null}

      {/* Info: Vorschau */}
      {infoPreviewOpen ? (
        <Modal
          open={infoPreviewOpen}
          title='Hinweis: Vorschau'
          onClose={() => setInfoPreviewOpen(false)}
          actions={<Button variant='primary' onClick={() => setInfoPreviewOpen(false)}>OK</Button>}
        >
          <div className='space-y-2 text-sm text-foreground'>
            <p>
              Über die Buttons kannst du Bilder oder GIFs hinzufügen. Maximal {imagePolicy?.maxCount ?? 4} Bilder je Skeet.
            </p>
            <p>
              Bilder werden beim Speichern hochgeladen. Der Zähler zeigt die aktuelle Zeichenanzahl im Verhältnis zum Limit.
            </p>
          </div>
        </Modal>
      ) : null}
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
