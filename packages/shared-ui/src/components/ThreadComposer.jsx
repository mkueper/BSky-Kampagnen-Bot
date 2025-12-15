import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import PropTypes from 'prop-types'
import { FaceIcon, ImageIcon, VideoIcon } from '@radix-ui/react-icons'
import { EmojiPicker, GifPicker } from '@kampagnen-bot/media-pickers'

import Button from './Button.jsx'
import MediaDialog from './MediaDialog.jsx'
import SegmentMediaGrid from './SegmentMediaGrid.jsx'
import {
  splitThread,
  splitThreadSource,
  buildSegmentMediaItems,
} from '@bsky-kampagnen-bot/shared-logic'

const MAX_THREAD_SEGMENTS = 25
const DEFAULT_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]
const DEFAULT_GIF_PICKER_STYLES = {
  panel: { width: '70vw', maxWidth: '1200px' },
}

const URL_REGEX = /https?:\/\/\S+/i

const defaultLabels = {
  title: 'Thread content',
  hint:
    'Ctrl+Enter inserts a separator. Long sections will be split automatically.',
  placeholder: 'Example:\nIntro...\n---\nNext post...',
  numberingToggle: 'Append automatic numbering (1/x)',
  previewTitle: 'Preview',
  postsCounter: (count) => `${count} post${count === 1 ? '' : 's'}`,
  segmentLabel: (index) => `Post ${index}`,
  charCount: (count, max) => (max ? `${count} / ${max}` : `${count}`),
  limitExceeded: 'Character limit exceeded.',
  emptySegment: '(no content)',
  submitLabel: 'Submit',
  previewPlaceholder: 'Additional posts will appear here once your thread grows.',
  mediaCounter: (count, max) => `Media ${count}/${max}`,
  addImageTitle: 'Add image',
  addGifTitle: 'Add GIF',
  gifUnavailable: 'GIF picker unavailable',
  addImageModalTitle: 'Add media',
  addGifLimitReached: (max) => `Maximum ${max} media items per post reached.`,
  gifTooLarge: (maxMb) => `GIF too large (max. ${maxMb}MB).`,
  gifLoadFailed: 'GIF could not be loaded.',
  altAddTitle: 'Add alt text',
  altEditTitle: 'Edit alt text',
  threadLimitWarning: (limit) => `Maximum ${limit} posts per thread.`,
}

function findFirstUrl(text = '') {
  try {
    const match = String(text || '').match(URL_REGEX)
    return match ? match[0] : ''
  } catch {
    return ''
  }
}

function mergeLabels(labels) {
  if (!labels) return defaultLabels
  return {
    ...defaultLabels,
    ...labels,
  }
}

