import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, MediaDialog } from '@bsky-kampagnen-bot/shared-ui'
import { useToast } from '@bsky-kampagnen-bot/shared-ui'
import { useClientConfig } from '../hooks/useClientConfig'
import { weekdayOrder, weekdayLabel } from '../utils/weekday'
import { GifPicker, EmojiPicker } from '@kampagnen-bot/media-pickers'
import LinkifiedText from './LinkifiedText'
import LinkPreviewCard from './LinkPreviewCard'
import { useLinkPreview } from '../hooks/useLinkPreview'
import {
  getDefaultDateParts,
  getInputPartsFromUtc,
  resolvePreferredTimeZone
} from '../utils/zonedDate'

const DASHBOARD_GIF_PICKER_CLASSES = {
  overlay: 'fixed inset-0 z-[200] flex items-center justify-center bg-black/40',
  panel: 'relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-background-elevated shadow-soft',
  header: 'flex flex-col gap-3 border-b border-border/80 bg-background px-4 py-3',
  title: 'text-base font-semibold text-foreground',
  searchBar: 'flex w-full items-center gap-2',
  input: 'flex-1 rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground',
  buttonPrimary: 'rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed',
  button: 'rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground hover:bg-background',
  content: 'flex-1 overflow-y-auto bg-background px-4 py-4',
  grid: 'grid grid-cols-3 gap-3',
  itemButton: 'overflow-hidden rounded-xl border border-border bg-background-subtle transition hover:ring-2 hover:ring-primary/40',
  image: 'h-24 w-full object-cover',
  statusText: 'text-xs text-foreground-muted',
  loadingMore: 'text-xs text-foreground-muted',
  footer: 'hidden',
  skeleton: 'h-24 w-full animate-pulse rounded-xl border border-border bg-background-subtle',
  error: 'text-sm text-destructive',
}

const DASHBOARD_GIF_PICKER_STYLES = {
  overlay: { padding: '16px' },
  //panel: { width: 'min(520px, 92vw)', height: 'min(420px, 92vh)', padding: 0 },
  panel: { width: '70vw', maxWidth: '1200px' },
  grid: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' },
  itemButton: { borderRadius: '14px' },
  image: { height: '120px' },
  skeleton: { height: '120px' }
}

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

/**
 * Formular zum Erstellen oder Bearbeiten eines Skeets.
 *
 * @param {Function} onSkeetSaved   Callback nach erfolgreichem Speichern (lädt Liste neu).
 * @param {Object|null} editingSkeet Aktueller Datensatz beim Bearbeiten, sonst null.
 * @param {Function} onCancelEdit   Wird beim Abbrechen aufgerufen (z. B. Tab-Wechsel).
 */
