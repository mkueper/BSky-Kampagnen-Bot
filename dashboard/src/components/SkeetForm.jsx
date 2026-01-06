import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ConfirmDialog, InlineField, InfoDialog, MediaDialog, SegmentMediaGrid } from '@bsky-kampagnen-bot/shared-ui'
import { useToast } from '@bsky-kampagnen-bot/shared-ui'
import { useClientConfig } from '../hooks/useClientConfig'
import { useSchedulerSettings } from '../hooks/useSchedulerSettings'
import { weekdayOrder, weekdayLabel } from '../utils/weekday'
import { GifPicker, EmojiPicker } from '@kampagnen-bot/media-pickers'
import { ImageIcon, FaceIcon } from '@radix-ui/react-icons'
import LinkifiedText from './LinkifiedText'
import LinkPreviewCard from './LinkPreviewCard'
import { useLinkPreview } from '../hooks/useLinkPreview'
import { useTranslation } from '../i18n/I18nProvider.jsx'
import {
  getDefaultDateParts,
  getInputPartsFromUtc,
  resolvePreferredTimeZone
} from '../utils/zonedDate'
import { applyRandomOffsetToLocalDateTime, clampTimeToNowForToday } from '../utils/scheduling'
import {
  buildSegmentMediaItems,
  countSegmentMedia
} from '@bsky-kampagnen-bot/shared-logic'

const DASHBOARD_GIF_PICKER_CLASSES = {
  overlay: 'fixed inset-0 z-[200] flex items-center justify-center bg-black/40',
  panel: 'relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-background-elevated shadow-soft',
  header: 'flex flex-col gap-3 border-b border-border/80 bg-background px-4 py-3',
  title: 'text-base font-semibold text-foreground',
  searchBar: 'flex w-full items-center gap-2',
  input: 'flex-1 rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground',
  buttonPrimary: 'rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground',
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

function normalizeRepeatValue (value) {
  if (value == null || value === '' || value === 0 || value === '0' || value === false) {
    return 'none'
  }
  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'none') {
    return value
  }
  return 'none'
}

/**
 * Formular zum Erstellen oder Bearbeiten eines Skeets.
 *
 * @param {Function} onSkeetSaved   Callback nach erfolgreichem Speichern (lädt Liste neu).
 * @param {Object|null} editingSkeet Aktueller Datensatz beim Bearbeiten, sonst null.
 * @param {Function} onCancelEdit   Wird beim Abbrechen aufgerufen (z. B. Tab-Wechsel).
 */
