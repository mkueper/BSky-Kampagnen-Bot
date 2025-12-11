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
  submitLabel: 'Submit'
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
  onSegmentsChange
}) {
  const mergedLabels = mergeLabels(labels)
  const [internalNumbering, setInternalNumbering] = useState(true)
  const resolvedAppendNumbering =
    typeof controlledNumbering === 'boolean'
      ? controlledNumbering
      : internalNumbering
  const textareaRef = useRef(null)

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

    const nextValue = `${before}${separator}${after}`
    onChange(nextValue)
    requestAnimationFrame(() => {
      try {
        const cursorPosition = before.length + separator.length
        textarea.selectionStart = cursorPosition
        textarea.selectionEnd = cursorPosition
        textarea.focus()
      } catch {
        // ignore cursor errors
      }
    })
  }, [value, onChange, hardBreakMarker])

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
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <h3 className='text-base font-semibold text-foreground'>
            {mergedLabels.title}
          </h3>
          <span className='text-xs uppercase tracking-[0.2em] text-foreground-muted'>
            {mergedLabels.postsCounter(totalSegments)}
          </span>
        </div>
        <p className='text-xs text-foreground-muted'>{mergedLabels.hint}</p>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className='h-48 w-full rounded-2xl border border-border bg-background-subtle p-4 font-mono text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60'
        placeholder={placeholder || mergedLabels.placeholder}
        disabled={disabled}
        aria-label={mergedLabels.title}
      />

      <label className='flex items-center gap-3 text-sm font-medium text-foreground'>
        <input
          type='checkbox'
          className='rounded border-border text-primary focus:ring-primary'
          checked={resolvedAppendNumbering}
          onChange={handleToggleNumbering}
          disabled={disabled}
        />
        {mergedLabels.numberingToggle}
      </label>

      <section className='rounded-3xl border border-border bg-background p-4 shadow-soft'>
        <div className='flex items-center justify-between'>
          <h4 className='text-sm font-semibold text-foreground'>
            {mergedLabels.previewTitle}
          </h4>
          <span className='text-xs text-foreground-muted'>
            {mergedLabels.postsCounter(totalSegments)}
          </span>
        </div>
        <div className='mt-4 space-y-3'>
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
        </div>
      </section>

      {typeof onSubmit === 'function' ? (
        <div className='flex justify-end'>
          <Button
            type='button'
            onClick={() => onSubmit(previewSegments)}
            disabled={submitDisabled}
          >
            {effectiveSubmitLabel}
          </Button>
        </div>
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
    submitLabel: PropTypes.string
  }),
  className: PropTypes.string,
  onSegmentsChange: PropTypes.func
}
