import { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Modal } from '@bsky-kampagnen-bot/shared-ui'
import {
  BellIcon,
  ChatBubbleIcon,
  HeartIcon,
  LoopIcon,
  MixerHorizontalIcon,
  PersonIcon,
  QuoteIcon,
  TargetIcon
} from '@radix-ui/react-icons'
import { ActorProfileLink, Button, Card, fetchActivitySubscriptions, fetchNotificationPreferences, updateNotificationPreferences, updateActivitySubscription } from '../shared'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { RepostLikeIcon, RepostRepostIcon } from './NotificationSettingsIcons.jsx'

const FILTERABLE_ITEMS = [
  {
    id: 'like',
    labelKey: 'notifications.settings.like',
    fallback: 'Gefällt mir',
    descriptionKey: 'notifications.settings.description.like',
    descriptionFallback: 'Mitteilungen erhalten, wenn Personen deine Posts mit „Gefällt mir“ markieren.',
    icon: HeartIcon,
    type: 'filterable'
  },
  {
    id: 'follow',
    labelKey: 'notifications.settings.follow',
    fallback: 'Neue Follower',
    descriptionKey: 'notifications.settings.description.follow',
    descriptionFallback: 'Mitteilungen erhalten, wenn dir jemand folgt.',
    icon: PersonIcon,
    type: 'filterable'
  },
  {
    id: 'reply',
    labelKey: 'notifications.settings.reply',
    fallback: 'Antworten',
    descriptionKey: 'notifications.settings.description.reply',
    descriptionFallback: 'Mitteilungen erhalten, wenn jemand auf deine Posts antwortet.',
    icon: ChatBubbleIcon,
    type: 'filterable'
  },
  {
    id: 'mention',
    labelKey: 'notifications.settings.mention',
    fallback: 'Erwähnungen',
    descriptionKey: 'notifications.settings.description.mention',
    descriptionFallback: 'Mitteilungen erhalten, wenn dich jemand erwähnt.',
    icon: TargetIcon,
    type: 'filterable'
  },
  {
    id: 'quote',
    labelKey: 'notifications.settings.quote',
    fallback: 'Zitate',
    descriptionKey: 'notifications.settings.description.quote',
    descriptionFallback: 'Mitteilungen erhalten, wenn jemand deine Posts zitiert.',
    icon: QuoteIcon,
    type: 'filterable'
  },
  {
    id: 'repost',
    labelKey: 'notifications.settings.repost',
    fallback: 'Reposts',
    descriptionKey: 'notifications.settings.description.repost',
    descriptionFallback: 'Mitteilungen erhalten, wenn jemand deine Posts repostet.',
    icon: LoopIcon,
    type: 'filterable'
  },
  {
    id: 'likeViaRepost',
    labelKey: 'notifications.settings.likeViaRepost',
    fallback: '„Gefällt mir“ für deine Reposts',
    descriptionKey: 'notifications.settings.description.likeViaRepost',
    descriptionFallback: 'Mitteilungen erhalten, wenn Personen Posts mit „Gefällt mir“ markieren, die du repostet hast.',
    icon: RepostLikeIcon,
    type: 'filterable'
  },
  {
    id: 'repostViaRepost',
    labelKey: 'notifications.settings.repostViaRepost',
    fallback: 'Reposts deiner Reposts',
    descriptionKey: 'notifications.settings.description.repostViaRepost',
    descriptionFallback: 'Mitteilungen erhalten, wenn jemand Posts repostet, die du repostet hast.',
    icon: RepostRepostIcon,
    type: 'filterable'
  }
]

const ACTIVITY_ITEM = {
  id: 'subscribedPost',
  labelKey: 'notifications.settings.activity',
  fallback: 'Aktivität von anderen',
  descriptionKey: 'notifications.settings.description.activity',
  descriptionFallback: 'Mitteilungen zu Posts und Antworten von ausgewählten Accounts erhalten.',
  icon: BellIcon,
  type: 'activity'
}
const MISC_ITEM = {
  id: 'starterpackJoined',
  labelKey: 'notifications.settings.misc',
  fallback: 'Alles andere',
  descriptionKey: 'notifications.settings.description.misc',
  descriptionFallback: 'Mitteilungen für alles andere, z. B. wenn jemand über eines deiner Startpakete beitritt.',
  icon: MixerHorizontalIcon,
  type: 'misc'
}
const MISC_SYNC_IDS = ['verified', 'unverified']
const PREFERENCE_ITEMS = [ACTIVITY_ITEM, MISC_ITEM]

