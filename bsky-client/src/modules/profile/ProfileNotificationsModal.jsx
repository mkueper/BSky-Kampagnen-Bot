import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, Button } from '@bsky-kampagnen-bot/shared-ui'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { updateActivitySubscription } from '../shared/api/bsky.js'

export default function ProfileNotificationsModal ({ open, profile, onClose, onSaved }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState({ post: false, reply: false })
  const [initial, setInitial] = useState({ post: false, reply: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const subscription = profile?.viewer?.activitySubscription || null
    const next = {
      post: Boolean(subscription?.post),
      reply: Boolean(subscription?.reply)
    }
    setDraft(next)
    setInitial(next)
    setSaving(false)
    setError('')
  }, [open, profile])

  const hasChanges = useMemo(() => {
    return draft.post !== initial.post || draft.reply !== initial.reply
  }, [draft, initial])

  const canSave = hasChanges && !saving

  const handleTogglePosts = useCallback((checked) => {
    setDraft((current) => ({
      post: checked,
      reply: checked ? current.reply : false
    }))
  }, [])

  const handleToggleReplies = useCallback((checked) => {
    setDraft((current) => ({
      post: checked ? true : current.post,
      reply: checked
    }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!canSave || !profile?.did) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        subject: profile.did,
        activitySubscription: {
          post: Boolean(draft.post),
          reply: Boolean(draft.reply)
        }
      }
      await updateActivitySubscription(payload)
      onSaved?.(payload.activitySubscription)
      onClose?.()
    } catch (err) {
      setError(err?.message || t('notifications.settings.activitySaveError', 'Aktivitätsabo konnte nicht gespeichert werden.'))
      setSaving(false)
    }
  }, [canSave, draft.post, draft.reply, onClose, onSaved, profile?.did, t])

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnBackdrop
      panelClassName='w-full max-w-sm'
      actions={(
        <Button variant='primary' className='w-full' onClick={handleSave} disabled={!canSave}>
          {saving
            ? t('notifications.settings.activitySaving', 'Speichert…')
            : t('notifications.settings.activitySave', 'Änderungen speichern')}
        </Button>
      )}
    >
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
            onClick={onClose}
            className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background-subtle'
            aria-label={t('common.actions.close', 'Schließen')}
          >
            <Cross2Icon className='h-4 w-4' aria-hidden='true' />
          </button>
        </div>
        <div className='flex items-center gap-3'>
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt=''
              className='h-10 w-10 rounded-full border border-border object-cover'
              loading='lazy'
            />
          ) : (
            <div className='h-10 w-10 rounded-full border border-border bg-background-subtle' />
          )}
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-foreground'>
              {profile?.displayName || profile?.handle || profile?.did}
            </p>
            <p className='text-xs text-foreground-muted'>
              {profile?.handle ? `@${profile.handle}` : profile?.did}
            </p>
          </div>
        </div>
        <div className='space-y-3'>
          <label className='flex items-center justify-between gap-3 rounded-xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground'>
            {t('notifications.settings.activityPosts', 'Posts')}
            <input
              type='checkbox'
              checked={draft.post}
              onChange={(event) => handleTogglePosts(event.target.checked)}
              className='h-5 w-5 rounded border-border text-primary focus:ring-primary'
              disabled={saving}
            />
          </label>
          <label className='flex items-center justify-between gap-3 rounded-xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground'>
            {t('notifications.settings.activityReplies', 'Antworten')}
            <input
              type='checkbox'
              checked={draft.reply}
              onChange={(event) => handleToggleReplies(event.target.checked)}
              className='h-5 w-5 rounded border-border text-primary focus:ring-primary'
              disabled={saving}
            />
          </label>
        </div>
        {error ? (
          <p className='text-sm text-red-600'>{error}</p>
        ) : null}
      </div>
    </Modal>
  )
}
