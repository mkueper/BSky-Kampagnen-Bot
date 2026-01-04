import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  ConfirmDialog,
  InfoDialog,
  InlineField,
  Modal,
  MediaDialog,
  SegmentMediaGrid
} from '@bsky-kampagnen-bot/shared-ui'
import { useTheme } from './ui/ThemeContext'
import { useToast } from '@bsky-kampagnen-bot/shared-ui'
import { useClientConfig } from '../hooks/useClientConfig'
import { useSchedulerSettings } from '../hooks/useSchedulerSettings'
import {
  splitThread,
  buildSegmentMediaItems,
  countSegmentMedia
} from '@bsky-kampagnen-bot/shared-logic'
import { FaceIcon, ImageIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { GifPicker, EmojiPicker } from '@kampagnen-bot/media-pickers'
import {
  formatDateTimeLocal,
  getDefaultDateParts,
  resolvePreferredTimeZone
} from '../utils/zonedDate'
import { applyRandomOffsetToLocalDateTime, clampTimeToNowForToday } from '../utils/scheduling'
import { useTranslation } from '../i18n/I18nProvider.jsx'

const DASHBOARD_GIF_PICKER_CLASSES = {
  overlay: 'fixed inset-0 z-[200] flex items-center justify-center bg-black/40',
  panel:
    'relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-background-elevated shadow-soft',
  header:
    'flex flex-col gap-3 border-b border-border/80 bg-background px-4 py-3',
  title: 'text-base font-semibold text-foreground',
  searchBar: 'flex w-full items-center gap-2',
  input:
    'flex-1 rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground',
  buttonPrimary:
    'rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground',
  button:
    'rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground hover:bg-background',
  content: 'flex-1 overflow-y-auto bg-background px-4 py-4',
  grid: 'grid grid-cols-3 gap-3',
  itemButton:
    'overflow-hidden rounded-xl border border-border bg-background-subtle transition hover:ring-2 hover:ring-primary/40',
  image: 'h-24 w-full object-cover',
  statusText: 'text-xs text-foreground-muted',
  loadingMore: 'text-xs text-foreground-muted',
  footer: 'hidden',
  skeleton:
    'h-24 w-full animate-pulse rounded-xl border border-border bg-background-subtle',
  error: 'text-sm text-destructive'
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

const PLATFORM_OPTIONS = [
  { id: 'bluesky', label: 'Bluesky', limit: 300 },
  { id: 'mastodon', label: 'Mastodon', limit: 500 }
]
const THREAD_BREAK_MARKER = '---'

function computeLimit (selectedPlatforms) {
  if (!selectedPlatforms.length) {
    return null
  }
  const selectedOptions = PLATFORM_OPTIONS.filter(option =>
    selectedPlatforms.includes(option.id)
  )
  if (selectedOptions.length === 0) {
    return null
  }
  return selectedOptions.reduce(
    (min, option) => Math.min(min, option.limit),
    Infinity
  )
}

function ThreadForm ({
  initialThread = null,
  loading = false,
  onThreadSaved,
  onCancel,
  onSuggestMoveToSkeets
}) {
  const { t } = useTranslation()
  const { config: clientConfig } = useClientConfig()
  const theme = useTheme()
  const timeZone = resolvePreferredTimeZone(clientConfig?.timeZone)
  const defaultScheduledAt = useMemo(() => {
    const parts = getDefaultDateParts(timeZone)
    return parts ? `${parts.date}T${parts.time}` : ''
  }, [timeZone])
  const mastodonStatus = clientConfig?.platforms?.mastodonConfigured
  const mastodonConfigured = mastodonStatus !== false
  const defaultPlatformFallback = useMemo(
    () => (mastodonStatus === true ? ['bluesky', 'mastodon'] : ['bluesky']),
    [mastodonStatus]
  )
  const [threadId, setThreadId] = useState(null)
  const [sending, setSending] = useState(false)
  const [targetPlatforms, setTargetPlatforms] = useState(
    defaultPlatformFallback
  )
  const [source, setSource] = useState('')
  const [appendNumbering, setAppendNumbering] = useState(true)
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt)
  const [scheduledDate, setScheduledDate] = useState(() =>
    defaultScheduledAt ? defaultScheduledAt.split('T')[0] : ''
  )
  const [scheduledTime, setScheduledTime] = useState(() =>
    defaultScheduledAt ? defaultScheduledAt.split('T')[1] || '' : ''
  )
  const scheduledDefaultRef = useRef(defaultScheduledAt)
  const dateInputRef = useRef(null)
  const timeInputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [singleSegDialog, setSingleSegDialog] = useState({
    open: false,
    proceed: null
  })
  const [sendNowConfirmOpen, setSendNowConfirmOpen] = useState(false)
  const textareaRef = useRef(null)
  const previewContainerRef = useRef(null)
  const previewSegmentRefs = useRef([])
  const toast = useToast()
  const { randomOffsetMinutes, loading: schedulerLoading } = useSchedulerSettings()
  const jitterAvailable = Number(randomOffsetMinutes) > 0
  const [applyJitter, setApplyJitter] = useState(false)
  const tenorAvailable = Boolean(clientConfig?.gifs?.tenorAvailable)
  const imagePolicy = clientConfig?.images || {
    maxCount: 4,
    maxBytes: 8 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    requireAltText: false
  }

  const nowLocal = formatDateTimeLocal(new Date(), timeZone)
  const [todayDate, nowTime] = nowLocal ? nowLocal.split('T') : ['', '']

  const applyScheduledParts = useCallback(
    (nextDate, nextTime) => {
      let date = nextDate
      let time = nextTime

      if (date && time) {
        const clamped = clampTimeToNowForToday({
          date,
          time,
          todayDate,
          nowTime
        })
        date = clamped.date
        time = clamped.time
        setScheduledDate(date)
        setScheduledTime(time)
        setScheduledAt(`${date}T${time}`)
      } else {
        setScheduledDate(date)
        setScheduledTime(time)
        setScheduledAt('')
      }
    },
    [todayDate, nowTime]
  )

  const restoreFromThread = useCallback(
    (thread, options = {}) => {
      const { focus = false } = options
      if (thread && thread.id) {
        setThreadId(thread.id)
        setTargetPlatforms(
          Array.isArray(thread.targetPlatforms) && thread.targetPlatforms.length
            ? thread.targetPlatforms
            : defaultPlatformFallback
        )
        setAppendNumbering(Boolean(thread.appendNumbering ?? true))
        const plannedValue = thread.scheduledPlannedAt || thread.scheduledAt
        setScheduledAt(
          plannedValue
            ? formatDateTimeLocal(plannedValue, timeZone)
            : ''
        )
        if (thread.scheduledPlannedAt && thread.scheduledAt) {
          const plannedTime = new Date(thread.scheduledPlannedAt).getTime()
          const actualTime = new Date(thread.scheduledAt).getTime()
          if (Number.isNaN(plannedTime) || Number.isNaN(actualTime)) {
            setApplyJitter(false)
          } else {
            setApplyJitter(plannedTime !== actualTime)
          }
        } else {
          setApplyJitter(false)
        }
        const sourceValue =
          typeof thread?.metadata?.source === 'string' &&
          thread.metadata.source.trim().length
            ? thread.metadata.source
            : Array.isArray(thread.segments)
            ? thread.segments
                .map(segment => segment?.content || '')
                .join('\n---\n')
            : ''
        setSource(sourceValue)
      } else {
        setThreadId(null)
        setTargetPlatforms(defaultPlatformFallback)
        setAppendNumbering(true)
        setScheduledAt(defaultScheduledAt)
        setApplyJitter(false)
        setSource('')
        if (focus) {
          requestAnimationFrame(() => {
            textareaRef.current?.focus()
          })
        }
      }
    },
    [defaultScheduledAt, timeZone]
  )

  useEffect(() => {
    if (loading) return
    if (initialThread && initialThread.id) {
      if (initialThread.id !== threadId) {
        restoreFromThread(initialThread)
      }
    } else if (!initialThread && threadId !== null) {
      restoreFromThread(null)
    }
  }, [initialThread, loading, threadId, restoreFromThread])

  useEffect(() => {
    if (
      !threadId &&
      (!scheduledAt || scheduledAt === scheduledDefaultRef.current)
    ) {
      setScheduledAt(defaultScheduledAt)
    }
    scheduledDefaultRef.current = defaultScheduledAt
  }, [defaultScheduledAt, scheduledAt, threadId])

  useEffect(() => {
    if (!jitterAvailable && !schedulerLoading) {
      setApplyJitter(false)
    }
  }, [jitterAvailable, schedulerLoading])

  useEffect(() => {
    if (!scheduledAt) {
      if (scheduledDate !== '' || scheduledTime !== '') {
        setScheduledDate('')
        setScheduledTime('')
      }
      return
    }
    const [datePart, timePart] = scheduledAt.split('T')
    if (datePart !== scheduledDate) {
      setScheduledDate(datePart || '')
    }
    if (timePart !== scheduledTime) {
      setScheduledTime(timePart || '')
    }
  }, [scheduledAt, scheduledDate, scheduledTime])

  // Mastodon aus Zielplattformen entfernen, wenn nicht konfiguriert
  useEffect(() => {
    if (mastodonStatus === false) {
      setTargetPlatforms(current => current.filter(id => id !== 'mastodon'))
    }
  }, [mastodonStatus])

  useEffect(() => {
    if (mastodonStatus === true && !threadId) {
      setTargetPlatforms(current =>
        current.includes('mastodon') ? current : [...current, 'mastodon']
      )
    }
  }, [mastodonStatus, threadId])

  const limit = useMemo(() => computeLimit(targetPlatforms), [targetPlatforms])

  const {
    rawSegments,
    previewSegments,
    rawToEffectiveStartIndex,
    effectiveOffsets,
    totalSegments
  } = useMemo(
    () =>
      splitThread({
        text: source,
        limit,
        appendNumbering,
        hardBreakMarker: THREAD_BREAK_MARKER
      }),
    [source, limit, appendNumbering]
  )
  const isEditMode = Boolean(threadId)
  const lastPreviewIndexRef = useRef(null)
  const skipNextPreviewScrollRef = useRef(false)

  const scrollPreviewToActiveSegment = useCallback(() => {
    const textarea = textareaRef.current
    const container = previewContainerRef.current
    if (!textarea || !container || !source || rawSegments.length === 0) return

    const cursorPos = textarea.selectionStart ?? 0
    const normalized = source.replace(/\r\n/g, '\n')
    const beforeCursor = normalized.slice(0, cursorPos)
    const delimiter = `\n${THREAD_BREAK_MARKER}\n`

    const partsBeforeCursor = beforeCursor.split(delimiter)
    let rawIndex = partsBeforeCursor.length - 1
    if (rawIndex < 0) rawIndex = 0
    if (rawIndex >= rawSegments.length) rawIndex = rawSegments.length - 1

    const rawText = (rawSegments[rawIndex] || '').replace(/\r\n/g, '\n')
    const rawLength = rawText.length || 1
    const positionWithinRaw =
      partsBeforeCursor[partsBeforeCursor.length - 1]?.length ?? 0
    const ratio = Math.min(
      Math.max(positionWithinRaw / rawLength, 0),
      0.9999
    )

    const startIndex = rawToEffectiveStartIndex[rawIndex] ?? 0
    const endIndex =
      rawIndex + 1 < rawToEffectiveStartIndex.length
        ? rawToEffectiveStartIndex[rawIndex + 1]
        : totalSegments
    const segmentCount = Math.max(endIndex - startIndex, 1)
    const relativeIndex = Math.floor(ratio * segmentCount)
    const previewIndex = Math.min(
      startIndex + relativeIndex,
      Math.max(endIndex - 1, startIndex)
    )

    const target = previewSegmentRefs.current[previewIndex]
    if (!target) return

    if (lastPreviewIndexRef.current === previewIndex) return
    lastPreviewIndexRef.current = previewIndex

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const above = targetRect.top < containerRect.top
    const below = targetRect.bottom > containerRect.bottom

    if (!above && !below) return

    const scrollOffset = target.offsetTop - container.clientHeight / 3
    container.scrollTo({
      top: Math.max(scrollOffset, 0),
      behavior: 'smooth'
    })
  }, [source, rawSegments, rawToEffectiveStartIndex, totalSegments])

  const handlePreviewSegmentClick = useCallback(
    previewIndex => {
      const textarea = textareaRef.current
      if (
        !textarea ||
        !source ||
        !Array.isArray(effectiveOffsets) ||
        !effectiveOffsets[previewIndex]
      ) {
        return
      }

      const { rawIndex, offsetInRaw } = effectiveOffsets[previewIndex]
      if (rawIndex == null || offsetInRaw == null) return

      const delimiter = `\n${THREAD_BREAK_MARKER}\n`
      let globalIndex = 0
      for (let i = 0; i < rawIndex; i++) {
        globalIndex += rawSegments[i]?.length || 0
        if (i < rawIndex) {
          globalIndex += delimiter.length
        }
      }
      globalIndex += offsetInRaw

      const normalizedSource = source.replace(/\r\n/g, '\n')
      const maxIndex = normalizedSource.length
      const cursorIndex = Math.min(Math.max(globalIndex, 0), maxIndex)

      try {
        textarea.focus()
        textarea.selectionStart = cursorIndex
        textarea.selectionEnd = cursorIndex
      } catch {
        // Cursor konnte nicht gesetzt werden
      }
    },
    [source, rawSegments, effectiveOffsets]
  )

  useEffect(() => {
    lastPreviewIndexRef.current = null
    if (skipNextPreviewScrollRef.current) {
      skipNextPreviewScrollRef.current = false
      return
    }
    scrollPreviewToActiveSegment()
  }, [
    previewSegments.length,
    scrollPreviewToActiveSegment
  ])

  // Minimaler Medien-Upload pro Segment (nur im Edit-Modus)
  const [mediaAlt] = useState({})
  const [pendingMedia, setPendingMedia] = useState({}) // create-mode media per segment id/index
  // Overlay helpers for existing media edits (without full reload)
  const [editedMediaAlt, setEditedMediaAlt] = useState({}) // key: mediaId => alt text
  const [removedMedia, setRemovedMedia] = useState({}) // key: mediaId => true
  const existingSegments = useMemo(() => {
    if (!isEditMode || !initialThread) return []
    return Array.isArray(initialThread.segments) ? initialThread.segments : []
  }, [initialThread, isEditMode])
  const getMediaCount = useCallback(
    index =>
      countSegmentMedia({
        segmentIndex: index,
        existingSegments,
        pendingMediaMap: pendingMedia,
        removedMediaMap: removedMedia
      }),
    [existingSegments, pendingMedia, removedMedia]
  )
  const getSegmentMediaItems = useCallback(
    segmentIndex =>
      buildSegmentMediaItems({
        segmentIndex,
        existingSegments,
        pendingMediaMap: pendingMedia,
        removedMediaMap: removedMedia,
        editedMediaAltMap: editedMediaAlt
      }),
    [editedMediaAlt, existingSegments, pendingMedia, removedMedia]
  )
  const mediaGridLabels = useMemo(
    () => ({
      imageAlt: index =>
        t('threads.form.media.imageAltFallback', 'Bild {index}', { index }),
      altAddTitle: t('threads.form.media.altAddTitle', 'Alt‑Text bearbeiten'),
      altEditTitle: t('threads.form.media.altEditTitle', 'Alt‑Text bearbeiten'),
      altBadge: t('threads.form.media.altBadge', 'ALT'),
      altAddBadge: t('threads.form.media.altAddBadge', '+ ALT'),
      removeTitle: t(
        'threads.form.media.removeButtonTitle',
        'Bild entfernen'
      ),
      removeAria: t(
        'threads.form.media.removeButtonTitle',
        'Bild entfernen'
      )
    }),
    [t]
  )
  const handleUploadMedia = async (index, file, altTextOverride) => {
    if (!file) return
    try {
      if (isEditMode && threadId) {
        // Direkt am Segment des existierenden Threads hochladen
        try {
          const formData = new FormData()
          formData.append('media', file)
          formData.append('altText', (altTextOverride ?? mediaAlt[index]) || '')

          const res = await fetch(
            `/api/threads/${threadId}/segments/${index}/media`,
            {
              method: 'POST',
              body: formData
            }
          )

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(
              data.error ||
                t(
                  'threads.form.media.uploadErrorExistingFallback',
                  'Upload fehlgeschlagen.'
                )
            )
          }
          toast.success({
            title: t('threads.form.media.segmentSuccessTitle', 'Post {index}', {
              index: index + 1
            }),
            description: t(
              'threads.form.media.addedDescription',
              'Bild hinzugefügt.'
            )
          })
        } catch (e) {
          const msg = e?.message || ''
          if (/zu groß|too large|413/i.test(msg)) {
            setUploadError({
              open: true,
              message: t(
                'threads.form.media.tooLargeMessage',
                'Die Datei ist zu groß. Maximal {mb} MB erlaubt.',
                {
                  mb: (imagePolicy.maxBytes / (1024 * 1024)).toFixed(0)
                }
              )
            })
          } else {
            toast.error({
              title: t(
                'threads.form.media.uploadExistingErrorTitle',
                'Medien-Upload fehlgeschlagen'
              ),
              description:
                msg ||
                t(
                  'threads.form.media.uploadErrorDescription',
                  'Fehler beim Upload.'
                )
            })
          }
        }
      } else {
        // Entwurf: Temporär hochladen und Vorschau sofort anzeigen
        try {
          const formData = new FormData()
          formData.append('media', file)
          formData.append('altText', (altTextOverride ?? mediaAlt[index]) || '')

          const res = await fetch('/api/uploads/temp', {
            method: 'POST',
            body: formData
          })

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            const error = new Error(
              data.message ||
                data.error ||
                t(
                  'threads.form.media.uploadTempErrorFallback',
                  'Temporärer Upload fehlgeschlagen.'
                )
            )
            if (typeof data.code === 'string') {
              error.code = data.code
            }
            error.data = data
            throw error
          }
          const info = await res.json()
          setPendingMedia(s => {
            const arr = Array.isArray(s[index]) ? s[index].slice() : []
            arr.push({
              tempId: info.tempId,
              mime: info.mime,
              previewUrl: info.previewUrl,
              altText: info.altText || ''
            })
            return { ...s, [index]: arr }
          })
          toast.success({
            title: t('threads.form.media.segmentSuccessTitle', 'Post {index}', {
              index: index + 1
            }),
            description: t(
              'threads.form.media.addedDescription',
              'Bild hinzugefügt.'
            )
          })
        } catch (e) {
          const code = e?.code
          const msg = e?.message || ''
          if (code === 'UPLOAD_TOO_LARGE' || /zu groß|too large|413/i.test(msg)) {
            setUploadError({
              open: true,
              message: t(
                'threads.form.media.tooLargeMessage',
                'Die Datei ist zu groß. Maximal {mb} MB erlaubt.',
                {
                  mb: (imagePolicy.maxBytes / (1024 * 1024)).toFixed(0)
                }
              )
            })
          } else {
            toast.error({
              title: t(
                'threads.form.media.uploadTempErrorTitle',
                'Upload fehlgeschlagen'
              ),
              description:
                msg ||
                t(
                  'threads.form.media.uploadErrorDescription',
                  'Fehler beim Upload.'
                )
            })
          }
        }
      }
    } catch (e) {
      console.error('Fehler beim Hochladen des Bildes im Thread', e)
      toast.error({
        title: t(
          'threads.form.media.uploadTempErrorTitle',
          'Upload fehlgeschlagen'
        ),
        description:
          e?.message || t('common.errors.unknown', 'Unbekannter Fehler')
      })
    }
  }

  // Media Dialog State
  const [mediaDialog, setMediaDialog] = useState({
    open: false,
    index: null,
    accept: 'image/*',
    title: t('threads.form.media.addImageTitle', 'Bild hinzufügen')
  })
  const openMediaDialog = (index, { gif = false } = {}) => {
    setMediaDialog({
      open: true,
      index,
      accept: gif ? 'image/gif' : 'image/*',
      title: gif
        ? t('threads.form.media.addGifTitle', 'GIF hinzufügen')
        : t('threads.form.media.addImageTitle', 'Bild hinzufügen')
    })
  }
  const closeMediaDialog = () =>
    setMediaDialog({
      open: false,
      index: null,
      accept: 'image/*',
      title: t('threads.form.media.addImageTitle', 'Bild hinzufügen')
    })
  const [gifPicker, setGifPicker] = useState({ open: false, index: null })
  const [emojiPicker, setEmojiPicker] = useState({ open: false })

  const [altDialog, setAltDialog] = useState({
    open: false,
    segmentIndex: null,
    item: null
  })
  const openAltDialog = (segmentIndex, item) => {
    setAltDialog({ open: true, segmentIndex, item })
  }
  const closeAltDialog = () =>
    setAltDialog({ open: false, segmentIndex: null, item: null })
  const [uploadError, setUploadError] = useState({ open: false, message: '' })
  const [infoThreadOpen, setInfoThreadOpen] = useState(false)
  const [infoPreviewOpen, setInfoPreviewOpen] = useState(false)

  const handleRemoveMedia = async (segmentIndex, item) => {
    if (item.type === 'existing') {
      try {
        const res = await fetch(`/api/media/${item.id}`, { method: 'DELETE' })
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => ({}))).error ||
              'Löschen fehlgeschlagen'
          )
        setRemovedMedia(s => ({ ...s, [item.id]: true }))
        toast.success({ title: 'Bild entfernt' })
      } catch (e) {
        toast.error({
          title: 'Entfernen fehlgeschlagen',
          description: e?.message || 'Unbekannter Fehler'
        })
      }
    } else {
      setPendingMedia(s => {
        const arr = Array.isArray(s[segmentIndex])
          ? s[segmentIndex].slice()
          : []
        if (item.pendingIndex >= 0 && item.pendingIndex < arr.length) {
          arr.splice(item.pendingIndex, 1)
        }
        return { ...s, [segmentIndex]: arr }
      })
    }
  }

  const handleTogglePlatform = platformId => {
    if (platformId === 'mastodon' && !mastodonConfigured) return
    setTargetPlatforms(current => {
      if (current.includes(platformId)) {
        // Mindestens eine Plattform muss aktiv bleiben
        if (current.length === 1) return current
        return current.filter(id => id !== platformId)
      }
      return [...current, platformId]
    })
  }

  const handleInsertSeparator = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { selectionStart, selectionEnd, value } = textarea
    const before = value.slice(0, selectionStart)
    const after = value.slice(selectionEnd)
    const prevChar = selectionStart > 0 ? value.charAt(selectionStart - 1) : ''
    const nextChar =
      selectionEnd < value.length ? value.charAt(selectionEnd) : ''

    const needsPrefixNl = selectionStart > 0 && prevChar !== '\n'
    const needsSuffixNl = nextChar !== '\n'
    const separator = `${needsPrefixNl ? '\n' : ''}---${
      needsSuffixNl ? '\n' : ''
    }`

    const nextValue = `${before}${separator}${after}`
    skipNextPreviewScrollRef.current = true
    setSource(nextValue)

    requestAnimationFrame(() => {
      const cursorPosition = before.length + separator.length
      textarea.selectionStart = cursorPosition
      textarea.selectionEnd = cursorPosition
      textarea.focus()
    })
  }

  const handleKeyDown = event => {
    // Ctrl+. öffnet Emoji-Picker
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === '.' || event.code === 'Period')
    ) {
      event.preventDefault()
      setEmojiPicker({ open: true })
      return
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleInsertSeparator()
    }
  }

  const hasValidationIssues = useMemo(() => {
    if (!targetPlatforms.length) {
      return true
    }
    return previewSegments.some(segment => {
      const noText = segment.isEmpty
      const mediaCount = getMediaCount(segment.id)
      const noMedia = mediaCount === 0
      const textMissingButMediaPresent = noText && !noMedia
      if (textMissingButMediaPresent) return false
      return noText || segment.exceedsLimit
    })
  }, [
    previewSegments,
    targetPlatforms.length,
    getMediaCount
  ])

  const hasAnySegmentContentOrMedia = useMemo(() => {
    return previewSegments.some(segment => {
      const noText = segment.isEmpty
      const mediaCount = getMediaCount(segment.id)
      const hasMedia = mediaCount > 0
      return !noText || hasMedia
    })
  }, [previewSegments, getMediaCount])

  const showLoadingState = loading && !threadId

  if (showLoadingState) {
    return (
      <div className='space-y-6'>
        <p className='text-sm text-foreground-muted'>Thread wird geladen…</p>
      </div>
    )
  }

  async function doSubmitThread () {
    const status = scheduledAt ? 'scheduled' : 'draft'
    const scheduledPlannedAt = scheduledAt ? scheduledAt : null
    const scheduledValue =
      scheduledPlannedAt && applyJitter && jitterAvailable
        ? applyRandomOffsetToLocalDateTime({
            localDateTime: scheduledPlannedAt,
            timeZone,
            offsetMinutes: randomOffsetMinutes
          })
        : scheduledPlannedAt
    const titleCandidate = previewSegments[0]?.raw || ''
    const normalizedTitle = titleCandidate.trim().slice(0, 120) || null

    const payload = {
      title: normalizedTitle,
      scheduledAt: scheduledValue,
      scheduledPlannedAt,
      status,
      targetPlatforms,
      appendNumbering,
      metadata: {
        limit,
        totalSegments,
        source
      },
      skeets: previewSegments.map((segment, index) => ({
        sequence: index,
        content: segment.formatted,
        appendNumbering,
        characterCount: segment.characterCount,
        media: Array.isArray(pendingMedia[index]) ? pendingMedia[index] : []
      }))
    }

    const endpoint = isEditMode ? `/api/threads/${threadId}` : '/api/threads'
    const method = isEditMode ? 'PATCH' : 'POST'

    setSaving(true)
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error ||
            (isEditMode
              ? 'Thread konnte nicht aktualisiert werden.'
              : 'Thread konnte nicht gespeichert werden.')
        )
      }

      const thread = await res.json()

      toast.success({
        title: isEditMode
          ? t('threads.form.saveSuccessUpdateTitle', 'Thread aktualisiert')
          : t('threads.form.saveSuccessCreateTitle', 'Thread geplant'),
        description: t(
          'threads.form.saveSuccessDescription',
          'Thread enthält {count} Post{suffix}.',
          {
            count: totalSegments,
            suffix: totalSegments !== 1 ? 's' : ''
          }
        )
      })

      if (typeof onThreadSaved === 'function') {
        try {
          onThreadSaved({ mode: isEditMode ? 'edit' : 'create', thread })
        } catch (callbackError) {
          console.error(
            'onThreadSaved Callback hat einen Fehler ausgelöst:',
            callbackError
          )
        }
      }

      if (!isEditMode) {
        restoreFromThread(null, { focus: true })
      }
    } catch (error) {
      console.error('Thread konnte nicht gespeichert werden:', error)
      toast.error({
        title: isEditMode
          ? t(
              'threads.form.saveErrorUpdateTitle',
              'Aktualisierung fehlgeschlagen'
            )
          : t('threads.form.saveErrorCreateTitle', 'Speichern fehlgeschlagen'),
        description:
          error?.message ||
          t(
            'threads.form.saveErrorDescription',
            'Unbekannter Fehler beim Speichern des Threads.'
          )
      })
    } finally {
      setSaving(false)
    }
  }

  async function doSendNowThread () {
    if (saving || loading || sending) return
    if (hasValidationIssues || !hasAnySegmentContentOrMedia) {
      toast.error({
        title: t(
          'threads.form.sendNow.validationErrorTitle',
          'Formular unvollständig'
        ),
        description: t(
          'threads.form.sendNow.validationErrorDescription',
          'Markierte Probleme sollten behoben werden, bevor gesendet wird.'
        )
      })
      return
    }

    setSending(true)
    try {
      let id = threadId
      if (!isEditMode) {
        const titleCandidate = previewSegments[0]?.raw || ''
        const normalizedTitle = titleCandidate.trim().slice(0, 120) || null
        const createPayload = {
          title: normalizedTitle,
          scheduledAt: null,
          status: 'draft',
          targetPlatforms,
          appendNumbering,
          metadata: { limit, totalSegments, source, sendNow: true },
          skeets: previewSegments.map((segment, index) => ({
            sequence: index,
            content: segment.formatted,
            appendNumbering,
            characterCount: segment.characterCount,
            media: Array.isArray(pendingMedia[index]) ? pendingMedia[index] : []
          }))
        }
        const resCreate = await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload)
        })
        if (!resCreate.ok) {
          const data = await resCreate.json().catch(() => ({}))
          throw new Error(
            data.error ||
              t(
                'threads.form.sendNow.createErrorFallback',
                'Thread konnte nicht erstellt werden.'
              )
          )
        }
        const created = await resCreate.json()
        id = created?.id
        if (!id) {
          throw new Error(
            t(
              'threads.form.sendNow.unexpectedCreateResponse',
              'Unerwartete Antwort beim Erstellen des Threads.'
            )
          )
        }
      }

      const resPub = await fetch(`/api/threads/${id}/publish-now`, {
        method: 'POST'
      })
      if (!resPub.ok) {
        const data = await resPub.json().catch(() => ({}))
        throw new Error(
          data.error ||
            t(
              'threads.form.sendNow.publishErrorFallback',
              'Direktveröffentlichung fehlgeschlagen.'
            )
        )
      }
      const published = await resPub.json()

      toast.success({
        title: t(
          'threads.form.sendNow.successTitle',
          'Veröffentlicht (direkt)'
        ),
        description: t(
          'threads.form.sendNow.successDescription',
          'Der Thread wurde unmittelbar gesendet und erscheint unter Veröffentlicht.'
        )
      })

      if (typeof onThreadSaved === 'function') {
        try {
          onThreadSaved(published)
        } catch (cbErr) {
          console.error('onThreadSaved Fehler:', cbErr)
        }
      }
      if (!isEditMode) {
        restoreFromThread(null, { focus: true })
      }
    } catch (e) {
      console.error('Sofort senden fehlgeschlagen:', e)
      toast.error({
        title: t('threads.form.sendNow.errorTitle', 'Senden fehlgeschlagen'),
        description:
          e?.message ||
          t(
            'threads.form.sendNow.errorDescription',
            'Unbekannter Fehler beim Senden.'
          )
      })
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (saving || loading || sending) return

    // If there is only one segment, suggest creating a single Post instead
    if (totalSegments === 1) {
      setSingleSegDialog({ open: true })
      return
    }

    await doSubmitThread()
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-foreground'>
            {isEditMode
              ? t('threads.form.headingEdit', 'Thread bearbeiten')
              : t('threads.form.headingCreate', 'Thread planen')}
          </h2>
          <p className='mt-1 text-sm text-foreground-muted'>
            {t(
              'threads.form.headingHint',
              'Maximal {limit} Zeichen pro Post für die gewählten Plattformen.',
              { limit: limit || 0 }
            )}
          </p>
        </div>
      </div>
      <div className='grid gap-6 lg:grid-cols-2 lg:items-start lg:min-h-0'>
        <div className='space-y-4'>
          <div
            className={`rounded-3xl border border-border ${theme.panelBg} p-6 shadow-soft`}
          >
            <header className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold'>
                  {t('threads.form.source.heading', 'Thread-Inhalt')}
                </h3>
                <button
                  type='button'
                  className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                  aria-label={t(
                    'threads.form.source.infoAria',
                    'Hinweis zu Thread-Inhalt anzeigen'
                  )}
                  onClick={() => setInfoThreadOpen(true)}
                  title={t('threads.form.infoButtonTitle', 'Hinweis anzeigen')}
                >
                  <InfoCircledIcon width={14} height={14} />{' '}
                  {t('threads.form.infoButtonLabel', 'Info')}
                </button>
              </div>
              <p className='mt-1 text-xs text-foreground-muted'>
                {t(
                  'threads.form.source.shortHint',
                  'STRG+Enter fügt einen Trenner ein. Lange Abschnitte werden automatisch aufgeteilt. Nummerierung kann optional deaktiviert werden.'
                )}
              </p>
            </header>

            <textarea
              ref={textareaRef}
              value={source}
              onChange={event => setSource(event.target.value)}
              onKeyDown={handleKeyDown}
              onClick={scrollPreviewToActiveSegment}
              onKeyUp={scrollPreviewToActiveSegment}
              className='mt-4 h-64 w-full rounded-2xl border border-border bg-background-subtle p-4 font-mono text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'
              placeholder={t(
                'threads.form.source.placeholder',
                'Beispiel:\nIntro zum Thread...\n---\nWeiterer Post...'
              )}
            />
            {/* Toolbar unter der Textarea */}
            <div className='mt-2 flex items-center gap-2'>
              <button
                type='button'
                className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                aria-label={t(
                  'threads.form.emoji.insertAria',
                  'Emoji einfügen'
                )}
                aria-keyshortcuts='Control+. Meta+.'
                title={t(
                  'threads.form.emoji.insertTitle',
                  'Emoji einfügen (Ctrl+.)'
                )}
                onClick={() => setEmojiPicker({ open: true })}
              >
                <FaceIcon className='h-4 w-4' aria-hidden='true' />
              </button>
            </div>

            <div className='mt-4 space-y-3'>
              <div className='space-y-3'>
                <div className='grid gap-4 md:grid-cols-2'>
                  <InlineField
                    htmlFor='thread-schedule-date'
                    label={t('posts.form.date.label', 'Geplantes Datum')}
                    size='lg'
                  >
                    <input
                      id='thread-schedule-date'
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
                      onChange={event => {
                        const value = event.target.value
                        applyScheduledParts(value, scheduledTime)
                        try {
                          dateInputRef.current?.blur?.()
                        } catch {
                          // blur nicht möglich
                        }
                      }}
                      className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    />
                  </InlineField>
                  <InlineField
                    htmlFor='thread-schedule-time'
                    label={t('posts.form.time.label', 'Geplante Uhrzeit')}
                    size='lg'
                  >
                    <input
                      id='thread-schedule-time'
                      type='time'
                      value={scheduledTime}
                      ref={timeInputRef}
                      min={scheduledDate === todayDate ? nowTime : undefined}
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
                      onChange={event => {
                        const value = event.target.value
                        applyScheduledParts(scheduledDate, value)
                        try {
                          timeInputRef.current?.blur?.()
                        } catch {
                          // blur nicht möglich
                        }
                      }}
                      className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    />
                  </InlineField>
                </div>
                <p className='text-xs text-foreground-muted'>
                  {t(
                    'threads.form.schedule.hint',
                    'Standard: morgen um 09:00 Uhr.'
                  )}{' '}
                  {scheduledDate === todayDate
                    ? t(
                        'threads.form.schedule.todayHint',
                        'Heute nur Zeiten ab der aktuellen Uhrzeit wählbar.'
                      )
                    : null}
                </p>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                {isEditMode && typeof onCancel === 'function' ? (
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={onCancel}
                    disabled={saving}
                    className='min-w-[8rem]'
                  >
                    {t('threads.form.actions.cancel', 'Abbrechen')}
                  </Button>
                ) : null}
                <Button
                  type='button'
                  variant='neutral'
                  className='min-w-[8rem]'
                  disabled={
                    hasValidationIssues ||
                    !hasAnySegmentContentOrMedia ||
                    saving ||
                    loading ||
                    sending
                  }
                  onClick={() => {
                    if (
                      hasValidationIssues ||
                      !hasAnySegmentContentOrMedia ||
                      saving ||
                      loading ||
                      sending
                    ) {
                      if (hasValidationIssues) {
                        toast.error({
                          title: t(
                            'threads.form.sendNow.validationErrorTitle',
                            'Formular unvollständig'
                          ),
                          description: t(
                            'threads.form.sendNow.validationErrorDescription',
                            'Markierte Probleme sollten behoben werden, bevor gesendet wird.'
                          )
                        })
                      }
                      return
                    }
                    setSendNowConfirmOpen(true)
                  }}
                >
                  {sending
                    ? t('threads.form.sendNow.buttonBusy', 'Senden…')
                    : t('threads.form.sendNow.buttonDefault', 'Sofort senden')}
                </Button>
                <Button
                  type='submit'
                  variant='primary'
                  disabled={hasValidationIssues || saving || loading}
                  className='min-w-[8rem]'
                >
                  {saving
                    ? isEditMode
                      ? t('threads.form.submitUpdateBusy', 'Aktualisieren…')
                      : t('threads.form.submitCreateBusy', 'Planen…')
                    : isEditMode
                    ? t('threads.form.submitUpdate', 'Thread aktualisieren')
                    : t('threads.form.submitCreate', 'Planen')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <aside className='flex flex-col gap-4 lg:max-h-[calc(100vh-18rem)] lg:min-h-0 lg:overflow-hidden'>
          <div
            className={`shrink-0 rounded-3xl border border-border ${theme.panelBg} p-5 shadow-soft`}
          >
            <div className='flex items-center justify-between'>
              <h3 className='text-base font-semibold text-foreground'>
                {t('threads.form.options.heading', 'Optionen')}
              </h3>
            </div>
            <div className='mt-4 space-y-4'>
              <fieldset className='space-y-2'>
                <legend className='text-sm font-semibold'>
                  {t('threads.form.platforms.legend', 'Zielplattformen')}
                </legend>
                <div className='space-y-2'>
                  <div
                    className='flex flex-wrap items-center gap-4'
                    role='group'
                    aria-label={t(
                      'threads.form.platforms.groupLabel',
                      'Zielplattformen wählen'
                    )}
                  >
                    {PLATFORM_OPTIONS.map(option => {
                      const isActive = targetPlatforms.includes(option.id)
                      const disabled =
                        option.id === 'mastodon' && !mastodonConfigured
                      const title = disabled
                        ? t(
                            'threads.form.platforms.mastodonDisabledTitle',
                            'Mastodon-Zugang nicht konfiguriert'
                          )
                        : t(
                            'threads.form.platforms.optionTitle',
                            '{label} ({limit})',
                            { label: option.label, limit: option.limit }
                          )
                      return (
                        <label
                          key={option.id}
                          className={`inline-flex items-center gap-2 text-sm font-medium ${
                            disabled
                              ? 'text-foreground-muted'
                              : 'text-foreground'
                          }`}
                          title={title}
                          aria-disabled={disabled || undefined}
                        >
                          <input
                            type='checkbox'
                            className='h-4 w-4 rounded border-border'
                            checked={isActive && !disabled}
                            disabled={disabled}
                            onChange={() => handleTogglePlatform(option.id)}
                          />
                          <span className='capitalize'>
                            {option.id === 'bluesky'
                              ? t('threads.form.platforms.bluesky', 'Bluesky')
                              : t('threads.form.platforms.mastodon', 'Mastodon')}
                            <span className='ml-1 text-xs text-foreground-muted'>
                              ({option.limit})
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  <div className='space-y-2'>
                    <label className='inline-flex items-center gap-2 text-sm font-medium text-foreground'>
                      <input
                        type='checkbox'
                        className='h-4 w-4 rounded border-border'
                        checked={applyJitter && jitterAvailable}
                        disabled={!jitterAvailable || !scheduledAt}
                        onChange={() => {
                          if (!jitterAvailable || !scheduledAt) return
                          setApplyJitter(prev => !prev)
                        }}
                      />
                      <span>
                        {t('threads.form.jitter.label', 'Jitter nutzen')}
                      </span>
                    </label>
                    {!jitterAvailable && !schedulerLoading ? (
                      <p className='text-xs text-foreground-muted'>
                        {t(
                          'threads.form.jitter.disabledHint',
                          'Jitter ist in den Einstellungen deaktiviert.'
                        )}
                      </p>
                    ) : null}
                  </div>
                  <label className='inline-flex items-center gap-2 text-sm font-medium text-foreground'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded border-border'
                      checked={appendNumbering}
                      onChange={event => setAppendNumbering(event.target.checked)}
                    />
                    <span>
                      {t(
                        'threads.form.numbering.label',
                        'Automatische Nummerierung (`1/x`) anhängen'
                      )}
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>
          </div>

          <div
            className={`flex flex-col rounded-3xl border border-border ${theme.panelBg} p-6 shadow-soft lg:min-h-0 lg:flex-1 lg:overflow-hidden`}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold'>
                  {t('threads.form.preview.heading', 'Vorschau')}
                </h3>
                <button
                  type='button'
                  className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                  aria-label={t(
                    'threads.form.preview.infoAria',
                    'Hinweis zur Vorschau anzeigen'
                  )}
                  onClick={() => setInfoPreviewOpen(true)}
                  title={t('threads.form.infoButtonTitle', 'Hinweis anzeigen')}
                >
                  <InfoCircledIcon width={14} height={14} />{' '}
                  {t('threads.form.infoButtonLabel', 'Info')}
                </button>
              </div>
              <span className='text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                {t('threads.form.preview.counter', '{count} Post{suffix}', {
                  count: totalSegments,
                  suffix: totalSegments !== 1 ? 's' : ''
                })}
              </span>
            </div>

            <div
              ref={previewContainerRef}
              className='mt-4 flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-preview lg:min-h-0 lg:pr-3'
            >
              {previewSegments.map((segment, index) => {
                return (
                  <article
                    key={segment.id}
                    onClick={event => {
                      const target = event.target
                      if (target?.closest?.('button, input, a')) return
                      handlePreviewSegmentClick(index)
                    }}
                    ref={el => {
                      previewSegmentRefs.current[index] = el
                    }}
                    className={`rounded-2xl border ${'border-border bg-background-subtle'} p-4 shadow-soft`}
                  >
                    <header className='flex items-center justify-between text-sm'>
                      <span className='font-semibold text-foreground'>
                        Post {index + 1}
                      </span>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`font-medium ${
                            segment.exceedsLimit
                              ? 'text-destructive'
                              : segment.characterCount >
                                (limit ? limit * 0.9 : Infinity)
                              ? 'text-amber-500'
                              : 'text-foreground-muted'
                          }`}
                        >
                          {segment.characterCount}
                          {limit ? ` / ${limit}` : null}
                        </span>
                        <button
                          type='button'
                          className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                          onClick={() => openMediaDialog(segment.id)}
                          title={
                            getMediaCount(segment.id) >= imagePolicy.maxCount
                              ? `Maximal ${imagePolicy.maxCount} Bilder je Post erreicht`
                              : 'Bild hinzufügen'
                          }
                          disabled={
                            getMediaCount(segment.id) >= imagePolicy.maxCount
                          }
                          aria-label={t(
                            'threads.form.media.addImageAria',
                            'Bild hinzufügen'
                          )}
                        >
                          <ImageIcon className='h-4 w-4' aria-hidden='true' />
                        </button>
                        {tenorAvailable ? (
                          <button
                            type='button'
                            className='rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-background-elevated'
                            onClick={() => setGifPicker({ open: true, index })}
                            title={
                              getMediaCount(segment.id) >= imagePolicy.maxCount
                                ? `Maximal ${imagePolicy.maxCount} Bilder je Post erreicht`
                                : 'GIF hinzufügen'
                            }
                            disabled={
                              getMediaCount(segment.id) >= imagePolicy.maxCount
                            }
                          >
                            GIF
                          </button>
                        ) : null}
                        {/* Emoji-Button entfällt: Emojis werden im Text eingefügt */}
                      </div>
                    </header>
                    <div className='mt-3 flex-1 overflow-auto pr-2'>
                      <span className='whitespace-pre-wrap break-words leading-relaxed text-foreground'>
                        {segment.formatted || '(kein Inhalt)'}
                      </span>
                    </div>
                    <SegmentMediaGrid
                      items={getSegmentMediaItems(segment.id)}
                      maxCount={imagePolicy.maxCount}
                      onEditAlt={item => openAltDialog(segment.id, item)}
                      onRemove={item => handleRemoveMedia(segment.id, item)}
                      labels={mediaGridLabels}
                    />
                    <div className='mt-2 text-xs text-foreground-muted'>
                      {t(
                        'threads.form.media.counterPerSegment',
                        'Medien {count}/{max}',
                        {
                          count: getMediaCount(segment.id),
                          max: imagePolicy.maxCount
                        }
                      )}
                    </div>
                    {segment.exceedsLimit ? (
                      <p className='mt-1 text-sm text-destructive'>
                        {t(
                          'threads.form.segment.limitExceeded',
                          'Zeichenlimit überschritten.'
                        )}
                      </p>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
      <MediaDialog
        open={mediaDialog.open}
        title={mediaDialog.title}
        mode='upload'
        accept={mediaDialog.accept}
        requireAltText={Boolean(imagePolicy.requireAltText)}
        maxBytes={imagePolicy.maxBytes}
        allowedMimes={imagePolicy.allowedMimes}
        onConfirm={(file, alt) => {
          const idx = mediaDialog.index
          closeMediaDialog()
          handleUploadMedia(idx, file, alt)
        }}
        onClose={closeMediaDialog}
      />
      <EmojiPicker
        open={emojiPicker.open}
        onClose={() => setEmojiPicker({ open: false })}
        anchorRef={textareaRef}
        verticalAlign='center'
        onPick={emoji => {
          const value = emoji?.native || emoji?.shortcodes || emoji?.id
          if (!value) return
          try {
            const ta = textareaRef.current
            if (!ta) return
            const {
              selectionStart = source.length,
              selectionEnd = source.length
            } = ta
            const next = `${source.slice(
              0,
              selectionStart
            )}${value}${source.slice(selectionEnd)}`
            setSource(next)
            setEmojiPicker({ open: false })
            setTimeout(() => {
              try {
                const pos = selectionStart + value.length
                ta.selectionStart = pos
                ta.selectionEnd = pos
                ta.focus()
              } catch {
                // Cursor konnte nicht neu gesetzt werden
              }
            }, 0)
          } catch {
            // Einfügen fehlgeschlagen; Eingabe sauber lassen
          }
        }}
      />
      <ConfirmDialog
        open={sendNowConfirmOpen}
        title={t('threads.form.sendNow.confirmTitle', 'Sofort senden?')}
        description={t(
          'threads.form.sendNow.confirmDescription',
          'Der Thread wird sofort veröffentlicht und nicht mehr geplant ausgeführt.'
        )}
        confirmLabel={t('threads.form.sendNow.buttonDefault', 'Sofort senden')}
        cancelLabel={t('common.actions.cancel', 'Abbrechen')}
        variant='primary'
        onConfirm={async () => {
          setSendNowConfirmOpen(false)
          await doSendNowThread()
        }}
        onCancel={() => setSendNowConfirmOpen(false)}
      />
      {tenorAvailable ? (
        <GifPicker
          open={gifPicker.open}
          onClose={() => setGifPicker({ open: false, index: null })}
          classNames={DASHBOARD_GIF_PICKER_CLASSES}
          styles={DASHBOARD_GIF_PICKER_STYLES}
          onPick={async ({ downloadUrl }) => {
            try {
              const resp = await fetch(downloadUrl)
              const blob = await resp.blob()
              if (blob.size > (imagePolicy.maxBytes || 8 * 1024 * 1024)) {
                setUploadError({
                  open: true,
                  message: t(
                    'threads.form.media.gifTooLargeMessage',
                    'GIF zu groß. Maximal {mb} MB.',
                    {
                      mb: (imagePolicy.maxBytes / (1024 * 1024)).toFixed(0)
                    }
                  )
                })
                return
              }
              const file = new File([blob], 'tenor.gif', { type: 'image/gif' })
              const idx = gifPicker.index
              if (typeof idx === 'number') {
                await handleUploadMedia(idx, file, '')
              }
            } catch (e) {
              setUploadError({
                open: true,
                message:
                  e?.message ||
                  t(
                    'threads.form.media.gifLoadErrorMessage',
                    'GIF konnte nicht geladen werden.'
                  )
              })
            } finally {
              setGifPicker({ open: false, index: null })
            }
          }}
        />
      ) : null}
      {uploadError.open ? (
        <Modal
          open={uploadError.open}
          title={t(
            'threads.form.media.uploadErrorDialogTitle',
            'Upload fehlgeschlagen'
          )}
          onClose={() => setUploadError({ open: false, message: '' })}
          actions={
            <Button
              variant='secondary'
              onClick={() => setUploadError({ open: false, message: '' })}
            >
              {t('common.actions.close', 'Schließen')}
            </Button>
          }
        >
          <p className='text-sm text-foreground'>
            {uploadError.message ||
              t(
                'threads.form.media.uploadErrorDialogBody',
                'Die Bilddatei konnte nicht hochgeladen werden.'
              )}
          </p>
        </Modal>
      ) : null}

      {/* Info: Thread-Inhalt */}
      {infoThreadOpen ? (
        <InfoDialog
          open={infoThreadOpen}
          title={t('threads.form.infoSource.title', 'Hinweis: Thread-Inhalt')}
          onClose={() => setInfoThreadOpen(false)}
          closeLabel={t('common.actions.close', 'Schließen')}
          content={
            <>
              <p>
                {t(
                  'threads.form.infoSource.body1',
                  'Der gesamte Thread kann in ein einzelnes Feld geschrieben werden. --- kann als Trenner genutzt oder mit STRG+Enter eingefügt werden.'
                )}
              </p>
              <p>
                {t(
                  'threads.form.infoSource.body2',
                  'Längere Abschnitte werden automatisch passend zerschnitten – wenn möglich am Satzende. Die Zeichenbegrenzung richtet sich nach den gewählten Plattformen (kleinster Wert gilt).'
                )}
              </p>
              <p>
                {t(
                  'threads.form.infoSource.body3',
                  'Medien werden pro Post in der Vorschau hinzugefügt. Maximal {max} Bilder pro Post.',
                  { max: imagePolicy?.maxCount ?? 4 }
                )}
              </p>
              <p>
                {t(
                  'threads.form.infoSource.body4',
                  'Die automatische Nummerierung (1/x) kann im Formular ein- oder ausgeschaltet werden.'
                )}
              </p>
            </>
          }
        />
      ) : null}

      {/* Info: Vorschau */}
      {infoPreviewOpen ? (
        <InfoDialog
          open={infoPreviewOpen}
          title={t('threads.form.infoPreview.title', 'Hinweis: Vorschau')}
          onClose={() => setInfoPreviewOpen(false)}
          closeLabel={t('common.actions.close', 'Schließen')}
          content={
            <>
              <p>
                {t(
                  'threads.form.infoPreview.body1',
                  'Jeder Abschnitt bildet einen Post. Über die Buttons in der Vorschau werden pro Post Bilder oder GIFs hinzugefügt.'
                )}
              </p>
              <p>
                {t(
                  'threads.form.infoPreview.body2',
                  'Bilder werden beim Speichern hochgeladen (max. {max} je Post).',
                  { max: imagePolicy?.maxCount ?? 4 }
                )}
              </p>
              <p>
                {t(
                  'threads.form.infoPreview.body3',
                  'Der Zähler zeigt die aktuelle Zeichenanzahl je Post im Verhältnis zum Limit der ausgewählten Plattformen.'
                )}
              </p>
              <p>
                {t(
                  'threads.form.infoPreview.body4',
                  'Die automatische Nummerierung (1/x) kann im Formular ein- oder ausgeschaltet werden.'
                )}
              </p>
            </>
          }
        />
      ) : null}
      {altDialog.open && altDialog.item ? (
        <MediaDialog
          open={altDialog.open}
          title={
            altDialog.item.alt
              ? t('threads.form.media.altEditTitle', 'Alt‑Text bearbeiten')
              : t('threads.form.media.altAddTitle', 'Alt‑Text bearbeiten')
          }
          mode='alt'
          previewSrc={altDialog.item.src}
          initialAlt={altDialog.item.alt || ''}
          requireAltText={Boolean(imagePolicy.requireAltText)}
          onConfirm={async (_file, newAlt) => {
            const segIdx = altDialog.segmentIndex
            const item = altDialog.item
            try {
              if (item.type === 'existing') {
                const res = await fetch(`/api/media/${item.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ altText: newAlt })
                })
                if (!res.ok) {
                  throw new Error(
                    (await res.json().catch(() => ({}))).error ||
                      t(
                        'threads.form.media.altSaveErrorFallback',
                        'Alt‑Text konnte nicht gespeichert werden.'
                      )
                  )
                }
                setEditedMediaAlt(s => ({ ...s, [item.id]: newAlt }))
              } else {
                setPendingMedia(s => {
                  const arr = Array.isArray(s[segIdx]) ? s[segIdx].slice() : []
                  if (arr[item.pendingIndex])
                    arr[item.pendingIndex] = {
                      ...arr[item.pendingIndex],
                      altText: newAlt
                    }
                  return { ...s, [segIdx]: arr }
                })
              }
              toast.success({
                title: t(
                  'threads.form.media.altSaveSuccessTitle',
                  'Alt‑Text gespeichert'
                )
              })
            } catch (e) {
              toast.error({
                title: t(
                  'threads.form.media.altSaveErrorTitle',
                  'Fehler beim Alt‑Text'
                ),
                description:
                  e?.message || t('common.errors.unknown', 'Unbekannter Fehler')
              })
            } finally {
              closeAltDialog()
            }
          }}
          onClose={closeAltDialog}
        />
      ) : null}

      {/* Suggest move to Posts-Planer if only one segment */}
      {singleSegDialog.open ? (
        <Modal
          open={singleSegDialog.open}
          title={t(
            'threads.form.singleSegment.title',
            'Nur ein Segment erkannt'
          )}
          onClose={() => setSingleSegDialog({ open: false })}
          actions={
            <>
              <Button
                variant='secondary'
                onClick={async () => {
                  setSingleSegDialog({ open: false })
                  await doSubmitThread()
                }}
              >
                {t(
                  'threads.form.singleSegment.keepAsThread',
                  'Trotzdem als Thread speichern'
                )}
              </Button>
              <Button
                variant='primary'
                onClick={() => {
                  setSingleSegDialog({ open: false })
                  if (typeof onSuggestMoveToSkeets === 'function') {
                    const content = (previewSegments?.[0]?.raw || '').toString()
                    onSuggestMoveToSkeets(content)
                  } else {
                    toast.info({
                      title: t(
                        'threads.form.singleSegment.moveToPostsTitle',
                        'Zum Posts-Planer wechseln'
                      ),
                      description: t(
                        'threads.form.singleSegment.moveToPostsDescription',
                        'Bitte wechsle zum Posts-Planer und füge den Text ein.'
                      )
                    })
                  }
                }}
              >
                {t(
                  'threads.form.singleSegment.moveToPostsButton',
                  'Zum Posts-Planer wechseln'
                )}
              </Button>
            </>
          }
        >
          <div className='space-y-2 text-sm text-foreground'>
            <p>
              {t(
                'threads.form.singleSegment.body',
                'Dieser Thread enthält nur ein Segment. Stattdessen kann ein einzelner Post geplant werden.'
              )}
            </p>
          </div>
        </Modal>
      ) : null}
    </form>
  )
}

export default ThreadForm
