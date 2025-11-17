import React from 'react'
import { useAppDispatch } from '../../context/AppContext'

// Helper to convert byte offsets to character offsets
function byteToCharIndex (text, byteIndex) {
  const encoder = new TextEncoder()
  let charIndex = 0
  for (let i = 0; i < text.length; i++) {
    const slice = text.slice(0, i + 1)
    const byteLength = encoder.encode(slice).length
    if (byteLength > byteIndex) {
      return i
    }
    charIndex = i + 1
  }
  return charIndex
}

function classifyLink (urlString) {
  try {
    const url = new URL(urlString)
    const isBskyProfile = url.hostname === 'bsky.app' && url.pathname.startsWith('/profile/')
    if (isBskyProfile) {
      return { target: '_self', rel: undefined }
    }
    return { target: '_blank', rel: 'noopener noreferrer' }
  } catch {
    return { target: '_blank', rel: 'noopener noreferrer' }
  }
}

function parseSegments (text, facets) {
  if (!facets || facets.length === 0) {
    return [{ text, isLink: false, isMention: false }]
  }

  const segments = []
  let lastByteEnd = 0

  facets.sort((a, b) => a.index.byteStart - b.index.byteStart)

  for (const facet of facets) {
    const byteStart = facet.index.byteStart
    const byteEnd = facet.index.byteEnd

    // Add text segment before the current facet
    if (byteStart > lastByteEnd) {
      const start = byteToCharIndex(text, lastByteEnd)
      const end = byteToCharIndex(text, byteStart)
      segments.push({ text: text.slice(start, end) })
    }

    // Add the facet segment
    const start = byteToCharIndex(text, byteStart)
    const end = byteToCharIndex(text, byteEnd)
    const segmentText = text.slice(start, end)

    if (facet.features[0]?.$type === 'app.bsky.richtext.facet#mention') {
      segments.push({ text: segmentText, isMention: true, did: facet.features[0].did })
    } else if (facet.features[0]?.$type === 'app.bsky.richtext.facet#link') {
      segments.push({ text: segmentText, isLink: true, href: facet.features[0].uri })
    } else {
      segments.push({ text: segmentText })
    }

    lastByteEnd = byteEnd
  }

  // Add any remaining text after the last facet
  const lastCharIndex = byteToCharIndex(text, lastByteEnd)
  if (lastCharIndex < text.length) {
    segments.push({ text: text.slice(lastCharIndex) })
  }

  return segments
}

export default function RichText ({ text = '', facets, className = '' }) {
  const dispatch = useAppDispatch()

  if (!text) {
    return <span className={className}>{text}</span>
  }

  const segments = parseSegments(text, facets)

  const handleMentionClick = (event, did) => {
    event.preventDefault()
    if (!did) return
    dispatch({ type: 'OPEN_PROFILE_VIEWER', actor: did })
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.isMention) {
          return (
            <a key={index} href={`/profile/${segment.did}`} onClick={(e) => handleMentionClick(e, segment.did)} className='text-primary hover:underline'>
              {segment.text}
            </a>
          )
        }
        if (segment.isLink) {
          const { target, rel } = classifyLink(segment.href)
          return (
            <a
              key={index}
              href={segment.href}
              target={target}
              rel={rel}
              className='text-primary underline decoration-primary/40 hover:decoration-primary'
            >
              {segment.text}
            </a>
          )
        }
        return <React.Fragment key={index}>{segment.text}</React.Fragment>
      })}
    </span>
  )
}
