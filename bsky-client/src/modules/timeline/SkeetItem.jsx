import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChatBubbleIcon,
  HeartIcon,
  HeartFilledIcon,
  Share2Icon,
  DotsHorizontalIcon,
  Link2Icon,
  CopyIcon,
  ExternalLinkIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircledIcon,
  SpeakerLoudIcon,
  MixerVerticalIcon,
  EyeClosedIcon,
  PersonIcon,
  CrossCircledIcon
} from '@radix-ui/react-icons'
import { useCardConfig } from '../../context/CardConfigContext.jsx'
import { useBskyEngagement, RichText, RepostMenuButton, ProfilePreviewTrigger, Card } from '../shared'

function extractImagesFromEmbed (item) {
  try {
    const post = item?.raw?.post || {}
    const e = post?.embed || {}
    /**
     * Possible shapes:
     * - { $type: 'app.bsky.embed.images#view', images: [{ thumb, fullsize, alt }] }
     * - { $type: 'app.bsky.embed.recordWithMedia#view', media: { $type: 'app.bsky.embed.images#view', images: [...] } }
     */
    const t1 = e?.$type
    const t2 = e?.media?.$type
    const isImg1 = typeof t1 === 'string' && t1.startsWith('app.bsky.embed.images')
    const isImg2 = typeof t2 === 'string' && t2.startsWith('app.bsky.embed.images')
    const imgView = isImg1 ? e : (isImg2 ? e.media : null)
    const images = Array.isArray(imgView?.images) ? imgView.images : []
    return images
      .map(img => ({
        src: img?.fullsize || img?.thumb || '',
        thumb: img?.thumb || img?.fullsize || '',
        alt: img?.alt || ''
      }))
      .filter(im => im.src)
      .slice(0, 4)
  } catch { return [] }
}

function extractExternalFromEmbed (item) {
  try {
    const post = item?.raw?.post || {}
    const e = post?.embed || {}
    const t1 = e?.$type
    const t2 = e?.media?.$type
    const isExt1 = typeof t1 === 'string' && t1.startsWith('app.bsky.embed.external')
    const isExt2 = typeof t2 === 'string' && t2.startsWith('app.bsky.embed.external')
    const extView = isExt1 ? e : (isExt2 ? e.media : null)
    const ext = extView?.external || null
    if (!ext || !ext?.uri) return null
    const url = new URL(ext.uri)
    const domain = url.hostname.replace(/^www\./, '')
    return {
      uri: ext.uri,
      title: ext.title || domain,
      description: ext.description || '',
      thumb: ext.thumb || '',
      domain
    }
  } catch { return null }
}

function extractQuoteFromEmbed (item) {
  try {
    const post = item?.raw?.post || {}
    const e = post?.embed || {}
    const t = e?.$type
    let recordView = null
    if (typeof t === 'string') {
      if (t.startsWith('app.bsky.embed.recordWithMedia')) {
        recordView = e?.record || null
      } else if (t.startsWith('app.bsky.embed.record')) {
        recordView = e
      }
    }
    if (!recordView) return null
    const view = recordView?.record && recordView?.record?.$type
      ? recordView.record
      : recordView
    const viewType = view?.$type || ''
    if (viewType.endsWith('#viewBlocked')) {
      return {
        uri: view?.uri || null,
        cid: view?.cid || null,
        text: '',
        author: {},
        status: 'blocked',
        statusMessage: 'Dieser Beitrag ist geschützt oder blockiert.'
      }
    }
    if (viewType.endsWith('#viewNotFound')) {
      return {
        uri: view?.uri || null,
        cid: view?.cid || null,
        text: '',
        author: {},
        status: 'not_found',
        statusMessage: 'Der Original-Beitrag wurde entfernt oder ist nicht mehr verfügbar.'
      }
    }
    if (viewType.endsWith('#viewDetached')) {
      return {
        uri: view?.uri || null,
        cid: view?.cid || null,
        text: '',
        author: {},
        status: 'detached',
        statusMessage: 'Der Original-Beitrag wurde losgelöst und kann nicht angezeigt werden.'
      }
    }
    const author = view?.author || {}
    const value = view?.value || {}
    return {
      uri: view?.uri || null,
      cid: view?.cid || null,
      text: typeof value?.text === 'string' ? value.text : '',
      author: {
        handle: author?.handle || '',
        displayName: author?.displayName || author?.handle || '',
        avatar: author?.avatar || null
      },
      status: 'ok',
      statusMessage: ''
    }
  } catch { return null }
}

