import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@bsky-kampagnen-bot/shared-ui'
import { fetchProfile } from './api/bsky.js'
import { useAppState } from '../../context/AppContext.jsx'

const profileCache = new Map()
const numberFormatter = new Intl.NumberFormat('de-DE')

const noop = () => {}

function formatNumber (value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.', ',')}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.', ',')}Tsd`
  return numberFormatter.format(num)
}

function getDocument () {
  if (typeof globalThis !== 'undefined' && globalThis.document) return globalThis.document
  return null
}

function usePortalContainer () {
  const [container, setContainer] = useState(null)
  useEffect(() => {
    const doc = getDocument()
    if (!doc) return
    const el = doc.createElement('div')
    doc.body.appendChild(el)
    setContainer(el)
    return () => {
      doc.body.removeChild(el)
    }
  }, [])
  return container
}

function ProfileCardSkeleton () {
  return (
    <div className='w-[320px]'>
      <div className='flex items-start gap-3'>
        <div className='h-12 w-12 shrink-0 animate-pulse rounded-full bg-background-subtle' />
        <div className='min-w-0 flex-1 space-y-1 pt-1'>
          <div className='h-5 w-3/4 animate-pulse rounded bg-background-subtle' />
          <div className='h-4 w-1/2 animate-pulse rounded bg-background-subtle' />
        </div>
      </div>
      <div className='mt-4 flex gap-4'>
        <div className='h-5 w-24 animate-pulse rounded bg-background-subtle' />
        <div className='h-5 w-20 animate-pulse rounded bg-background-subtle' />
      </div>
    </div>
  )
}

function ProfileCard ({ profile, loading, error, onMouseEnter, onMouseLeave }) {
  const content = useMemo(() => {
    if (loading) {
      return <ProfileCardSkeleton />
    }
    if (error) {
      return <p className='text-sm text-destructive'>{error}</p>
    }
    if (!profile) {
      return <p className='text-sm text-foreground-muted'>Keine Profildaten gefunden.</p>
    }
    return (
      <>
        <div className='flex items-start gap-3'>
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt=''
              className='h-12 w-12 shrink-0 rounded-full border border-border object-cover'
              loading='lazy'
            />
          ) : (
            <div className='h-12 w-12 shrink-0 rounded-full border border-border bg-background-subtle' />
          )}
          <div className='min-w-0'>
            <p className='truncate text-base font-semibold text-foreground'>{profile.displayName || profile.handle}</p>
            <p className='truncate text-sm text-foreground-muted'>@{profile.handle}</p>
            {(profile.viewer?.followedBy || profile.viewer?.following) ? (
              <div className='mt-1 flex flex-wrap items-center gap-2'>
                {profile.viewer?.followedBy ? (
                  <span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'>
                    Folgt dir
                  </span>
                ) : null}
                {profile.viewer?.following ? (
                  <span className='inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-foreground'>
                    Folge ich
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className='mt-3 flex gap-4 text-sm text-foreground'>
          <div>
            <span className='font-semibold text-foreground'>{formatNumber(profile.followersCount)}</span>{' '}
            <span className='text-foreground-muted'>Follower</span>
          </div>
          <div>
            <span className='font-semibold text-foreground'>{formatNumber(profile.followsCount)}</span>{' '}
            <span className='text-foreground-muted'>Folgt</span>
          </div>
        </div>
        {profile.description ? (
          <p className='mt-3 text-sm text-foreground whitespace-pre-line'>{profile.description}</p>
        ) : null}
        {Array.isArray(profile.labels) && profile.labels.length > 0 ? (
          <div className='mt-3 flex flex-wrap gap-2'>
            {profile.labels.slice(0, 4).map((label, index) => (
              <span key={index} className='rounded-full bg-background-subtle px-2 py-0.5 text-xs text-foreground-muted'>
                {label?.val || label?.identifier || 'Label'}
              </span>
            ))}
          </div>
        ) : null}
      </>
    )
  }, [profile, loading, error])

  return (
    <Card
      as='div'
      padding='p-4'
      className='w-[320px] shadow-2xl shadow-black/10'
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {content}
    </Card>
  )
}

export function ProfilePreviewTrigger ({
  actor,
  fallback,
  children,
  className = '',
  as: Component = 'span',
  style,
  disablePreview = false
}) {
  const triggerRef = useRef(null)
  const hoverTimeoutRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const portalContainer = usePortalContainer()
  const { profileViewer } = useAppState()
  const [supportsHover, setSupportsHover] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const handler = (event) => setSupportsHover(event.matches)
    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const updatePosition = useCallback(() => {
    const doc = getDocument()
    if (!doc) return
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cardWidth = 320
    const gap = 10
    const bodyWidth = doc.documentElement.clientWidth
    const bodyHeight = doc.documentElement.clientHeight
    const left = Math.min(Math.max(rect.left + rect.width / 2 - cardWidth / 2, 12), bodyWidth - cardWidth - 12)
    const spaceBelow = bodyHeight - rect.bottom
    const estimatedHeight = 240
    const top = spaceBelow > estimatedHeight
      ? rect.bottom + gap
      : Math.max(12, rect.top - gap - estimatedHeight)
    setCoords({ top, left })
  }, [])

  const ensureProfile = useCallback(async () => {
    const key = (actor || '').toLowerCase()
    if (!key) return
    if (profileCache.has(key)) {
      setProfile(profileCache.get(key))
      setLoading(false)
      setError('')
      return
    }
    try {
      setLoading(true)
      setError('')
      const data = await fetchProfile(key)
      profileCache.set(key, data)
      setProfile(data)
    } catch (err) {
      setError(err?.message || 'Profil konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [actor])

  const previewEnabled = supportsHover && !disablePreview && !profileViewer?.open

  const openWithDelay = useCallback(() => {
    if (!actor || !previewEnabled) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      updatePosition()
      setOpen(true)
      if (!profile && !loading) {
        ensureProfile()
      }
    }, 200)
  }, [actor, ensureProfile, loading, profile, updatePosition])

  const closeWithDelay = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 120)
  }, [])

  const handleMouseEnter = useCallback(() => {
    openWithDelay()
  }, [openWithDelay])

  const handleMouseLeave = useCallback(() => {
    closeWithDelay()
  }, [closeWithDelay])

  useEffect(() => {
    if (!open) return
    const doc = getDocument()
    if (!doc) return
    const handleScroll = () => setOpen(false)
    const handlePointerDown = () => setOpen(false)
    doc.addEventListener('scroll', handleScroll, true)
    doc.addEventListener('resize', handleScroll, true)
    doc.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      doc.removeEventListener('scroll', handleScroll, true)
      doc.removeEventListener('resize', handleScroll, true)
      doc.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [open])

  const combinedClassName = ['relative', className].filter(Boolean).join(' ')

  return (
    <>
      <Component
        ref={triggerRef}
        className={combinedClassName}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={openWithDelay}
        onBlur={closeWithDelay}
      >
        {children}
      </Component>
      {open && portalContainer && typeof coords.top === 'number'
        ? createPortal(
            <div
              className='pointer-events-auto fixed z-[1000]'
              style={{ top: coords.top, left: coords.left }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <ProfileCard
                profile={profile || fallback || null}
                loading={loading && !profileCache.has((actor || '').toLowerCase())}
                error={error}
                onMouseEnter={noop}
                onMouseLeave={noop}
              />
            </div>,
            portalContainer
          )
        : null}
    </>
  )
}
