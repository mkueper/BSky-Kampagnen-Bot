import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { fetchProfile, fetchProfileFeed } from '../shared/api/bsky'
import { Card, Button, ScrollTopButton } from '@bsky-kampagnen-bot/shared-ui'
import ProfilePosts from './ProfilePosts.jsx'
import ProfileMetaSkeleton from './ProfileMetaSkeleton.jsx'
import SkeetItem from '../timeline/SkeetItem.jsx'
import {
  ArrowLeftIcon,
  ChatBubbleIcon,
  BellIcon,
  DotsHorizontalIcon,
  Link2Icon,
  MagnifyingGlassIcon,
  RocketIcon,
  ListBulletIcon,
  InfoCircledIcon
} from '@radix-ui/react-icons'

const numberFormatter = new Intl.NumberFormat('de-DE')
const PROFILE_SCROLL_CONTAINER_ID = 'bsky-profile-scroll-container'

function formatNumber (value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0'
  return numberFormatter.format(num)
}

// This is a simplified view. We can reuse/enhance the ProfileCard from ProfilePreview later.
function ProfileMeta ({ profile, onBack, isOwnProfile = false, tabsStuck = false }) {
  const relationBadges = useMemo(() => {
    const next = []
    if (profile.viewer?.followedBy) next.push({ label: 'Folgt dir', tone: 'primary' })
    if (profile.viewer?.following) next.push({ label: 'Von dir gefolgt', tone: 'secondary', hidden: true })
    if (profile.viewer?.muted) next.push({ label: 'Stummgeschaltet', tone: 'muted' })
    if (profile.viewer?.blocking) next.push({ label: 'Blockiert', tone: 'destructive' })
    return next
  }, [profile.viewer])
  const labels = Array.isArray(profile.labels) ? profile.labels : []
  const labelsCount = labels.length
  const profileSlug = profile.handle || profile.did || ''
  const displayName = profile.displayName || profileSlug
  const baseProfileUrl = useMemo(() => {
    if (!profileSlug) return ''
    return `https://bsky.app/profile/${encodeURIComponent(profileSlug)}`
  }, [profileSlug])
  const stats = useMemo(() => ([
    { label: 'Follower', value: formatNumber(profile.followersCount), href: baseProfileUrl ? `${baseProfileUrl}/followers` : null },
    { label: 'Folge ich', value: formatNumber(profile.followsCount), href: baseProfileUrl ? `${baseProfileUrl}/follows` : null },
    { label: 'Posts', value: formatNumber(profile.postsCount), href: baseProfileUrl || null }
  ]), [baseProfileUrl, profile.followersCount, profile.followsCount, profile.postsCount])
  const visibleBadges = relationBadges.filter((badge) => !badge.hidden)

  const copyProfileLink = useCallback(async () => {
    if (!baseProfileUrl) return
    try {
      // Die Clipboard-API ist mittlerweile gut unterstützt.
      // Der Button wird ohnehin deaktiviert, wenn die URL nicht verfügbar ist.
      await navigator.clipboard.writeText(baseProfileUrl)
    } catch (error) {
      console.error('Profil-Link konnte nicht in die Zwischenablage kopiert werden:', error)
    }
  }, [baseProfileUrl])

  const menuItems = useMemo(() => ([
    { label: 'Link zum Profil kopieren', icon: Link2Icon, onSelect: copyProfileLink, disabled: !baseProfileUrl },
    { label: 'Posts durchsuchen', icon: MagnifyingGlassIcon, disabled: true },
    { label: 'Zu Startpaketen hinzufügen', icon: RocketIcon, disabled: true },
    { label: 'Zu Listen hinzufügen', icon: ListBulletIcon, disabled: true }
  ]), [baseProfileUrl, copyProfileLink])

  const isFollowing = Boolean(profile.viewer?.following)
  const followLabel = isFollowing ? 'Gefolgt' : 'Folgen'
  const followTitle = isFollowing ? 'Du folgst diesem Profil bereits' : 'Folgen (bald verfügbar)'
  const circleButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition hover:border-foreground/70 disabled:cursor-not-allowed disabled:opacity-60'

  if (!profile) return null
  return (
    <Card padding='p-0' compact className='overflow-hidden border-border/80 bg-background-elevated shadow-card'>
      <div className='relative h-36 w-full bg-background-subtle sm:h-44'>
        {profile.banner
          ? <img src={profile.banner} alt='' className='absolute inset-0 h-full w-full object-cover' />
          : <div className='absolute inset-0 bg-gradient-to-r from-background via-background-subtle to-background' />}
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60' aria-hidden='true' />
      {typeof onBack === 'function' && !tabsStuck
          ? (
            <div className='absolute left-3 top-3 z-10 sm:left-4 sm:top-4'>
              <button
                type='button'
                onClick={onBack}
              className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-lg backdrop-blur-sm transition hover:border-foreground/70'
                aria-label='Zurück'
              >
                <ArrowLeftIcon className='h-5 w-5' />
              </button>
            </div>
            )
          : null}
        <div className='absolute right-3 -bottom-[44px] z-10 flex flex-wrap items-center justify-end gap-2 sm:right-4 sm:-bottom-12'>
          {isOwnProfile ? (
            <>
              <button
                type='button'
                disabled
                className='inline-flex items-center rounded-full border border-border/70 bg-background/80 px-4 py-1.5 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:border-foreground/70 disabled:cursor-not-allowed disabled:opacity-70'
              >
                Profil bearbeiten
              </button>
              <ProfileActionsMenu
                labels={labels}
                relationBadges={relationBadges}
                triggerClassName={circleButtonClass}
                menuItems={menuItems}
              />
            </>
          ) : (
            <>
              <button
                type='button'
                disabled
                aria-label='Benachrichtigungen verwalten'
                title='Benachrichtigungen (bald verfügbar)'
                className={circleButtonClass}
              >
                <BellIcon className='h-4 w-4' />
              </button>
              <button
                type='button'
                disabled
                aria-label='Nachricht senden'
                title='Nachricht (bald verfügbar)'
                className={circleButtonClass}
              >
                <ChatBubbleIcon className='h-4 w-4' />
              </button>
              <button
                type='button'
                disabled
                title={followTitle}
                className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold disabled:cursor-not-allowed ${
                  isFollowing
                    ? 'border border-primary/60 bg-primary/15 text-primary'
                    : 'border border-border bg-background text-foreground disabled:opacity-70'
                }`}
              >
                {followLabel}
              </button>
              <ProfileActionsMenu
                labels={labels}
                relationBadges={relationBadges}
                triggerClassName={circleButtonClass}
                menuItems={menuItems}
              />
            </>
          )}
        </div>
        <div className='absolute -bottom-12 left-4 sm:-bottom-14 sm:left-6'>
          <div className='h-24 w-24 rounded-full border-4 border-background shadow-xl sm:h-28 sm:w-28'>
            {profile.avatar
              ? <img src={profile.avatar} alt='' className='h-full w-full rounded-full object-cover' />
              : <div className='h-full w-full rounded-full bg-background-subtle' />}
          </div>
        </div>
      </div>
      <div className='px-4 pb-6 pt-16 sm:px-6 sm:pt-20'>
        <div className='flex flex-col gap-5'>
          <div className='flex min-w-0 flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-3'>
              <h1 className='break-words text-2xl font-bold leading-tight text-foreground sm:text-3xl'>{displayName}</h1>
            </div>
            <div className='mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground-muted'>
              {visibleBadges.map((badge, index) => (
                <span
                  key={`${badge.label}-${index}`}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    badge.tone === 'destructive'
                      ? 'bg-destructive/15 text-destructive'
                      : badge.tone === 'muted'
                        ? 'bg-background-subtle text-foreground-muted'
                        : 'bg-border/70 text-foreground'
                  }`}
                >
                  {badge.label}
                </span>
              ))}
              <span className='truncate text-foreground-muted'>@{profileSlug}</span>
            </div>
          </div>
          {profile.description ? (
            <p className='whitespace-pre-wrap break-words text-base leading-6 text-foreground'>{profile.description}</p>
          ) : null}
          {labelsCount > 0 ? (
            <div className='inline-flex items-center gap-2 rounded-full bg-background-subtle px-3 py-0.5 text-xs text-foreground'>
              <InfoCircledIcon className='h-4 w-4 text-foreground-muted' aria-hidden='true' />
              <span>{labelsCount === 1 ? '1 Kennzeichnung wurde diesem Account zugeordnet' : `${labelsCount} Kennzeichnungen wurden diesem Account zugeordnet`}</span>
            </div>
          ) : null}
          <div className='flex flex-wrap gap-x-6 gap-y-3 text-sm text-foreground-muted'>
            {stats.map((stat) => (
              stat.href
                ? (
                  <a
                    key={stat.label}
                    href={stat.href}
                    target='_blank'
                    rel='noreferrer'
                    className='flex items-center gap-2 text-foreground transition hover:text-foreground'
                  >
                    <span className='text-base font-semibold text-foreground'>{stat.value}</span>
                    <span className='text-foreground-muted'>{stat.label}</span>
                  </a>
                  )
                : (
                  <span key={stat.label} className='flex items-center gap-2'>
                    <span className='text-base font-semibold text-foreground'>{stat.value}</span>
                    <span className='text-foreground-muted'>{stat.label}</span>
                  </span>
                  )
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function ProfileActionsMenu ({ labels = [], relationBadges = [], triggerClassName = '', menuItems: customMenuItems }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleInteraction = (event) => {
      // Menü bei Klick ausserhalb oder Escape-Taste schliessen
      if (
        (event.type === 'pointerdown' && containerRef.current && !containerRef.current.contains(event.target)) ||
        (event.type === 'keydown' && event.key === 'Escape')
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleInteraction)
    document.addEventListener('keydown', handleInteraction)
    return () => {
      document.removeEventListener('pointerdown', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  const defaultMenuItems = useMemo(() => ([
    { label: 'Link zum Profil kopieren', icon: Link2Icon, disabled: true },
    { label: 'Posts durchsuchen', icon: MagnifyingGlassIcon, disabled: true },
    { label: 'Zu Startpaketen hinzufügen', icon: RocketIcon, disabled: true },
    { label: 'Zu Listen hinzufügen', icon: ListBulletIcon, disabled: true },
    { label: 'Account stummschalten', disabled: true },
    { label: 'Account blockieren', disabled: true },
    { label: 'Account melden', disabled: true }
  ]), [])

  const menuItems = Array.isArray(customMenuItems) && customMenuItems.length > 0 ? customMenuItems : defaultMenuItems

  const handleMenuItemClick = async (item) => {
    if (item.disabled) return
    try {
      if (typeof item.onSelect === 'function') {
        await item.onSelect()
      }
    } catch (error) {
      console.error('Profilaktion fehlgeschlagen', error)
    } finally {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        aria-label='Weitere Aktionen'
        title='Aktionen'
        className={triggerClassName || 'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-70'}
        onClick={() => setOpen((prev) => !prev)}
      >
        <DotsHorizontalIcon className='h-4 w-4' />
      </button>
      {open ? (
        <div className='absolute right-0 top-full z-30 mt-2 w-60 rounded-2xl border border-border bg-background shadow-soft'>
          <div className='py-1'>
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
              <button
                    key={item.label}
                    type='button'
                    disabled={item.disabled}
                    onClick={() => handleMenuItemClick(item)}
                    className='flex w-full items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    <span className='flex items-center gap-2'>
                      {Icon ? <Icon className='h-4 w-4 text-foreground-muted' /> : null}
                      <span>{item.label}</span>
                    </span>
                  </button>
              )
            })}
          </div>
          {relationBadges.some((badge) => !badge.hidden) ? (
            <div className='border-t border-border/60'>
              <p className='px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Beziehung</p>
              <div className='flex flex-wrap gap-1 px-3 pb-2'>
                {relationBadges.filter((badge) => !badge.hidden).map((badge, index) => (
                  <span
                    key={`${badge.label}-${index}`}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      badge.tone === 'destructive'
                        ? 'bg-destructive/10 text-destructive'
                        : badge.tone === 'muted'
                          ? 'bg-background-subtle text-foreground-muted'
                          : 'bg-border/70 text-foreground'
                    }`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {labels.length > 0 ? (
            <div className='border-t border-border/60'>
              <p className='px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>Labels</p>
              <div className='max-h-48 overflow-y-auto'>
                {labels.map((label, index) => (
                  <div key={`${label?.identifier || label?.val || index}-${index}`} className='px-3 py-1 text-sm text-foreground'>
                    {label?.val || label?.identifier || 'Label'}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function ProfileView ({
  actor: actorOverride = null,
  onClose,
  onSelectPost,
  onReply,
  onQuote,
  onViewMedia
}) {
  const { profileActor, me } = useAppState()
  const dispatch = useAppDispatch()
  const actor = (actorOverride || profileActor || '').trim()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const [feeds, setFeeds] = useState({
    posts: { items: [], cursor: null, error: '', status: 'idle' },
    replies: { items: [], cursor: null, error: '', status: 'idle' },
    media: { items: [], cursor: null, error: '', status: 'idle' }
  })
  const [tabsStuck, setTabsStuck] = useState(false)
  const containerRef = useRef(null)
  const tabsWrapperRef = useRef(null)
  const tabsSentinelRef = useRef(null)

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose()
    } else {
      dispatch({ type: 'SET_SECTION', payload: 'home' })
    }
  }, [dispatch, onClose])

  // Haupt-Effekt zum Laden des Profils. Wird nur durch den `actor` getriggert.
  useEffect(() => {
    if (!actor) {
      setError('Kein Profil zum Anzeigen ausgewählt.')
      setLoading(false)
      return
    }
    let ignore = false
    const loadProfile = async () => {
      // Setze alles zurück, wenn ein neues Profil geladen wird
      setLoading(true)
      setError('')
      setProfile(null)
      setFeeds({
        posts: { items: [], cursor: null, error: '', status: 'idle' },
        replies: { items: [], cursor: null, error: '', status: 'idle' },
        media: { items: [], cursor: null, error: '', status: 'idle' }
      })
      setActiveTab('posts')

      try {
        const data = await fetchProfile(actor)
        if (!ignore) {
          setProfile(data)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Profil konnte nicht geladen werden.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadProfile()
    return () => { ignore = true }
  }, [actor])

  // Effekt zum Laden der Feed-Daten für den aktiven Tab
  useEffect(() => {
    if (!profile || activeTab === 'videos') return

    const currentFeed = feeds[activeTab]
    // Nicht neu laden, wenn bereits geladen oder am Laden
    if (currentFeed.status === 'success' || currentFeed.status === 'loading') {
      return
    }

    let ignore = false
    const loadFeed = async () => {
      setFeeds(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], status: 'loading', error: '' } }))
      try {
        const filterMap = {
          posts: 'posts_no_replies',
          replies: 'posts_with_replies',
          media: 'posts_with_media'
        }
        const { items: nextItemsRaw, cursor: nextCursor } = await fetchProfileFeed({
          actor: profile.did,
          limit: 20,
          filter: filterMap[activeTab]
        })

        if (!ignore) {
          const normalized = activeTab === 'replies'
            ? nextItemsRaw.filter(entry => entry?.raw?.post?.record?.reply?.parent)
            : nextItemsRaw

          setFeeds(prev => ({
            ...prev,
            [activeTab]: { items: normalized, cursor: nextCursor, status: 'success', error: '' }
          }))
        }
      } catch (err) {
        if (!ignore) {
          const message = err.message || 'Beiträge konnten nicht geladen werden.'
          setFeeds(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], status: 'error', error: message } }))
        }
      }
    }

    loadFeed()
    return () => { ignore = true }
  }, [profile, activeTab, feeds])

  const isOwnProfile = useMemo(() => {
    if (!profile || !me) return false
    return me.did === profile.did
  }, [me, profile])
  const tabConfig = useMemo(() => ([
    { id: 'posts', label: 'Beiträge', disabled: false },
    { id: 'replies', label: 'Antworten', disabled: false },
    { id: 'media', label: 'Medien', disabled: false },
    { id: 'videos', label: 'Videos', disabled: true }
  ]), [])

  useEffect(() => {
    const el = containerRef.current
    if (el) {
      el.scrollTop = 0
    }
    setTabsStuck(false)
  }, [actor])

  useEffect(() => {
    const container = containerRef.current
    const sentinel = tabsSentinelRef.current
    if (!container || !sentinel) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      setTabsStuck(entry ? !entry.isIntersecting : false)
    }, {
      root: container,
      threshold: 1
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [actor])

  if (loading) {
    return (
      <div className='mx-auto flex h-full w-full max-w-2xl items-center justify-center p-4'>
        <ProfileMetaSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className='mx-auto flex h-full w-full max-w-2xl items-center justify-center p-4'>
        <Card padding='p-4' compact background='destructive-subtle'><p className='text-destructive'>{error}</p></Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className='mx-auto flex h-full w-full max-w-2xl items-center justify-center p-4'>
        <Card padding='p-4' compact><p>Profil nicht gefunden.</p></Card>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      id={PROFILE_SCROLL_CONTAINER_ID}
      className='mx-auto flex h-full w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto p-3 sm:gap-6 sm:p-4'
    >
      <div className='relative z-10'>
        <ProfileMeta profile={profile} onBack={handleClose} isOwnProfile={isOwnProfile} tabsStuck={tabsStuck} />
      </div>
      <div ref={tabsSentinelRef} aria-hidden='true' className='h-1 w-full' />
      <div ref={tabsWrapperRef} className='sticky -top-4 z-20 -mt-4'>
        <Card padding='p-3 sm:p-4' compact className='relative z-0 space-y-3 border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
          <div className='flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground'>
            {
              <button
                type='button'
                onClick={handleClose}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-foreground/70'
                aria-label='Zurück'
              >
                <ArrowLeftIcon className='h-4 w-4' />
              </button>
            }
            <div className='flex flex-wrap gap-2'>
              {tabConfig.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type='button'
                    disabled={tab.disabled}
                    onClick={() => !tab.disabled && setActiveTab(tab.id)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-foreground hover:border-foreground/60'
                    } ${tab.disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
          {activeTab === 'videos' ? (
            <p className='text-sm text-foreground-muted'>Videos werden bald verfügbar sein.</p>
          ) : null}
        </Card>
      </div>
      {(activeTab === 'posts' || activeTab === 'replies' || activeTab === 'media') ? (
        <ProfilePosts
          actor={profile.did}
          activeTab={activeTab}
          feedData={feeds[activeTab]}
          setFeeds={setFeeds}
          scrollContainerRef={containerRef}
          onSelectPost={onSelectPost}
          onReply={onReply}
          onQuote={onQuote}
          onViewMedia={onViewMedia}
        />
      ) : null}
      <ScrollTopButton
        containerId={PROFILE_SCROLL_CONTAINER_ID}
        position='bottom-left'
        offset={20}
        horizontalOffset={16}
      />
    </div>
  )
}
