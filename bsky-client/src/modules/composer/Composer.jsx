import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, RichText, MediaDialog, SegmentMediaGrid } from '../shared'
import { GifPicker, EmojiPicker } from '@kampagnen-bot/media-pickers'
import { VideoIcon } from '@radix-ui/react-icons'
import { publishPost } from '../shared/api/bsky.js'
import { useClientConfig } from '../../hooks/useClientConfig.js'
import { useAppDispatch } from '../../context/AppContext.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const MAX_MEDIA_COUNT = 4
const MAX_GIF_BYTES = 8 * 1024 * 1024

export default function Composer ({ reply = null, quote = null, onCancelQuote, onSent, onCancel }) {
  const { t } = useTranslation()
  const { clientConfig } = useClientConfig()
  const dispatch = useAppDispatch()
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [dismissedPreviewUrl, setDismissedPreviewUrl] = useState('')
  const [pendingMedia, setPendingMedia] = useState([]) // [{ id, file, previewUrl, mime, altText }]
  const textareaRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const cursorRef = useRef({ start: 0, end: 0 })
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [tenorAvailable, setTenorAvailable] = useState(false)
  const [sending, setSending] = useState(false)
  const mediaPreviewsRef = useRef(new Set())

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
  }, [releasePreviewUrl])
  const mediaGridLabels = useMemo(
    () => ({
      imageAlt: index => `Bild ${index}`,
      removeTitle: 'Bild entfernen',
      removeAria: 'Bild entfernen'
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

  const firstUrl = useMemo(() => {
    try {
      const m = String(text || '').match(/https?:\/\/\S+/i)
      return m ? m[0] : ''
    } catch { return '' }
  }, [text])

  useEffect(() => {
    setPreview(null)
    setPreviewError('')
    setPreviewLoading(false)
    setPreviewUrl(firstUrl || '')
    setDismissedPreviewUrl('')
  }, [firstUrl])

  useEffect(() => {
    const url = String(previewUrl || '').trim()
    if (!url) return
    if (dismissedPreviewUrl && dismissedPreviewUrl === url) return
    let cancelled = false
    const controller = new AbortController()

    const load = async () => {
      setPreviewLoading(true)
      setPreviewError('')
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`, { signal: controller.signal })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Preview fehlgeschlagen (HTTP ${res.status})`)
        }
        const data = await res.json()
        if (cancelled) return
        setPreview({
          uri: data?.uri || url,
          title: data?.title || '',
          description: data?.description || '',
          image: data?.image || '',
          domain: data?.domain || ''
        })
        setPreviewError('')
      } catch (e) {
        if (cancelled) return
        if (e?.name === 'AbortError') return
        setPreview(null)
        setPreviewError(e?.message || 'Preview fehlgeschlagen')
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [dismissedPreviewUrl, previewUrl])

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
    const items = Array.from(event?.clipboardData?.items || [])
    if (items.length === 0) return

    const imageItem = items.find((item) => {
      if (!item || item.kind !== 'file') return false
      const type = String(item.type || '').toLowerCase()
      return type.startsWith('image/')
    })
    if (!imageItem) return

    const file = imageItem.getAsFile?.()
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

  function createMediaEntry (file, previewUrl) {
    return {
      id: (globalThis.crypto?.randomUUID?.() || `media-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      file,
      previewUrl,
      mime: file.type || 'application/octet-stream',
      altText: ''
    }
  }

  async function addMediaFile (file, previewOverride = '') {
    if (!file) throw new Error('Keine Datei ausgewählt')
    if (pendingMedia.length >= MAX_MEDIA_COUNT) {
      throw new Error(`Maximal ${MAX_MEDIA_COUNT} Medien je Post`)
    }
    const previewUrl = previewOverride || URL.createObjectURL(file)
    if (previewUrl.startsWith('blob:')) registerPreviewUrl(previewUrl)
    setPendingMedia((arr) => [...arr, createMediaEntry(file, previewUrl)])
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

  async function handleLocalFile (file) {
    if (!file) return
    setMessage('')
    try {
      await addMediaFile(file)
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
    const externalPayload = buildExternalPayload()
    if (sending) return
    setSending(true)
    try {
      const replyContext = reply && reply.uri && reply.cid
        ? (() => {
            const parent = { uri: reply.uri, cid: reply.cid }
            const rootReply = reply.raw?.post?.record?.reply?.root
            const root = rootReply && rootReply.uri && rootReply.cid ? rootReply : parent
            return { root, parent }
          })()
        : null
      const sent = await publishPost({
        text: content,
        mediaEntries: pendingMedia.map((entry) => ({ file: entry.file, altText: entry.altText || '' })),
        quote: quoteInfo ? { uri: quoteInfo.uri, cid: quoteInfo.cid } : null,
        external: externalPayload,
        reply: replyContext
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

  const handleCancelComposer = useCallback(() => {
    if (typeof onCancel === 'function') {
      onCancel({ hasContent })
    }
  }, [hasContent, onCancel])

  return (
    <form id='bsky-composer-form' onSubmit={handleSendNow} className='space-y-4' data-component='BskyComposer'>
      <label className='block text-sm font-medium'>Inhalt</label>
      {quoteInfo ? (
        <div className='rounded-2xl border border-border bg-background-subtle px-3 py-3 text-sm text-foreground'>
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
                <p className='text-xs text-foreground-muted'>Autorinformationen wurden nicht mitgeliefert.</p>
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
                title='Zitat entfernen'
              >
                Entfernen
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); updateCursorFromTextarea(e.target) }}
        onPaste={handleComposerPaste}
        onSelect={(e) => updateCursorFromTextarea(e.target)}
        onClick={(e) => updateCursorFromTextarea(e.target)}
        onKeyUp={(e) => updateCursorFromTextarea(e.target)}
        rows={6}
        className='max-h-48 w-full overflow-auto rounded-md border bg-background p-3'
        placeholder='Was möchtest du posten?'
      />
      {showMediaGrid ? (
        <SegmentMediaGrid
          items={pendingMediaItems}
          maxCount={MAX_MEDIA_COUNT}
          onRemove={handleRemovePendingMedia}
          labels={mediaGridLabels}
          className='mt-2'
        />
      ) : null}
      {showLinkPreview ? (
        <div className='relative mt-2 rounded-2xl border border-border bg-background-subtle p-3'>
          <button
            type='button'
            className='absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-sm text-foreground-muted hover:text-foreground'
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
                {previewLoading ? 'Lade…' : (previewError ? 'Kein Preview' : '')}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className='flex items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => setMediaDialogOpen(true)}
          disabled={mediaDisabled}
          title={mediaDisabled ? `Maximal ${MAX_MEDIA_COUNT} Medien je Skeet erreicht` : 'Bild oder GIF hochladen'}
        >
          <span className='text-base leading-none md:text-lg'>🖼️</span>
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
            <span>GIF</span>
          </Button>
        ) : null}
        <Button
          ref={emojiButtonRef}
          type='button'
          variant='outline'
          onClick={() => setEmojiPickerOpen((v) => !v)}
          title='Emoji auswählen'
          aria-expanded={emojiPickerOpen}
        >
          <span className='text-base leading-none md:text-lg'>😊</span>
        </Button>
      </div>
      <MediaDialog
        open={mediaDialogOpen}
        title='Bild hinzufügen'
        onClose={() => setMediaDialogOpen(false)}
        onConfirm={(file) => {
          setMediaDialogOpen(false)
          handleLocalFile(file)
        }}
      />
      <div className='flex items-center justify-between'>
        <button
          type='button'
          className='inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-background-elevated'
          title='Interaktions-Einstellungen'
          onClick={() => {
            // Platzhalter für künftigen Dialog
          }}
        >
          Jeder kann interagieren
        </button>
        {message ? (
          <span className='text-xs text-muted-foreground'>{message}</span>
        ) : null}
      </div>
      <div className='flex items-center justify-end gap-3'>
        {onCancel ? (
          <Button type='button' variant='secondary' onClick={handleCancelComposer} disabled={sending}>
            {t('compose.cancel', 'Abbrechen')}
          </Button>
        ) : null}
        <Button type='submit' variant='primary' disabled={sending}>
          {sending ? t('compose.thread.sending', 'Sende…') : t('compose.submit', 'Posten')}
        </Button>
      </div>
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
