import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, MediaDialog } from '@bsky-kampagnen-bot/shared-ui'
import { useTheme } from './ui/ThemeContext'
import { useToast } from '@bsky-kampagnen-bot/shared-ui'
import { useClientConfig } from '../hooks/useClientConfig'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { GifPicker, EmojiPicker } from '@kampagnen-bot/media-pickers'
import {
  formatDateTimeLocal,
  getDefaultDateParts,
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

function splitIntoSentences (text) {
  const normalized = text.replace(/\s+/g, ' ')
  const pattern = /[^.!?]+[.!?]*(?:\s+|$)/g
  const sentences = []
  let match
  while ((match = pattern.exec(normalized)) !== null) {
    sentences.push(match[0])
  }
  if (sentences.length === 0) {
    return [normalized]
  }
  return sentences
}

function hardSplit (text, limit) {
  if (!text) return ['']
  const chunks = []
  let cursor = 0
  while (cursor < text.length) {
    chunks.push(text.slice(cursor, cursor + limit))
    cursor += limit
  }
  return chunks
}

function splitRawSegments (source) {
  const normalized = source.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const segments = []
  let buffer = []

  for (const line of lines) {
    if (line.trim() === '---') {
      segments.push(buffer.join('\n'))
      buffer = []
    } else {
      buffer.push(line)
    }
  }

  segments.push(buffer.join('\n'))

  if (segments.length === 0) {
    return ['']
  }

  return segments
}

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
  const [targetPlatforms, setTargetPlatforms] = useState(defaultPlatformFallback)
  const [source, setSource] = useState('')
  const [appendNumbering, setAppendNumbering] = useState(true)
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt)
  const scheduledDefaultRef = useRef(defaultScheduledAt)
  const [saving, setSaving] = useState(false)
  const [singleSegDialog, setSingleSegDialog] = useState({ open: false, proceed: null })
  const textareaRef = useRef(null)
  const toast = useToast()
  const tenorAvailable = Boolean(clientConfig?.gifs?.tenorAvailable)
  const imagePolicy = clientConfig?.images || { maxCount: 4, maxBytes: 8 * 1024 * 1024, allowedMimes: ['image/jpeg','image/png','image/webp','image/gif'], requireAltText: false }

  const restoreFromThread = useCallback((thread) => {
    if (thread && thread.id) {
      setThreadId(thread.id)
      setTargetPlatforms(
        Array.isArray(thread.targetPlatforms) && thread.targetPlatforms.length
          ? thread.targetPlatforms
          : defaultPlatformFallback
      )
      setAppendNumbering(Boolean(thread.appendNumbering ?? true))
      setScheduledAt(
        thread.scheduledAt
          ? formatDateTimeLocal(thread.scheduledAt, timeZone)
          : ''
      )
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
      setSource('')
    }
  }, [defaultScheduledAt, timeZone])

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
    if (!threadId && (!scheduledAt || scheduledAt === scheduledDefaultRef.current)) {
      setScheduledAt(defaultScheduledAt)
    }
    scheduledDefaultRef.current = defaultScheduledAt
  }, [defaultScheduledAt, scheduledAt, threadId])

  // Mastodon aus Zielplattformen entfernen, wenn nicht konfiguriert
  useEffect(() => {
    if (mastodonStatus === false) {
      setTargetPlatforms((current) => current.filter((id) => id !== 'mastodon'))
    }
  }, [mastodonStatus])

  useEffect(() => {
    if (mastodonStatus === true && !threadId) {
      setTargetPlatforms((current) =>
        current.includes('mastodon') ? current : [...current, 'mastodon']
      )
    }
  }, [mastodonStatus, threadId])

  const limit = useMemo(() => computeLimit(targetPlatforms), [targetPlatforms])

  const rawSegments = useMemo(() => splitRawSegments(source), [source])

  const effectiveSegments = useMemo(() => {
    if (!Number.isFinite(limit)) {
      return rawSegments.map(segment => segment.replace(/\s+$/u, ''))
    }
    const reservedForNumbering = appendNumbering ? 8 : 0
    const effectiveLimit = Math.max(20, limit - reservedForNumbering)
    const result = []
    rawSegments.forEach(segment => {
      const trimmed = segment.replace(/\s+$/u, '')
      if (!trimmed) {
        result.push('')
        return
      }
      if (trimmed.length <= effectiveLimit) {
        result.push(trimmed)
        return
      }
      const sentences = splitIntoSentences(trimmed)
      let buffer = ''
      sentences.forEach(sentence => {
        const candidate = buffer ? `${buffer}${sentence}` : sentence
        if (candidate.trim().length <= effectiveLimit) {
          buffer = candidate
        } else {
          if (buffer.trim()) {
            result.push(buffer.trim())
          }
          let fallback = sentence.trim()
          if (fallback.length > effectiveLimit) {
            const hardChunks = hardSplit(fallback, effectiveLimit)
            result.push(...hardChunks.slice(0, -1).map(chunk => chunk.trim()))
            fallback = hardChunks[hardChunks.length - 1]
          }
          buffer = fallback
        }
      })
      if (buffer.trim()) {
        result.push(buffer.trim())
      }
    })
    return result
  }, [rawSegments, limit, appendNumbering])

  const totalSegments = effectiveSegments.length
  const isEditMode = Boolean(threadId)

  const previewSegments = useMemo(() => {
    return effectiveSegments.map((segment, index) => {
      const trimmedEnd = segment.replace(/\s+$/u, '')
      const numbering = appendNumbering
        ? `\n\n${index + 1}/${totalSegments}`
        : ''
      const formattedContent = appendNumbering
        ? `${trimmedEnd}${numbering}`
        : trimmedEnd
      const characterCount = formattedContent.length
      const isEmpty = trimmedEnd.trim().length === 0
      const exceedsLimit =
        typeof limit === 'number' ? characterCount > limit : false

      return {
        id: index,
        raw: segment,
        formatted: formattedContent,
        characterCount,
        isEmpty,
        exceedsLimit
      }
    })
  }, [effectiveSegments, appendNumbering, totalSegments, limit])

  // Minimaler Medien-Upload pro Segment (nur im Edit-Modus)
  const [mediaAlt] = useState({});
  const [pendingMedia, setPendingMedia] = useState({}); // create-mode media per segment id/index
  const getMediaCount = (index) => {
    const pending = Array.isArray(pendingMedia[index]) ? pendingMedia[index].length : 0;
    let existing = 0;
    if (isEditMode && initialThread && Array.isArray(initialThread.segments)) {
      const seg = initialThread.segments.find((s) => Number(s.sequence) === Number(index));
      existing = Array.isArray(seg?.media) ? seg.media.length : 0;
    }
    return pending + existing;
  };
  const handleUploadMedia = async (index, file, altTextOverride) => {
    if (!file) return;
    try {
      if (isEditMode && threadId) {
        // Direkt am Segment des existierenden Threads hochladen
        try {
          const formData = new FormData();
          formData.append('media', file);
          formData.append('altText', (altTextOverride ?? mediaAlt[index]) || '');

          const res = await fetch(`/api/threads/${threadId}/segments/${index}/media`, {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Upload fehlgeschlagen.');
          }
          toast.success({ title: `Skeet ${index + 1}`, description: 'Bild hinzugefügt.' });
        } catch (e) {
          const msg = e?.message || '';
          if (/zu groß|too large|413/i.test(msg)) {
            setUploadError({ open: true, message: `Die Datei ist zu groß. Maximal ${(imagePolicy.maxBytes / (1024*1024)).toFixed(0)} MB erlaubt.` });
          } else {
            toast.error({ title: 'Medien-Upload fehlgeschlagen', description: msg || 'Fehler beim Upload.' });
          }
        }
      } else {
        // Entwurf: Temporär hochladen und Vorschau sofort anzeigen
        try {
          const formData = new FormData();
          formData.append('media', file);
          formData.append('altText', (altTextOverride ?? mediaAlt[index]) || '');

          const res = await fetch('/api/uploads/temp', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Temporärer Upload fehlgeschlagen.');
          }
          const info = await res.json();
          setPendingMedia((s) => {
            const arr = Array.isArray(s[index]) ? s[index].slice() : [];
            arr.push({ tempId: info.tempId, mime: info.mime, previewUrl: info.previewUrl, altText: info.altText || '' });
            return { ...s, [index]: arr };
          });
          toast.success({ title: `Skeet ${index + 1}`, description: 'Bild hinzugefügt.' });
        } catch (e) {
          const msg = e?.message || '';
          if (/zu groß|too large|413/i.test(msg)) {
            setUploadError({ open: true, message: `Die Datei ist zu groß. Maximal ${(imagePolicy.maxBytes / (1024*1024)).toFixed(0)} MB erlaubt.` });
          } else {
            toast.error({ title: 'Upload fehlgeschlagen', description: msg || 'Fehler beim Upload.' });
          }
        }
      }
    } catch (e) {
      console.error("Fehler beim Hochladen des Bildes im Thread", e)
      toast.error({ title: 'Upload fehlgeschlagen', description: e})
    }
  };

  // Media Dialog State
  const [mediaDialog, setMediaDialog] = useState({ open: false, index: null, accept: 'image/*', title: 'Bild hinzufügen' })
  const openMediaDialog = (index, { gif = false } = {}) => {
    setMediaDialog({ open: true, index, accept: gif ? 'image/gif' : 'image/*', title: gif ? 'GIF hinzufügen' : 'Bild hinzufügen' })
  }
  const closeMediaDialog = () => setMediaDialog({ open: false, index: null, accept: 'image/*', title: 'Bild hinzufügen' })
  const [gifPicker, setGifPicker] = useState({ open: false, index: null })
  const [emojiPicker, setEmojiPicker] = useState({ open: false })

  // Overlay helpers for existing media edits (without full reload)
  const [editedMediaAlt, setEditedMediaAlt] = useState({}); // key: mediaId => alt text
  const [removedMedia, setRemovedMedia] = useState({}); // key: mediaId => true

  const [altDialog, setAltDialog] = useState({ open: false, segmentIndex: null, item: null });
  const openAltDialog = (segmentIndex, item) => {
    setAltDialog({ open: true, segmentIndex, item });
  };
  const closeAltDialog = () => setAltDialog({ open: false, segmentIndex: null, item: null });
  const [uploadError, setUploadError] = useState({ open: false, message: '' });
  const [infoThreadOpen, setInfoThreadOpen] = useState(false);
  const [infoPreviewOpen, setInfoPreviewOpen] = useState(false);

  const handleRemoveMedia = async (segmentIndex, item) => {
    if (item.type === 'existing') {
      try {
        const res = await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Löschen fehlgeschlagen');
        setRemovedMedia((s) => ({ ...s, [item.id]: true }));
        toast.success({ title: 'Bild entfernt' });
      } catch (e) {
        toast.error({ title: 'Entfernen fehlgeschlagen', description: e?.message || 'Unbekannter Fehler' });
      }
    } else {
      setPendingMedia((s) => {
        const arr = Array.isArray(s[segmentIndex]) ? s[segmentIndex].slice() : [];
        if (item.pendingIndex >= 0 && item.pendingIndex < arr.length) {
          arr.splice(item.pendingIndex, 1);
        }
        return { ...s, [segmentIndex]: arr };
      });
    }
  };

  const handleTogglePlatform = (platformId) => {
    if (platformId === 'mastodon' && !mastodonConfigured) return
    setTargetPlatforms((current) => {
      if (current.includes(platformId)) {
        // Mindestens eine Plattform muss aktiv bleiben
        if (current.length === 1) return current;
        return current.filter((id) => id !== platformId);
      }
      return [...current, platformId];
    });
  };

  const handleInsertSeparator = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { selectionStart, selectionEnd, value } = textarea
    const before = value.slice(0, selectionStart)
    const after = value.slice(selectionEnd)
    const prevChar = selectionStart > 0 ? value.charAt(selectionStart - 1) : ''
    const nextChar = selectionEnd < value.length ? value.charAt(selectionEnd) : ''

    const needsPrefixNl = selectionStart > 0 && prevChar !== '\n'
    const needsSuffixNl = nextChar !== '\n'
    const separator = `${needsPrefixNl ? '\n' : ''}---${needsSuffixNl ? '\n' : ''}`

    const nextValue = `${before}${separator}${after}`
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
    if ((event.ctrlKey || event.metaKey) && (event.key === '.' || event.code === 'Period')) {
      event.preventDefault()
      setEmojiPicker({ open: true })
      return
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleInsertSeparator()
    }
  }

  const limitLabel = useMemo(() => {
    if (!targetPlatforms.length) {
      return 'Keine Plattform ausgewählt'
    }
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
      return 'Zeichenlimit nicht bestimmt'
    }
    return `${limit} Zeichen (limitierend)`
  }, [limit, targetPlatforms.length])

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
  }, [previewSegments, targetPlatforms.length, pendingMedia, initialThread, isEditMode])

  const showLoadingState = loading && !threadId

  if (showLoadingState) {
    return (
      <div className='space-y-6'>
        <p className='text-sm text-foreground-muted'>Thread wird geladen…</p>
      </div>
    )
  }

  async function doSubmitThread() {
    const status = scheduledAt ? 'scheduled' : 'draft'
    const scheduledValue = scheduledAt ? scheduledAt : null
    const titleCandidate = previewSegments[0]?.raw || ''
    const normalizedTitle = titleCandidate.trim().slice(0, 120) || null

    const payload = {
      title: normalizedTitle,
      scheduledAt: scheduledValue,
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
        title: isEditMode ? 'Thread aktualisiert' : 'Thread geplant',
        description: `Thread enthält ${totalSegments} Skeet${
          totalSegments !== 1 ? 's' : ''
        }.`
      })

      if (typeof onThreadSaved === 'function') {
        try {
          onThreadSaved(thread)
        } catch (callbackError) {
          console.error(
            'onThreadSaved Callback hat einen Fehler ausgelöst:',
            callbackError
          )
        }
      }

      if (!isEditMode) {
        restoreFromThread(null)
      }
    } catch (error) { 
      console.error('Thread konnte nicht gespeichert werden:', error)
      toast.error({
        title: isEditMode
          ? 'Aktualisierung fehlgeschlagen'
          : 'Speichern fehlgeschlagen',
        description:
          error?.message || 'Unbekannter Fehler beim Speichern des Threads.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (saving || loading || sending) return

    // If there is only one segment, suggest creating a single Skeet instead
    if (totalSegments === 1) {
      setSingleSegDialog({ open: true })
      return
    }

    await doSubmitThread()
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='space-y-4'>
          <div className={`rounded-3xl border border-border ${theme.panelBg} p-6 shadow-soft`}>
            <header className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold'>Thread-Inhalt</h3>
                <button
                  type='button'
                  className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                  aria-label='Hinweis zu Thread-Inhalt anzeigen'
                  onClick={() => setInfoThreadOpen(true)}
                  title='Hinweis anzeigen'
                >
                  <InfoCircledIcon width={14} height={14} /> Info
                </button>
              </div>
              <div className='flex flex-wrap items-center gap-3 text-sm'>
                <span className='rounded-full bg-background-subtle px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground-muted'>
                  Limit: {limitLabel}
                </span>
              </div>
            </header>

            <textarea
              ref={textareaRef}
              value={source}
              onChange={event => setSource(event.target.value)}
              onKeyDown={handleKeyDown}
              className='mt-4 h-64 w-full rounded-2xl border border-border bg-background-subtle p-4 font-mono text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'
              placeholder='Beispiel:\nIntro zum Thread...\n---\nWeiterer Skeet...'
            />
            {/* Toolbar unter der Textarea */}
            <div className='mt-2 flex items-center gap-2'>
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

            <div className='mt-4 space-y-3'>
              <fieldset className='space-y-2'>
                <legend className='text-sm font-semibold'>
                  Zielplattformen
                </legend>
                <div className='flex flex-wrap items-center gap-2' role='group' aria-label='Zielplattformen wählen'>
                  {PLATFORM_OPTIONS.map((option) => {
                    const isActive = targetPlatforms.includes(option.id);
                    const disabled = option.id === 'mastodon' && !mastodonConfigured;
                    const title = disabled ? 'Mastodon-Zugang nicht konfiguriert' : `${option.label} (${option.limit})`;
                    return (
                      <label
                        key={option.id}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'border-primary bg-primary/10 text-primary shadow-soft'
                            : 'border-border text-foreground-muted hover:border-primary/50'
                        } ${disabled ? 'opacity-60 cursor-not-allowed hover:border-border' : ''}`}
                        title={title}
                        aria-disabled={disabled || undefined}
                      >
                        <input
                          type='checkbox'
                          className='sr-only'
                          checked={isActive && !disabled}
                          disabled={disabled}
                          onChange={() => handleTogglePlatform(option.id)}
                        />
                        <span className='capitalize'>
                          {option.label.toLowerCase()}
                          <span className='ml-1 text-xs text-foreground-muted'>({option.limit})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className='flex items-center gap-3 text-sm font-medium'>
                <input
                  type='checkbox'
                  className='rounded border-border text-primary focus:ring-primary'
                  checked={appendNumbering}
                  onChange={event => setAppendNumbering(event.target.checked)}
                />
                Automatische Nummerierung (`1/x`) anhängen
              </label>

              <label className='block text-sm font-medium'>
                Geplanter Versand
                <input
                  type='datetime-local'
                  value={scheduledAt}
                  onChange={event => setScheduledAt(event.target.value)}
                  className='mt-1 w-full rounded-2xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'
                />
                <span className='mt-1 block text-xs text-foreground-muted'>
                  Standard: morgen um 09:00 Uhr
                </span>
              </label>

              <p className='text-xs text-foreground-muted'>
                STRG+Enter fügt einen Trenner ein. Lange Abschnitte werden
                automatisch aufgeteilt. Nummerierung kann optional deaktiviert
                werden.
              </p>

              <div className='flex flex-wrap items-center gap-2'>
                {isEditMode && typeof onCancel === 'function' ? (
                  <Button type='button' variant='secondary' onClick={onCancel} disabled={saving}>
                    Abbrechen
                  </Button>
                ) : null}
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    if (isEditMode && initialThread) {
                      restoreFromThread(initialThread)
                    } else {
                      restoreFromThread(null)
                    }
                  }}
                  disabled={saving || sending}
                >
                  Formular zurücksetzen
                </Button>
                <Button
                  type='button'
                  variant='warning'
                  onClick={async () => {
                    if (saving || loading || sending) return
                    if (hasValidationIssues) {
                      toast.error({ title: 'Formular unvollständig', description: 'Bitte behebe die markierten Probleme, bevor du sendest.' })
                      return
                    }

                    setSending(true)
                    try {
                      let id = threadId
                      if (!isEditMode) {
                        // 1) Thread anlegen (ohne unmittelbare Planung);
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
                          throw new Error(data.error || 'Thread konnte nicht erstellt werden.')
                        }
                        const created = await resCreate.json()
                        id = created?.id
                        if (!id) throw new Error('Unerwartete Antwort beim Erstellen des Threads.')
                      }

                      // 2) Direkt veröffentlichen (ohne Scheduler-Tick)
                      const resPub = await fetch(`/api/threads/${id}/publish-now`, { method: 'POST' })
                      if (!resPub.ok) {
                        const data = await resPub.json().catch(() => ({}))
                        throw new Error(data.error || 'Direktveröffentlichung fehlgeschlagen.')
                      }
                      const published = await resPub.json()

                      toast.success({
                        title: 'Veröffentlicht (direkt)',
                        description: 'Der Thread wurde unmittelbar gesendet und erscheint unter Veröffentlicht.'
                      })

                      if (typeof onThreadSaved === 'function') {
                        try { onThreadSaved(published) } catch (cbErr) { console.error('onThreadSaved Fehler:', cbErr) }
                      }
                      if (!isEditMode) {
                        restoreFromThread(null)
                      }
                    } catch (e) {
                      console.error('Sofort senden fehlgeschlagen:', e)
                      toast.error({ title: 'Senden fehlgeschlagen', description: e?.message || 'Unbekannter Fehler beim Senden.' })
                    } finally {
                      setSending(false)
                    }
                  }}
                  disabled={hasValidationIssues || saving || loading || sending}
                >
                  {sending ? 'Senden…' : 'Sofort senden'}
                </Button>
                <Button type='submit' variant='primary' disabled={hasValidationIssues || saving || loading}>
                  {saving
                    ? (isEditMode ? 'Aktualisieren…' : 'Planen…')
                    : (isEditMode ? 'Thread aktualisieren' : 'Planen')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <aside className='space-y-4'>
          <div className={`flex flex-col rounded-3xl border border-border ${theme.panelBg} p-6 shadow-soft lg:max-h-[calc(100vh-4rem)] lg:overflow-hidden`}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold'>Vorschau</h3>
                <button
                  type='button'
                  className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-background-elevated'
                  aria-label='Hinweis zur Vorschau anzeigen'
                  onClick={() => setInfoPreviewOpen(true)}
                  title='Hinweis anzeigen'
                >
                  <InfoCircledIcon width={14} height={14} /> Info
                </button>
              </div>
              <span className='text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                {totalSegments} Skeet{totalSegments !== 1 ? 's' : ''}
              </span>
            </div>

            <div className='mt-4 flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-preview lg:min-h-0 lg:pr-3'>
              {previewSegments.map((segment, index) => {
                return (
                  <article
                    key={segment.id}
                    className={`rounded-2xl border ${
                      'border-border bg-background-subtle'
                    } p-4 shadow-soft`}
                  >
                    <header className='flex items-center justify-between text-sm'>
                      <span className='font-semibold text-foreground'>
                        Skeet {index + 1}
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
                          className='rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                          onClick={() => openMediaDialog(segment.id)}
                          title={getMediaCount(segment.id) >= imagePolicy.maxCount
                              ? `Maximal ${imagePolicy.maxCount} Bilder je Skeet erreicht`
                              : 'Bild hinzufügen'}
                          disabled={getMediaCount(segment.id) >= imagePolicy.maxCount}
                        >
                          <span className='text-base md:text-lg leading-none'>🖼️</span>
                        </button>
                        {tenorAvailable ? (
                        <button
                          type='button'
                          className='rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                          onClick={() => setGifPicker({ open: true, index })}
                          title={getMediaCount(segment.id) >= imagePolicy.maxCount
                              ? `Maximal ${imagePolicy.maxCount} Bilder je Skeet erreicht`
                              : 'GIF hinzufügen'}
                          disabled={getMediaCount(segment.id) >= imagePolicy.maxCount}
                        >
                          GIF
                        </button>
                        ) : null}
                        {/* Emoji-Button entfällt: Emojis werden im Text eingefügt */}
                      </div>
                    </header>
                    <pre className='mt-3 whitespace-pre-wrap break-words rounded-xl bg-background-subtle/70 p-3 text-sm text-foreground'>
                      {segment.formatted || '(leer)'}
                    </pre>
                    {(() => {
                      // Build preview list: existing (edit) + pending (create)
                      const list = [];
                      if (isEditMode && initialThread && Array.isArray(initialThread.segments)) {
                        const seg = initialThread.segments.find((s) => Number(s.sequence) === Number(segment.id));
                        if (seg && Array.isArray(seg.media)) {
                          seg.media.forEach((m) => {
                            if (m?.previewUrl && !removedMedia[m.id]) list.push({ type: 'existing', id: m.id, src: m.previewUrl, alt: editedMediaAlt[m.id] ?? (m.altText || ''), pendingIndex: null });
                          });
                        }
                      }
                      const pend = Array.isArray(pendingMedia[segment.id]) ? pendingMedia[segment.id] : [];
                      pend.forEach((m, idx) => list.push({ type: 'pending', id: null, src: (m.previewUrl || m.data), alt: m.altText || '', pendingIndex: idx }));
                      const items = list.slice(0, imagePolicy.maxCount || 4);
                      if (items.length === 0) return null;
                      return (
                        <div className='mt-2 grid grid-cols-2 gap-2'>
                          {items.map((it, idx) => (
                            <div key={idx} className='relative h-28 overflow-hidden rounded-xl border border-border bg-background-subtle'>
                              <img src={it.src} alt={it.alt || `Bild ${idx + 1}`} className='absolute inset-0 h-full w-full object-contain' />
                              <div className='pointer-events-none absolute left-1 top-1 z-10'>
                                <span className={`pointer-events-auto rounded-full px-2 py-1 text-[10px] font-semibold text-white ${it.alt ? 'bg-black/60' : 'bg-black/90 ring-1 ring-white/30'}`}
                                  title={it.alt ? 'Alt‑Text bearbeiten' : 'Alt‑Text hinzufügen'}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAltDialog(segment.id, it); }}
                                  role='button'
                                  tabIndex={0}
                                  aria-label={it.alt ? 'Alt‑Text bearbeiten' : 'Alt‑Text hinzufügen'}
                                >
                                  {it.alt ? 'ALT' : '+ ALT'}
                                </span>
                              </div>
                              <div className='absolute right-1 top-1 z-10 flex gap-1'>
                                <button type='button' className='rounded-full bg-black/60 px-2 py-1 text-white hover:bg-black/80' title='Bild entfernen'
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveMedia(segment.id, it); }} aria-label='Bild entfernen'>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div className='mt-2 text-xs text-foreground-muted'>Medien {getMediaCount(segment.id)}/{imagePolicy.maxCount}</div>
                    {segment.exceedsLimit ? (
                      <p className='mt-1 text-sm text-destructive'>
                        Zeichenlimit überschritten.
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
        mode="upload"
        accept={mediaDialog.accept}
        requireAltText={Boolean(imagePolicy.requireAltText)}
        maxBytes={imagePolicy.maxBytes}
        allowedMimes={imagePolicy.allowedMimes}
        onConfirm={(file, alt) => { const idx = mediaDialog.index; closeMediaDialog(); handleUploadMedia(idx, file, alt); }}
        onClose={closeMediaDialog}
      />
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
            const { selectionStart = source.length, selectionEnd = source.length } = ta
            const next = `${source.slice(0, selectionStart)}${value}${source.slice(selectionEnd)}`
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
                setUploadError({ open: true, message: `GIF zu groß. Maximal ${(imagePolicy.maxBytes / (1024*1024)).toFixed(0)} MB.` })
                return
              }
              const file = new File([blob], 'tenor.gif', { type: 'image/gif' })
              const idx = gifPicker.index
              if (typeof idx === 'number') {
                await handleUploadMedia(idx, file, '')
              }
            } catch (e) {
              setUploadError({ open: true, message: e?.message || 'GIF konnte nicht geladen werden.' })
            } finally {
              setGifPicker({ open: false, index: null })
            }
          }}
        />
      ) : null}
      {uploadError.open ? (
        <Modal
          open={uploadError.open}
          title="Upload fehlgeschlagen"
          onClose={() => setUploadError({ open: false, message: '' })}
          actions={<Button variant='primary' onClick={() => setUploadError({ open: false, message: '' })}>OK</Button>}
        >
          <p className='text-sm text-foreground'>{uploadError.message || 'Die Bilddatei konnte nicht hochgeladen werden.'}</p>
        </Modal>
      ) : null}

      {/* Info: Thread-Inhalt */}
      {infoThreadOpen ? (
        <Modal
          open={infoThreadOpen}
          title="Hinweis: Thread-Inhalt"
          onClose={() => setInfoThreadOpen(false)}
          actions={<Button variant='primary' onClick={() => setInfoThreadOpen(false)}>OK</Button>}
        >
          <div className='space-y-1.5 text-sm leading-snug text-foreground'>
            <p>
              Schreibe den gesamten Thread in ein Feld. Du kannst <code className='rounded bg-background-subtle px-1 py-0.5'>---</code> als Trenner nutzen
              oder mit <kbd className='rounded bg-background-subtle px-1 py-0.5'>STRG</kbd>+<kbd className='rounded bg-background-subtle px-1 py-0.5'>Enter</kbd> einen Trenner einfügen.
            </p>
            <p>
              Längere Abschnitte werden automatisch passend zerschnitten – wenn möglich am Satzende. Die Zeichenbegrenzung
              richtet sich nach den gewählten Plattformen (kleinster Wert gilt).
            </p>
            <p>
              Medien kannst du pro Skeet in der Vorschau hinzufügen. Maximal {imagePolicy?.maxCount ?? 4} Bilder pro Skeet.
            </p>
            <p>
              Die automatische Nummerierung (<code className='rounded bg-background-subtle px-1 py-0.5'>1/x</code>) kann im Formular ein- oder ausgeschaltet werden.
            </p>
          </div>
        </Modal>
      ) : null}

      {/* Info: Vorschau */}
      {infoPreviewOpen ? (
        <Modal
          open={infoPreviewOpen}
          title="Hinweis: Vorschau"
          onClose={() => setInfoPreviewOpen(false)}
          actions={<Button variant='primary' onClick={() => setInfoPreviewOpen(false)}>OK</Button>}
        >
          <div className='space-y-1.5 text-sm leading-snug text-foreground'>
            <p>
              Jeder Abschnitt bildet einen Skeet. Über die Buttons in der Vorschau kannst du pro Skeet Bilder oder GIFs hinzufügen.
            </p>
            <p>
              Bilder werden beim Speichern hochgeladen (max. {imagePolicy?.maxCount ?? 4} je Skeet).
            </p>
            <p>
              Der Zähler zeigt die aktuelle Zeichenanzahl je Skeet im Verhältnis zum Limit der ausgewählten Plattformen.
            </p>
            <p>
              Die automatische Nummerierung (<code className='rounded bg-background-subtle px-1 py-0.5'>1/x</code>) kann im Formular ein- oder ausgeschaltet werden.
            </p>
          </div>
        </Modal>
      ) : null}
      {altDialog.open && altDialog.item ? (
        <MediaDialog
          open={altDialog.open}
          title={altDialog.item.alt ? 'Alt‑Text bearbeiten' : 'Alt‑Text hinzufügen'}
          mode="alt"
          previewSrc={altDialog.item.src}
          initialAlt={altDialog.item.alt || ''}
          requireAltText={Boolean(imagePolicy.requireAltText)}
          onConfirm={async (_file, newAlt) => {
            const segIdx = altDialog.segmentIndex;
            const item = altDialog.item;
            try {
              if (item.type === 'existing') {
                const res = await fetch(`/api/media/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ altText: newAlt }) });
                if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Alt‑Text konnte nicht gespeichert werden.');
                setEditedMediaAlt((s) => ({ ...s, [item.id]: newAlt }));
              } else {
                setPendingMedia((s) => {
                  const arr = Array.isArray(s[segIdx]) ? s[segIdx].slice() : [];
                  if (arr[item.pendingIndex]) arr[item.pendingIndex] = { ...arr[item.pendingIndex], altText: newAlt };
                  return { ...s, [segIdx]: arr };
                });
              }
              toast.success({ title: 'Alt‑Text gespeichert' });
            } catch (e) {
              toast.error({ title: 'Fehler beim Alt‑Text', description: e?.message || 'Unbekannter Fehler' });
            } finally {
              closeAltDialog();
            }
          }}
          onClose={closeAltDialog}
        />
      ) : null}

      {/* Suggest move to Skeets if only one segment */}
      {singleSegDialog.open ? (
        <Modal
          open={singleSegDialog.open}
          title="Nur ein Segment erkannt"
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
                Trotzdem als Thread speichern
              </Button>
              <Button
                variant='primary'
                onClick={() => {
                  setSingleSegDialog({ open: false })
                  if (typeof onSuggestMoveToSkeets === 'function') {
                    const content = (previewSegments?.[0]?.raw || '').toString()
                    onSuggestMoveToSkeets(content)
                  } else {
                    toast.info({ title: 'Zum Skeetplaner wechseln', description: 'Bitte wechsle zum Skeetplaner und füge den Text ein.' })
                  }
                }}
              >
                Zum Skeetplaner wechseln
              </Button>
            </>
          }
        >
          <div className='space-y-2 text-sm text-foreground'>
            <p>Dieser Thread enthält nur ein Segment. Möchtest du stattdessen einen einzelnen Skeet planen?</p>
          </div>
        </Modal>
      ) : null}
    </form>
  )
}

export default ThreadForm
