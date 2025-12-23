import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, RichText, MediaDialog, SegmentMediaGrid } from '../shared'
import { GifPicker, EmojiPicker } from '@kampagnen-bot/media-pickers'
import { VideoIcon, ImageIcon, FaceIcon } from '@radix-ui/react-icons'
import { publishPost } from '../shared/api/bsky.js'
import { useClientConfig } from '../../hooks/useClientConfig.js'
import { useAppDispatch } from '../../context/AppContext.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { useInteractionSettingsControls } from './useInteractionSettingsControls.js'
import { calculateBlueskyPostLength } from '@bsky-kampagnen-bot/shared-logic'
import { fetchLinkPreviewMetadata } from './linkPreviewService.js'
import ReplyPreviewCard from './ReplyPreviewCard.jsx'
import { buildReplyContext, buildReplyInfo } from './replyUtils.js'

const MAX_MEDIA_COUNT = 4
const MAX_GIF_BYTES = 8 * 1024 * 1024
const POST_CHAR_LIMIT = 300
const PREVIEW_TYPING_DELAY = 600

function normalizePreviewUrl (value) {
  if (!value) return ''
  try {
    return new URL(String(value)).toString()
  } catch {
    return String(value || '').trim()
  }
}

function createEmptyAltDialogState () {
  return {
    open: false,
    pendingIndex: null,
    previewSrc: '',
    initialAlt: ''
  }
}

function detectUrlCandidate (text = '') {
  try {
    const input = String(text || '')
    const match = input.match(/https?:\/\/\S+/i)
    if (!match) return { url: '', ready: false }
    const url = match[0]
    const matchIndex = typeof match.index === 'number' ? match.index : input.indexOf(url)
    if (matchIndex < 0) return { url: '', ready: false }
    const endIndex = matchIndex + url.length
    const nextChar = input[endIndex] || ''
    const ready = Boolean(nextChar) && /\s/.test(nextChar)
    return { url, ready }
  } catch {
    return { url: '', ready: false }
  }
}