function SkeetForm ({ onSkeetSaved, editingSkeet, onCancelEdit }) {
  const { t } = useTranslation()
  const { config: clientConfig } = useClientConfig()
  const timeZone = resolvePreferredTimeZone(clientConfig?.timeZone)
  const defaultDateParts = useMemo(
    () => getDefaultDateParts(timeZone) ?? { date: '', time: '' },
    [timeZone]
  )
  const nowLocal = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    return { todayDate: `${year}-${month}-${day}`, nowTime: `${hour}:${minute}` }
  }, [])
  const { todayDate, nowTime } = nowLocal
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
  const [sendNowConfirmOpen, setSendNowConfirmOpen] = useState(false)
  const [sendingNow, setSendingNow] = useState(false)
  const { randomOffsetMinutes, loading: schedulerLoading } = useSchedulerSettings()
  const jitterAvailable = Number(randomOffsetMinutes) > 0
  const [applyJitter, setApplyJitter] = useState(false)
  const existingSegments = useMemo(() => {
    if (!Array.isArray(editingSkeet?.media)) return []
    return [{ sequence: 0, media: editingSkeet.media }]
  }, [editingSkeet])
  const totalMediaCount = useMemo(
    () =>
      countSegmentMedia({
        segmentIndex: 0,
        existingSegments,
        pendingMediaMap: { 0: pendingMedia },
        removedMediaMap: removedMedia
      }),
    [existingSegments, pendingMedia, removedMedia]
  )
  const segmentMediaItems = useMemo(
    () =>
      buildSegmentMediaItems({
        segmentIndex: 0,
        existingSegments,
        pendingMediaMap: { 0: pendingMedia },
        removedMediaMap: removedMedia,
        editedMediaAltMap: editedMediaAlt
      }),
    [editedMediaAlt, existingSegments, pendingMedia, removedMedia]
  )
  const mediaGridLabels = useMemo(
    () => ({
      imageAlt: index =>
        t('posts.form.media.imageAltFallback', 'Bild {index}', { index }),
      altAddTitle: t('posts.form.media.altAddTitle', 'Alt‑Text bearbeiten'),
      altEditTitle: t('posts.form.media.altEditTitle', 'Alt‑Text bearbeiten'),
      altBadge: t('posts.form.media.altBadge', 'ALT'),
      altAddBadge: t('posts.form.media.altAddBadge', '+ ALT'),
      removeTitle: t('posts.form.media.removeButtonTitle', 'Bild entfernen'),
      removeAria: t('posts.form.media.removeButtonTitle', 'Bild entfernen')
    }),
    [t]
  )
  const mediaDialogLabels = useMemo(
    () => ({
      selectFile: t('common.mediaDialog.selectFile', 'Datei auswählen'),
      allowedHint: (allowed, max) =>
        t(
          'common.mediaDialog.allowedHint',
          'Erlaubt: {allowed} · Max {max}',
          { allowed, max }
        ),
      invalidType: t('common.mediaDialog.invalidType', 'Nicht unterstützter Dateityp.'),
      maxSize: (max) =>
        t('common.mediaDialog.maxSize', 'Maximal {max} erlaubt.', { max }),
      altRequired: t('common.mediaDialog.altRequired', 'Alt-Text ist erforderlich.'),
      altTooLong: t(
        'common.mediaDialog.altTooLong',
        'Alt-Text ist zu lang (max. 2000 Zeichen).'
      ),
      prepareError: t(
        'common.mediaDialog.prepareError',
        'Bild konnte nicht vorbereitet werden.'
      ),
      noPreview: t('common.mediaDialog.noPreview', 'Keine Vorschau'),
      previewAlt: t('common.mediaDialog.previewAlt', 'Vorschau'),
      editAltAria: t('common.mediaDialog.editAltAria', 'Alt-Text bearbeiten'),
      altLabel: t('common.mediaDialog.altLabel', 'Alt-Text'),
      altRequiredSuffix: t('common.mediaDialog.altRequiredSuffix', '(Pflicht)'),
      altHintWithInitial: t(
        'common.mediaDialog.altHintWithInitial',
        'Passe den vorhandenen Alt-Text bei Bedarf an.'
      ),
      altHintDefault: t(
        'common.mediaDialog.altHintDefault',
        'Beschreibe kurz, was auf dem Bild oder Video zu sehen ist.'
      ),
      altPlaceholder: t('common.mediaDialog.altPlaceholder', 'Beschreibender Alt-Text'),
      cancelLabel: t('common.mediaDialog.cancel', 'Abbrechen'),
      confirmLabel: t('common.mediaDialog.confirm', 'Übernehmen')
    }),
    [t]
  )
  const gifPickerLabels = useMemo(
    () => ({
      title: t('common.gifPicker.title', 'GIF suchen (Tenor)'),
      searchPlaceholder: t('common.gifPicker.searchPlaceholder', 'Suchbegriff'),
      searchButton: t('common.gifPicker.searchButton', 'Suchen'),
      closeButton: t('common.gifPicker.closeButton', 'Schließen'),
      imageAlt: t('common.gifPicker.imageAlt', 'GIF'),
      emptyFeatured: t('common.gifPicker.emptyFeatured', 'Keine GIFs verfügbar.'),
      emptySearch: t(
        'common.gifPicker.emptySearch',
        'Keine GIFs gefunden. Bitte anderen Suchbegriff probieren.'
      ),
      loadingMore: t('common.gifPicker.loadingMore', 'Weitere GIFs werden geladen…'),
      loadMoreHint: t(
        'common.gifPicker.loadMoreHint',
        'Scroll weiter nach unten, um mehr GIFs zu laden.'
      ),
      errorPrefix: t('common.gifPicker.errorPrefix', 'Fehler'),
      footerEmpty: t('common.gifPicker.footerEmpty', 'Keine weiteren GIFs verfügbar.')
    }),
    [t]
  )
  const previewBlocked = totalMediaCount > 0
  const previewDisabledReason = previewBlocked
    ? t(
        'posts.form.previewDisabledReason',
        'Link-Vorschauen können nicht gemeinsam mit Bildanhängen gesendet werden.'
      )
    : ''
  const hasContentOrMedia =
    content.trim().length > 0 || totalMediaCount > 0
  const previewUnavailableMessage = t(
    'posts.form.preview.unavailableStandalone',
    'Link-Vorschau ist im Standalone-Modus derzeit nicht verfügbar.'
  )
  const {
    previewUrl,
    preview,
    loading: previewLoading,
    error: previewError
  } = useLinkPreview(content, {
    enabled: !previewBlocked,
    unavailableMessage: previewUnavailableMessage
  })
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
          throw new Error(
            data?.error ||
              t(
                'posts.form.media.removeErrorFallback',
                'Bild konnte nicht entfernt werden.'
              )
          )
        }
        setRemovedMedia((prev) => ({ ...prev, [item.id]: true }))
        setEditedMediaAlt((prev) => {
          if (!prev[item.id]) return prev
          const clone = { ...prev }
          delete clone[item.id]
          return clone
        })
        toast.success({
          title: t('posts.form.media.removeSuccessTitle', 'Bild entfernt')
        })
      } catch (error) {
        toast.error({
          title: t('posts.form.media.removeErrorTitle', 'Entfernen fehlgeschlagen'),
          description:
            error?.message ||
            t('common.errors.unknown', 'Unbekannter Fehler')
        })
      }
      return
    }
    if (item.type === 'pending' && typeof item.pendingIndex === 'number') {
      setPendingMedia((arr) => arr.filter((_, idx) => idx !== item.pendingIndex))
    }
  }

  function resetToDefaults ({ focus = false } = {}) {
    setContent('')
    setTargetPlatforms(defaultPlatformFallback)
    setRepeat('none')
    setRepeatDayOfMonth(null)
    setPendingMedia([])
    const defaults = getDefaultDateParts(timeZone) ?? { date: '', time: '' }
    setScheduledDate(defaults.date)
    setScheduledTime(defaults.time)
    if (focus) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    }
  }

  useEffect(() => {
    if (editingSkeet) {
      const normalizedRepeat = normalizeRepeatValue(editingSkeet.repeat)
      setContent(editingSkeet.content ?? '')
      setRepeat(normalizedRepeat)
      setTargetPlatforms(
        Array.isArray(editingSkeet.targetPlatforms) &&
          editingSkeet.targetPlatforms.length > 0
          ? editingSkeet.targetPlatforms
          : defaultPlatformFallback
      )
      setRepeat(normalizedRepeat)
      if (normalizedRepeat === 'weekly') {
        let rawDays = []
        if (
          Array.isArray(editingSkeet.repeatDaysOfWeek) &&
          editingSkeet.repeatDaysOfWeek.length
        ) {
          rawDays = editingSkeet.repeatDaysOfWeek
        } else if (typeof editingSkeet.repeatDaysOfWeek === 'string') {
          try {
            const parsed = JSON.parse(editingSkeet.repeatDaysOfWeek)
            if (Array.isArray(parsed) && parsed.length) {
              rawDays = parsed
            }
          } catch {
            // ignorieren, Fallback unten
          }
        }
        if (
          (!Array.isArray(rawDays) || !rawDays.length) &&
          editingSkeet.repeatDayOfWeek != null
        ) {
          rawDays = [editingSkeet.repeatDayOfWeek]
        }

        const normalizedDays = Array.from(
          new Set(
            rawDays
              .map(v => Number(v))
              .filter(v => Number.isInteger(v) && v >= 0 && v <= 6)
          )
        )
        setRepeatDaysOfWeek(normalizedDays)
      } else {
        setRepeatDaysOfWeek([])
      }
      setRepeatDayOfMonth(
        normalizedRepeat === 'monthly' &&
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
    const plannedValue = editingSkeet?.scheduledPlannedAt || editingSkeet?.scheduledAt
    if (plannedValue) {
      const rawParts =
        getInputPartsFromUtc(plannedValue, timeZone) ??
        (getDefaultDateParts(timeZone) || { date: '', time: '' })
      const clamped = clampTimeToNowForToday({
        date: rawParts.date,
        time: rawParts.time,
        todayDate,
        nowTime
      })
      setScheduledDate(clamped.date)
      setScheduledTime(clamped.time)
    } else if (!editingSkeet) {
      const defaults = getDefaultDateParts(timeZone) ?? { date: '', time: '' }
      setScheduledDate(defaults.date)
      setScheduledTime(defaults.time)
    }
  }, [editingSkeet, timeZone, todayDate, nowTime])

  useEffect(() => {
    if (!editingSkeet) {
      setApplyJitter(false)
      return
    }
    const planned = editingSkeet?.scheduledPlannedAt
    const actual = editingSkeet?.scheduledAt
    if (!planned || !actual) {
      setApplyJitter(false)
      return
    }
    const plannedTime = new Date(planned).getTime()
    const actualTime = new Date(actual).getTime()
    if (Number.isNaN(plannedTime) || Number.isNaN(actualTime)) {
      setApplyJitter(false)
      return
    }
    setApplyJitter(plannedTime !== actualTime)
  }, [editingSkeet])

  useEffect(() => {
    if (!jitterAvailable && !schedulerLoading) {
      setApplyJitter(false)
    }
  }, [jitterAvailable, schedulerLoading])
  
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

    if (!hasContentOrMedia) {
      toast.error({
        title: t('posts.form.noContentTitle', 'Kein Inhalt'),
        description: t(
          'posts.form.noContentDescription',
          'Bitte Text eingeben oder mindestens ein Medium hinzufügen.'
        )
      })
      return
    }

    if (content.length > submissionLimit) {
      toast.error({
        title: t('posts.form.limitExceededTitle', 'Zeichenlimit überschritten'),
        description: t(
          'posts.form.limitExceededDescription',
          'Der Post darf maximal {limit} Zeichen für die ausgewählten Plattformen enthalten.',
          { limit: submissionLimit }
        )
      })
      return
    }

    if (repeat === 'none') {
      const hasSchedule = Boolean(scheduledDateTimeString && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(scheduledDateTimeString))
      if (!hasSchedule) {
        toast.error({
          title: t('posts.form.invalidScheduleTitle', 'Ungültige Planung'),
          description: t(
            'posts.form.invalidScheduleDescription',
            'Bitte Datum und Uhrzeit prüfen.'
          )
        })
        return
      }
    }

    if (repeat === 'weekly') {
      if (!repeatDaysOfWeek || repeatDaysOfWeek.length === 0) {
        toast.error({
          title: t(
            'posts.form.weeklyMissingDaysTitle',
            'Bitte Wochentage wählen'
          ),
          description: t(
            'posts.form.weeklyMissingDaysDescription',
            'Mindestens einen Tag markieren.'
          )
        })
        return
      }
    }

    if (repeat === 'monthly') {
      const d = Number(repeatDayOfMonth)
      if (!Number.isInteger(d) || d < 1 || d > 31) {
        toast.error({
          title: t(
            'posts.form.monthlyInvalidDayTitle',
            'Ungültiger Monatstag'
          ),
          description: t(
            'posts.form.monthlyInvalidDayDescription',
            'Bitte einen Wert von 1 bis 31 wählen.'
          )
        })
        return
      }
    }

    if (normalizedPlatforms.length === 0) {
      toast.error({
        title: t(
          'posts.form.noPlatformTitle',
          'Keine Plattform gewählt'
        ),
        description: t(
          'posts.form.noPlatformDescription',
          'Bitte mindestens eine Zielplattform auswählen.'
        )
      })
      return
    }

    const scheduledPlannedAt = scheduledDateTimeString
    const scheduledActualAt =
      repeat === 'none' && applyJitter && jitterAvailable
        ? applyRandomOffsetToLocalDateTime({
            localDateTime: scheduledPlannedAt,
            timeZone,
            offsetMinutes: randomOffsetMinutes
          })
        : scheduledPlannedAt

    const payload = {
      content,
      scheduledAt: scheduledActualAt,
      scheduledPlannedAt,
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
        resetToDefaults({ focus: true })
      }
      if (onSkeetSaved) {
        onSkeetSaved({ mode: isEditing ? 'edit' : 'create', id: editingSkeet?.id ?? null })
      }
      toast.success({
        title: isEditing
          ? t('posts.form.saveSuccessUpdateTitle', 'Post aktualisiert')
          : t('posts.form.saveSuccessCreateTitle', 'Post geplant'),
        description: t(
          'posts.form.saveSuccessDescription',
          'Die Änderungen wurden übernommen.'
        )
      })
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error({
        title: t('posts.form.saveErrorTitle', 'Speichern fehlgeschlagen'),
        description:
          data.error ||
          t(
            'posts.form.saveErrorDescription',
            'Fehler beim Speichern des Posts.'
          )
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6 space-x-2'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-foreground'>
            {isEditing
              ? t('posts.form.headingEdit', 'Post bearbeiten')
              : t('posts.form.headingCreate', 'Neuen Post planen')}
          </h2>
          <p className='mt-1 text-sm text-foreground-muted'>
            {t(
              'posts.form.maxLengthHint',
              'Maximal {limit} Zeichen für die gewählten Plattformen.',
              { limit: maxContentLength }
            )}
          </p>
        </div>
        <div className='space-y-2'>
          <div
            className='flex flex-wrap items-center gap-4'
            role='group'
            aria-label={t(
              'posts.form.platforms.groupLabel',
              'Plattformen wählen'
            )}
          >
            {['bluesky', 'mastodon'].map(platform => {
              const isActive = targetPlatforms.includes(platform)
              const disabled = platform === 'mastodon' && !mastodonConfigured
              const title = disabled
                ? t(
                    'posts.form.platforms.mastodonDisabledTitle',
                    'Mastodon-Zugang nicht konfiguriert'
                  )
                : undefined
              return (
                <label
                  key={platform}
                  className={`inline-flex items-center gap-2 text-sm font-medium ${
                    disabled
                      ? 'text-foreground-muted'
                      : 'text-foreground'
                  }`}
                  aria-disabled={disabled || undefined}
                  title={title}
                >
                  <input
                    type='checkbox'
                    className='h-4 w-4 rounded border-border'
                    checked={isActive && !disabled}
                    disabled={disabled}
                    onChange={() => togglePlatform(platform)}
                  />
                  <span className='capitalize'>
                    {platform === 'bluesky'
                      ? t('posts.form.platforms.bluesky', 'Bluesky')
                      : t('posts.form.platforms.mastodon', 'Mastodon')}
                    <span className='ml-1 text-xs text-foreground-muted'>
                      ({PLATFORM_LIMITS[platform]})
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          {repeat === 'none' && (
            <div className='space-y-2'>
              <label className='inline-flex items-center gap-2 text-sm font-medium text-foreground'>
                <input
                  type='checkbox'
                  className='h-4 w-4 rounded border-border'
                  checked={applyJitter && jitterAvailable}
                  disabled={!jitterAvailable || !scheduledDateTimeString}
                  onChange={() => {
                    if (!jitterAvailable || !scheduledDateTimeString) return
                    setApplyJitter(prev => !prev)
                  }}
                />
                <span>{t('posts.form.jitter.label', 'Jitter nutzen')}</span>
              </label>
              {!jitterAvailable && !schedulerLoading ? (
                <p className='text-xs text-foreground-muted'>
                  {t(
                    'posts.form.jitter.disabledHint',
                    'Jitter ist in den Einstellungen deaktiviert.'
                  )}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className='space-y-3'>
        {/* Überschriftenzeile für Desktop: mit Info-Buttons, sauber neben den Labels ausgerichtet */}
        <div className='hidden lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6'>
          <div className='flex items-center justify-between self-end'>
            <label htmlFor='skeet-content' className='text-lg font-semibold text-foreground'>
              {t('posts.form.content.label', 'Post-Text')}
            </label>
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
              aria-label={t(
                'posts.form.content.infoAria',
                'Hinweis zu Post-Text anzeigen'
              )}
              onClick={() => setInfoContentOpen(true)}
              title={t(
                'posts.form.infoButtonTitle',
                'Hinweis anzeigen'
              )}
            >
              <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fillRule='evenodd' clipRule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
              {t('posts.form.infoButtonLabel', 'Info')}
            </button>
          </div>
          <div />
          <div className='flex items-center justify-between self-end'>
            <label className='text-lg font-semibold text-foreground'>
              {t('posts.form.preview.label', 'Vorschau')}
            </label>
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
              aria-label={t(
                'posts.form.preview.infoAria',
                'Hinweis zur Vorschau anzeigen'
              )}
              onClick={() => setInfoPreviewOpen(true)}
              title={t(
                'posts.form.infoButtonTitle',
                'Hinweis anzeigen'
              )}
            >
              <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fillRule='evenodd' clipRule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
              {t('posts.form.infoButtonLabel', 'Info')}
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
                {t('posts.form.content.label', 'Post-Text')}
              </label>
              <button
                type='button'
                className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label={t(
                  'posts.form.content.infoAria',
                  'Hinweis zu Post-Text anzeigen'
                )}
                onClick={() => setInfoContentOpen(true)}
                title={t(
                  'posts.form.infoButtonTitle',
                  'Hinweis anzeigen'
                )}
              >
                <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fillRule='evenodd' clipRule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
                {t('posts.form.infoButtonLabel', 'Info')}
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
              placeholder={t(
                'posts.form.content.placeholder',
                'Geplante Inhalte können hier erfasst werden.'
              )}
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
              {t(
                'posts.form.content.counter',
                '{count}/{limit} Zeichen',
                { count: content.length, limit: maxContentLength }
              )}
            </div>
            <div className='mt-2 flex items-center gap-2 lg:hidden'>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/*',
                    title: t(
                      'posts.form.media.addImageTitle',
                      'Bild hinzufügen'
                    )
                  })
                }
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                title={
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                    ? t(
                        'posts.form.media.limitReachedTitle',
                        'Maximal {count} Bilder',
                        { count: imagePolicy.maxCount || 4 }
                      )
                    : t(
                        'posts.form.media.addImageTitle',
                        'Bild hinzufügen'
                      )
                }
              >
                <ImageIcon className='h-4 w-4' aria-hidden='true' />
              </button>
              {tenorAvailable ? (
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                onClick={() => setGifPicker({ open: true })}
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                title={
                  pendingMedia.length >= (imagePolicy.maxCount || 4)
                    ? t(
                        'posts.form.media.limitReachedTitle',
                        'Maximal {count} Bilder',
                        { count: imagePolicy.maxCount || 4 }
                      )
                    : t(
                        'posts.form.media.addGifTitle',
                        'GIF hinzufügen'
                      )
                }
              >
                {t('posts.form.media.addGifLabel', 'GIF')}
              </button>
              ) : null}
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label={t(
                  'posts.form.emoji.insertAria',
                  'Emoji einfügen'
                )}
                aria-keyshortcuts='Control+. Meta+.'
                title={t(
                  'posts.form.emoji.insertTitle',
                  'Emoji einfügen (Ctrl+.)'
                )}
                onClick={() => setEmojiPicker({ open: true })}
              >
                <FaceIcon className='h-4 w-4' aria-hidden='true' />
              </button>
            </div>
          </div>
          {/* Vertikale Toolbar (nur Desktop) */}
          <div className='hidden items-center justify-center lg:flex'>
            <div className='flex flex-col items-center gap-2'>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-background-elevated'
                onClick={() =>
                  setMediaDialog({
                    open: true,
                    accept: 'image/*',
                    title: t(
                      'posts.form.media.addImageTitle',
                      'Bild hinzufügen'
                    )
                  })
                }
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                aria-label={t(
                  'posts.form.media.addImageAria',
                  'Bild hinzufügen'
                )}
                title={t(
                  'posts.form.media.addImageTitle',
                  'Bild hinzufügen'
                )}
              >
                <ImageIcon className='h-4 w-4' aria-hidden='true' />
              </button>
              {tenorAvailable ? (
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-background-elevated'
                onClick={() => setGifPicker({ open: true })}
                disabled={pendingMedia.length >= (imagePolicy.maxCount || 4)}
                aria-label={t(
                  'posts.form.media.addGifAria',
                  'GIF hinzufügen'
                )}
                title={t(
                  'posts.form.media.addGifTitle',
                  'GIF hinzufügen'
                )}
              >
                {t('posts.form.media.addGifLabel', 'GIF')}
              </button>
              ) : null}
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-background-elevated'
                aria-label={t(
                  'posts.form.emoji.insertAria',
                  'Emoji einfügen'
                )}
                aria-keyshortcuts='Control+. Meta+.'
                title={t(
                  'posts.form.emoji.insertTitle',
                  'Emoji einfügen (Ctrl+.)'
                )}
                onClick={() => setEmojiPicker({ open: true })}
              >
                <FaceIcon className='h-4 w-4' aria-hidden='true' />
              </button>
            </div>
          </div>
          {/* Vorschau */}
          <div>
            {/* Mobile-Label + Info */}
            <div className='flex items-center justify-between lg:hidden'>
              <label className='text-lg font-semibold text-foreground'>
                {t('posts.form.preview.label', 'Vorschau')}
              </label>
              <button
                type='button'
                className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label={t(
                  'posts.form.preview.infoAria',
                  'Hinweis zur Vorschau anzeigen'
                )}
                onClick={() => setInfoPreviewOpen(true)}
                title={t('posts.form.infoButtonTitle', 'Hinweis anzeigen')}
              >
                <svg width='14' height='14' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z' fill='currentColor'/><path fillRule='evenodd' clipRule='evenodd' d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z' fill='currentColor'/></svg>
                {t('posts.form.infoButtonLabel', 'Info')}
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
                  placeholder={t(
                    'posts.form.preview.emptyPlaceholder',
                    '(kein Inhalt)'
                  )}
                  className='whitespace-pre-wrap break-words leading-relaxed text-foreground'
                />
                <SegmentMediaGrid
                  items={segmentMediaItems}
                  maxCount={imagePolicy.maxCount || 4}
                  onEditAlt={item => setAltDialog({ open: true, item })}
                  onRemove={handleRemoveMedia}
                  labels={mediaGridLabels}
                  className='mt-2'
                />
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
              {t('posts.form.media.counterLabel', 'Medien')}{' '}
              {totalMediaCount}/{imagePolicy.maxCount || 4}
            </div>
            </div>
          </div>
        </div>

      <div className='space-y-6'>
        <InlineField
          htmlFor='repeat'
          label={t('posts.form.repeat.label', 'Wiederholungsmuster')}
          size='lg'
        >
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
            <option value='none'>
              {t('posts.form.repeat.none', 'Keine Wiederholung')}
            </option>
            <option value='daily'>
              {t('posts.form.repeat.daily', 'Täglich')}
            </option>
            <option value='weekly'>
              {t('posts.form.repeat.weekly', 'Wöchentlich')}
            </option>
            <option value='monthly'>
              {t('posts.form.repeat.monthly', 'Monatlich')}
            </option>
          </select>
        </InlineField>

        {repeat === 'none' ? (
          <div className='grid gap-6 md:grid-cols-2'>
            <InlineField
              htmlFor='date'
              label={t('posts.form.date.label', 'Geplantes Datum')}
              size='lg'
            >
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
                onChange={e => {
                  const value = e.target.value
                  const clamped = clampTimeToNowForToday({
                    date: value,
                    time: scheduledTime,
                    todayDate,
                    nowTime
                  })
                  setScheduledDate(clamped.date)
                  setScheduledTime(clamped.time)
                }}
                className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
              />
            </InlineField>
            <InlineField
              htmlFor='time'
              label={t('posts.form.time.label', 'Geplante Uhrzeit')}
              size='lg'
            >
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
                  const value = e.target.value
                  const clamped = clampTimeToNowForToday({
                    date: scheduledDate,
                    time: value,
                    todayDate,
                    nowTime
                  })
                  setScheduledTime(clamped.time)
                  try {
                    timeInputRef.current?.blur?.()
                  } catch { 
                    // blur konnte nicht erzwungen werden
                  }
                }}
                min={scheduledDate === todayDate ? nowTime : undefined}
                className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
              />
            </InlineField>
          </div>
        ) : (
          <InlineField
            htmlFor='time'
            label={t('posts.form.time.label', 'Geplante Uhrzeit')}
            size='lg'
          >
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
          </InlineField>
        )}

        {repeat === 'none' && scheduledDate === todayDate && (
          <p className='mt-1 text-xs text-foreground-muted'>
            {t(
              'posts.form.schedule.todayHint',
              'Heute nur Zeiten ab der aktuellen Uhrzeit wählbar.'
            )}
          </p>
        )}


        {repeat === 'weekly' && (
          <div className='space-y-2'>
            <label className='text-sm font-semibold text-foreground'>
              {t('posts.form.weekdays.label', 'Wochentage')}
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
          <InlineField
            htmlFor='repeatDayOfMonth'
            label={t('posts.form.monthlyDay.label', 'Tag im Monat (1–31)')}
            size='sm'
          >
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
          </InlineField>
        )}

      </div>
      <div className='flex flex-wrap justify-end gap-3'>
        {isEditing && (
          <Button
            type='button'
            variant='secondary'
            onClick={() => onCancelEdit && onCancelEdit()}
            className='min-w-[8rem]'
          >
            {t('posts.form.cancel', 'Abbrechen')}
          </Button>
        )}
        <Button
          type='button'
          variant='neutral'
          disabled={sendingNow || !hasContentOrMedia}
          className='min-w-[8rem]'
          onClick={() => {
            if (sendingNow || !hasContentOrMedia) return
            setSendNowConfirmOpen(true)
          }}
        >
          {t('posts.form.sendNow.buttonDefault', 'Sofort senden')}
        </Button>
        <Button
          type='submit'
          variant='primary'
          className='min-w-[8rem]'
          disabled={!hasContentOrMedia}
        >
          {isEditing
            ? t('posts.form.submitUpdate', 'Post aktualisieren')
            : t('posts.form.submitCreate', 'Planen')}
        </Button>
      </div>
      <MediaDialog
        mode='upload'
        open={Boolean(mediaDialog.open)}
        title={
          mediaDialog.title ||
          t('posts.form.media.addImageTitle', 'Bild hinzufügen')
        }
        accept={mediaDialog.accept || 'image/*'}
        requireAltText={Boolean(imagePolicy.requireAltText)}
        maxBytes={imagePolicy.maxBytes}
        allowedMimes={imagePolicy.allowedMimes}
        labels={mediaDialogLabels}
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
          labels={gifPickerLabels}
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
              toast.error({
                title: t(
                  'posts.form.media.gifLoadErrorTitle',
                  'GIF konnte nicht geladen werden'
                ),
                description:
                  e?.message ||
                  t('common.errors.unknown', 'Unbekannter Fehler')
              })
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
      <ConfirmDialog
        open={sendNowConfirmOpen}
        title={t('posts.form.sendNow.confirmTitle', 'Sofort senden?')}
        description={t(
          'posts.form.sendNow.confirmDescription',
          'Der Beitrag wird sofort veröffentlicht und nicht mehr geplant ausgeführt.'
        )}
        confirmLabel={t('posts.form.sendNow.buttonDefault', 'Sofort senden')}
        cancelLabel={t('common.actions.cancel', 'Abbrechen')}
        variant='primary'
        onConfirm={async () => {
          if (!hasContentOrMedia) {
            setSendNowConfirmOpen(false)
            toast.error({
              title: t('posts.form.noContentTitle', 'Kein Inhalt'),
              description: t(
                'posts.form.noContentDescription',
                'Bitte Text eingeben oder mindestens ein Medium hinzufügen.'
              )
            })
            return
          }
          setSendNowConfirmOpen(false)
          if (sendingNow) return
          if (!isEditing) {
            const normalizedPlatforms = Array.from(new Set(targetPlatforms))
            const submissionLimit = resolveMaxLength(normalizedPlatforms)
            if (content.length > submissionLimit) {
              toast.error({
                title: t(
                  'posts.form.limitExceededTitle',
                  'Zeichenlimit überschritten'
                ),
                description: t(
                  'posts.form.limitExceededShort',
                  'Max. {limit} Zeichen.',
                  { limit: submissionLimit }
                )
              })
              return
            }
            const now = new Date()
            const pad = n => String(n).padStart(2, '0')
            const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
            const createPayload = {
              content,
              scheduledAt: localIso,
              repeat: 'none',
              repeatDaysOfWeek: [],
              repeatDayOfMonth: null,
              repeatDayOfWeek: null,
              targetPlatforms: normalizedPlatforms,
              media: pendingMedia
            }
            setSendingNow(true)
            try {
              const resCreate = await fetch('/api/skeets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createPayload) })
              if (!resCreate.ok) {
                const data = await resCreate.json().catch(() => ({}))
                throw new Error(
                  data.error ||
                    t(
                      'posts.form.sendNow.createErrorFallback',
                      'Post konnte nicht erstellt werden.'
                    )
                )
              }
              const created = await resCreate.json()
              if (!created?.id) {
                throw new Error(
                  t(
                    'posts.form.sendNow.unexpectedCreateResponse',
                    'Unerwartete Antwort beim Erstellen des Posts.'
                  )
                )
              }
              const resPub = await fetch(`/api/skeets/${created.id}/publish-now`, { method: 'POST' })
              if (!resPub.ok) {
                const data = await resPub.json().catch(() => ({}))
                throw new Error(
                  data.error ||
                    t(
                      'posts.form.sendNow.publishErrorFallback',
                      'Direktveröffentlichung fehlgeschlagen.'
                    )
                )
              }
              toast.success({
                title: t(
                  'posts.form.sendNow.successTitle',
                  'Veröffentlicht (direkt)'
                ),
                description: t(
                  'posts.form.sendNow.successDescription',
                  'Der Post wurde unmittelbar gesendet.'
                )
              })
              resetToDefaults()
              if (onSkeetSaved) onSkeetSaved()
            } catch (e) {
              toast.error({
                title: t(
                  'posts.form.sendNow.errorTitle',
                  'Senden fehlgeschlagen'
                ),
                description:
                  e?.message ||
                  t('common.errors.unknown', 'Unbekannter Fehler')
              })
            } finally {
              setSendingNow(false)
            }
          } else {
            setSendingNow(true)
            try {
              const res = await fetch(`/api/skeets/${editingSkeet.id}/publish-now`, { method: 'POST' })
              if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(
                  data.error ||
                    t(
                      'posts.form.sendNow.publishErrorFallback',
                      'Direktveröffentlichung fehlgeschlagen.'
                    )
                )
              }
              toast.success({
                title: t(
                  'posts.form.sendNow.successTitle',
                  'Veröffentlicht (direkt)'
                ),
                description: t(
                  'posts.form.sendNow.successDescription',
                  'Der Post wurde unmittelbar gesendet.'
                )
              })
              if (onSkeetSaved) onSkeetSaved()
            } catch (e) {
              toast.error({
                title: t(
                  'posts.form.sendNow.errorTitle',
                  'Senden fehlgeschlagen'
                ),
                description:
                  e?.message ||
                  t('common.errors.unknown', 'Unbekannter Fehler')
              })
            } finally {
              setSendingNow(false)
            }
          }
        }}
        onCancel={() => setSendNowConfirmOpen(false)}
      />
      {/* Info: Post-Text */}
      {infoContentOpen ? (
        <InfoDialog
          open={infoContentOpen}
          title={t('posts.form.infoContent.title', 'Hinweis: Post-Text')}
          onClose={() => setInfoContentOpen(false)}
          closeLabel={t('common.actions.close', 'Schließen')}
          content={(
            <>
              <p>
                {t(
                  'posts.form.infoContent.body1',
                  'Zielplattformen bestimmen das Zeichenlimit. Der kleinste Wert (z. B. Bluesky 300, Mastodon 500) gilt.'
                )}
              </p>
              <p>
                {t(
                  'posts.form.infoContent.body2',
                  'Für Wiederholungen wähle bitte das passende Muster (keine/wöchentlich/monatlich) und gib die erforderlichen Felder an.'
                )}
              </p>
            </>
          )}
        />
      ) : null}

      {/* Info: Vorschau */}
      {infoPreviewOpen ? (
        <InfoDialog
          open={infoPreviewOpen}
          title={t('posts.form.infoPreview.title', 'Hinweis: Vorschau')}
          onClose={() => setInfoPreviewOpen(false)}
          closeLabel={t('common.actions.close', 'Schließen')}
          content={(
            <>
              <p>
                {t(
                  'posts.form.infoPreview.body1',
                  'Über die Buttons in der Vorschau werden Bilder oder GIFs hinzugefügt. Maximal {max} Bilder je Post.',
                  { max: imagePolicy?.maxCount ?? 4 }
                )}
              </p>
              <p>
                {t(
                  'posts.form.infoPreview.body2',
                  'Bilder werden beim Speichern hochgeladen. Der Zähler zeigt die aktuelle Zeichenanzahl im Verhältnis zum Limit.'
                )}
              </p>
            </>
          )}
        />
      ) : null}
      {altDialog.open && altDialog.item ? (
        <MediaDialog
          open={altDialog.open}
          mode='alt'
          title={
            altDialog.item.alt
              ? t('posts.form.media.altEditTitle', 'Alt‑Text bearbeiten')
              : t('posts.form.media.altAddTitle', 'Alt‑Text bearbeiten')
          }
          previewSrc={altDialog.item.src}
          initialAlt={altDialog.item.alt || ''}
          requireAltText={Boolean(imagePolicy.requireAltText)}
          labels={mediaDialogLabels}
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
                      t(
                        'posts.form.media.altSaveErrorFallback',
                        'Alt‑Text konnte nicht gespeichert werden.'
                      )
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
                title: t(
                  'posts.form.media.altSaveErrorTitle',
                  'Fehler beim Alt‑Text'
                ),
                description:
                  e?.message ||
                  t('common.errors.unknown', 'Unbekannter Fehler')
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