function SkeetForm ({ onSkeetSaved, editingSkeet, onCancelEdit, initialContent }) {
  const { config: clientConfig } = useClientConfig()
  const timeZone = resolvePreferredTimeZone(clientConfig?.timeZone)
  const defaultDateParts = useMemo(
    () => getDefaultDateParts(timeZone) ?? { date: '', time: '' },
    [timeZone]
  )
  const mastodonStatus = clientConfig?.platforms?.mastodonConfigured
  const mastodonConfigured = mastodonStatus !== false
  const defaultPlatformFallback = useMemo(
    () => (mastodonStatus === true ? ['bluesky', 'mastodon'] : ['bluesky']),
    [mastodonStatus]
  )
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
  } catch (e){ console.log(e) }
    return defaultPlatformFallback
  })
  const [scheduledDate, setScheduledDate] = useState(defaultDateParts.date)
  const [scheduledTime, setScheduledTime] = useState(defaultDateParts.time)
  const [repeat, setRepeat] = useState('none')
  // Single weekly day is derived from repeatDaysOfWeek[0]
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(null)

  const isEditing = Boolean(editingSkeet)
  const maxContentLength = resolveMaxLength(targetPlatforms)
  const toast = useToast()
  const tenorAvailable = Boolean(clientConfig?.gifs?.tenorAvailable)
  const imagePolicy = clientConfig?.images || {
    maxCount: 4,
    maxBytes: 8 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    requireAltText: false
  }
  const [pendingMedia, setPendingMedia] = useState([])
  const [mediaDialog, setMediaDialog] = useState({ open: false })
  const [gifPicker, setGifPicker] = useState({ open: false })
  const [emojiPicker, setEmojiPicker] = useState({ open: false })
  const [editedMediaAlt, setEditedMediaAlt] = useState({})
  const [removedMedia, setRemovedMedia] = useState({})
  const [altDialog, setAltDialog] = useState({ open: false, item: null })
  const textareaRef = useRef(null)
  const previewRef = useRef(null)
  const timeInputRef = useRef(null)
  const dateInputRef = useRef(null)
  const [coupledHeight] = useState(null)
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'de-DE'
  const order = weekdayOrder(locale)
  const [infoContentOpen, setInfoContentOpen] = useState(false)
  const [infoPreviewOpen, setInfoPreviewOpen] = useState(false)
  const [sendingNow, setSendingNow] = useState(false)
  const existingMediaCount = useMemo(() => {
    if (!isEditing || !Array.isArray(editingSkeet?.media)) return 0
    return editingSkeet.media.filter(m => !removedMedia[m.id]).length
  }, [isEditing, editingSkeet, removedMedia])
  const pendingMediaCount = pendingMedia.length
  const previewBlocked = (existingMediaCount + pendingMediaCount) > 0
  const previewDisabledReason = previewBlocked
    ? 'Link-Vorschauen können nicht gemeinsam mit Bildanhängen gesendet werden.'
    : ''
  const {
    previewUrl,
    preview,
    loading: previewLoading,
    error: previewError
  } = useLinkPreview(content, { enabled: !previewBlocked })
  const initializedRef = useRef(false)
  const prevEditingRef = useRef(Boolean(editingSkeet))

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

  const handleRemoveMedia = async (item) => {
    if (!item) return
    if (item.type === 'existing' && item.id) {
      try {
        const res = await fetch(`/api/skeet-media/${item.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Bild konnte nicht entfernt werden.')
        }
        setRemovedMedia((prev) => ({ ...prev, [item.id]: true }))
        setEditedMediaAlt((prev) => {
          if (!prev[item.id]) return prev
          const clone = { ...prev }
          delete clone[item.id]
          return clone
        })
        toast.success({ title: 'Bild entfernt' })
      } catch (error) {
        toast.error({ title: 'Entfernen fehlgeschlagen', description: error?.message || 'Unbekannter Fehler' })
      }
      return
    }
    if (item.type === 'pending' && typeof item.pendingIndex === 'number') {
      setPendingMedia((arr) => arr.filter((_, idx) => idx !== item.pendingIndex))
    }
  }

  function resetToDefaults () {
    setContent((typeof initialContent === 'string' && initialContent.length) ? initialContent : '')
    setTargetPlatforms(defaultPlatformFallback)
    setRepeat('none')
    setRepeatDayOfMonth(null)
    setPendingMedia([])
    const defaults = getDefaultDateParts(timeZone) ?? { date: '', time: '' }
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
          : defaultPlatformFallback
      )
      setRepeat(editingSkeet.repeat ?? 'none')
      if (editingSkeet.repeat === 'weekly' && editingSkeet.repeatDayOfWeek != null) {
        setRepeatDaysOfWeek([Number(editingSkeet.repeatDayOfWeek)])
      } else {
        setRepeatDaysOfWeek([])
      }
      setRepeatDayOfMonth(
        editingSkeet.repeat === 'monthly' &&
          editingSkeet.repeatDayOfMonth != null
          ? Number(editingSkeet.repeatDayOfMonth)
          : null
      )

      prevEditingRef.current = true
      initializedRef.current = true
      return
    }
    if (!initializedRef.current || prevEditingRef.current) {
      resetToDefaults()
      initializedRef.current = true
    }
    prevEditingRef.current = false
  }, [editingSkeet, timeZone])

  useEffect(() => {
    if (editingSkeet?.scheduledAt) {
      const parts =
        getInputPartsFromUtc(editingSkeet.scheduledAt, timeZone) ??
        (getDefaultDateParts(timeZone) || { date: '', time: '' })
      setScheduledDate(parts.date)
      setScheduledTime(parts.time)
    } else if (!editingSkeet) {
      const defaults = getDefaultDateParts(timeZone) ?? { date: '', time: '' }
      setScheduledDate(defaults.date)
      setScheduledTime(defaults.time)
    }
  }, [editingSkeet, timeZone])
  
  // Mastodon deaktivieren, wenn keine Zugangsdaten vorhanden
  useEffect(() => {
    if (mastodonStatus === false) {
      setTargetPlatforms(prev => prev.filter(p => p !== 'mastodon'))
    }
  }, [mastodonStatus])

  useEffect(() => {
    if (mastodonStatus === true && !isEditing) {
      setTargetPlatforms(prev => (prev.includes('mastodon') ? prev : [...prev, 'mastodon']))
    }
  }, [mastodonStatus, isEditing])

  function togglePlatform (name) {
    if (name === 'mastodon' && !mastodonConfigured) return
    setTargetPlatforms(prev => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev
        return prev.filter(p => p !== name)
      }
      return [...prev, name]
    })
  }

  const scheduledDateTimeString =
    scheduledDate && scheduledTime
      ? `${scheduledDate}T${scheduledTime}`
      : null

  const handleSubmit = async e => {
    e.preventDefault()

    const normalizedPlatforms = Array.from(new Set(targetPlatforms))
    const submissionLimit = resolveMaxLength(normalizedPlatforms)

    if (content.length > submissionLimit) {
      toast.error({
        title: 'Zeichenlimit überschritten',
        description: `Der Post darf maximal ${submissionLimit} Zeichen für die ausgewählten Plattformen enthalten.`
      })
      return
    }

    if (repeat === 'none') {
      const hasSchedule = Boolean(scheduledDateTimeString && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(scheduledDateTimeString))
      if (!hasSchedule) {
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
      scheduledAt: scheduledDateTimeString,
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
        title: isEditing ? 'Post aktualisiert' : 'Post geplant',
        description: 'Die Änderungen wurden übernommen.'
      })
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error({
        title: 'Speichern fehlgeschlagen',
        description: data.error || 'Fehler beim Speichern des Posts.'
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6 space-x-2'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-foreground'>
            {isEditing ? 'Post bearbeiten' : 'Neuen Post planen'}
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
            const disabled = platform === 'mastodon' && !mastodonConfigured
            const title = disabled ? 'Mastodon-Zugang nicht konfiguriert' : undefined
            return (
              <label
                key={platform}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow-soft'
                    : 'border-border text-foreground-muted hover:border-primary/50'
                } ${disabled ? 'opacity-60 cursor-not-allowed hover:border-border' : ''}`}
                aria-disabled={disabled || undefined}
                title={title}
              >
                <input
                  type='checkbox'
                  className='sr-only'
                  checked={isActive && !disabled}
                  disabled={disabled}
                  onChange={() => togglePlatform(platform)}
                />
                <span className='capitalize'>
                  {platform.toLowerCase()}
                  <span className='ml-1 text-xs text-foreground-muted'>({PLATFORM_LIMITS[platform]})</span>
                </span>
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
              Post-Text
            </label>
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
              aria-label='Hinweis zu Post-Text anzeigen'
              onClick={() => setInfoContentOpen(true)}
              title='Hinweis anzeigen'
            >
              <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fillRule='evenodd' clipRule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
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
              <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fillRule='evenodd' clipRule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
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
                Post-Text
              </label>
              <button
                type='button'
                className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label='Hinweis zu Post-Text anzeigen'
                onClick={() => setInfoContentOpen(true)}
                title='Hinweis anzeigen'
              >
                <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fillRule='evenodd' clipRule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
                Info
              </button>
            </div>
            <textarea
              ref={textareaRef}
              id='skeet-content'
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={(e) => {
                try {
                  if ((e.ctrlKey || e.metaKey) && (e.key === '.' || e.code === 'Period')) {
                    e.preventDefault()
                    setEmojiPicker({ open: true })
                  }
                } catch { 
                  // Shortcut konnte nicht verarbeitet werden; ignorieren
                }
              }}
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
              {tenorAvailable ? (
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() => setGifPicker({ open: true })}
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                title={
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                    ? `Maximal ${imagePolicy.maxCount} Bilder`
                    : 'GIF hinzufügen'
                }
              >
                GIF
              </button>
              ) : null}
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label='Emoji einfügen'
                aria-keyshortcuts='Control+. Meta+.'
                title='Emoji einfügen (Ctrl+.)'
                onClick={() => setEmojiPicker({ open: true })}
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
              {tenorAvailable ? (
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() => setGifPicker({ open: true })}
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                aria-label='GIF hinzufügen'
                title='GIF hinzufügen'
              >
                GIF
              </button>
              ) : null}
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-background-elevated'
                aria-label='Emoji einfügen'
                aria-keyshortcuts='Control+. Meta+.'
                title='Emoji einfügen (Ctrl+.)'
                onClick={() => setEmojiPicker({ open: true })}
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
                <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fillRule='evenodd' clipRule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
                Info
              </button>
            </div>
            <div
              ref={previewRef}
              className='rounded-2xl border border-border bg-background py-3 px-4 shadow-soft flex flex-col overflow-hidden'
              style={coupledHeight ? { height: `${coupledHeight}px` } : {}}
            >
              <div className='flex-1 overflow-auto pr-2'>
                <LinkifiedText
                  text={content}
                  placeholder='(kein Inhalt)'
                  className='whitespace-pre-wrap break-words leading-relaxed text-foreground'
                />
                {(() => {
                  const list = []
                  if (isEditing && Array.isArray(editingSkeet?.media)) {
                    editingSkeet.media.forEach(m => {
                      if (!removedMedia[m.id] && m.previewUrl) {
                        list.push({
                          type: 'existing',
                          id: m.id,
                          src: m.previewUrl,
                          alt: editedMediaAlt[m.id] ?? (m.altText || ''),
                          pendingIndex: null
                        })
                      }
                    })
                  }
                  pendingMedia.forEach((m, idx) =>
                    list.push({
                      type: 'pending',
                      id: null,
                      src: m.previewUrl || m.data,
                      alt: m.altText || '',
                      pendingIndex: idx
                    })
                  )
                  const items = list.slice(0, imagePolicy.maxCount || 4)
                  if (items.length === 0) return null
                  const hClass = items.length > 2 ? 'h-20' : 'h-28'
                  return (
                    <div className='mt-2 grid grid-cols-2 gap-2'>
                      {items.map((it, idx) => (
                        <div
                          key={`${it.type}-${it.id ?? it.pendingIndex}-${idx}`}
                          className={`relative ${hClass} overflow-hidden rounded-xl border border-border bg-background-subtle`}
                        >
                          <img
                            src={it.src}
                            alt={it.alt || `Bild ${idx + 1}`}
                            className='absolute inset-0 h-full w-full object-contain'
                          />
                          <div className='pointer-events-none absolute left-1 top-1 z-10'>
                            <span
                              className={`pointer-events-auto rounded-full px-2 py-1 text-[10px] font-semibold text-white ${it.alt ? 'bg-black/60' : 'bg-black/90 ring-1 ring-white/30'}`}
                              title={it.alt ? 'Alt‑Text bearbeiten' : 'Alt‑Text hinzufügen'}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setAltDialog({ open: true, item: it })
                              }}
                              role='button'
                              tabIndex={0}
                              aria-label={it.alt ? 'Alt‑Text bearbeiten' : 'Alt‑Text hinzufügen'}
                            >
                              {it.alt ? 'ALT' : '+ ALT'}
                            </span>
                          </div>
                          <div className='absolute right-1 top-1 z-10 flex gap-1'>
                            <button
                              type='button'
                              className='rounded-full bg-black/60 px-2 py-1 text-white hover:bg-black/80'
                              title='Bild entfernen'
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemoveMedia(it)
                              }}
                              aria-label='Bild entfernen'
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                <LinkPreviewCard
                  preview={preview}
                  url={previewUrl}
                  loading={previewLoading}
                  error={previewError}
                  disabled={previewBlocked}
                  disabledReason={previewDisabledReason}
                />
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
            ref={timeInputRef}
            onClick={() => {
              try {
                timeInputRef.current?.showPicker?.()
              } catch { 
                // showPicker nicht verfügbar
              }
            }}
            onFocus={() => {
              try {
                timeInputRef.current?.showPicker?.()
              } catch { 
                // showPicker nicht verfügbar
              }
            }}
            onChange={e => {
              setScheduledTime(e.target.value)
              try {
                timeInputRef.current?.blur?.()
              } catch { 
                // blur konnte nicht erzwungen werden
              }
            }}
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
              ref={dateInputRef}
              onClick={() => {
                try {
                  dateInputRef.current?.showPicker?.()
                } catch { 
                  // showPicker nicht verfügbar
                }
              }}
              onFocus={() => {
                try {
                  dateInputRef.current?.showPicker?.()
                } catch { 
                  // showPicker nicht verfügbar
                }
              }}
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
          {isEditing ? 'Post aktualisieren' : 'Planen'}
        </Button>
        <Button
          type='button'
          variant='warning'
          disabled={sendingNow}
          onClick={async () => {
            if (!isEditing) {
              // Direktversand benötigt einen existierenden Datensatz → erst speichern mit sofortigem Termin
              const normalizedPlatforms = Array.from(new Set(targetPlatforms))
              const submissionLimit = resolveMaxLength(normalizedPlatforms)
              if (content.length > submissionLimit) {
                toast.error({ title: 'Zeichenlimit überschritten', description: `Max. ${submissionLimit} Zeichen.` })
                return
              }
              const now = new Date()
              const pad = n => String(n).padStart(2, '0')
              const localIso = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
              const createPayload = {
                content,
                scheduledAt: localIso,
                repeat: 'none',
                repeatDaysOfWeek: [],
                repeatDayOfMonth: null,
                repeatDayOfWeek: null,
                targetPlatforms: normalizedPlatforms,
                media: pendingMedia,
              }
              setSendingNow(true)
              try {
                const resCreate = await fetch('/api/skeets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createPayload) })
                if (!resCreate.ok) {
                  const data = await resCreate.json().catch(() => ({}))
                  throw new Error(data.error || 'Post konnte nicht erstellt werden.')
                }
                const created = await resCreate.json()
                if (!created?.id) throw new Error('Unerwartete Antwort beim Erstellen des Posts.')
                const resPub = await fetch(`/api/skeets/${created.id}/publish-now`, { method: 'POST' })
                if (!resPub.ok) {
                  const data = await resPub.json().catch(() => ({}))
                  throw new Error(data.error || 'Direktveröffentlichung fehlgeschlagen.')
                }
                toast.success({ title: 'Veröffentlicht (direkt)', description: 'Der Post wurde unmittelbar gesendet.' })
                resetToDefaults()
                if (onSkeetSaved) onSkeetSaved()
              } catch (e) {
                toast.error({ title: 'Senden fehlgeschlagen', description: e?.message || 'Unbekannter Fehler' })
              } finally {
                setSendingNow(false)
              }
              return
            }

            // Bearbeiten: existierenden posten
            setSendingNow(true)
            try {
              const res = await fetch(`/api/skeets/${editingSkeet.id}/publish-now`, { method: 'POST' })
              if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Direktveröffentlichung fehlgeschlagen.')
              }
              toast.success({ title: 'Veröffentlicht (direkt)', description: 'Der Post wurde unmittelbar gesendet.' })
              if (onSkeetSaved) onSkeetSaved()
            } catch (e) {
              toast.error({ title: 'Senden fehlgeschlagen', description: e?.message || 'Unbekannter Fehler' })
            } finally {
              setSendingNow(false)
            }
          }}
        >
          {sendingNow ? 'Senden…' : 'Sofort senden'}
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
      {tenorAvailable ? (
        <GifPicker
          open={gifPicker.open}
          onClose={() => setGifPicker({ open: false })}
          classNames={DASHBOARD_GIF_PICKER_CLASSES}
          styles={DASHBOARD_GIF_PICKER_STYLES}
          onPick={async ({ downloadUrl }) => {
            try {
              const res = await fetch(downloadUrl)
              const blob = await res.blob()
              if (blob.size > (imagePolicy.maxBytes || 8 * 1024 * 1024)) {
                toast.error({ title: 'GIF zu groß', description: 'Bitte ein kleineres GIF wählen.' })
                return
              }
              const file = new File([blob], 'tenor.gif', { type: 'image/gif' })
              const reader = new FileReader()
              reader.onload = () => {
                setPendingMedia(arr => [
                  ...arr,
                  {
                    filename: file.name,
                    mime: file.type,
                    data: reader.result,
                    altText: ''
                  }
                ])
              }
              reader.readAsDataURL(file)
            } catch (e) {
              toast.error({ title: 'GIF konnte nicht geladen werden', description: e?.message || 'Unbekannter Fehler' })
            } finally {
              setGifPicker({ open: false })
            }
          }}
        />
      ) : null}
      <EmojiPicker
        open={emojiPicker.open}
        onClose={() => setEmojiPicker({ open: false })}
        anchorRef={textareaRef}
        verticalAlign='center'
        onPick={(emoji) => {
          const value = emoji?.native || emoji?.shortcodes || emoji?.id
          if (!value) return
          try {
            const ta = textareaRef.current
            if (!ta) return
            const { selectionStart = content.length, selectionEnd = content.length } = ta
            const next = `${content.slice(0, selectionStart)}${value}${content.slice(selectionEnd)}`
            setContent(next)
            setEmojiPicker({ open: false })
            setTimeout(() => {
              try {
                const pos = selectionStart + value.length
                ta.selectionStart = pos
                ta.selectionEnd = pos
                ta.focus()
              } catch { 
                // Cursor konnte nicht aktualisiert werden
              }
            }, 0)
          } catch { 
            // Einfügen fehlgeschlagen; Eingabe unverändert lassen
          }
        }}
      />
      {/* Info: Post-Text */}
      {infoContentOpen ? (
        <Modal
          open={infoContentOpen}
          title='Hinweis: Post-Text'
          onClose={() => setInfoContentOpen(false)}
          actions={<Button variant='primary' onClick={() => setInfoContentOpen(false)}>OK</Button>}
        >
          <div className='space-y-2 text-sm text-foreground'>
            <p>
              Zielplattformen bestimmen das Zeichenlimit. Der kleinste Wert (z. B. Bluesky 300, Mastodon 500) gilt.
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
              Über die Buttons kannst du Bilder oder GIFs hinzufügen. Maximal {imagePolicy?.maxCount ?? 4} Bilder je Post.
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
