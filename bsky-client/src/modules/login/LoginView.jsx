import { useEffect, useState } from 'react'
import { Button, Card } from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { useBskyAuth } from '../auth/AuthContext.jsx'

const HELP_LINK = 'https://bsky.app/settings/app-passwords'

export default function LoginView ({
  variant = 'page',
  open = true,
  prefill = null,
  onClose = null
}) {
  const { t } = useTranslation()
  const { login, preferences, status } = useBskyAuth()
  const [serviceUrl, setServiceUrl] = useState(preferences.serviceUrl || '')
  const [identifier, setIdentifier] = useState(preferences.identifier || '')
  const [appPassword, setAppPassword] = useState('')
  const [rememberCredentials, setRememberCredentials] = useState(Boolean(preferences.rememberCredentials))
  const [rememberSession, setRememberSession] = useState(Boolean(preferences.rememberSession))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (variant === 'modal' && open && prefill) {
      const nextServiceUrl = String(prefill?.serviceUrl || preferences.serviceUrl || '').trim()
      const nextIdentifier = String(prefill?.identifier || preferences.identifier || '').trim()
      setServiceUrl(nextServiceUrl)
      setIdentifier(nextIdentifier)
    } else {
      setServiceUrl(preferences.serviceUrl || '')
      setIdentifier(preferences.identifier || '')
    }
    setRememberCredentials(Boolean(preferences.rememberCredentials))
    setRememberSession(Boolean(preferences.rememberSession))
  }, [
    variant,
    open,
    prefill?.serviceUrl,
    prefill?.identifier,
    preferences.serviceUrl,
    preferences.identifier,
    preferences.rememberCredentials,
    preferences.rememberSession
  ])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await login({
        serviceUrl,
        identifier,
        appPassword,
        rememberCredentials,
        rememberSession,
        asNewAccount: variant === 'modal'
      })
      setAppPassword('')
      if (variant === 'modal' && typeof onClose === 'function') {
        onClose()
      }
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (variant === 'modal' && !open) return null

  const heading = variant === 'modal'
    ? t('login.addAccountHeading', 'Account hinzufügen')
    : t('login.heading', 'Bluesky Login')

  return (
    <div
      className={variant === 'modal'
        ? 'fixed inset-0 z-50 flex items-center justify-center px-4 py-10'
        : 'flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground'}
      data-component={variant === 'modal' ? 'BskyAddAccountModal' : 'BskyLoginView'}
    >
      {variant === 'modal' ? (
        <div
          className='absolute inset-0 bg-black/40 backdrop-blur-sm'
          onClick={typeof onClose === 'function' ? onClose : undefined}
          aria-hidden='true'
          data-role='overlay'
        />
      ) : null}

      <Card className={`relative w-full max-w-md space-y-6 shadow-card ${variant === 'modal' ? 'z-10' : ''}`} padding='p-8'>
        <div>
          <p className='text-xs uppercase tracking-[0.3em] text-foreground-muted'>
            {t('layout.nav.tagline', 'Control Center')}
          </p>
          <h1 className='mt-1 text-2xl font-semibold'>
            {heading}
          </h1>
          <p className='mt-2 text-sm text-foreground-muted'>
            {t(
              'login.subtitleStandalone',
              'Melde dich mit einem App-Passwort an. Deine Sitzung bleibt lokal im Client.'
            )}
          </p>
        </div>

        {error ? (
          <div className='rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
            {error?.message || t('login.errorFallback', 'Login fehlgeschlagen.')}
          </div>
        ) : null}

        <form className='space-y-4' onSubmit={handleSubmit}>
          <div className='space-y-1'>
            <label className='text-sm font-medium text-foreground' htmlFor='login-service'>
              {t('login.serviceLabel', 'Service-URL')}
            </label>
            <input
              id='login-service'
              type='text'
              className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none'
              value={serviceUrl}
              disabled={submitting}
              onChange={(event) => setServiceUrl(event.target.value)}
              required
            />
          </div>

          <div className='space-y-1'>
            <label className='text-sm font-medium text-foreground' htmlFor='login-identifier'>
              {t('login.identifierLabel', 'Identifier (Handle/E-Mail)')}
            </label>
            <input
              id='login-identifier'
              type='text'
              className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none'
              placeholder='name.bsky.social'
              value={identifier}
              disabled={submitting}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              autoComplete='username'
            />
          </div>

          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <label className='text-sm font-medium text-foreground' htmlFor='login-password'>
                {t('login.passwordLabel', 'App-Passwort')}
              </label>
              <a
                href={HELP_LINK}
                target='_blank'
                rel='noreferrer'
                className='text-xs text-primary underline-offset-2 hover:underline'
              >
                {t('login.passwordHelp', 'App-Passwort erstellen')}
              </a>
            </div>
            <input
              id='login-password'
              type='password'
              className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none'
              placeholder='xxxx-xxxx-xxxx-xxxx'
              value={appPassword}
              disabled={submitting}
              onChange={(event) => setAppPassword(event.target.value)}
              required
              autoComplete='current-password'
            />
          </div>

          <div className='space-y-2 text-sm text-foreground'>
            <label className='flex items-center gap-3'>
              <input
                type='checkbox'
                checked={rememberCredentials}
                onChange={(event) => setRememberCredentials(event.target.checked)}
                className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
              />
              {t('login.rememberCredentials', 'Service-URL und Identifier merken')}
            </label>
            <label className='flex items-center gap-3'>
              <input
                type='checkbox'
                checked={rememberSession}
                onChange={(event) => setRememberSession(event.target.checked)}
                className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
              />
              {t('login.rememberSession', 'Angemeldet bleiben (Session speichern)')}
            </label>
          </div>

          <Button type='submit' variant='primary' disabled={submitting || status === 'loading'} className='w-full justify-center'>
            {submitting
              ? t('login.submitBusy', 'Anmeldung läuft…')
              : t('login.submitLabel', 'Anmelden')}
          </Button>
          {variant === 'modal' && typeof onClose === 'function' ? (
            <Button
              type='button'
              variant='secondary'
              className='w-full justify-center'
              disabled={submitting}
              onClick={onClose}
            >
              {t('compose.cancel', 'Abbrechen')}
            </Button>
          ) : null}
        </form>

        <p className='text-xs text-foreground-muted'>
          {t(
            'login.footerHintStandalone',
            'Tipp: App-Passwörter lassen sich im Bluesky-Account unter „Settings → App Passwords“ verwalten.'
          )}
        </p>
      </Card>
    </div>
  )
}
