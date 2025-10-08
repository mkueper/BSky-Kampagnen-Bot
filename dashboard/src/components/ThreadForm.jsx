import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../hooks/useToast'
import { useClientConfig } from '../hooks/useClientConfig'
import MediaDialog from './MediaDialog'
import Button from './ui/Button'

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

function formatDateTimeLocal (date) {
  const pad = value => String(value).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function getDefaultScheduledAt () {
  const now = new Date()
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    9,
    0,
    0,
    0
  )
  return formatDateTimeLocal(next)
}

function toDatetimeLocal (value) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    if (typeof value === 'string') {
      return value.slice(0, 16)
    }
    return ''
  }

  const offsetMinutes = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offsetMinutes * 60000)
  return local.toISOString().slice(0, 16)
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
  onCancel
}) {
  const [threadId, setThreadId] = useState(null)
  const [targetPlatforms, setTargetPlatforms] = useState(['bluesky'])
  const [source, setSource] = useState('')
  const [appendNumbering, setAppendNumbering] = useState(true)
  const [scheduledAt, setScheduledAt] = useState(() => getDefaultScheduledAt())
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef(null)
  const toast = useToast()
  const { config: clientConfig } = useClientConfig()
  const imagePolicy = clientConfig?.images || { maxCount: 4, maxBytes: 8 * 1024 * 1024, allowedMimes: ['image/jpeg','image/png','image/webp','image/gif'], requireAltText: false }

  const restoreFromThread = thread => {
    if (thread && thread.id) {
      setThreadId(thread.id)
      setTargetPlatforms(
        Array.isArray(thread.targetPlatforms) && thread.targetPlatforms.length
          ? thread.targetPlatforms
          : ['bluesky']
      )
      setAppendNumbering(Boolean(thread.appendNumbering ?? true))
      setScheduledAt(
        thread.scheduledAt ? toDatetimeLocal(thread.scheduledAt) : ''
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
      setTargetPlatforms(['bluesky'])
      setAppendNumbering(true)
      setScheduledAt(getDefaultScheduledAt())
      setSource('')
    }
  }

  useEffect(() => {
    if (loading) return
    if (initialThread && initialThread.id) {
      if (initialThread.id !== threadId) {
        restoreFromThread(initialThread)
      }
    } else if (!initialThread && threadId !== null) {
      restoreFromThread(null)
    }
  }, [initialThread, loading, threadId])

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
  const [mediaAlt, setMediaAlt] = useState({});
  const [mediaBusy, setMediaBusy] = useState({});
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
    setMediaBusy((s) => ({ ...s, [index]: true }));
    try {
      if (isEditMode && threadId) {
        // Direkt am Segment des existierenden Threads hochladen
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result;
            const res = await fetch(`/api/threads/${threadId}/segments/${index}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: file.name, mime: file.type, data: base64, altText: (altTextOverride ?? mediaAlt[index]) || '' }),
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
          } finally {
            setMediaBusy((s) => ({ ...s, [index]: false }));
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Entwurf: Temporär hochladen und Vorschau sofort anzeigen
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result;
            const res = await fetch('/api/uploads/temp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: file.name, mime: file.type, data: base64, altText: (altTextOverride ?? mediaAlt[index]) || '' }),
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
          } finally {
            setMediaBusy((s) => ({ ...s, [index]: false }));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (e) {
      setMediaBusy((s) => ({ ...s, [index]: false }));
    }
  };

  // Media Dialog State
  const [mediaDialog, setMediaDialog] = useState({ open: false, index: null, accept: 'image/*', title: 'Bild hinzufügen' })
  const openMediaDialog = (index, { gif = false } = {}) => {
    setMediaDialog({ open: true, index, accept: gif ? 'image/gif' : 'image/*', title: gif ? 'GIF hinzufügen' : 'Bild hinzufügen' })
  }
  const closeMediaDialog = () => setMediaDialog({ open: false, index: null, accept: 'image/*', title: 'Bild hinzufügen' })

  // Overlay helpers for existing media edits (without full reload)
  const [editedMediaAlt, setEditedMediaAlt] = useState({}); // key: mediaId => alt text
  const [removedMedia, setRemovedMedia] = useState({}); // key: mediaId => true

  const [altDialog, setAltDialog] = useState({ open: false, segmentIndex: null, item: null });
  const openAltDialog = (segmentIndex, item) => {
    setAltDialog({ open: true, segmentIndex, item });
  };
  const closeAltDialog = () => setAltDialog({ open: false, segmentIndex: null, item: null });
  const [uploadError, setUploadError] = useState({ open: false, message: '' });

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

  const handleTogglePlatform = platformId => {
    setTargetPlatforms(current => {
      if (current.includes(platformId)) {
        return current.filter(id => id !== platformId)
      }
      return [...current, platformId]
    })
  }

  const handleInsertSeparator = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const separator = textarea.selectionStart === 0 ? '---\n' : '\n---\n'
    const { selectionStart, selectionEnd, value } = textarea
    const nextValue = `${value.slice(
      0,
      selectionStart
    )}${separator}${value.slice(selectionEnd)}`
    setSource(nextValue)

    requestAnimationFrame(() => {
      const cursorPosition = selectionStart + separator.length
      textarea.selectionStart = cursorPosition
      textarea.selectionEnd = cursorPosition
      textarea.focus()
    })
  }

  const handleKeyDown = event => {
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
    return previewSegments.some(
      segment => segment.isEmpty || segment.exceedsLimit
    )
  }, [previewSegments, targetPlatforms.length])

  const showLoadingState = loading && !threadId

  if (showLoadingState) {
    return (
      <div className='space-y-6'>
        <p className='text-sm text-foreground-muted'>Thread wird geladen…</p>
      </div>
    )
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (saving || loading) return

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
        title: isEditMode ? 'Thread aktualisiert' : 'Thread gespeichert',
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

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='space-y-4'>
          <div className='rounded-3xl border border-border bg-background-elevated p-6 shadow-soft'>
            <header className='space-y-3'>
              <div>
                <h3 className='text-lg font-semibold'>Thread-Inhalt</h3>
                {/* <p className='text-sm text-foreground-muted'>
                  Schreibe den gesamten Thread in einem Feld. Du kannst `---`
                  oder STRG+Enter nutzen, um Skeets abzusetzen. Längere
                  Abschnitte werden automatisch passend zerschnitten – wenn
                  möglich am Satzende.
                </p> */}
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

            <div className='mt-4 space-y-3'>
              <fieldset className='space-y-2'>
                <legend className='text-sm font-semibold'>
                  Zielplattformen
                </legend>
                <div className='flex flex-wrap gap-3 text-sm'>
                  {PLATFORM_OPTIONS.map(option => {
                    const checked = targetPlatforms.includes(option.id)
                    return (
                      <label
                        key={option.id}
                        className='inline-flex items-center gap-2 rounded-full border border-border bg-background-subtle px-3 py-1 transition hover:bg-background'
                      >
                        <input
                          type='checkbox'
                          className='rounded border-border text-primary focus:ring-primary'
                          checked={checked}
                          onChange={() => handleTogglePlatform(option.id)}
                        />
                        <span>
                          {option.label}{' '}
                          <span className='text-xs text-foreground-muted'>
                            ({option.limit})
                          </span>
                        </span>
                      </label>
                    )
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
                  disabled={saving}
                >
                  Formular zurücksetzen
                </Button>
                <Button type='submit' variant='primary' disabled={hasValidationIssues || saving || loading}>
                  {saving
                    ? 'Speichern…'
                    : isEditMode
                    ? 'Thread aktualisieren'
                    : 'Thread speichern'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <aside className='space-y-4'>
          <div className='flex flex-col rounded-3xl border border-border bg-background-elevated p-6 shadow-soft lg:max-h-[calc(100vh-4rem)] lg:overflow-hidden'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold'>Vorschau</h3>
              <span className='text-xs uppercase tracking-[0.2em] text-foreground-muted'>
                {totalSegments} Skeet{totalSegments !== 1 ? 's' : ''}
              </span>
            </div>

            <div className='mt-4 flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-preview lg:min-h-0 lg:pr-3'>
              {previewSegments.map((segment, index) => {
                const hasIssue = segment.isEmpty || segment.exceedsLimit
                return (
                  <article
                    key={segment.id}
                    className={`rounded-2xl border ${
                      // hasIssue
                      // ? 'border-destructive bg-destructive/10'
                      // : 'border-border bg-background-subtle'
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
                          title={segment.isEmpty
                            ? 'Bitte zuerst Text für diesen Skeet eingeben'
                            : getMediaCount(segment.id) >= imagePolicy.maxCount
                              ? `Maximal ${imagePolicy.maxCount} Bilder je Skeet erreicht`
                              : 'Bild hinzufügen'}
                          disabled={getMediaCount(segment.id) >= imagePolicy.maxCount || segment.isEmpty}
                        >
                          🖼️
                        </button>
                        <button
                          type='button'
                          className='rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed'
                          onClick={() => openMediaDialog(segment.id, { gif: true })}
                          title={segment.isEmpty
                            ? 'Bitte zuerst Text für diesen Skeet eingeben'
                            : getMediaCount(segment.id) >= imagePolicy.maxCount
                              ? `Maximal ${imagePolicy.maxCount} Bilder je Skeet erreicht`
                              : 'GIF hinzufügen'}
                          disabled={getMediaCount(segment.id) >= imagePolicy.maxCount || segment.isEmpty}
                        >
                          GIF
                        </button>
                        <button type='button' className='rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-background-elevated' onClick={() => { /* Emoji Picker später */ }} title='Emoji einfügen'>😊</button>
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
                    {!isEditMode ? (
                      <p className='mt-1 text-xs text-foreground-muted'>Bilder werden beim Speichern hochgeladen (max. {imagePolicy.maxCount}/Segment).</p>
                    ) : null}
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
    </form>
  )
}

export default ThreadForm