const DEFAULT_FILTERABLE = {
  include: 'all',
  list: true,
  push: true
}

const DEFAULT_PREFERENCE = {
  list: true,
  push: true
}

function normalizeFilterable (value) {
  if (!value || typeof value !== 'object') return { ...DEFAULT_FILTERABLE }
  return {
    include: value.include || 'all',
    list: Boolean(value.list),
    push: Boolean(value.push)
  }
}

function normalizePreference (value) {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PREFERENCE }
  return {
    list: Boolean(value.list),
    push: Boolean(value.push)
  }
}

function buildFilterableSummary (entry, t) {
  const channels = []
  if (entry.list) channels.push(t('notifications.settings.channels.inApp', 'In-App'))
  if (entry.push) channels.push(t('notifications.settings.channels.push', 'Push'))
  if (channels.length === 0) {
    return t('notifications.settings.channels.off', 'Aus')
  }
  const includeLabel = entry.include === 'follows'
    ? t('notifications.settings.include.follows', 'Personen, denen ich folge')
    : t('notifications.settings.include.all', 'Alle')
  return `${channels.join(', ')}, ${includeLabel}`
}

function buildPreferenceSummary (entry, t, { includeList = true } = {}) {
  const channels = []
  if (includeList && entry.list) channels.push(t('notifications.settings.channels.inApp', 'In-App'))
  if (entry.push) channels.push(t('notifications.settings.channels.push', 'Push'))
  if (channels.length === 0) {
    return t('notifications.settings.channels.off', 'Aus')
  }
  return channels.join(', ')
}

function pickRelevantPrefs (prefs) {
  const normalized = {}
  FILTERABLE_ITEMS.forEach((item) => {
    normalized[item.id] = normalizeFilterable(prefs?.[item.id])
  })
  PREFERENCE_ITEMS.forEach((item) => {
    normalized[item.id] = normalizePreference(prefs?.[item.id])
  })
  MISC_SYNC_IDS.forEach((id) => {
    normalized[id] = normalizePreference(prefs?.[id])
  })
  return normalized
}

