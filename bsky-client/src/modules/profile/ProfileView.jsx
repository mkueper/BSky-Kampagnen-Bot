import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useAppDispatch } from '../../context/AppContext'
import { useUIState } from '../../context/UIContext.jsx'
import { fetchProfile } from '../shared/api/bsky'
import {
  Card,
  ScrollTopButton,
  InlineMenu,
  InlineMenuTrigger,
  InlineMenuContent,
  InlineMenuItem,
  ConfirmDialog,
  useConfirmDialog
} from '@bsky-kampagnen-bot/shared-ui'
import { muteActor as apiMuteActor, unmuteActor as apiUnmuteActor, blockActor as apiBlockActor, unblockActor as apiUnblockActor } from '../shared/api/bsky'
import ProfilePosts from './ProfilePosts.jsx'
import ProfileMetaSkeleton from './ProfileMetaSkeleton.jsx'
import {
  ArrowLeftIcon,
  ChatBubbleIcon,
  BellIcon,
  DotsHorizontalIcon,
  Link2Icon,
  MagnifyingGlassIcon,
  RocketIcon,
  ListBulletIcon,
  InfoCircledIcon,
  SpeakerModerateIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const numberFormatter = new Intl.NumberFormat('de-DE')
const PROFILE_SCROLL_CONTAINER_ID = 'bsky-profile-scroll-container'

function formatNumber (value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0'
  return numberFormatter.format(num)
}

// This is a simplified view. We can reuse/enhance the ProfileCard from ProfilePreview later.
function ProfileMeta ({ profile, onBack, isOwnProfile = false, tabsStuck = false, onToggleMute, onToggleBlock }) {
  const { t } = useTranslation()
  const relationBadges = useMemo(() => {
    const next = []
    if (profile.viewer?.followedBy) next.push({ label: t('profile.relation.followsYou', 'Folgt dir'), tone: 'primary' })
    if (profile.viewer?.following) next.push({ label: t('profile.relation.youFollow', 'Von dir gefolgt'), tone: 'secondary', hidden: true })
    if (profile.viewer?.muted) next.push({ label: t('profile.relation.muted', 'Stummgeschaltet'), tone: 'muted' })
    if (profile.viewer?.blocking) next.push({ label: t('profile.relation.blocked', 'Blockiert'), tone: 'destructive' })
    if (profile.viewer?.blockedBy) next.push({ label: t('profile.relation.blockedYou', 'Blockiert dich'), tone: 'warning' })
    return next
  }, [profile.viewer, t])
  const labels = Array.isArray(profile.labels) ? profile.labels : []
  const labelsCount = labels.length
  const profileSlug = profile.handle || profile.did || ''
  const displayName = profile.displayName || profileSlug
  const baseProfileUrl = useMemo(() => {
    if (!profileSlug) return ''
    return `https://bsky.app/profile/${encodeURIComponent(profileSlug)}`
  }, [profileSlug])
  const stats = useMemo(() => ([
    { label: t('profile.stats.followers', 'Follower'), value: formatNumber(profile.followersCount), href: baseProfileUrl ? `${baseProfileUrl}/followers` : null },
    { label: t('profile.stats.following', 'Folge ich'), value: formatNumber(profile.followsCount), href: baseProfileUrl ? `${baseProfileUrl}/follows` : null },
    { label: t('profile.stats.posts', 'Beiträge'), value: formatNumber(profile.postsCount), href: baseProfileUrl || null }
  ]), [baseProfileUrl, profile.followersCount, profile.followsCount, profile.postsCount, t])
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

  const menuItems = useMemo(() => {
    const muted = Boolean(profile?.viewer?.muted)
    const blocking = Boolean(profile?.viewer?.blocking)
    return [
      { label: t('profile.menu.copyLink', 'Link zum Profil kopieren'), icon: Link2Icon, onSelect: copyProfileLink, disabled: !baseProfileUrl },
      { label: t('profile.menu.searchPosts', 'Posts durchsuchen'), icon: MagnifyingGlassIcon, disabled: true },
      { label: t('profile.menu.addStarterPack', 'Zu Startpaketen hinzufügen'), icon: RocketIcon, disabled: true },
      { label: t('profile.menu.addToList', 'Zu Listen hinzufügen'), icon: ListBulletIcon, disabled: true, dividerAfter: true },
      { label: muted ? t('profile.menu.unmute', 'Stummschaltung aufheben') : t('profile.menu.mute', 'Account stummschalten'), icon: SpeakerModerateIcon, onSelect: onToggleMute, disabled: !onToggleMute },
      { label: blocking ? t('profile.menu.unblock', 'Blockierung aufheben') : t('profile.menu.block', 'Account blockieren'), icon: CrossCircledIcon, onSelect: onToggleBlock, disabled: !onToggleBlock },
      { label: t('profile.menu.report', 'Account melden'), icon: ExclamationTriangleIcon, disabled: true }
    ]
  }, [baseProfileUrl, copyProfileLink, profile, onToggleMute, onToggleBlock, t])

  const isFollowing = Boolean(profile.viewer?.following)
  const followLabel = isFollowing ? t('profile.follow.following', 'Gefolgt') : t('profile.follow.follow', 'Folgen')
  const followTitle = isFollowing
    ? t('profile.follow.followingTitle', 'Du folgst diesem Profil bereits')
    : t('profile.follow.followTitle', 'Folgen (bald verfügbar)')
  const circleButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition hover:border-foreground/70'

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
                aria-label={t('profile.actions.back', 'Zurück')}
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
                className='inline-flex items-center rounded-full border border-border/70 bg-background/80 px-4 py-1.5 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:border-foreground/70'
              >
                {t('profile.actions.editProfile', 'Profil bearbeiten')}
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
                aria-label={t('profile.actions.notificationsLabel', 'Benachrichtigungen verwalten')}
                title={t('profile.actions.notificationsTitle', 'Benachrichtigungen (bald verfügbar)')}
                className={circleButtonClass}
              >
                <BellIcon className='h-4 w-4' />
              </button>
              <button
                type='button'
                disabled
                aria-label={t('profile.actions.messageLabel', 'Nachricht senden')}
                title={t('profile.actions.messageTitle', 'Nachricht (bald verfügbar)')}
                className={circleButtonClass}
              >
                <ChatBubbleIcon className='h-4 w-4' />
              </button>
              <button
                type='button'
                disabled
                title={followTitle}
                className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ${
                  isFollowing
                    ? 'border border-primary/60 bg-primary/15 text-primary'
                    : 'border border-border bg-background text-foreground'
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
                      : badge.tone === 'warning'
                        ? 'bg-amber-100 text-amber-800'
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
              <span>{t('profile.labels.assigned', labelsCount === 1 ? '1 Kennzeichnung wurde diesem Account zugeordnet' : '{count} Kennzeichnungen wurden diesem Account zugeordnet', { count: labelsCount })}</span>
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
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const defaultMenuItems = useMemo(() => ([
    { label: t('profile.menu.copyLink', 'Link zum Profil kopieren'), icon: Link2Icon, disabled: true },
    { label: t('profile.menu.searchPosts', 'Posts durchsuchen'), icon: MagnifyingGlassIcon, disabled: true, dividerAfter: true },
    { label: t('profile.menu.addStarterPack', 'Zu Startpaketen hinzufügen'), icon: RocketIcon, disabled: true },
    { label: t('profile.menu.addToList', 'Zu Listen hinzufügen'), icon: ListBulletIcon, disabled: true, dividerAfter: true },
    { label: t('profile.menu.mute', 'Account stummschalten'), icon: SpeakerModerateIcon, disabled: true },
    { label: t('profile.menu.block', 'Account blockieren'), icon: CrossCircledIcon, disabled: true },
    { label: t('profile.menu.report', 'Account melden'), icon: ExclamationTriangleIcon, disabled: true }
  ]), [t])

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
    <InlineMenu open={open} onOpenChange={setOpen}>
      <InlineMenuTrigger asChild>
        <button
          type='button'
          aria-label={t('profile.actions.moreLabel', 'Weitere Aktionen')}
          title={t('profile.actions.moreTitle', 'Aktionen')}
          className={triggerClassName || 'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm'}
        >
          <DotsHorizontalIcon className='h-4 w-4' />
        </button>
      </InlineMenuTrigger>
      <InlineMenuContent align='end' side='top' sideOffset={10} style={{ width: 240 }}>
        <div className='py-1'>
          {menuItems.map((item, index) => (
            <div key={`${item.label}-${index}`}>
              <InlineMenuItem
                icon={item.icon}
                disabled={item.disabled}
                onSelect={() => handleMenuItemClick(item)}
              >
                {item.label}
              </InlineMenuItem>
              {item.dividerAfter ? <div className='my-1 border-t border-border/60' /> : null}
            </div>
          ))}
        </div>
        {relationBadges.some((badge) => !badge.hidden) ? (
          <div className='border-t border-border/60'>
            <p className='px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>{t('profile.menu.relationHeading', 'Beziehung')}</p>
            <div className='flex flex-wrap gap-1 px-3 pb-2'>
              {relationBadges.filter((badge) => !badge.hidden).map((badge, index) => (
                <span
                  key={`${badge.label}-${index}`}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    badge.tone === 'destructive'
                      ? 'bg-destructive/10 text-destructive'
                      : badge.tone === 'warning'
                        ? 'bg-amber-100 text-amber-800'
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
            <p className='px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'>{t('profile.menu.labelsHeading', 'Labels')}</p>
            <div className='max-h-48 overflow-y-auto'>
              {labels.map((label, index) => (
                <div key={`${label?.identifier || label?.val || index}-${index}`} className='px-3 py-1 text-sm text-foreground'>
                  {label?.val || label?.identifier || t('profile.menu.labelFallback', 'Label')}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </InlineMenuContent>
    </InlineMenu>
  )
}

export default function ProfileView ({
  actor: actorOverride = null,
  onClose,
  onHeadlineChange,
  showHeroBackButton = true
}) {
  const { t } = useTranslation()
  const { profileActor, me } = useUIState()
  const dispatch = useAppDispatch()
  const actor = (actorOverride || profileActor || '').trim()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const [tabsStuck, setTabsStuck] = useState(false)
  const containerRef = useRef(null)
  const tabsWrapperRef = useRef(null)
  const tabsSentinelRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose()
    } else {
      dispatch({ type: 'SET_SECTION', payload: 'home' })
    }
  }, [dispatch, onClose])

  useEffect(() => {
    if (typeof onHeadlineChange !== 'function') return
    if (profile) {
      onHeadlineChange({
        displayName: profile.displayName || '',
        handle: profile.handle || '',
        did: profile.did || '',
        actor
      })
    } else {
      onHeadlineChange(null)
    }
  }, [profile, actor, onHeadlineChange])

  // Haupt-Effekt zum Laden des Profils. Wird nur durch den `actor` getriggert.
  useEffect(() => {
    if (!actor) {
      setError(t('profile.errors.noActor', 'Kein Profil zum Anzeigen ausgewählt.'))
      setLoading(false)
      return
    }
    let ignore = false
    const loadProfile = async () => {
      // Setze alles zurück, wenn ein neues Profil geladen wird
      setLoading(true)
      setError('')
      setProfile(null)
      setActiveTab('posts')
      try {
        const data = await fetchProfile(actor)
        if (!ignore) {
          setProfile(data)
        }
      } catch (err) {
        if (!ignore) {
        setError(err.message || t('profile.errors.loadFailed', 'Profil konnte nicht geladen werden.'))
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

  const isOwnProfile = useMemo(() => {
    if (!profile || !me) return false
    return me.did === profile.did
  }, [me, profile])
  const isBlockedBy = Boolean(profile?.viewer?.blockedBy)
  const isBlocking = Boolean(profile?.viewer?.blocking)
  const isInteractionBlocked = isBlockedBy || isBlocking

  const { dialog: confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

  const toggleMute = useCallback(() => {
    if (!profile || !profile.did) return
    const currentlyMuted = Boolean(profile.viewer?.muted)
    openConfirm({
      title: currentlyMuted
        ? t('profile.confirm.unmute.title', 'Stummschaltung aufheben')
        : t('profile.confirm.mute.title', 'Account stummschalten'),
      description: currentlyMuted
        ? t('profile.confirm.unmute.description', 'Die Stummschaltung dieses Accounts aufheben?')
        : t('profile.confirm.mute.description', 'Beiträge dieses Accounts stummschalten? Diese Beiträge werden ausgeblendet.'),
      confirmLabel: currentlyMuted
        ? t('profile.confirm.unmute.confirm', 'Aufheben')
        : t('profile.confirm.mute.confirm', 'Stummschalten'),
      variant: currentlyMuted ? 'secondary' : 'destructive',
      onConfirm: async () => {
        // Optimistisches Update
        setProfile((prev) => (prev ? { ...prev, viewer: { ...(prev.viewer || {}), muted: !currentlyMuted } } : prev))
        try {
          if (currentlyMuted) {
            await apiUnmuteActor(profile.did)
          } else {
            await apiMuteActor(profile.did)
          }
        } catch (err) {
          // Rollback
          setProfile((prev) => (prev ? { ...prev, viewer: { ...(prev.viewer || {}), muted: currentlyMuted } } : prev))
          setError(err?.message || t('profile.errors.muteToggleFailed', 'Stummschalten fehlgeschlagen'))
        }
      }
    })
  }, [profile, openConfirm])

  const toggleBlock = useCallback(() => {
    if (!profile || !profile.did) return
    const currentBlockingValue = profile.viewer?.blocking
    const blockingUri = typeof currentBlockingValue === 'string' ? currentBlockingValue : null
    const currentlyBlocking = Boolean(currentBlockingValue)
    const applyBlockingState = (value) => {
      setProfile((prev) => (prev ? { ...prev, viewer: { ...(prev.viewer || {}), blocking: value } } : prev))
    }
    openConfirm({
      title: currentlyBlocking
        ? t('profile.confirm.unblock.title', 'Blockierung aufheben')
        : t('profile.confirm.block.title', 'Account blockieren'),
      description: currentlyBlocking
        ? t('profile.confirm.unblock.description', 'Blockierung dieses Accounts aufheben?')
        : t('profile.confirm.block.description', 'Blockierte Accounts werden ausgeblendet und können nicht interagieren.'),
      confirmLabel: currentlyBlocking
        ? t('profile.confirm.unblock.confirm', 'Aufheben')
        : t('profile.confirm.block.confirm', 'Blockieren'),
      variant: currentlyBlocking ? 'secondary' : 'destructive',
      onConfirm: async () => {
        if (currentlyBlocking) {
          applyBlockingState(null)
          try {
            await apiUnblockActor(profile.did, { blockUri: blockingUri })
          } catch (err) {
            applyBlockingState(currentBlockingValue || true)
            setError(err?.message || t('profile.errors.unblockFailed', 'Blockierung aufheben fehlgeschlagen'))
          }
          return
        }
        applyBlockingState(true)
        try {
          const result = await apiBlockActor(profile.did)
          const nextUri = result?.uri || null
          applyBlockingState(nextUri || true)
        } catch (err) {
          applyBlockingState(null)
          setError(err?.message || t('profile.errors.blockFailed', 'Blockieren fehlgeschlagen'))
        }
      }
    })
  }, [profile, openConfirm])

  const tabConfig = useMemo(() => ([
    { id: 'posts', label: t('profile.tabs.posts', 'Beiträge'), disabled: false },
    { id: 'replies', label: t('profile.tabs.replies', 'Antworten'), disabled: false },
    { id: 'media', label: t('profile.tabs.media', 'Medien'), disabled: false },
    { id: 'videos', label: t('profile.tabs.videos', 'Videos'), disabled: false },
    { id: 'likes', label: t('profile.tabs.likes', 'Likes'), disabled: !isOwnProfile }
  ]), [isOwnProfile, t])

  useEffect(() => {
    if (!isOwnProfile && activeTab === 'likes') {
      setActiveTab('posts')
    }
  }, [isOwnProfile, activeTab])

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
        <Card padding='p-4' compact><p>{t('profile.errors.notFound', 'Profil nicht gefunden.')}</p></Card>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      id={PROFILE_SCROLL_CONTAINER_ID}
      className='mx-auto flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto p-3 sm:gap-6 sm:p-4'
    >
      <div className='relative z-10'>
        <ProfileMeta
          profile={profile}
          onBack={showHeroBackButton ? handleClose : null}
          isOwnProfile={isOwnProfile}
          tabsStuck={tabsStuck}
          onToggleMute={toggleMute}
          onToggleBlock={toggleBlock}
        />
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
                aria-label={t('profile.actions.back', 'Zurück')}
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
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>
      </div>
      {isInteractionBlocked ? (
        <Card padding='p-4' className='border-border bg-background-subtle text-sm text-foreground'>
          <p className='font-semibold text-foreground'>{t('profile.hidden.heading', 'Beiträge ausgeblendet')}</p>
          <p className='mt-1 text-foreground-muted'>
            {isBlockedBy
              ? t('profile.hidden.blockedBy', 'Dieser Account blockiert dich. Beiträge, Antworten und Medien werden ausgeblendet.')
              : t('profile.hidden.youBlocked', 'Du blockierst diesen Account. Beiträge, Antworten und Medien bleiben ausgeblendet, bis du die Blockierung aufhebst.')}
          </p>
        </Card>
      ) : (() => {
        const allowedTabs = new Set(['posts', 'replies', 'media', 'videos'])
        if (isOwnProfile) allowedTabs.add('likes')
        if (!allowedTabs.has(activeTab)) return null
        return (
          <ProfilePosts
            actor={profile.did}
            actorHandle={profile.handle || ''}
            activeTab={activeTab}
            scrollContainerRef={containerRef}
          />
        )
      })()}
      <ScrollTopButton
        containerId={PROFILE_SCROLL_CONTAINER_ID}
        position='bottom-left'
        offset={20}
        horizontalOffset={16}
      />
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        variant={confirmDialog.variant || 'primary'}
        onConfirm={confirmDialog.onConfirm || closeConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}
