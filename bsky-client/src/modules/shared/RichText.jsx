import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MagnifyingGlassIcon, PersonIcon, SpeakerOffIcon } from '@radix-ui/react-icons'
import { InlineMenu, InlineMenuContent, InlineMenuItem, InlineMenuTrigger } from '@bsky-kampagnen-bot/shared-ui'
import { RichText as RichTextAPI } from '@atproto/api'
import { useAppDispatch } from '../../context/AppContext'
import { getActiveBskyAgentClient } from './api/bskyAgentClient.js'
const MIN_HASHTAG_LENGTH = 2

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

function resolveBskyProfileActor (urlString) {
  try {
    const url = new URL(urlString)
    if (url.hostname !== 'bsky.app') return null
    if (!url.pathname.startsWith('/profile/')) return null
    const actor = url.pathname.replace('/profile/', '').split('/')[0] || ''
    return actor || null
  } catch {
    return null
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

    const feature = facet.features[0]
    if (feature?.$type === 'app.bsky.richtext.facet#mention') {
      segments.push({ text: segmentText, isMention: true, did: feature.did })
    } else if (feature?.$type === 'app.bsky.richtext.facet#link') {
      segments.push({ text: segmentText, isLink: true, href: feature.uri })
    } else if (feature?.$type === 'app.bsky.richtext.facet#tag') {
      segments.push({ text: segmentText, isHashtag: true, hashtag: feature.tag || segmentText.replace(/^#+/, '') })
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

function isValidHashtagBoundary (char) {
  if (!char) return true
  return /[\s([{/'"`]/.test(char)
}

function isValidHashtagChar (codePoint) {
  if (!codePoint && codePoint !== 0) return false
  if (codePoint === 95) return true // underscore
  if ((codePoint >= 48 && codePoint <= 57) || (codePoint >= 65 && codePoint <= 90) || (codePoint >= 97 && codePoint <= 122)) {
    return true
  }
  // Allow extended latin and general unicode letters/numbers
  if (codePoint >= 0x80 && codePoint <= 0x10ffff) {
    // exclude obvious separators
    if (codePoint === 0x2000 || codePoint === 0x2001 || codePoint === 0x2002 || codePoint === 0x2003) return false
    return true
  }
  return false
}

function splitTextByHashtags (text) {
  if (!text) return [{ text }]
  const segments = []
  let bufferStart = 0
  let cursor = 0
  const totalLength = text.length
  while (cursor < totalLength) {
    const currentChar = text[cursor]
    if (currentChar === '#') {
      const prevChar = cursor > 0 ? text[cursor - 1] : ''
      if (isValidHashtagBoundary(prevChar)) {
        let end = cursor + 1
        while (end < totalLength) {
          const codePoint = text.codePointAt(end)
          if (!isValidHashtagChar(codePoint)) break
          end += codePoint > 0xffff ? 2 : 1
        }
        const bodyLength = end - (cursor + 1)
        if (bodyLength >= MIN_HASHTAG_LENGTH) {
          if (cursor > bufferStart) {
            segments.push({ text: text.slice(bufferStart, cursor) })
          }
          const segmentText = text.slice(cursor, end)
          segments.push({ text: segmentText, isHashtag: true, hashtag: segmentText.replace(/^#+/, '') })
          bufferStart = end
          cursor = end
          continue
        }
      }
    }
    const codePoint = text.codePointAt(cursor)
    cursor += codePoint > 0xffff ? 2 : 1
  }
  if (bufferStart < totalLength) {
    segments.push({ text: text.slice(bufferStart) })
  }
  return segments
}

function normalizeSegmentsWithHashtags (segments) {
  return segments.flatMap((segment) => {
    if (!segment.text) return [segment]
    if (segment.isMention || segment.isLink || segment.isHashtag) {
      return [segment]
    }
    return splitTextByHashtags(segment.text)
  })
}

export default function RichText ({
  text = '',
  facets,
  className = '',
  hashtagContext = null,
  disableHashtagMenu = false,
  autoDetectFacets = true
}) {
  const dispatch = useAppDispatch()
  const [detectedFacets, setDetectedFacets] = useState(null)
  const stopInteraction = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const hasProvidedFacets = Array.isArray(facets) && facets.length > 0

  useEffect(() => {
    if (!autoDetectFacets || hasProvidedFacets || !text) {
      setDetectedFacets(null)
      return
    }
    const client = getActiveBskyAgentClient()
    const agent = client?.getAgent?.() || null
    if (!agent) {
      setDetectedFacets(null)
      return
    }
    let cancelled = false
    const resolveFacets = async () => {
      try {
        const richText = new RichTextAPI({ text })
        await richText.detectFacets(agent)
        if (!cancelled) {
          setDetectedFacets(Array.isArray(richText.facets) ? richText.facets : null)
        }
      } catch {
        if (!cancelled) setDetectedFacets(null)
      }
    }
    resolveFacets()
    return () => {
      cancelled = true
    }
  }, [autoDetectFacets, hasProvidedFacets, text])

  const effectiveFacets = hasProvidedFacets ? facets : detectedFacets
  const segments = useMemo(
    () => normalizeSegmentsWithHashtags(parseSegments(text, effectiveFacets)),
    [text, effectiveFacets]
  )

  const openHashtagSearch = useCallback((payload) => {
    const query = typeof payload?.query === 'string' ? payload.query.trim() : ''
    if (!query) return
    dispatch({
      type: 'OPEN_HASHTAG_SEARCH',
      payload: {
        query,
        label: payload?.label || query,
        description: payload?.description || '',
        tab: payload?.tab
      }
    })
  }, [dispatch])

  const handleMentionClick = (event, did) => {
    event.preventDefault()
    event.stopPropagation()
    if (!did) return
    dispatch({ type: 'OPEN_PROFILE_VIEWER', actor: did })
  }

  const handleLinkClick = (event, href) => {
    const actor = resolveBskyProfileActor(href)
    if (!actor) return
    event.preventDefault()
    event.stopPropagation()
    dispatch({ type: 'OPEN_PROFILE_VIEWER', actor })
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
          const profileActor = resolveBskyProfileActor(segment.href)
          return (
            <a
              key={index}
              href={segment.href}
              target={target}
              rel={rel}
              onClick={(event) => {
                if (profileActor) {
                  handleLinkClick(event, segment.href)
                  return
                }
                event.stopPropagation()
              }}
              className='text-primary underline decoration-primary/40 hover:decoration-primary'
            >
              {segment.text}
            </a>
          )
        }
        if (segment.isHashtag) {
          if (disableHashtagMenu) {
            return (
              <span
                key={`hashtag-${index}-${segment.text}`}
                className='text-primary'
                onClick={stopInteraction}
                onMouseDown={stopInteraction}
                onPointerDown={stopInteraction}
              >
                {segment.text}
              </span>
            )
          }
          return (
            <HashtagMenu
              key={`hashtag-${index}-${segment.text}`}
              hashtag={segment.hashtag}
              display={segment.text}
              onNavigate={openHashtagSearch}
              context={hashtagContext}
            />
          )
        }
        return <React.Fragment key={index}>{segment.text}</React.Fragment>
      })}
    </span>
  )
}

function HashtagMenu ({ hashtag, display, onNavigate, context }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const normalizedTag = useMemo(() => {
    if (typeof hashtag === 'string' && hashtag.trim()) {
      return hashtag.replace(/^#+/, '')
    }
    if (typeof display === 'string' && display.trim().startsWith('#')) {
      return display.trim().replace(/^#+/, '')
    }
    return ''
  }, [hashtag, display])
  const label = normalizedTag ? `#${normalizedTag}` : ''
  const authorHandle = useMemo(() => {
    if (!context) return ''
    const handle = context.authorHandle || ''
    if (!handle) return ''
    return handle.replace(/^@/, '')
  }, [context])

  const handleContextMenu = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!label) return
    setMenuOpen(true)
  }, [label])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault()
      event.stopPropagation()
      if (!label) return
      setMenuOpen(true)
    }
  }, [label])

  const showPosts = useCallback(() => {
    if (!label) return
    onNavigate({ query: label, label, description: '', tab: 'top' })
    setMenuOpen(false)
  }, [label, onNavigate])

  const showAuthorPosts = useCallback(() => {
    if (!label || !authorHandle) return
    const authorQuery = `from:${authorHandle} ${label}`
    onNavigate({ query: authorQuery, label, description: `@${authorHandle}`, tab: 'top' })
    setMenuOpen(false)
  }, [authorHandle, label, onNavigate])

  const handleMenuChange = useCallback((nextOpen) => {
    setMenuOpen(nextOpen)
  }, [])

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!label) {
    return <>{display}</>
  }

  const queryLabel = `${label}-Posts ansehen`
  const authorLabel = `${label}-Posts des Nutzers ansehen`
  const muteLabel = normalizedTag ? `${normalizedTag} stummschalten` : 'Tag stummschalten'

  return (
    <InlineMenu open={menuOpen} onOpenChange={handleMenuChange}>
      <InlineMenuTrigger>
        <button
          type='button'
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          className='inline bg-transparent p-0 text-primary underline decoration-primary/40 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
          title={`Hashtag ${label}`}
          data-hashtag={normalizedTag}
        >
          {label}
        </button>
      </InlineMenuTrigger>
      {hydrated ? (
        <InlineMenuContent align='start' side='top' sideOffset={6}>
          <InlineMenuItem icon={MagnifyingGlassIcon} onSelect={showPosts}>
            {queryLabel}
          </InlineMenuItem>
          <InlineMenuItem
            icon={PersonIcon}
            onSelect={showAuthorPosts}
            disabled={!authorHandle}
          >
            {authorLabel}
          </InlineMenuItem>
          <div className='my-1 h-px bg-border' role='separator' />
          <InlineMenuItem icon={SpeakerOffIcon} disabled>
            {muteLabel}
          </InlineMenuItem>
        </InlineMenuContent>
      ) : null}
    </InlineMenu>
  )
}