export default function Composer ({ reply = null, quote = null, onCancelQuote, onSent, onCancel, onConvertToThread = null }) {
  const { t } = useTranslation()
  const { clientConfig } = useClientConfig()
  const allowReplyPreview = clientConfig?.composer?.showReplyPreview !== false
  const requireAltText = clientConfig?.layout?.requireAltText === true
  const dispatch = useAppDispatch()
  const {
    interactionSettings,
    data: interactionData,
    summary: interactionSummary,
    openModal: openInteractionModal,
    reloadSettings
  } = useInteractionSettingsControls(t)
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [dismissedPreviewUrl, setDismissedPreviewUrl] = useState('')
  const [pendingMedia, setPendingMedia] = useState([]) // [{ id, file, previewUrl, mime, altText }]
  const [altDialog, setAltDialog] = useState(() => createEmptyAltDialogState())
  const textareaRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const cursorRef = useRef({ start: 0, end: 0 })
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [tenorAvailable, setTenorAvailable] = useState(false)
  const [sending, setSending] = useState(false)
  const mediaPreviewsRef = useRef(new Set())
  const previewDebounceRef = useRef(null)
  const previousUrlRef = useRef('')

  const registerPreviewUrl = useCallback((url) => {
    if (!url || !url.startsWith('blob:')) return
    mediaPreviewsRef.current.add(url)
  }, [])

  const releasePreviewUrl = useCallback((url) => {
    if (!url || !url.startsWith('blob:')) return
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* noop */
    }
    mediaPreviewsRef.current.delete(url)
  }, [])

  useEffect(() => {
    return () => {
      mediaPreviewsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* noop */
        }
      })
      mediaPreviewsRef.current.clear()
    }
  }, [])
  const focusRequestedRef = useRef(false)
  const quoteInfo = useMemo(() => {
    if (!quote || !quote.uri || !quote.cid) return null
    const author = quote.author || {}
    return {
      uri: String(quote.uri),
      cid: String(quote.cid),
      text: String(quote.text || ''),
      author: {
        displayName: author.displayName || author.handle || '',
        handle: author.handle || '',
        avatar: author.avatar || null
      }
    }
  }, [quote])
  const quoteInfoAuthorLabel = quoteInfo ? (quoteInfo.author.displayName || quoteInfo.author.handle || 'Unbekannt') : ''
  const quoteInfoAuthorMissing = quoteInfo ? !(quoteInfo.author.displayName || quoteInfo.author.handle) : false
  const replyInfo = useMemo(() => buildReplyInfo(reply), [reply])
  const pendingMediaItems = useMemo(
    () =>
      pendingMedia.map((item, idx) => ({
        type: 'pending',
        id: item?.id || `pending-${idx}`,
        tempId: item?.id || `pending-${idx}`,
        src: item?.previewUrl || '',
        alt: item?.altText || '',
        pendingIndex: idx
      })),
    [pendingMedia]
  )
  const handleRemovePendingMedia = useCallback(item => {
    if (typeof item?.pendingIndex !== 'number') return
    setPendingMedia(arr => {
      const target = arr[item.pendingIndex]
      if (target?.previewUrl) releasePreviewUrl(target.previewUrl)
      return arr.filter((_, idx) => idx !== item.pendingIndex)
    })
    setAltDialog(current => {
      if (typeof item?.pendingIndex === 'number' && current.pendingIndex === item.pendingIndex) {
        return createEmptyAltDialogState()
      }
      return current
    })
  }, [releasePreviewUrl])
  const handleOpenAltDialog = useCallback((item) => {
    if (typeof item?.pendingIndex !== 'number') return
    setAltDialog({
      open: true,
      pendingIndex: item.pendingIndex,
      previewSrc: item?.src || '',
      initialAlt: String(pendingMedia[item.pendingIndex]?.altText || '')
    })
  }, [pendingMedia])
  const closeAltDialog = useCallback(() => {
    setAltDialog(createEmptyAltDialogState())
  }, [])
  const handleConfirmAltDialog = useCallback((newAltText) => {
    setPendingMedia((prev) => {
      if (typeof altDialog.pendingIndex !== 'number') return prev
      return prev.map((entry, idx) => {
        if (idx !== altDialog.pendingIndex) return entry
        return { ...entry, altText: newAltText || '' }
      })
    })
    closeAltDialog()
  }, [altDialog.pendingIndex, closeAltDialog])
  const mediaGridLabels = useMemo(
    () => ({
      imageAlt: index => `Bild ${index}`,
      removeTitle: 'Bild entfernen',
      removeAria: 'Bild entfernen',
      altBadge: 'ALT',
      altAddBadge: '+ ALT',
      altEditTitle: 'Alt-Text bearbeiten',
      altAddTitle: 'Alt-Text bearbeiten'
    }),
    []
  )

  useEffect(() => {
    focusRequestedRef.current = false
    requestAnimationFrame(() => {
      try {
        textareaRef.current?.focus()
        focusRequestedRef.current = true
      } catch {
        /* ignore focus errors */
      }
    })
  }, [reply, quote])

  useEffect(() => {
    if (focusRequestedRef.current) return
    const timer = setTimeout(() => {
      try {
        textareaRef.current?.focus()
      } catch {
        /* ignore focus errors */
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const enabled = Boolean(clientConfig?.gifs?.tenorAvailable)
    const apiKey = String(clientConfig?.gifs?.tenorApiKey || '').trim()
    setTenorAvailable(Boolean(enabled && apiKey))
  }, [clientConfig?.gifs?.tenorAvailable, clientConfig?.gifs?.tenorApiKey])

  const tenorFetcher = useMemo(() => {
    const apiKey = String(clientConfig?.gifs?.tenorApiKey || '').trim()
    if (!apiKey) return null
    return async (endpoint, params) => {
      const safeEndpoint = String(endpoint || '').trim()
      if (!safeEndpoint) throw new Error('Tenor: endpoint fehlt.')
      const baseUrl = `https://tenor.googleapis.com/v2/${encodeURIComponent(safeEndpoint)}`
      const searchParams = new URLSearchParams(typeof params?.toString === 'function' ? params.toString() : '')
      searchParams.set('key', apiKey)
      searchParams.set('client_key', 'bsky-client')
      searchParams.set('media_filter', 'gif,tinygif,nanogif')
      const url = `${baseUrl}?${searchParams.toString()}`
      const res = await fetch(url)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Tenor Fehler: HTTP ${res.status} ${text}`.trim())
      }
      return res.json()
    }
  }, [clientConfig?.gifs?.tenorApiKey])

  const urlCandidate = useMemo(() => detectUrlCandidate(text), [text])
  const previewDismissed = useMemo(() => {
    if (!dismissedPreviewUrl) return false
    const normalizedDismissed = normalizePreviewUrl(dismissedPreviewUrl)
    if (!normalizedDismissed) return false
    const normalizedPreviewUri = normalizePreviewUrl(preview?.uri)
    const normalizedPreviewUrl = normalizePreviewUrl(previewUrl)
    return (
      (normalizedPreviewUri && normalizedPreviewUri === normalizedDismissed) ||
      (normalizedPreviewUrl && normalizedPreviewUrl === normalizedDismissed)
    )
  }, [dismissedPreviewUrl, preview?.uri, previewUrl])

  useEffect(() => {
    const normalized = urlCandidate.url || ''
    if (normalized !== previousUrlRef.current) {
      setDismissedPreviewUrl('')
      previousUrlRef.current = normalized
    }
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current)
      previewDebounceRef.current = null
    }
    if (!urlCandidate.ready) {
      setPreview(null)
      setPreviewError('')
      setPreviewLoading(false)
      setPreviewUrl('')
      return
    }
    previewDebounceRef.current = setTimeout(() => {
      setPreview(null)
      setPreviewError('')
      setPreviewLoading(false)
      setPreviewUrl(normalized)
    }, PREVIEW_TYPING_DELAY)
    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current)
        previewDebounceRef.current = null
      }
    }
  }, [urlCandidate.ready, urlCandidate.url])

  useEffect(() => {
    const url = String(previewUrl || '').trim()
    if (!url) {
      setPreview(null)
      setPreviewError('')
      setPreviewLoading(false)
      return
    }
    if (previewDismissed) {
      setPreview(null)
      setPreviewError('')
      setPreviewLoading(false)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    setPreviewError('')
    fetchLinkPreviewMetadata(url)
      .then((data) => {
        if (cancelled) return
        setPreview(data)
        setPreviewError('')
        setPreviewLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        if (error?.code === 'PREVIEW_UNAVAILABLE') {
          setPreviewError(
            t(
              'compose.previewUnavailableStandalone',
              'Link-Vorschau ist im Standalone-Modus derzeit nicht verfügbar.'
            )
          )
        } else if (error?.code === 'PREVIEW_TIMEOUT') {
          setPreviewError(
            t('compose.preview.timeout', 'Link-Vorschau hat zu lange gebraucht.')
          )
        } else {
          setPreviewError(
            error?.message || t('compose.preview.error', 'Link-Vorschau konnte nicht geladen werden.')
          )
        }
        setPreview(null)
        setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [previewDismissed, previewUrl, t])

  function updateCursorFromTextarea (target) {
    if (!target) return
    const start = target.selectionStart ?? target.value.length
    const end = target.selectionEnd ?? start
    cursorRef.current = { start, end }
  }

  function insertAtCursor (snippet) {
    if (!snippet) return
    setText((prev) => {
      const el = textareaRef.current
      const start = el?.selectionStart ?? cursorRef.current.start ?? prev.length
      const end = el?.selectionEnd ?? cursorRef.current.end ?? start
      const safeStart = clampSelection(start, prev.length)
      const safeEnd = clampSelection(end, prev.length)
      const before = prev.slice(0, safeStart)
      const after = prev.slice(safeEnd)
      const next = `${before}${snippet}${after}`
      requestAnimationFrame(() => {
        try {
          if (el) {
            el.focus()
            const pos = safeStart + String(snippet).length
            el.setSelectionRange(pos, pos)
            cursorRef.current = { start: pos, end: pos }
          }
        } catch {
          /* ignore focus errors */
        }
      })
      return next
    })
  }

  async function handleComposerPaste (event) {
    const clipboardData = event?.clipboardData
    if (!clipboardData) return
    const items = Array.from(clipboardData.items || [])
    const files = Array.from(clipboardData.files || [])
    const imageItem = items.find((item) => {
      if (!item || item.kind !== 'file') return false
      const type = String(item.type || '').toLowerCase()
      return type.startsWith('image/')
    })
    const directFile = imageItem?.getAsFile?.()
    const fallbackFile = files.find((file) => String(file?.type || '').toLowerCase().startsWith('image/'))
    const file = directFile || fallbackFile
    if (!file) return
    if (!String(file.type || '').toLowerCase().startsWith('image/')) return

    event.preventDefault()
    setMessage('')
    try {
      if (file.type === 'image/gif' && file.size > MAX_GIF_BYTES) {
        throw new Error(`GIF ist zu groß (max. ${Math.round(MAX_GIF_BYTES / 1024 / 1024)}MB).`)
      }
      await addMediaFile(file)
    } catch (e) {
      setMessage(e?.message || 'Bild konnte nicht eingefügt werden')
    }
  }

  function createMediaEntry (file, previewUrl, altText = '') {
    return {
      id: (globalThis.crypto?.randomUUID?.() || `media-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      file,
      previewUrl,
      mime: file.type || 'application/octet-stream',
      altText: altText || ''
    }
  }

  async function addMediaFile (file, previewOverride = '', altText = '') {
    if (!file) throw new Error('Keine Datei ausgewählt')
    if (pendingMedia.length >= MAX_MEDIA_COUNT) {
      throw new Error(`Maximal ${MAX_MEDIA_COUNT} Medien je Post`)
    }
    const previewUrl = previewOverride || URL.createObjectURL(file)
    if (previewUrl.startsWith('blob:')) registerPreviewUrl(previewUrl)
    setPendingMedia((arr) => [...arr, createMediaEntry(file, previewUrl, altText)])
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      try {
        el.focus()
      } catch {
        /* ignore focus errors */
      }
    })
  }

  async function handleLocalFile (file, altText = '') {
    if (!file) return
    setMessage('')
    try {
      await addMediaFile(file, '', altText)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (!el) {
          console.warn('[Composer] textareaRef missing after handleLocalFile')
          return
        }
        try {
          el.focus()
          //console.log('[Composer] focus set in handleLocalFile', { pending: pendingMedia.length })
        } catch (err) {
          console.warn('[Composer] focus failed in handleLocalFile', err)
        }
      })
    } catch (e) {
      console.warn('[Composer] handleLocalFile failed', e)
      setMessage(e?.message || 'Upload fehlgeschlagen')
    }
  }

  async function handleGifPick ({ id, downloadUrl }) {
    setGifPickerOpen(false)
    if (!downloadUrl) return
    setMessage('')
    try {
      if (pendingMedia.length >= MAX_MEDIA_COUNT) {
        throw new Error(`Maximal ${MAX_MEDIA_COUNT} Medien je Post`)
      }
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('GIF konnte nicht geladen werden.')
      }
      const blob = await response.blob()
      if (blob.size > MAX_GIF_BYTES) {
        throw new Error('GIF ist zu groß. Bitte ein kleineres GIF wählen.')
      }
      const file = new File([blob], `tenor-${id || 'gif'}.gif`, { type: blob.type || 'image/gif' })
      const objectUrl = URL.createObjectURL(blob)
      let added = false
      try {
        await addMediaFile(file, objectUrl)
        added = true
      } finally {
        if (!added && objectUrl.startsWith('blob:')) {
          releasePreviewUrl(objectUrl)
        }
      }
    } catch (e) {
      setMessage(e?.message || 'GIF konnte nicht geladen werden')
    } finally {
      requestAnimationFrame(() => {
        try {
          textareaRef.current?.focus()
        } catch {
          /* ignore focus errors */
        }
      })
    }
  }

  function buildExternalPayload () {
    if (!preview || !preview?.uri) return null
    if (pendingMedia.length > 0) return null
    if (previewDismissed) return null
    try {
      const normalizedUrl = new URL(preview.uri)
      return {
        uri: normalizedUrl.toString(),
        title: preview.title || preview.domain || normalizedUrl.hostname,
        description: preview.description || '',
        image: preview.image || '',
        domain: preview.domain || normalizedUrl.hostname.replace(/^www\./, '')
      }
    } catch {
      return null
    }
  }

  async function handleSendNow (e) {
    e.preventDefault()
    setMessage('')
    const content = String(text || '').trim()
    if (!content && !quoteInfo) {
      setMessage('Bitte Text eingeben oder ein Zitat verwenden.')
      return
    }
    if (missingAltText) {
      setMessage(t('compose.media.altRequired', 'Bitte ALT-Text für alle Medien hinzufügen.'))
      return
    }
    const externalPayload = buildExternalPayload()
    if (sending) return
    setSending(true)
    try {
      const replyContext = buildReplyContext(reply)
      const sent = await publishPost({
        text: content,
        mediaEntries: pendingMedia.map((entry) => ({ file: entry.file, altText: entry.altText || '' })),
        quote: quoteInfo ? { uri: quoteInfo.uri, cid: quoteInfo.cid } : null,
        external: externalPayload,
        reply: replyContext,
        interactions: interactionData
      })
      if (quoteInfo?.uri && sent?.uri) {
        dispatch({ type: 'SET_QUOTE_REPOST', payload: { targetUri: quoteInfo.uri, quoteUri: sent.uri } })
      }
      if (replyContext?.parent?.uri) {
        dispatch({ type: 'PATCH_POST_ENGAGEMENT', payload: { uri: replyContext.parent.uri, patch: { replyDelta: 1 } } })
      }
      pendingMedia.forEach((entry) => releasePreviewUrl(entry.previewUrl))
      setPendingMedia([])
      setText('')
      setMessage('Gesendet.')
      if (typeof onSent === 'function') onSent()
    } catch (err) {
      setMessage(err?.message || String(err))
    } finally {
      setSending(false)
    }
  }

  const mediaDisabled = pendingMedia.length >= MAX_MEDIA_COUNT
  const showMediaGrid = pendingMediaItems.length > 0
  const showLinkPreview = !showMediaGrid && Boolean(previewUrl) && (!dismissedPreviewUrl || dismissedPreviewUrl !== previewUrl)
  const hasContent = text.trim().length > 0 || pendingMedia.length > 0
  const characterCount = calculateBlueskyPostLength(text)
  const exceedsCharLimit = characterCount > POST_CHAR_LIMIT
  const missingAltText = requireAltText && pendingMedia.some((entry) => !String(entry?.altText || '').trim())
  const altTextMissingHint = missingAltText
    ? t('compose.media.altRequired', 'Bitte ALT-Text für alle Medien hinzufügen.')
    : ''

  const handleCancelComposer = useCallback(() => {
    if (typeof onCancel === 'function') {
      onCancel({ hasContent })
    }
  }, [hasContent, onCancel])

  const convertToThread = useCallback(() => {
    if (typeof onConvertToThread !== 'function') return
    onConvertToThread({
      text,
      media: pendingMedia.map((entry) => ({
        file: entry.file,
        altText: entry.altText || ''
      }))
    })
  }, [onConvertToThread, pendingMedia, text])

  const canRequestThread = Boolean(reply && typeof onConvertToThread === 'function')
  const convertButtonTitle = t('compose.thread.convertHint', 'Antwort in einen Thread umwandeln, um mehrere Posts zu senden.')

  return (
    <form id='bsky-composer-form' onSubmit={handleSendNow} className='space-y-4' data-component='BskyComposer'>
      {allowReplyPreview && replyInfo ? (
        <ReplyPreviewCard info={replyInfo} t={t} />
      ) : null}

      {quoteInfo ? (
        <div className={`rounded-2xl border border-border bg-background-subtle px-3 py-3 text-sm text-foreground ${(allowReplyPreview && replyInfo) ? 'mt-3' : ''}`}>
          <div className='flex items-start gap-3'>
            {quoteInfo.author.avatar ? (
              <img
                src={quoteInfo.author.avatar}
                alt=''
                className='h-10 w-10 shrink-0 rounded-full border border-border object-cover'
              />
            ) : (
              <div className='h-10 w-10 shrink-0 rounded-full border border-border bg-background-subtle' />
            )}
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold text-foreground'>
                {quoteInfoAuthorLabel}
              </p>
              {quoteInfoAuthorMissing ? (
                <p className='text-xs text-foreground-muted'>
                  {t('compose.context.authorMissing', 'Autorinformationen wurden nicht mitgeliefert.')}
                </p>
              ) : null}
              {quoteInfo.author.handle ? (
                <p className='truncate text-xs text-foreground-muted'>@{quoteInfo.author.handle}</p>
              ) : null}
              {quoteInfo.text ? (
                <div className='mt-2 text-sm text-foreground'>
                  <RichText
                    text={quoteInfo.text}
                    className='whitespace-pre-wrap break-words text-sm text-foreground'
                    hashtagContext={{ authorHandle: quoteInfo?.author?.handle }}
                  />
                </div>
              ) : null}
            </div>
            {onCancelQuote ? (
              <button
                type='button'
                className='ml-2 rounded-full border border-border px-2 py-1 text-xs text-foreground-muted hover:text-foreground'
                onClick={onCancelQuote}
                title={t('compose.context.quoteRemove', 'Zitat entfernen')}
              >
                {t('compose.context.quoteRemove', 'Zitat entfernen')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className='grid min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        <div className='flex min-h-0 flex-col rounded-3xl border border-border bg-background p-4 shadow-soft sm:p-6'>
          <label className='text-sm font-medium text-foreground'>Inhalt</label>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); updateCursorFromTextarea(e.target) }}
            onPaste={handleComposerPaste}
            onSelect={(e) => updateCursorFromTextarea(e.target)}
            onClick={(e) => updateCursorFromTextarea(e.target)}
            onKeyUp={(e) => updateCursorFromTextarea(e.target)}
            rows={6}
            className='mt-2 h-full min-h-[12rem] flex-1 overflow-auto rounded-2xl border border-border bg-background-subtle p-4 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'
            placeholder='Was möchtest du posten?'
          />
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setMediaDialogOpen(true)}
              disabled={mediaDisabled}
              title={mediaDisabled ? `Maximal ${MAX_MEDIA_COUNT} Medien je Skeet erreicht` : 'Bild oder GIF hochladen'}
              aria-label={mediaDisabled ? 'Medienlimit erreicht' : 'Bild oder GIF hochladen'}
            >
              <ImageIcon className='h-4 w-4' aria-hidden='true' />
            </Button>
            {tenorAvailable ? (
              <Button
                type='button'
                variant='outline'
                disabled={mediaDisabled}
                onClick={() => setGifPickerOpen(true)}
                title={mediaDisabled ? `Maximal ${MAX_MEDIA_COUNT} Medien je Skeet erreicht` : 'GIF aus Tenor einfügen'}
              >
                <VideoIcon className='h-4 w-4' aria-hidden='true' />
                <span className='sr-only'>GIF</span>
              </Button>
            ) : null}
            <Button
              ref={emojiButtonRef}
              type='button'
              variant='outline'
              onClick={() => setEmojiPickerOpen((v) => !v)}
              title='Emoji auswählen'
              aria-expanded={emojiPickerOpen}
              aria-label='Emoji auswählen'
            >
              <FaceIcon className='h-4 w-4' aria-hidden='true' />
            </Button>
          </div>
        </div>

        <section className='flex min-h-0 flex-col rounded-3xl border border-border bg-background p-4 shadow-soft sm:p-6'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-semibold text-foreground'>Vorschau</h4>
            <span
              className={`text-xs font-medium ${
                exceedsCharLimit
                  ? 'text-destructive'
                  : characterCount > POST_CHAR_LIMIT * 0.9
                    ? 'text-amber-500'
                    : 'text-foreground-muted'
              }`}
            >
              {characterCount}/{POST_CHAR_LIMIT}
            </span>
          </div>
          <article className='mt-4 min-h-[16rem] rounded-2xl border border-border bg-background-subtle p-4'>
            {text.trim() ? (
              <RichText
                text={text}
                className='whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground'
              />
            ) : (
              <p className='text-sm text-foreground-muted'>
                {t('compose.preview.placeholder', 'Dein Text erscheint hier.')}
              </p>
            )}
            {showMediaGrid ? (
              <SegmentMediaGrid
                items={pendingMediaItems}
                maxCount={MAX_MEDIA_COUNT}
                onRemove={handleRemovePendingMedia}
                onEditAlt={handleOpenAltDialog}
                labels={mediaGridLabels}
                className='mt-4'
              />
            ) : null}
            {showLinkPreview ? (
              <div className='relative mt-4 rounded-2xl border border-border bg-background p-3'>
                <button
                  type='button'
                  className='absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background-subtle text-sm text-foreground-muted hover:text-foreground'
                  title='Link-Vorschau entfernen'
                  onClick={() => setDismissedPreviewUrl(previewUrl)}
                >
                  ×
                </button>
                <div className='flex gap-3 pr-8'>
                  {preview?.image ? (
                    <img
                      src={preview.image}
                      alt=''
                      className='h-16 w-16 shrink-0 rounded-xl border border-border object-cover'
                      loading='lazy'
                    />
                  ) : (
                    <div className='h-16 w-16 shrink-0 rounded-xl border border-border bg-background' />
                  )}
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-semibold text-foreground'>{preview?.title || previewUrl}</p>
                    {preview?.description ? (
                      <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{preview.description}</p>
                    ) : null}
                    <p className='mt-1 text-xs text-foreground-subtle'>{preview?.domain || new URL(previewUrl).hostname.replace(/^www\./, '')}</p>
                <div className='text-xs text-foreground-muted'>
                  {previewLoading ? t('compose.preview.loading', 'Lade Vorschau…') : (previewError || '')}
                </div>
                  </div>
                </div>
              </div>
            ) : null}
            {!text.trim() && !showMediaGrid && !showLinkPreview ? (
              <p className='mt-4 text-xs text-foreground-muted'>
                {t('compose.preview.emptyHint', 'Füge Text, Medien oder einen Link hinzu, um die Vorschau zu sehen.')}
              </p>
            ) : null}
          </article>
        </section>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3'>
          <button
            type='button'
            className='inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-background-elevated'
            title={t('compose.interactions.buttonTitle', 'Interaktionen konfigurieren')}
            onClick={openInteractionModal}
            disabled={interactionSettings?.loading}
          >
            {interactionSettings?.loading
              ? t('compose.interactions.loading', 'Lade Interaktionseinstellungen…')
              : interactionSummary}
          </button>
          {interactionSettings?.error && !interactionSettings?.modalOpen ? (
            <button
              type='button'
              className='text-xs font-semibold text-primary hover:underline'
              onClick={reloadSettings}
            >
              {t('compose.interactions.retry', 'Erneut versuchen')}
            </button>
          ) : null}
          {altTextMissingHint ? (
            <span className='text-xs text-destructive'>{altTextMissingHint}</span>
          ) : null}
          {message ? (
            <span className='text-xs text-muted-foreground'>{message}</span>
          ) : null}
        </div>
        <div className='flex items-center gap-3'>
          {canRequestThread ? (
            <Button
              type='button'
              variant='secondary'
              onClick={convertToThread}
              disabled={sending}
              title={convertButtonTitle}
            >
              {t('compose.thread.convertButton', 'In Thread umwandeln')}
            </Button>
          ) : null}
          {onCancel ? (
            <Button type='button' variant='secondary' onClick={handleCancelComposer} disabled={sending}>
              {t('compose.cancel', 'Abbrechen')}
            </Button>
          ) : null}
          <Button type='submit' variant='primary' disabled={sending || missingAltText}>
            {sending ? t('compose.thread.sending', 'Sende…') : t('compose.submit', 'Posten')}
          </Button>
        </div>
      </div>
      <MediaDialog
        open={mediaDialogOpen}
        title='Bild hinzufügen'
        requireAltText={requireAltText}
        onClose={() => setMediaDialogOpen(false)}
        onConfirm={(file, altText) => {
          setMediaDialogOpen(false)
          handleLocalFile(file, altText || '')
        }}
      />
      <MediaDialog
        open={altDialog.open}
        mode='alt'
        title={altDialog.initialAlt ? 'Alt-Text bearbeiten' : 'Alt-Text bearbeiten'}
        previewSrc={altDialog.previewSrc}
        initialAlt={altDialog.initialAlt}
        requireAltText={requireAltText}
        onConfirm={(_, altText) => handleConfirmAltDialog(altText || '')}
        onClose={closeAltDialog}
      />
      {tenorAvailable ? (
        <GifPicker
          open={gifPickerOpen}
          styles={{ panel: { width: '70vw', maxWidth: '1200px' }}}
          onClose={() => setGifPickerOpen(false)}
          onPick={handleGifPick}
          maxBytes={MAX_GIF_BYTES}
          fetcher={tenorFetcher || undefined}
        />
      ) : null}
      <EmojiPicker
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        anchorRef={emojiButtonRef}
        onPick={(emoji) => {
          const value = emoji?.native || emoji?.shortcodes || emoji?.id
          if (!value) return
          insertAtCursor(value)
          setEmojiPickerOpen(false)
        }}
      />
    </form>
  )
}

function clampSelection (pos, length) {
  if (!Number.isFinite(pos)) return length
  if (pos < 0) return 0
  if (pos > length) return length
  return pos
}