function createMediaId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `media-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
}

function normalizeSegmentsForPreview(previewSegments, pendingMedia) {
  return previewSegments.map((segment) => {
    const mediaEntries = Array.isArray(pendingMedia?.[segment.id])
      ? pendingMedia[segment.id].map((entry) => ({
          file: entry.file,
          altText: entry.altText || '',
        }))
      : []
    return {
      ...segment,
      mediaEntries,
    }
  })
}

export default function ThreadComposer({
  value,
  onChange,
  maxLength = null,
  hardBreakMarker = '---',
  appendNumbering: controlledNumbering,
  onToggleNumbering,
  disabled = false,
  placeholder,
  onSubmit,
  submitLabel,
  labels,
  className = '',
  onSegmentsChange,
  secondaryAction = null,
  mediaMaxPerSegment = 4,
  mediaMaxBytes = 8 * 1024 * 1024,
  mediaAllowedMimes = DEFAULT_ALLOWED_MIMES,
  mediaRequireAltText = false,
  gifPickerEnabled = false,
  gifPickerFetcher = null,
  gifPickerMaxBytes = 8 * 1024 * 1024,
  gifPickerStyles = DEFAULT_GIF_PICKER_STYLES,
  footerAside = null,
}) {
  const mergedLabels = mergeLabels(labels)
  const [internalNumbering, setInternalNumbering] = useState(true)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [mediaDialog, setMediaDialog] = useState({ open: false, segmentId: null })
  const [gifPickerState, setGifPickerState] = useState({
    open: false,
    segmentId: null,
  })
  const [altDialog, setAltDialog] = useState({
    open: false,
    segmentId: null,
    pendingIndex: null,
    previewSrc: '',
    initialAlt: '',
  })
  const [pendingMedia, setPendingMedia] = useState({})
  const [mediaMessage, setMediaMessage] = useState('')
  const [dismissedPreviewUrls, setDismissedPreviewUrls] = useState({})
  const resolvedAppendNumbering =
    typeof controlledNumbering === 'boolean'
      ? controlledNumbering
      : internalNumbering
  const textareaRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const previewUrlsRef = useRef(new Set())
  const lastCursorSegmentRef = useRef(0)
  const gifFetchControllerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (gifFetchControllerRef.current) {
        try { gifFetchControllerRef.current.abort() } catch (e) { /* ignore */ }
        gifFetchControllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (typeof controlledNumbering === 'boolean') {
      setInternalNumbering(controlledNumbering)
    }
  }, [controlledNumbering])

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* ignore */
        }
      })
      previewUrlsRef.current.clear()
    }
  }, [])

  const registerPreviewUrl = useCallback((url) => {
    if (!url?.startsWith?.('blob:')) return
    previewUrlsRef.current.add(url)
  }, [])

  const releasePreviewUrl = useCallback((url) => {
    if (!url?.startsWith?.('blob:')) return
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
    previewUrlsRef.current.delete(url)
  }, [])

  const {
    previewSegments,
    totalSegments,
    rawToEffectiveStartIndex,
    effectiveOffsets,
  } = useMemo(
    () =>
      splitThread({
        text: value || '',
        limit: maxLength,
        appendNumbering: resolvedAppendNumbering,
        hardBreakMarker,
      }),
    [value, maxLength, resolvedAppendNumbering, hardBreakMarker],
  )

  const previewWithMedia = useMemo(
    () => normalizeSegmentsForPreview(previewSegments, pendingMedia),
    [pendingMedia, previewSegments],
  )

  const mediaItemsBySegment = useMemo(() => {
    const map = new Map()
    previewWithMedia.forEach((segment) => {
      map.set(
        segment.id,
        buildSegmentMediaItems({
          segmentIndex: segment.id,
          pendingMediaMap: pendingMedia,
        }),
      )
    })
    return map
  }, [pendingMedia, previewWithMedia])

  useEffect(() => {
    if (typeof onSegmentsChange === 'function') {
      onSegmentsChange(previewWithMedia)
    }
  }, [previewWithMedia, onSegmentsChange])

  useEffect(() => {
    setPendingMedia((prev) => {
      const activeIds = new Set(previewSegments.map((segment) => segment.id))
      let changed = false
      const next = {}
      for (const [key, list] of Object.entries(prev)) {
        const numericKey = Number(key)
        if (activeIds.has(numericKey)) {
          next[key] = list
        } else if (Array.isArray(list)) {
          list.forEach((entry) => releasePreviewUrl(entry?.previewUrl))
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [previewSegments, releasePreviewUrl])

  useEffect(() => {
    setDismissedPreviewUrls((prev) => {
      let changed = false
      const next = {}
      previewSegments.forEach((segment) => {
        const url = findFirstUrl(segment.raw) || ''
        const prevValue = prev[segment.id]
        if (prevValue && prevValue === url) {
          next[segment.id] = prevValue
        } else if (prevValue && prevValue !== url) {
          changed = true
        }
      })
      if (
        !changed &&
        Object.keys(prev).length === Object.keys(next).length
      ) {
        return prev
      }
      return next
    })
  }, [previewSegments])

  const hasPending = useMemo(
    () =>
      Object.values(pendingMedia).some(
        (arr) => Array.isArray(arr) && arr.length > 0,
      ),
    [pendingMedia],
  )

  const insertAtCursor = useCallback(
    (snippet) => {
      if (!snippet) return
      const textarea = textareaRef.current
      const baseValue = value || ''
      if (!textarea) {
        onChange(`${baseValue}${snippet}`)
        return
      }
      const selectionStart =
        typeof textarea.selectionStart === 'number'
          ? textarea.selectionStart
          : baseValue.length
      const selectionEnd =
        typeof textarea.selectionEnd === 'number'
          ? textarea.selectionEnd
          : baseValue.length
      const before = baseValue.slice(0, selectionStart)
      const after = baseValue.slice(selectionEnd)
      const nextValue = `${before}${snippet}${after}`
      onChange(nextValue)
      requestAnimationFrame(() => {
        try {
          const cursorPosition = before.length + snippet.length
          textarea.selectionStart = cursorPosition
          textarea.selectionEnd = cursorPosition
          textarea.focus()
        } catch {
          /* ignore cursor errors */
        }
      })
    },
    [onChange, value],
  )

  const getSegmentIdForCursor = useCallback(
    (cursorPos) => {
      const normalized = String(value || '').replace(/\r\n/g, '\n')
      const safePos = Math.max(
        0,
        Math.min(Number.isFinite(cursorPos) ? cursorPos : normalized.length, normalized.length),
      )
      const upToCursor = normalized.slice(0, safePos)
      const partialSegments = splitThreadSource(upToCursor, hardBreakMarker)
      const rawIndex = Math.max(0, partialSegments.length - 1)
      const offsetWithinRaw = partialSegments[rawIndex]
        ? partialSegments[rawIndex].length
        : 0
      const start = rawToEffectiveStartIndex[rawIndex] ?? 0
      const end =
        rawIndex + 1 < rawToEffectiveStartIndex.length
          ? rawToEffectiveStartIndex[rawIndex + 1]
          : previewSegments.length
      if (start >= end) {
        return start
      }
      let candidate = start
      for (let i = start; i < end; i++) {
        const currentOffset = effectiveOffsets[i]?.offsetInRaw ?? 0
        const nextOffset =
          i + 1 < end
            ? effectiveOffsets[i + 1]?.offsetInRaw ?? Infinity
            : Infinity
        if (offsetWithinRaw >= currentOffset && offsetWithinRaw < nextOffset) {
          candidate = i
          break
        }
        candidate = i
      }
      return candidate
    },
    [
      effectiveOffsets,
      hardBreakMarker,
      previewSegments.length,
      rawToEffectiveStartIndex,
      value,
    ],
  )

  const rememberCursorSegment = useCallback(
    (target) => {
      if (!target) return
      const pos =
        typeof target.selectionStart === 'number'
          ? target.selectionStart
          : (value || '').length
      lastCursorSegmentRef.current = getSegmentIdForCursor(pos)
    },
    [getSegmentIdForCursor, value],
  )

  const handleInsertSeparator = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const {
      selectionStart = value.length,
      selectionEnd = value.length,
    } = textarea
    const prevChar = selectionStart > 0 ? value.charAt(selectionStart - 1) : ''
    const nextChar =
      selectionEnd < value.length ? value.charAt(selectionEnd) : ''

    const needsPrefixNl = selectionStart > 0 && prevChar !== '\n'
    const needsSuffixNl = nextChar !== '\n'
    const separator = `${needsPrefixNl ? '\n' : ''}${hardBreakMarker}${
      needsSuffixNl ? '\n' : ''
    }`

    insertAtCursor(separator)
  }, [value, hardBreakMarker, insertAtCursor])

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        handleInsertSeparator()
      }
    },
    [handleInsertSeparator],
  )

  const handleToggleNumbering = () => {
    if (typeof onToggleNumbering === 'function') {
      onToggleNumbering(!resolvedAppendNumbering)
      return
    }
    setInternalNumbering((prev) => !prev)
  }

  const getPendingCount = useCallback(
    (segmentId) => {
      const direct = pendingMedia[segmentId]
      if (Array.isArray(direct)) return direct.length
      const asString = pendingMedia[String(segmentId)]
      if (Array.isArray(asString)) return asString.length
      return 0
    },
    [pendingMedia],
  )

  const canAddMedia = useCallback(
    (segmentId) => {
      if (!Number.isFinite(mediaMaxPerSegment)) return true
      return getPendingCount(segmentId) < mediaMaxPerSegment
    },
    [getPendingCount, mediaMaxPerSegment],
  )

  const appendMediaEntry = useCallback((segmentId, entry) => {
    setPendingMedia((prev) => {
      const existing = Array.isArray(prev[segmentId]) ? prev[segmentId] : []
      const nextList = [...existing, entry]
      return {
        ...prev,
        [segmentId]: nextList,
      }
    })
  }, [])

  const handleAddLocalFile = useCallback(
    (segmentId, file, altText = '', previewOverride = '') => {
      if (!file || segmentId === null || segmentId === undefined) return false
      setMediaMessage('')
      if (!canAddMedia(segmentId)) {
        setMediaMessage(
          mergedLabels.addGifLimitReached(mediaMaxPerSegment || 0),
        )
        return false
      }

      const previewUrl = previewOverride || URL.createObjectURL(file)
      registerPreviewUrl(previewUrl)
      appendMediaEntry(segmentId, {
        tempId: createMediaId(),
        file,
        previewUrl,
        altText: altText || '',
      })
      return true
    },
    [
      appendMediaEntry,
      canAddMedia,
      mediaMaxPerSegment,
      mergedLabels,
      registerPreviewUrl,
    ],
  )

  const handleRemoveMedia = useCallback(
    (segmentId, item) => {
      if (typeof item?.pendingIndex !== 'number') return
      setPendingMedia((prev) => {
        const list = Array.isArray(prev[segmentId]) ? prev[segmentId].slice() : []
        const target = list[item.pendingIndex]
        if (!target) return prev
        if (target.previewUrl) releasePreviewUrl(target.previewUrl)
        list.splice(item.pendingIndex, 1)
        return {
          ...prev,
          [segmentId]: list,
        }
      })
    },
    [releasePreviewUrl],
  )

  const handleOpenAltDialog = useCallback((segmentId, item) => {
    if (!item || typeof item.pendingIndex !== 'number') return
    setAltDialog({
      open: true,
      segmentId,
      pendingIndex: item.pendingIndex,
      previewSrc: item.src || '',
      initialAlt: item.alt || '',
    })
  }, [])

  const handleConfirmAltDialog = useCallback(
    (_file, newAlt) => {
      const { segmentId, pendingIndex } = altDialog
      setPendingMedia((prev) => {
        const list = Array.isArray(prev[segmentId]) ? prev[segmentId].slice() : []
        if (!list[pendingIndex]) return prev
        list[pendingIndex] = {
          ...list[pendingIndex],
          altText: newAlt || '',
        }
        return {
          ...prev,
          [segmentId]: list,
        }
      })
      setAltDialog({
        open: false,
        segmentId: null,
        pendingIndex: null,
        previewSrc: '',
        initialAlt: '',
      })
    },
    [altDialog],
  )

  const handleGifPick = useCallback(
    async (segmentId, payload) => {
      setGifPickerState({ open: false, segmentId: null })
      if (!segmentId && segmentId !== 0) return
      if (!payload?.downloadUrl) return
      if (!canAddMedia(segmentId)) {
        setMediaMessage(
          mergedLabels.addGifLimitReached(mediaMaxPerSegment || 0),
        )
        return
      }
      setMediaMessage('')
      let controller = null
      try {
        controller = new AbortController()
        gifFetchControllerRef.current = controller
        const response = await fetch(payload.downloadUrl, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(mergedLabels.gifLoadFailed)
        }
        const blob = await response.blob()
        if (
          Number.isFinite(gifPickerMaxBytes) &&
          blob.size > gifPickerMaxBytes
        ) {
          const mb = Math.round(gifPickerMaxBytes / (1024 * 1024))
          throw new Error(mergedLabels.gifTooLarge(mb))
        }
        const file = new File(
          [blob],
          `tenor-${payload.id || Date.now()}.gif`,
          { type: blob.type || 'image/gif' },
        )
        const objectUrl = URL.createObjectURL(blob)
        let added = false
        try {
          added = handleAddLocalFile(segmentId, file, '', objectUrl)
        } finally {
          if (!added) {
            releasePreviewUrl(objectUrl)
          }
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          // fetch was aborted; ignore
        } else {
          setMediaMessage(error?.message || mergedLabels.gifLoadFailed)
        }
      } finally {
        if (gifFetchControllerRef.current === controller)
          gifFetchControllerRef.current = null
      }
    },
    [
      canAddMedia,
      gifPickerMaxBytes,
      handleAddLocalFile,
      mediaMaxPerSegment,
      mergedLabels,
      releasePreviewUrl,
    ],
  )

  const handleTextareaPaste = useCallback(
    (event) => {
      if (disabled) return
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
      const fallbackFile = files.find((file) =>
        String(file?.type || '').toLowerCase().startsWith('image/'),
      )
      const file = directFile || fallbackFile
      if (!file || !String(file.type || '').toLowerCase().startsWith('image/')) {
        return
      }
      event.preventDefault()
      rememberCursorSegment(event.target)
      const targetSegment = lastCursorSegmentRef.current ?? 0
      try {
        if (
          file.type === 'image/gif' &&
          Number.isFinite(gifPickerMaxBytes) &&
          file.size > gifPickerMaxBytes
        ) {
          const mb = Math.max(1, Math.round(gifPickerMaxBytes / (1024 * 1024)))
          throw new Error(mergedLabels.gifTooLarge(mb))
        }
        const added = handleAddLocalFile(targetSegment, file)
        if (!added) {
          setMediaMessage(
            mergedLabels.addGifLimitReached(mediaMaxPerSegment || 0),
          )
        }
      } catch (error) {
        setMediaMessage(error?.message || mergedLabels.gifLoadFailed)
      }
    },
    [
      disabled,
      gifPickerMaxBytes,
      handleAddLocalFile,
      mediaMaxPerSegment,
      mergedLabels,
      rememberCursorSegment,
      setMediaMessage,
    ],
  )

  const handleTextareaChange = useCallback(
    (event) => {
      onChange(event.target.value)
      rememberCursorSegment(event.target)
    },
    [onChange, rememberCursorSegment],
  )

  const handleSelectionUpdate = useCallback(
    (event) => {
      rememberCursorSegment(event.target)
    },
    [rememberCursorSegment],
  )

  const exceedsThreadLimit = totalSegments > MAX_THREAD_SEGMENTS

  const submitDisabled =
    (!value?.trim() && !hasPending) ||
    previewSegments.every(
      (segment) => segment.isEmpty && !getPendingCount(segment.id),
    ) ||
    disabled ||
    exceedsThreadLimit

  const effectiveSubmitLabel = submitLabel || mergedLabels.submitLabel

  const mediaGridLabels = useMemo(
    () => ({
      imageAlt: (index) => `Image ${index}`,
      altAddTitle: mergedLabels.altAddTitle,
      altEditTitle: mergedLabels.altEditTitle,
      altBadge: 'ALT',
      altAddBadge: '+ ALT',
      removeTitle: 'Remove image',
      removeAria: 'Remove image',
    }),
    [mergedLabels.altAddTitle, mergedLabels.altEditTitle],
  )

  const handleSubmit = useCallback(() => {
    if (typeof onSubmit === 'function') {
      onSubmit(previewWithMedia)
    }
  }, [onSubmit, previewWithMedia])

  const segmentFirstUrls = useMemo(() => {
    const map = new Map()
    previewSegments.forEach((segment) => {
      map.set(segment.id, findFirstUrl(segment.raw || ''))
    })
    return map
  }, [previewSegments])

  const handleDismissPreview = useCallback((segmentId, url) => {
    if (!segmentId && segmentId !== 0) return
    if (!url) return
    setDismissedPreviewUrls((prev) => ({
      ...prev,
      [segmentId]: url,
    }))
  }, [])

  return (
    <div className={`flex h-full min-h-0 flex-col gap-6 ${className}`}>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h3 className='text-base font-semibold text-foreground'>
            {mergedLabels.title}
          </h3>
          <p className='mt-1 text-xs text-foreground-muted'>{mergedLabels.hint}</p>
        </div>
        <span className='text-xs uppercase tracking-[0.2em] text-foreground-muted'>
          {mergedLabels.postsCounter(totalSegments)}
        </span>
      </div>

      <div className='grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch'>
        <div className='flex min-h-0 flex-col rounded-3xl border border-border bg-background p-4 shadow-soft sm:p-6'>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={handleTextareaPaste}
            onSelect={handleSelectionUpdate}
            onKeyUp={handleSelectionUpdate}
            onClick={handleSelectionUpdate}
            className='mt-2 h-full min-h-[16rem] flex-1 rounded-2xl border border-border bg-background-subtle p-4 font-mono text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60'
            placeholder={placeholder || mergedLabels.placeholder}
            disabled={disabled}
            aria-label={mergedLabels.title}
          />

          <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
            <label className='inline-flex items-center gap-3 text-sm font-medium text-foreground'>
              <input
                type='checkbox'
                className='rounded border-border text-primary focus:ring-primary'
                checked={resolvedAppendNumbering}
                onChange={handleToggleNumbering}
                disabled={disabled}
              />
              {mergedLabels.numberingToggle}
            </label>
            <div className='flex items-center gap-2'>
              <button
                ref={emojiButtonRef}
                type='button'
                className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background-subtle text-foreground shadow-soft transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
                title='Emoji einfügen'
                aria-label='Emoji einfügen'
                onClick={() => setEmojiPickerOpen((open) => !open)}
                disabled={disabled}
              >
                <FaceIcon className='h-5 w-5' aria-hidden='true' />
              </button>
              <button
                type='button'
                className='inline-flex h-10 items-center justify-center rounded-full border border-border bg-background-subtle px-4 text-sm font-medium text-foreground shadow-soft transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
                onClick={handleInsertSeparator}
                disabled={disabled}
              >
                ---
              </button>
            </div>
          </div>
        </div>

        <section className='flex min-h-0 flex-col rounded-3xl border border-border bg-background p-4 shadow-soft sm:p-6'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-semibold text-foreground'>
              {mergedLabels.previewTitle}
            </h4>
            <span className='text-xs text-foreground-muted'>
              {mergedLabels.postsCounter(totalSegments)}
            </span>
          </div>
          <div className='mt-4 flex-1 space-y-3 overflow-y-auto pr-1'>
            {previewWithMedia.map((segment, index) => {
              const mediaItems = mediaItemsBySegment.get(segment.id) || []
              const currentCount = Math.min(
                mediaItems.length,
                mediaMaxPerSegment || mediaItems.length,
              )
              const limitReached =
                Number.isFinite(mediaMaxPerSegment) &&
                currentCount >= mediaMaxPerSegment
              const segmentUrl = segmentFirstUrls.get(segment.id) || ''
              const dismissedUrl = dismissedPreviewUrls[segment.id] || ''
              const showLinkPreview =
                Boolean(segmentUrl) &&
                mediaItems.length === 0 &&
                dismissedUrl !== segmentUrl
              return (
                <article
                  key={segment.id}
                  className='rounded-2xl border border-border bg-background-subtle p-4'
                >
                  <header className='flex flex-wrap items-center justify-between gap-3 text-xs'>
                    <span className='font-semibold text-foreground'>
                      {mergedLabels.segmentLabel(index + 1)}
                    </span>
                    <div className='flex items-center gap-3'>
                      <span
                        className={`font-medium ${
                          segment.exceedsLimit
                            ? 'text-destructive'
                            : segment.characterCount >
                                (maxLength ? maxLength * 0.9 : Infinity)
                              ? 'text-amber-500'
                              : 'text-foreground-muted'
                        }`}
                      >
                        {mergedLabels.charCount(segment.characterCount, maxLength)}
                      </span>
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60'
                          onClick={() =>
                            setMediaDialog({ open: true, segmentId: segment.id })
                          }
                          disabled={disabled || limitReached}
                          title={
                            limitReached
                              ? mergedLabels.addGifLimitReached(
                                  mediaMaxPerSegment || 0,
                                )
                              : mergedLabels.addImageTitle
                          }
                        >
                          <ImageIcon className='h-4 w-4' aria-hidden='true' />
                          <span>Bild</span>
                        </button>
                        {gifPickerEnabled ? (
                          <button
                            type='button'
                            className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60'
                            onClick={() =>
                              setGifPickerState({ open: true, segmentId: segment.id })
                            }
                            disabled={disabled || limitReached}
                            title={
                              limitReached
                                ? mergedLabels.addGifLimitReached(
                                    mediaMaxPerSegment || 0,
                                  )
                                : mergedLabels.addGifTitle
                            }
                            aria-label={mergedLabels.addGifTitle}
                          >
                            <VideoIcon className='h-4 w-4' aria-hidden='true' />
                            <span>GIF</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </header>
                  <div className='mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground'>
                    {segment.formatted || mergedLabels.emptySegment}
                  </div>
                  <SegmentMediaGrid
                    items={mediaItems}
                    maxCount={mediaMaxPerSegment}
                    onEditAlt={(item) => handleOpenAltDialog(segment.id, item)}
                    onRemove={(item) => handleRemoveMedia(segment.id, item)}
                    labels={mediaGridLabels}
                  />
                  {showLinkPreview ? (
                    <SegmentLinkPreview
                      url={segmentUrl}
                      onDismiss={() => handleDismissPreview(segment.id, segmentUrl)}
                    />
                  ) : null}
                  {Number.isFinite(mediaMaxPerSegment) ? (
                    <p className='mt-2 text-xs text-foreground-muted'>
                      {mergedLabels.mediaCounter(currentCount, mediaMaxPerSegment)}
                    </p>
                  ) : null}
                  {segment.exceedsLimit ? (
                    <p className='mt-2 text-xs text-destructive'>
                      {mergedLabels.limitExceeded}
                    </p>
                  ) : null}
                </article>
              )
            })}
            {previewSegments.length === 0 ? (
              <p className='text-xs text-foreground-muted'>
                {mergedLabels.postsCounter(0)}
              </p>
            ) : null}
            {previewSegments.filter((segment) => !segment.isEmpty).length <= 1 &&
            !hasPending ? (
              <article className='flex min-h-[96px] items-center justify-center rounded-2xl border border-dashed border-border bg-background-subtle px-6 py-8 text-center text-xs text-foreground-muted opacity-70'>
                {mergedLabels.previewPlaceholder}
              </article>
            ) : null}
          </div>
          {exceedsThreadLimit ? (
            <p className='mt-2 text-xs text-destructive'>
              {mergedLabels.threadLimitWarning(MAX_THREAD_SEGMENTS)}
            </p>
          ) : null}
          {mediaMessage ? (
            <p className='mt-2 text-xs text-destructive'>{mediaMessage}</p>
          ) : null}
        </section>
      </div>

      {typeof onSubmit === 'function' ? (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          {footerAside ? (
            <div className='flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3'>
              {footerAside}
            </div>
          ) : <span />}
          <div className='flex items-center gap-3'>
            {secondaryAction}
            <Button type='button' onClick={handleSubmit} disabled={submitDisabled}>
              {effectiveSubmitLabel}
            </Button>
          </div>
        </div>
      ) : null}

      <EmojiPicker
        open={emojiPickerOpen}
        anchorRef={emojiButtonRef}
        onClose={() => setEmojiPickerOpen(false)}
        onPick={(emoji) => {
          const valueToInsert = emoji?.native || emoji?.shortcodes || emoji?.id
          if (!valueToInsert) return
          insertAtCursor(valueToInsert)
          setEmojiPickerOpen(false)
        }}
      />
      <MediaDialog
        open={mediaDialog.open}
        title={mergedLabels.addImageModalTitle}
        mode='upload'
        accept='image/*'
        requireAltText={mediaRequireAltText}
        maxBytes={mediaMaxBytes}
        allowedMimes={mediaAllowedMimes}
        onConfirm={(file, altText) => {
          setMediaDialog({ open: false, segmentId: null })
          if (!file && !altText) return
          handleAddLocalFile(mediaDialog.segmentId, file, altText)
        }}
        onClose={() => setMediaDialog({ open: false, segmentId: null })}
      />
      <MediaDialog
        open={altDialog.open}
        mode='alt'
        title={
          altDialog.initialAlt
            ? mergedLabels.altEditTitle
            : mergedLabels.altAddTitle
        }
        previewSrc={altDialog.previewSrc}
        initialAlt={altDialog.initialAlt}
        requireAltText={mediaRequireAltText}
        onConfirm={handleConfirmAltDialog}
        onClose={() =>
          setAltDialog({
            open: false,
            segmentId: null,
            pendingIndex: null,
            previewSrc: '',
            initialAlt: '',
          })
        }
      />
      {gifPickerEnabled ? (
        <GifPicker
          open={gifPickerState.open}
          onClose={() => setGifPickerState({ open: false, segmentId: null })}
          styles={gifPickerStyles}
          fetcher={gifPickerFetcher || undefined}
          maxBytes={gifPickerMaxBytes}
          onPick={(payload) => handleGifPick(gifPickerState.segmentId, payload)}
        />
      ) : null}
    </div>
  )
}

ThreadComposer.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  maxLength: PropTypes.number,
  hardBreakMarker: PropTypes.string,
  appendNumbering: PropTypes.bool,
  onToggleNumbering: PropTypes.func,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  onSubmit: PropTypes.func,
  submitLabel: PropTypes.string,
  labels: PropTypes.shape({
    title: PropTypes.string,
    hint: PropTypes.string,
    placeholder: PropTypes.string,
    numberingToggle: PropTypes.string,
    previewTitle: PropTypes.string,
    postsCounter: PropTypes.func,
    segmentLabel: PropTypes.func,
    charCount: PropTypes.func,
    emptySegment: PropTypes.string,
    limitExceeded: PropTypes.string,
    submitLabel: PropTypes.string,
    previewPlaceholder: PropTypes.string,
    mediaCounter: PropTypes.func,
    addImageTitle: PropTypes.string,
    addGifTitle: PropTypes.string,
    gifUnavailable: PropTypes.string,
    addImageModalTitle: PropTypes.string,
    addGifLimitReached: PropTypes.func,
    gifTooLarge: PropTypes.func,
    gifLoadFailed: PropTypes.string,
    altAddTitle: PropTypes.string,
    altEditTitle: PropTypes.string,
    threadLimitWarning: PropTypes.func,
  }),
  className: PropTypes.string,
  onSegmentsChange: PropTypes.func,
  secondaryAction: PropTypes.node,
  mediaMaxPerSegment: PropTypes.number,
  mediaMaxBytes: PropTypes.number,
  mediaAllowedMimes: PropTypes.arrayOf(PropTypes.string),
  mediaRequireAltText: PropTypes.bool,
  gifPickerEnabled: PropTypes.bool,
  gifPickerFetcher: PropTypes.func,
  gifPickerMaxBytes: PropTypes.number,
  gifPickerStyles: PropTypes.object,
  footerAside: PropTypes.node,
}

function useSegmentLinkPreview(url) {
  const [state, setState] = useState({
    loading: false,
    data: null,
    error: '',
  })

  useEffect(() => {
    if (!url) {
      setState({ loading: false, data: null, error: '' })
      return
    }
    let cancelled = false
    const controller = new AbortController()
    setState({ loading: true, data: null, error: '' })
    const loadPreview = async () => {
      try {
        const response = await fetch(
          `/api/preview?url=${encodeURIComponent(url)}`,
          { signal: controller.signal },
        )
        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `Preview fehlgeschlagen (${response.status})`)
        }
        const payload = await response.json()
        if (cancelled) return
        setState({ loading: false, data: payload, error: '' })
      } catch (error) {
        if (error?.name === 'AbortError' || cancelled) return
        setState({
          loading: false,
          data: null,
          error: error?.message || 'Preview fehlgeschlagen',
        })
      }
    }
    loadPreview()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [url])

  return state
}

function SegmentLinkPreview({ url, onDismiss }) {
  const { loading, data, error } = useSegmentLinkPreview(url)
  if (!url) return null
  let hostname = ''
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    hostname = ''
  }
  const title = data?.title || url
  const description = data?.description || ''
  const domain = data?.domain || hostname
  const image = data?.image || ''

  return (
    <div className='relative mt-3 rounded-2xl border border-border bg-background p-3'>
      {typeof onDismiss === 'function' ? (
        <button
          type='button'
          className='absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background-subtle text-sm text-foreground-muted hover:text-foreground'
          title='Link-Vorschau entfernen'
          onClick={onDismiss}
        >
          ×
        </button>
      ) : null}
      <div className='flex gap-3 pr-8'>
        {image ? (
          <img
            src={image}
            alt=''
            className='h-16 w-16 shrink-0 rounded-xl border border-border object-cover'
            loading='lazy'
          />
        ) : (
          <div className='h-16 w-16 shrink-0 rounded-xl border border-border bg-background' />
        )}
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-semibold text-foreground'>
            {title}
          </p>
          {description ? (
            <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>
              {description}
            </p>
          ) : null}
          <p className='mt-1 text-xs text-foreground-subtle'>{domain}</p>
          <div className='text-xs text-foreground-muted'>
            {loading ? 'Lade…' : error ? 'Kein Preview' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}

SegmentLinkPreview.propTypes = {
  url: PropTypes.string.isRequired,
  onDismiss: PropTypes.func,
}
