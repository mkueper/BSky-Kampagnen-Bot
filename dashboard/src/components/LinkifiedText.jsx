import { Fragment, memo } from 'react'

const URL_REGEX_GLOBAL = /https?:\/\/[^\s<>"')\]]+/gi
const TRAILING_PUNCTUATION = /[),.;!?]+$/

function normalizeUrl (raw) {
  if (!raw) return ''
  const trimmed = raw.replace(TRAILING_PUNCTUATION, '')
  try {
    const parsed = new URL(trimmed)
    if (!/^https?:$/.test(parsed.protocol)) return ''
    return {
      href: parsed.toString(),
      display: trimmed
    }
  } catch {
    return ''
  }
}

function LinkifiedText ({ text, className = '', placeholder = '' }) {
  const value = typeof text === 'string' ? text : ''
  if (!value) {
    return placeholder ? <span className={className}>{placeholder}</span> : null
  }

  const parts = []
  let lastIndex = 0
  let match
  URL_REGEX_GLOBAL.lastIndex = 0

  while ((match = URL_REGEX_GLOBAL.exec(value)) !== null) {
    const start = match.index
    const rawUrl = match[0]
    if (start > lastIndex) {
      parts.push({
        type: 'text',
        content: value.slice(lastIndex, start)
      })
    }
    const normalized = normalizeUrl(rawUrl)
    if (normalized) {
      parts.push({
        type: 'link',
        content: normalized.display,
        href: normalized.href
      })
    } else {
      parts.push({
        type: 'text',
        content: rawUrl
      })
    }
    lastIndex = start + rawUrl.length
  }

  if (lastIndex < value.length) {
    parts.push({
      type: 'text',
      content: value.slice(lastIndex)
    })
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <a
              key={`link-${index}`}
              href={part.href}
              target='_blank'
              rel='noreferrer noopener'
              className='text-primary underline underline-offset-2'
            >
              {part.content}
            </a>
          )
        }
        return <Fragment key={`text-${index}`}>{part.content}</Fragment>
      })}
    </span>
  )
}

export default memo(LinkifiedText)