function extractReasonContext (item) {
  try {
    const reason = item?.raw?.reason || item?.reason || null
    if (!reason || typeof reason !== 'object') return null
    const type = String(reason?.$type || reason?.type || '').toLowerCase()
    const actor = reason?.by || reason?.actor || {}
    const actorLabel = actor.displayName || actor.handle || actor.did || 'Jemand'
    if (type.includes('repost')) {
      return `${actorLabel} hat repostet`
    }
    if (type.includes('like')) {
      return `${actorLabel} gefällt das`
    }
    return null
  } catch {
    return null
  }
}

function buildShareUrl (item) {
  try {
    const uri = item?.uri || ''
    const author = item?.author || {}
    const handle = author?.handle || author?.did || ''
    if (!uri || !handle) return uri
    const parts = uri.split('/')
    const rkey = parts[parts.length - 1]
    if (!rkey) return uri
    return `https://bsky.app/profile/${handle}/post/${rkey}`
  } catch {
    return item?.uri || ''
  }
}

export default function SkeetItem({ item, variant = 'card', onReply, onQuote, onViewMedia, onSelect }) {
  const { author = {}, text = '', createdAt, stats = {} } = item || {}
  const images = useMemo(() => extractImagesFromEmbed(item), [item])
  const external = useMemo(() => extractExternalFromEmbed(item), [item])
  const quoted = useMemo(() => extractQuoteFromEmbed(item), [item])
  const contextLabel = useMemo(() => extractReasonContext(item), [item])
  const quotedAuthorLabel = quoted ? (quoted.author?.displayName || quoted.author?.handle || 'Unbekannt') : ''
  const quotedAuthorMissing = quoted ? !(quoted.author?.displayName || quoted.author?.handle) : false
  const quotedStatusMessage = quoted && quoted.status && quoted.status !== 'ok'
    ? (quoted.statusMessage || 'Der Original-Beitrag kann nicht angezeigt werden.')
    : ''
  const quoteClickable = !quotedStatusMessage && quoted?.uri && typeof onSelect === 'function'
  const { config } = useCardConfig()
  const {
    likeCount,
    repostCount,
    hasLiked,
    hasReposted,
    busy,
    refreshing,
    error: actionError,
    toggleLike,
    toggleRepost,
    refresh,
    clearError,
  } = useBskyEngagement({
    uri: item?.uri,
    cid: item?.cid || item?.raw?.post?.cid,
    initialLikes: stats?.likeCount,
    initialReposts: stats?.repostCount,
    viewer: item?.raw?.post?.viewer || item?.viewer,
  })
  const likeStyle = hasLiked ? { color: '#e11d48' } : undefined // rose-600
  const repostStyle = hasReposted ? { color: '#0ea5e9' } : undefined // sky-500
  const Wrapper = variant === 'card' ? Card : 'div'
  const wrapperClassName = variant === 'card' ? 'relative' : 'relative px-1'
  const wrapperProps = variant === 'card'
    ? { as: 'article', padding: 'p-4' }
    : {}
  const handleSelect = (event) => {
    if (typeof onSelect !== 'function') return
    if (event) {
      const target = event.target
      if (target?.closest?.('button, a, input, textarea')) return
      event.preventDefault()
    }
    onSelect(item)
  }

  const handleMediaPreview = (event, index = 0) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (typeof onViewMedia === 'function' && images.length > 0) {
      const safeIndex = Math.max(0, Math.min(index, images.length - 1))
      onViewMedia(images, safeIndex)
    }
  }

  const handleMediaKeyDown = (event, index = 0) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleMediaPreview(event, index)
    }
  }

  const handleSelectQuoted = (event) => {
    if (typeof onSelect !== 'function') return
    if (!quoted?.uri || quotedStatusMessage) return
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    onSelect({
      uri: quoted.uri,
      cid: quoted.cid,
      text: quoted.text,
      author: quoted.author,
      raw: { post: { uri: quoted.uri, cid: quoted.cid, author: quoted.author, record: { text: quoted.text } } }
    })
  }

  const actorIdentifier = author?.did || author?.handle || ''
  const shareUrl = useMemo(() => buildShareUrl(item), [item])
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!optionsOpen) return undefined
    const handler = (event) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target)) {
        setOptionsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => {
      document.removeEventListener('pointerdown', handler)
    }
  }, [optionsOpen])


  const copyToClipboard = async (value, successMessage = 'Kopiert') => {
    if (!value) return
    const fallback = () => window.prompt('Zum Kopieren', value)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        setFeedbackMessage(successMessage)
        window.setTimeout(() => setFeedbackMessage(''), 2400)
      } else {
        fallback()
      }
    } catch {
      fallback()
    }
  }

  const showPlaceholder = (label) => {
    setFeedbackMessage(`${label} ist noch nicht verfügbar.`)
    window.setTimeout(() => setFeedbackMessage(''), 2400)
  }

  const menuActions = useMemo(() => [
    {
      label: 'Uebersetzen (Google)',
      icon: QuestionMarkCircledIcon,
      action: () => {
        const target = encodeURIComponent(text || '')
        if (!target) { showPlaceholder('Uebersetzung'); return }
        const lang = (navigator?.language || 'en').split('-')[0] || 'en'
        const url = `https://translate.google.com/?sl=auto&tl=${lang}&text=${target}`
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    { label: 'Post-Text kopieren', icon: CopyIcon, action: () => copyToClipboard(String(text || ''), 'Text kopiert') },
    { label: 'Link kopieren', icon: Link2Icon, action: () => copyToClipboard(shareUrl, 'Link kopiert') },
    { label: 'Thread stummschalten', icon: SpeakerLoudIcon, action: () => showPlaceholder('Thread stummschalten') },
    { label: 'Woerter/Tags stummschalten', icon: MixerVerticalIcon, action: () => showPlaceholder('Wort-Filter') },
    { label: 'Post ausblenden', icon: EyeClosedIcon, action: () => showPlaceholder('Post ausblenden') },
    { label: 'Account stummschalten', icon: PersonIcon, action: () => showPlaceholder('Account stummschalten') },
    { label: 'Account blockieren', icon: CrossCircledIcon, action: () => showPlaceholder('Account blockieren') },
    { label: 'In Bluesky öffnen', icon: ExternalLinkIcon, action: () => { if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer') } },
    { label: 'Post melden', icon: ExclamationTriangleIcon, action: () => showPlaceholder('Melden') }
  ], [shareUrl, text])

  const body = (
    <>
      {contextLabel ? (
        <p className='mb-2 text-xs font-semibold text-foreground-muted'>{contextLabel}</p>
      ) : null}
      <header className='flex items-center gap-3'>
        <ProfilePreviewTrigger actor={actorIdentifier} fallback={author} className='inline-flex'>
          {author.avatar ? (
            <img src={author.avatar} alt='' className='h-10 w-10 shrink-0 rounded-full border border-border object-cover' />
          ) : (
            <div className='h-10 w-10 shrink-0 rounded-full border border-border bg-background-subtle' />
          )}
        </ProfilePreviewTrigger>
        <div className='min-w-0 flex-1'>
          <ProfilePreviewTrigger
            actor={actorIdentifier}
            fallback={author}
            as='span'
            className='inline-flex max-w-full flex-col min-w-0'
          >
            <p className='truncate font-semibold text-foreground'>{author.displayName || author.handle}</p>
            <p className='truncate text-sm text-foreground-muted'>@{author.handle}</p>
          </ProfilePreviewTrigger>
        </div>
        <div className='ml-auto flex items-center gap-1'>
          {createdAt ? (
            <time className='whitespace-nowrap text-xs text-foreground-muted' dateTime={createdAt}>
              {new Date(createdAt).toLocaleString('de-DE')}
            </time>
          ) : null}
          <button
            type='button'
            className='ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted hover:bg-background-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
            aria-label='Mehr Optionen'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setOptionsOpen((prev) => !prev)
            }}
          >
            <DotsHorizontalIcon className='h-5 w-5' />
          </button>
        </div>
      </header>
      {optionsOpen ? (
        <div
          ref={menuRef}
          className='absolute right-4 top-12 z-20 w-60 rounded-2xl border border-border bg-background shadow-2xl'
        >
          <ul className='py-1 text-sm'>
            {menuActions.map((entry) => {
              const Icon = entry.icon
              return (
                <li key={entry.label}>
                  <button
                    type='button'
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-background-subtle'
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setOptionsOpen(false)
                      try {
                        entry.action()
                      } catch {}
                    }}
                  >
                    {Icon ? <Icon className='h-4 w-4 text-foreground-muted' /> : null}
                    <span>{entry.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      <p className='mt-3 text-sm text-foreground'>
        <RichText text={text} className='whitespace-pre-wrap break-words' />
      </p>

      {quoted ? (
        <div
          className={`mt-3 rounded-2xl border border-border bg-background-subtle px-3 py-3 text-sm text-foreground ${
            quoteClickable
              ? 'cursor-pointer transition hover:bg-background-subtle/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70'
              : ''
          }`}
          data-component='BskyQuoteCard'
          role={quoteClickable ? 'button' : undefined}
          tabIndex={quoteClickable ? 0 : undefined}
          onClick={quoteClickable ? handleSelectQuoted : undefined}
          onKeyDown={
            quoteClickable
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    handleSelectQuoted(event)
                  }
                }
              : undefined
          }
        >
          {quotedStatusMessage ? (
            <p className='text-sm text-foreground-muted'>{quotedStatusMessage}</p>
          ) : (
            <div className='flex items-start gap-3'>
              {quoted.author?.avatar ? (
                <img src={quoted.author.avatar} alt='' className='h-10 w-10 shrink-0 rounded-full border border-border object-cover' />
              ) : (
                <div className='h-10 w-10 shrink-0 rounded-full border border-border bg-background-subtle' />
              )}
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-semibold text-foreground'>{quotedAuthorLabel}</p>
                {quotedAuthorMissing ? (
                  <p className='text-xs text-foreground-muted'>Autorinformationen wurden nicht mitgeliefert.</p>
                ) : null}
                {quoted.author?.handle ? (
                  <p className='truncate text-xs text-foreground-muted'>@{quoted.author.handle}</p>
                ) : null}
                {quoted.text ? (
                  <div className='mt-2 text-sm text-foreground'>
                    <RichText text={quoted.text} className='whitespace-pre-wrap break-words text-sm text-foreground' />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className='mt-3' data-component='BskySkeetImages'>
          {images.length === 1 ? (
            <div
              role='button'
              tabIndex={0}
              className='group block cursor-zoom-in rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60'
              onClick={(event) => handleMediaPreview(event, 0)}
              onKeyDown={(event) => handleMediaKeyDown(event, 0)}
              aria-label='Bild vergrößert anzeigen'
            >
              <img
                src={images[0].src}
                alt={images[0].alt || ''}
                className='w-full rounded-xl border border-border'
                style={{
                  ...(config?.mode === 'fixed'
                    ? { height: (config?.singleMax ?? 360), maxHeight: (config?.singleMax ?? 360) }
                    : { maxHeight: (config?.singleMax ?? 360) }),
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  backgroundColor: 'var(--background-subtle, #f6f6f6)'
                }}
                loading='lazy'
              />
            </div>
          ) : (
            <div className='grid gap-2'
              style={{ gridTemplateColumns: images.length === 2 ? '1fr 1fr' : '1fr 1fr' }}
            >
              {images.map((im, idx) => (
                <div
                  key={idx}
                  role='button'
                  tabIndex={0}
                  className='cursor-zoom-in rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60'
                  onClick={(event) => handleMediaPreview(event, idx)}
                  onKeyDown={(event) => handleMediaKeyDown(event, idx)}
                  aria-label='Bild vergrößert anzeigen'
                >
                  <img
                    src={im.src}
                    alt={im.alt || ''}
                    className='w-full rounded-xl border border-border'
                    style={{
                      ...(config?.mode === 'fixed'
                        ? { height: (config?.multiMax ?? 180), maxHeight: (config?.multiMax ?? 180) }
                        : { maxHeight: (config?.multiMax ?? 180) }),
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      backgroundColor: 'var(--background-subtle, #f6f6f6)'
                    }}
                    loading='lazy'
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {external && images.length === 0 ? (
        <a
          href={external.uri}
          target='_blank'
          rel='noopener noreferrer nofollow'
          className='mt-3 block rounded-xl border border-border bg-background-subtle hover:bg-background-subtle/80 transition'
          data-component='BskyExternalCard'
        >
          <div className='flex gap-3 p-3 items-start'>
            {external.thumb ? (
              <img
                src={external.thumb}
                alt=''
                className='h-20 w-28 shrink-0 rounded-lg border border-border object-cover'
                loading='lazy'
              />
            ) : null}
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold text-foreground'>{external.title}</p>
              {external.description ? (
                <p className='mt-1 line-clamp-2 text-sm text-foreground-muted'>{external.description}</p>
              ) : null}
              <p className='mt-1 text-xs text-foreground-subtle'>{external.domain}</p>
            </div>
          </div>
        </a>
      ) : null}
    </>
  )

  return (
    <Wrapper className={wrapperClassName} data-variant={variant} data-component='BskySkeetItem' {...wrapperProps}>
      {typeof onSelect === 'function' ? (
        <div
          role='button'
          tabIndex={0}
          className='-mx-1 rounded-xl px-1 py-0.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70 hover:bg-background-subtle/50 cursor-pointer'
          onClick={handleSelect}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              handleSelect(event)
            }
          }}
        >
          {body}
        </div>
      ) : body}
      <footer className='mt-3 flex flex-wrap items-center gap-3 text-sm text-foreground-muted sm:gap-5'>
        <button
          type='button'
          className='group inline-flex items-center gap-2 hover:text-foreground transition'
          title='Antworten'
          onClick={() => {
            if (typeof onReply === 'function') {
              clearError()
              onReply({ uri: item?.uri, cid: item?.cid || item?.raw?.post?.cid })
            }
          }}
        >
          <ChatBubbleIcon className='h-5 w-5 md:h-6 md:w-6' />
          <span className='tabular-nums'>{Number(item?.stats?.replyCount ?? 0)}</span>
        </button>
        <RepostMenuButton
          count={repostCount}
          hasReposted={hasReposted}
          busy={busy}
          style={repostStyle}
          onRepost={() => {
            clearError()
            toggleRepost()
          }}
          onQuote={onQuote ? (() => {
            clearError()
            onQuote(item)
          }) : undefined}
        />
        <button
          type='button'
          className={`group inline-flex items-center gap-2 transition ${busy ? 'opacity-60' : ''}`}
          style={likeStyle}
          title='Gefällt mir'
          aria-pressed={hasLiked}
          disabled={busy}
          onClick={toggleLike}
        >
          {hasLiked ? (
            <HeartFilledIcon className='h-5 w-5 md:h-6 md:w-6' />
          ) : (
            <HeartIcon className='h-5 w-5 md:h-6 md:w-6' />
          )}
          <span className='tabular-nums'>{likeCount}</span>
        </button>
        <button
          type='button'
          className='inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-2 py-1 text-xs hover:bg-background-subtle sm:w-auto'
          onClick={(event) => {
            event?.preventDefault()
            event?.stopPropagation()
            copyToClipboard(shareUrl, 'Link kopiert')
          }}
          title='Link kopieren'
        >
          <Share2Icon className='h-4 w-4' />
          Teilen
        </button>
        <button
          type='button'
          className={`w-full inline-flex items-center justify-center gap-2 rounded-full border border-border px-2 py-1 text-xs hover:bg-background-subtle sm:ml-auto sm:w-auto ${refreshing ? 'opacity-60' : ''}`}
          onClick={refresh}
        >
          {refreshing ? 'Aktualisiere…' : 'Aktualisieren'}
        </button>
      </footer>
      {feedbackMessage ? (
        <p className='mt-2 text-xs text-emerald-600'>{feedbackMessage}</p>
      ) : null}
      {actionError ? (
        <p className='mt-2 text-xs text-red-600'>{actionError}</p>
      ) : null}
    </Wrapper>
  )
}