export default function NotificationSettingsModal ({ open, onClose, onProfileOpen }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [localPrefs, setLocalPrefs] = useState(() => pickRelevantPrefs(null))
  const [initialPrefs, setInitialPrefs] = useState(() => pickRelevantPrefs(null))
  const [activityState, setActivityState] = useState({
    items: [],
    cursor: null,
    loading: false,
    loadingMore: false,
    error: '',
    loaded: false
  })
  const [activityEditor, setActivityEditor] = useState({
    open: false,
    profile: null,
    draft: { post: true, reply: true },
    initial: { post: true, reply: true },
    saving: false,
    error: ''
  })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    setExpandedId(null)
    fetchNotificationPreferences()
      .then((data) => {
        if (cancelled) return
        const prefs = pickRelevantPrefs(data?.preferences || data)
        setLocalPrefs(prefs)
        setInitialPrefs(prefs)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || t('notifications.settings.loadError', 'Einstellungen konnten nicht geladen werden.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, t])

  const hasChanges = useMemo(() => {
    return JSON.stringify(localPrefs) !== JSON.stringify(initialPrefs)
  }, [initialPrefs, localPrefs])

  const handleToggleExpanded = (id) => {
    setExpandedId((current) => (current === id ? null : id))
  }

  const updateEntry = (id, patch) => {
    setLocalPrefs((current) => ({
      ...current,
      [id]: { ...current[id], ...patch }
    }))
  }

  const updateEntries = (ids, patch) => {
    setLocalPrefs((current) => {
      const next = { ...current }
      ids.forEach((id) => {
        next[id] = { ...next[id], ...patch }
      })
      return next
    })
  }

  const loadActivitySubscriptions = useCallback(async ({ cursor, append = false } = {}) => {
    setActivityState((current) => ({
      ...current,
      loading: append ? current.loading : true,
      loadingMore: append,
      error: ''
    }))
    try {
      const res = await fetchActivitySubscriptions({ limit: 50, cursor })
      const nextItems = Array.isArray(res?.subscriptions) ? res.subscriptions : []
      setActivityState((current) => ({
        items: append ? [...current.items, ...nextItems] : nextItems,
        cursor: res?.cursor || null,
        loading: false,
        loadingMore: false,
        error: '',
        loaded: true
      }))
    } catch (err) {
      setActivityState((current) => ({
        ...current,
        loading: false,
        loadingMore: false,
        error: err?.message || t('notifications.settings.activityLoadError', 'Aktivitätsabos konnten nicht geladen werden.'),
        loaded: true
      }))
    }
  }, [t])

  const openActivityEditor = useCallback((profile) => {
    if (!profile) return
    const subscription = profile?.viewer?.activitySubscription
    const initial = {
      post: Boolean(subscription?.post ?? true),
      reply: Boolean(subscription?.reply ?? true)
    }
    setActivityEditor({
      open: true,
      profile,
      draft: { ...initial },
      initial,
      saving: false,
      error: ''
    })
  }, [])

  const closeActivityEditor = useCallback(() => {
    setActivityEditor({
      open: false,
      profile: null,
      draft: { post: true, reply: true },
      initial: { post: true, reply: true },
      saving: false,
      error: ''
    })
  }, [])

  const updateActivityDraft = (patch) => {
    setActivityEditor((current) => ({
      ...current,
      draft: { ...current.draft, ...patch }
    }))
  }

  const handleSaveActivitySubscription = useCallback(async () => {
    if (!activityEditor.profile || activityEditor.saving) return
    setActivityEditor((current) => ({ ...current, saving: true, error: '' }))
    try {
      const payload = {
        subject: activityEditor.profile.did,
        activitySubscription: {
          post: Boolean(activityEditor.draft.post),
          reply: Boolean(activityEditor.draft.reply)
        }
      }
      await updateActivitySubscription(payload)
      setActivityState((current) => ({
        ...current,
        items: current.items.map((entry) => (
          entry.did === activityEditor.profile.did
            ? {
                ...entry,
                viewer: {
                  ...(entry.viewer || {}),
                  activitySubscription: payload.activitySubscription
                }
              }
            : entry
        ))
      }))
      closeActivityEditor()
    } catch (err) {
      setActivityEditor((current) => ({
        ...current,
        saving: false,
        error: err?.message || t('notifications.settings.activitySaveError', 'Aktivitätsabo konnte nicht gespeichert werden.')
      }))
    }
  }, [activityEditor.draft.post, activityEditor.draft.reply, activityEditor.profile, activityEditor.saving, closeActivityEditor, t])

  useEffect(() => {
    if (!open) return
    if (expandedId !== ACTIVITY_ITEM.id) return
    if (activityState.loaded || activityState.loading) return
    loadActivitySubscriptions()
  }, [activityState.loaded, activityState.loading, expandedId, loadActivitySubscriptions, open])

  const handleSave = async () => {
    if (saving || !hasChanges) return
    setSaving(true)
    setError('')
    try {
      const payload = {}
      FILTERABLE_ITEMS.forEach((item) => {
        payload[item.id] = normalizeFilterable(localPrefs[item.id])
      })
      PREFERENCE_ITEMS.forEach((item) => {
        payload[item.id] = normalizePreference(localPrefs[item.id])
      })
      MISC_SYNC_IDS.forEach((id) => {
        payload[id] = normalizePreference(localPrefs[id])
      })
      const res = await updateNotificationPreferences(payload)
      const prefs = pickRelevantPrefs(res?.preferences || payload)
      setLocalPrefs(prefs)
      setInitialPrefs(prefs)
      if (typeof onClose === 'function') onClose()
    } catch (err) {
      setError(err?.message || t('notifications.settings.saveError', 'Einstellungen konnten nicht gespeichert werden.'))
    } finally {
      setSaving(false)
    }
  }

  const canSaveActivity = Boolean(
    activityEditor.profile &&
    !activityEditor.saving &&
    (activityEditor.draft.post !== activityEditor.initial.post ||
      activityEditor.draft.reply !== activityEditor.initial.reply)
  )

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t('notifications.settings.title', 'Mitteilungen bearbeiten')}
        panelClassName='w-full max-w-2xl'
        closeOnBackdrop={false}
        actions={(
          <>
            <Button variant='secondary' onClick={onClose} disabled={saving}>
              {t('common.actions.close', 'Schließen')}
            </Button>
            <Button variant='primary' onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? t('common.actions.saving', 'Speichert…') : t('common.actions.save', 'Speichern')}
            </Button>
          </>
        )}
      >
        <div className='space-y-3'>
        <p className='text-sm text-foreground-muted'>
          {t('notifications.settings.subtitle', 'Wähle, welche Mitteilungen im Client oder per Push angezeigt werden.')}
        </p>
        {error ? (
          <p className='text-sm text-red-600'>{error}</p>
        ) : null}
        <div className='min-h-[70vh] max-h-[70vh] space-y-2 overflow-y-auto pr-1'>
          {[...FILTERABLE_ITEMS, ...PREFERENCE_ITEMS].map((item) => {
            const entry = localPrefs[item.id] || (item.type === 'filterable' ? DEFAULT_FILTERABLE : DEFAULT_PREFERENCE)
            const isOpen = expandedId === item.id
            const summary = item.type === 'filterable'
              ? buildFilterableSummary(entry, t)
              : buildPreferenceSummary(entry, t, { includeList: item.type !== 'misc' })
            const description = item.descriptionKey
              ? t(item.descriptionKey, item.descriptionFallback || '')
              : ''
            const ItemIcon = item.icon || null
            return (
              <Card key={item.id} padding='p-0' className='overflow-hidden'>
                <button
                  type='button'
                  className='flex w-full items-start justify-between gap-4 px-4 py-3 text-left'
                  onClick={() => handleToggleExpanded(item.id)}
                  aria-expanded={isOpen}
                >
                  <div className='flex min-w-0 gap-3'>
                    {ItemIcon ? (
                      <span className='mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background-subtle text-foreground-muted'>
                        <ItemIcon className='h-5 w-5' />
                      </span>
                    ) : null}
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold text-foreground'>
                        {t(item.labelKey, item.fallback)}
                      </p>
                      {description ? (
                        <p className='mt-1 text-xs text-foreground-muted'>
                          {description}
                        </p>
                      ) : null}
                      <span className='mt-2 inline-flex rounded-full border border-border bg-background-subtle px-3 py-1 text-xs text-foreground-muted'>
                        {summary}
                      </span>
                    </div>
                  </div>
                  <span className={`mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted ${isOpen ? 'opacity-100' : 'opacity-60'}`}>
                    {isOpen ? t('notifications.settings.actions.close', 'Schließen') : t('notifications.settings.actions.edit', 'Anpassen')}
                  </span>
                </button>
                {isOpen ? (
                  <div className='px-4 pb-4'>
                    <div className='space-y-4 rounded-2xl border border-border-muted bg-background-elevated/50 px-4 py-4 shadow-soft'>
                    {item.type === 'filterable' ? (
                      <>
                        <div className='space-y-2'>
                          <label className='flex items-center gap-3 text-sm text-foreground'>
                            <input
                              type='checkbox'
                              checked={entry.push}
                              onChange={(event) => updateEntry(item.id, { push: event.target.checked })}
                              className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                            />
                            {t('notifications.settings.channels.push', 'Push-Mitteilungen')}
                          </label>
                          <label className='flex items-center gap-3 text-sm text-foreground'>
                            <input
                              type='checkbox'
                              checked={entry.list}
                              onChange={(event) => updateEntry(item.id, { list: event.target.checked })}
                              className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                            />
                            {t('notifications.settings.channels.inApp', 'In-App-Mitteilungen')}
                          </label>
                        </div>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                            {t('notifications.settings.include.title', 'Von')}
                          </p>
                          <div className='mt-2 space-y-2'>
                            <label className='flex items-center gap-3 text-sm text-foreground'>
                              <input
                                type='radio'
                                name={`${item.id}-include`}
                                value='all'
                                checked={entry.include === 'all'}
                                onChange={() => updateEntry(item.id, { include: 'all' })}
                                className='h-4 w-4 border-border text-primary focus:ring-primary'
                              />
                              {t('notifications.settings.include.all', 'Alle')}
                            </label>
                            <label className='flex items-center gap-3 text-sm text-foreground'>
                              <input
                                type='radio'
                                name={`${item.id}-include`}
                                value='follows'
                                checked={entry.include === 'follows'}
                                onChange={() => updateEntry(item.id, { include: 'follows' })}
                                className='h-4 w-4 border-border text-primary focus:ring-primary'
                              />
                              {t('notifications.settings.include.follows', 'Personen, denen ich folge')}
                            </label>
                          </div>
                        </div>
                      </>
                    ) : null}
                    {item.type === 'activity' ? (
                      <>
                        <div className='space-y-2'>
                          <label className='flex items-center gap-3 text-sm text-foreground'>
                            <input
                              type='checkbox'
                              checked={entry.push}
                              onChange={(event) => updateEntry(item.id, { push: event.target.checked })}
                              className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                            />
                            {t('notifications.settings.channels.push', 'Push-Mitteilungen')}
                          </label>
                          <label className='flex items-center gap-3 text-sm text-foreground'>
                            <input
                              type='checkbox'
                              checked={entry.list}
                              onChange={(event) => updateEntry(item.id, { list: event.target.checked })}
                              className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                            />
                            {t('notifications.settings.channels.inApp', 'In-App-Mitteilungen')}
                          </label>
                        </div>
                        <div className='border-t border-border pt-3 space-y-2'>
                          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                            {t('notifications.settings.activityListTitle', 'Abonnierte Accounts')}
                          </p>
                          {activityState.error ? (
                            <p className='text-xs text-red-600'>{activityState.error}</p>
                          ) : null}
                          <div className='max-h-40 overflow-y-auto rounded-lg border border-border bg-background-subtle'>
                            {activityState.loading ? (
                              <p className='px-3 py-2 text-xs text-foreground-muted'>
                                {t('notifications.settings.activityLoading', 'Aktivitätsabos werden geladen…')}
                              </p>
                            ) : null}
                            {!activityState.loading && activityState.items.length === 0 ? (
                              <p className='px-3 py-2 text-xs text-foreground-muted'>
                                {t('notifications.settings.activityEmpty', 'Keine abonnierten Accounts.')}
                              </p>
                            ) : null}
                            {activityState.items.map((profile) => (
                              <div key={profile.did} className='flex items-center gap-3 px-3 py-2 border-t border-border first:border-t-0'>
                                <div className='flex min-w-0 flex-1 items-center gap-3'>
                                  <ActorProfileLink
                                    actor={profile.did}
                                    handle={profile.handle}
                                    label={profile.displayName || profile.handle || profile.did}
                                    className='shrink-0'
                                    onOpen={onProfileOpen}
                                  >
                                    {profile.avatar ? (
                                      <img
                                        src={profile.avatar}
                                        alt=''
                                        className='h-8 w-8 rounded-full border border-border object-cover'
                                        loading='lazy'
                                      />
                                    ) : (
                                      <div className='h-8 w-8 rounded-full border border-border bg-background-subtle' />
                                    )}
                                  </ActorProfileLink>
                                  <div className='min-w-0'>
                                    <ActorProfileLink
                                      actor={profile.did}
                                      handle={profile.handle}
                                      label={profile.displayName || profile.handle || profile.did}
                                      className='block truncate text-sm font-semibold text-foreground'
                                      onOpen={onProfileOpen}
                                    />
                                    <p className='truncate text-xs text-foreground-muted'>
                                      {profile.handle ? `@${profile.handle}` : profile.did}
                                    </p>
                                  </div>
                                </div>
                                <Button variant='secondary' size='pill' onClick={() => openActivityEditor(profile)}>
                                  {t('notifications.settings.activityEdit', 'Bearbeiten')}
                                </Button>
                              </div>
                            ))}
                          </div>
                          {activityState.cursor ? (
                            <div className='pt-1'>
                              <Button
                                variant='secondary'
                                onClick={() => loadActivitySubscriptions({ cursor: activityState.cursor, append: true })}
                                disabled={activityState.loadingMore}
                              >
                                {activityState.loadingMore
                                  ? t('notifications.settings.activityLoadingMore', 'Lädt…')
                                  : t('notifications.settings.activityLoadMore', 'Mehr laden')}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                    {item.type === 'misc' ? (
                      <div className='space-y-2'>
                        <label className='flex items-center gap-3 text-sm text-foreground'>
                          <input
                            type='checkbox'
                            checked={entry.push}
                            onChange={(event) => updateEntries([item.id, ...MISC_SYNC_IDS], { push: event.target.checked })}
                            className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                          />
                          {t('notifications.settings.channels.push', 'Push-Mitteilungen')}
                        </label>
                      </div>
                    ) : null}
                    </div>
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
        <div className='min-h-[1.25rem]'>
          {loading ? (
            <p className='text-xs text-foreground-muted'>
              {t('notifications.settings.loading', 'Einstellungen werden geladen…')}
            </p>
          ) : null}
        </div>
        </div>
      </Modal>
      <Modal
        open={activityEditor.open}
        onClose={closeActivityEditor}
        closeOnBackdrop
        panelClassName='w-full max-w-sm'
        actions={(
          <Button
            variant='primary'
            className='w-full'
            onClick={handleSaveActivitySubscription}
            disabled={!canSaveActivity}
          >
            {activityEditor.saving
              ? t('notifications.settings.activitySaving', 'Speichert…')
              : t('notifications.settings.activitySave', 'Änderungen speichern')}
          </Button>
        )}
      >
        {activityEditor.profile ? (
          <div className='space-y-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-lg font-semibold text-foreground'>
                  {t('notifications.settings.activityDialogTitle', 'Halte mich auf dem Laufenden')}
                </h3>
                <p className='mt-1 text-sm text-foreground-muted'>
                  {t('notifications.settings.activityDialogSubtitle', 'Erhalte Mitteilungen über die Aktivitäten dieses Accounts')}
                </p>
              </div>
              <button
                type='button'
                onClick={closeActivityEditor}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background-subtle'
                aria-label={t('common.actions.close', 'Schließen')}
              >
                <span aria-hidden>×</span>
              </button>
            </div>
            <div className='flex items-center gap-3'>
              {activityEditor.profile.avatar ? (
                <img
                  src={activityEditor.profile.avatar}
                  alt=''
                  className='h-10 w-10 rounded-full border border-border object-cover'
                  loading='lazy'
                />
              ) : (
                <div className='h-10 w-10 rounded-full border border-border bg-background-subtle' />
              )}
              <div className='min-w-0'>
                <p className='text-sm font-semibold text-foreground'>
                  {activityEditor.profile.displayName || activityEditor.profile.handle || activityEditor.profile.did}
                </p>
                <p className='text-xs text-foreground-muted'>
                  {activityEditor.profile.handle ? `@${activityEditor.profile.handle}` : activityEditor.profile.did}
                </p>
              </div>
            </div>
            <div className='space-y-3'>
              <label className='flex items-center justify-between gap-3 rounded-xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground'>
                {t('notifications.settings.activityPosts', 'Posts')}
                <input
                  type='checkbox'
                  checked={activityEditor.draft.post}
                  onChange={(event) => updateActivityDraft({ post: event.target.checked })}
                  className='h-5 w-5 rounded border-border text-primary focus:ring-primary'
                />
              </label>
              <label className='flex items-center justify-between gap-3 rounded-xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground'>
                {t('notifications.settings.activityReplies', 'Antworten')}
                <input
                  type='checkbox'
                  checked={activityEditor.draft.reply}
                  onChange={(event) => updateActivityDraft({ reply: event.target.checked })}
                  className='h-5 w-5 rounded border-border text-primary focus:ring-primary'
                />
              </label>
            </div>
            {activityEditor.error ? (
              <p className='text-sm text-red-600'>{activityEditor.error}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  )
}

NotificationSettingsModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onProfileOpen: PropTypes.func
}
