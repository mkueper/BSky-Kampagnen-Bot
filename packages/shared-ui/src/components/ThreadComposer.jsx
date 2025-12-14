import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import PropTypes from 'prop-types'
import Button from './Button.jsx'
import { splitThread } from '@bsky-kampagnen-bot/shared-logic'
import { EmojiPicker } from '@kampagnen-bot/media-pickers'
import { FaceIcon } from '@radix-ui/react-icons'

const defaultLabels = {
  title: 'Thread content',
  hint:
    'Ctrl+Enter inserts a separator. Long sections will be split automatically.',
  placeholder: 'Example:\nIntro...\n---\nNext post...',
  numberingToggle: 'Append automatic numbering (1/x)',
  previewTitle: 'Preview',
  postsCounter: count => `${count} post${count === 1 ? '' : 's'}`,
  segmentLabel: index => `Post ${index}`,
  charCount: (count, max) => (max ? `${count} / ${max}` : `${count}`),
  limitExceeded: 'Character limit exceeded.',
  emptySegment: '(no content)',
  submitLabel: 'Submit',
  previewPlaceholder: 'Additional posts will appear here once your thread grows.'
}

function mergeLabels (labels) {
  if (!labels) return defaultLabels
  return {
    ...defaultLabels,
    ...labels
  }
}

export default function ThreadComposer ({
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
  secondaryAction = null
}) {
  const mergedLabels = mergeLabels(labels)
  const [internalNumbering, setInternalNumbering] = useState(true)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const resolvedAppendNumbering =
    typeof controlledNumbering === 'boolean'
      ? controlledNumbering
      : internalNumbering
  const textareaRef = useRef(null)
  const emojiButtonRef = useRef(null)

  useEffect(() => {
    if (typeof controlledNumbering === 'boolean') {
      setInternalNumbering(controlledNumbering)
    }
  }, [controlledNumbering])

  const {
    previewSegments,
    totalSegments
  } = useMemo(
    () =>
      splitThread({
        text: value || '',
        limit: maxLength,
        appendNumbering: resolvedAppendNumbering,
        hardBreakMarker
      }),
    [value, maxLength, resolvedAppendNumbering, hardBreakMarker]
  )

  useEffect(() => {
    if (typeof onSegmentsChange === 'function') {
      onSegmentsChange(previewSegments)
    }
  }, [previewSegments, onSegmentsChange])

  const insertAtCursor = useCallback(
    snippet => {
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
          // ignore cursor errors
        }
      })
    },
    [onChange, value]
  )

  const handleInsertSeparator = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const {
      selectionStart = value.length,
      selectionEnd = value.length
    } = textarea
    const before = value.slice(0, selectionStart)
    const after = value.slice(selectionEnd)
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
    event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        handleInsertSeparator()
      }
    },
    [handleInsertSeparator]
  )

  const handleToggleNumbering = () => {
    if (typeof onToggleNumbering === 'function') {
      onToggleNumbering(!resolvedAppendNumbering)
      return
    }
    setInternalNumbering(prev => !prev)
  }

  const submitDisabled =
    !value?.trim() ||
    previewSegments.every(segment => segment.isEmpty) ||
    disabled

  const effectiveSubmitLabel = submitLabel || mergedLabels.submitLabel

  return (
    <div className={`flex h-full min-h-0 flex-col gap-6 ${className}`}>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h3 className='text-base font-semibold text-foreground'>
            {mergedLabels.title}
          </h3>
          <p className='mt-1 text-xs text-foreground-muted'>
            {mergedLabels.hint}
          </p>
        </div>
        <span className='text-xs uppercase tracking-[0.2em] text-foreground-muted'>
          {mergedLabels.postsCounter(totalSegments)}
        </span>
      </div>

      <div className='grid flex-1 min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch'>
        <div className='flex min-h-0 flex-col rounded-3xl border border-border bg-background p-4 shadow-soft sm:p-6'>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={event => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className='mt-2 h-64 w-full rounded-2xl border border-border bg-background-subtle p-4 font-mono text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60'
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
                onClick={() => setEmojiPickerOpen(open => !open)}
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
           {previewSegments.map((segment, index) => (
              <article
                key={segment.id}
                className='rounded-2xl border border-border bg-background-subtle p-4'
              >
              <header className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-foreground'>
                  {mergedLabels.segmentLabel(index + 1)}
                </span>
                <span
                  className={`font-medium ${
                    segment.exceedsLimit
                      ? 'text-destructive'
                      : segment.characterCount > (maxLength ? maxLength * 0.9 : Infinity)
                      ? 'text-amber-500'
                      : 'text-foreground-muted'
                  }`}
                >
                  {mergedLabels.charCount(segment.characterCount, maxLength)}
                </span>
              </header>
              <div className='mt-2 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed'>
                {segment.formatted || mergedLabels.emptySegment}
              </div>
              {segment.exceedsLimit ? (
                <p className='mt-2 text-xs text-destructive'>
                  {mergedLabels.limitExceeded}
                </p>
              ) : null}
            </article>
          ))}
          {previewSegments.length === 0 ? (
            <p className='text-xs text-foreground-muted'>
              {mergedLabels.postsCounter(0)}
            </p>
          ) : null}
          {previewSegments.filter((segment) => !segment.isEmpty).length <= 1 ? (
            <article className='flex min-h-[96px] items-center justify-center rounded-2xl border border-dashed border-border bg-background-subtle px-6 py-8 text-center text-xs text-foreground-muted opacity-70'>
              {mergedLabels.previewPlaceholder}
            </article>
          ) : null}
          </div>
        </section>
      </div>

      {typeof onSubmit === 'function' ? (
        <div className='flex items-center justify-end gap-3'>
          {secondaryAction}
          <Button
            type='button'
            onClick={() => onSubmit(previewSegments)}
            disabled={submitDisabled}
          >
            {effectiveSubmitLabel}
          </Button>
        </div>
      ) : null}

      <EmojiPicker
        open={emojiPickerOpen}
        anchorRef={emojiButtonRef}
        onClose={() => setEmojiPickerOpen(false)}
        onPick={emoji => {
          const valueToInsert = emoji?.native || emoji?.shortcodes || emoji?.id
          if (!valueToInsert) return
          insertAtCursor(valueToInsert)
          setEmojiPickerOpen(false)
        }}
      />
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
    submitLabel: PropTypes.string
  }),
  className: PropTypes.string,
  onSegmentsChange: PropTypes.func,
  secondaryAction: PropTypes.node
}
