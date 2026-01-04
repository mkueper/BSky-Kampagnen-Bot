import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  Button,
  InlineMenu,
  InlineMenuTrigger,
  InlineMenuContent,
  InlineMenuItem,
  ConfirmDialog
} from '@bsky-kampagnen-bot/shared-ui'
import { CameraIcon } from '@radix-ui/react-icons'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { fetchProfile, updateProfileRecord, uploadProfileImage } from '../shared/api/bsky.js'

const panelClassName =
  'w-full max-w-3xl p-0 overflow-hidden [&>div:first-child]:mt-0 [&>div:last-child]:hidden'

export default function EditProfileModal ({ open, profile, onClose, onSaved }) {
  const { t } = useTranslation()
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [bannerRemoved, setBannerRemoved] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const bannerInputRef = useRef(null)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setDisplayName(profile?.displayName || '')
    setDescription(profile?.description || '')
    setAvatarFile(null)
    setBannerFile(null)
    setAvatarRemoved(false)
    setBannerRemoved(false)
    setAvatarPreview('')
    setBannerPreview('')
    setError('')
    setSaving(false)
    setConfirmOpen(false)
  }, [open, profile])

  const bannerUrl = profile?.banner || ''
  const avatarUrl = profile?.avatar || ''
  const currentDisplayName = profile?.displayName || ''
  const currentDescription = profile?.description || ''
  const hasChanges = (
    displayName !== currentDisplayName ||
    description !== currentDescription ||
    Boolean(avatarFile) ||
    Boolean(bannerFile) ||
    avatarRemoved ||
    bannerRemoved
  )
  const saveDisabled = saving || !hasChanges

  const bannerStyle = useMemo(() => {
    if (bannerRemoved) return null
    const url = bannerPreview || bannerUrl
    if (!url) return null
    return { backgroundImage: `url(${url})` }
  }, [bannerPreview, bannerRemoved, bannerUrl])

  const avatarSrc = avatarRemoved ? '' : (avatarPreview || avatarUrl)

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('')
      return undefined
    }
    const previewUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [avatarFile])

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview('')
      return undefined
    }
    const previewUrl = URL.createObjectURL(bannerFile)
    setBannerPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [bannerFile])

  const handleClose = useCallback(() => {
    if (saving) return
    if (hasChanges) {
      setConfirmOpen(true)
      return
    }
    onClose?.()
  }, [hasChanges, onClose, saving])

  const handleConfirmDiscard = useCallback(() => {
    setConfirmOpen(false)
    onClose?.()
  }, [onClose])

  const handleCancelDiscard = useCallback(() => {
    setConfirmOpen(false)
  }, [])

  const handleBannerClick = useCallback(() => {
    if (saving) return
    bannerInputRef.current?.click()
  }, [saving])

  const handleAvatarClick = useCallback(() => {
    if (saving) return
    avatarInputRef.current?.click()
  }, [saving])

  const handleBannerChange = useCallback((event) => {
    const file = event.target.files?.[0] || null
    if (file) {
      setBannerFile(file)
      setBannerRemoved(false)
    }
    event.target.value = ''
  }, [])

  const handleAvatarChange = useCallback((event) => {
    const file = event.target.files?.[0] || null
    if (file) {
      setAvatarFile(file)
      setAvatarRemoved(false)
    }
    event.target.value = ''
  }, [])

  const handleBannerRemove = useCallback(() => {
    if (saving) return
    setBannerFile(null)
    setBannerRemoved(true)
  }, [saving])

  const handleAvatarRemove = useCallback(() => {
    if (saving) return
    setAvatarFile(null)
    setAvatarRemoved(true)
  }, [saving])

  const handleSave = useCallback(async () => {
    if (saveDisabled) return
    setSaving(true)
    setError('')
    try {
      const avatarBlob = avatarFile ? await uploadProfileImage(avatarFile) : undefined
      const bannerBlob = bannerFile ? await uploadProfileImage(bannerFile) : undefined
      await updateProfileRecord({
        displayName,
        description,
        avatarBlob,
        bannerBlob,
        avatarRemoved,
        bannerRemoved
      })
      const actor = profile?.did || profile?.handle || ''
      const updatedProfile = actor ? await fetchProfile(actor) : null
      if (updatedProfile) {
        onSaved?.(updatedProfile)
      }
      onClose?.()
    } catch (err) {
      setError(err?.message || t('profile.editModal.saveError', 'Profil konnte nicht gespeichert werden.'))
      setSaving(false)
    }
  }, [avatarFile, bannerFile, description, displayName, onClose, onSaved, profile, saveDisabled, t])

  return (
    <Modal open={open} onClose={handleClose} panelClassName={panelClassName}>
      <div className='flex items-center justify-between border-b border-border bg-background-elevated/80 px-4 py-3'>
        <Button variant='ghost' size='pill' onClick={handleClose} disabled={saving}>
          {t('profile.editModal.cancel', 'Abbrechen')}
        </Button>
        <div className='text-sm font-semibold text-foreground'>
          {t('profile.editModal.title', 'Profil bearbeiten')}
        </div>
        <Button
          variant='primary'
          size='pill'
          disabled={saveDisabled}
          onClick={handleSave}
          title={saveDisabled && !saving ? t('profile.editModal.saveHint', 'Speichern (bald verfügbar)') : undefined}
        >
          {saving ? t('profile.editModal.saving', 'Speichern…') : t('profile.editModal.save', 'Speichern')}
        </Button>
      </div>
      <div className='max-h-[70vh] space-y-5 overflow-y-auto p-4'>
        <div className='relative'>
          <div
            className='relative h-36 w-full overflow-hidden rounded-2xl border border-border bg-background-subtle bg-cover bg-center sm:h-44'
            style={bannerStyle || undefined}
          >
            {!bannerUrl ? (
              <div className='absolute inset-0 bg-gradient-to-r from-background via-background-subtle to-background' />
            ) : null}
            <div className='absolute bottom-3 right-3'>
              <InlineMenu>
                <InlineMenuTrigger>
                  <button
                    type='button'
                    disabled={saving}
                    className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-soft'
                    aria-label={t('profile.editModal.changeBanner', 'Banner bearbeiten')}
                    title={t('profile.editModal.changeBanner', 'Banner bearbeiten')}
                  >
                    <CameraIcon className='h-4 w-4' />
                  </button>
                </InlineMenuTrigger>
                <InlineMenuContent align='end' side='top' sideOffset={8} style={{ width: 220 }}>
                  <InlineMenuItem onSelect={handleBannerClick}>
                    {t('profile.editModal.uploadFromFile', 'Von Datei hochladen')}
                  </InlineMenuItem>
                  <InlineMenuItem onSelect={handleBannerRemove} disabled={saving || (!bannerUrl && !bannerPreview && !bannerFile)}>
                    {t('profile.editModal.removeBanner', 'Banner entfernen')}
                  </InlineMenuItem>
                </InlineMenuContent>
              </InlineMenu>
              <input
                ref={bannerInputRef}
                type='file'
                accept='image/*'
                onChange={handleBannerChange}
                className='hidden'
              />
            </div>
          </div>
          <div className='absolute -bottom-10 left-4'>
            <div className='relative h-20 w-20 rounded-full border-4 border-background shadow-xl sm:h-24 sm:w-24'>
              {avatarSrc ? (
                <img src={avatarSrc} alt='' className='h-full w-full rounded-full object-cover' />
              ) : (
                <div className='h-full w-full rounded-full bg-background-subtle' />
              )}
              <InlineMenu>
                <InlineMenuTrigger>
                  <button
                    type='button'
                    disabled={saving}
                    className='absolute -right-1 -bottom-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-soft'
                    aria-label={t('profile.editModal.changeAvatar', 'Avatar bearbeiten')}
                    title={t('profile.editModal.changeAvatar', 'Avatar bearbeiten')}
                  >
                    <CameraIcon className='h-4 w-4' />
                  </button>
                </InlineMenuTrigger>
                <InlineMenuContent align='end' side='top' sideOffset={8} style={{ width: 220 }}>
                  <InlineMenuItem onSelect={handleAvatarClick}>
                    {t('profile.editModal.uploadFromFile', 'Von Datei hochladen')}
                  </InlineMenuItem>
                  <InlineMenuItem onSelect={handleAvatarRemove} disabled={saving || (!avatarUrl && !avatarPreview && !avatarFile)}>
                    {t('profile.editModal.removeAvatar', 'Avatar entfernen')}
                  </InlineMenuItem>
                </InlineMenuContent>
              </InlineMenu>
              <input
                ref={avatarInputRef}
                type='file'
                accept='image/*'
                onChange={handleAvatarChange}
                className='hidden'
              />
            </div>
          </div>
        </div>
        <div className='pt-6 space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-semibold text-foreground'>
              {t('profile.editModal.displayName', 'Anzeigename')}
            </label>
            <input
              type='text'
              value={displayName}
              maxLength={64}
              onChange={(event) => setDisplayName(event.target.value.slice(0, 64))}
              disabled={saving}
              className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-semibold text-foreground'>
              {t('profile.editModal.description', 'Beschreibung')}
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              disabled={saving}
              className='min-h-[120px] w-full resize-none rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'
            />
          </div>
        </div>
        {error ? (
          <p className='text-sm text-destructive'>{error}</p>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={t('profile.editModal.discardTitle', 'Änderungen verwerfen?')}
        description={t('profile.editModal.discardDescription', 'Du hast ungespeicherte Änderungen. Möchtest du diese verwerfen?')}
        confirmLabel={t('profile.editModal.discardConfirm', 'Verwerfen')}
        cancelLabel={t('profile.editModal.discardCancel', 'Abbrechen')}
        variant='destructive'
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </Modal>
  )
}
