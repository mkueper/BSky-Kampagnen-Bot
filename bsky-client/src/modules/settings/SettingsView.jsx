import { useCallback, useMemo, useState } from 'react'
import { Button, Card } from '@bsky-kampagnen-bot/shared-ui'
import {
  registerPushSubscription,
  unregisterPushSubscription,
  getActivePushTransportName
} from '../shared'

const PLATFORM_OPTIONS = [
  { value: 'web', label: 'Web (Browser)' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' }
]

function Field ({ label, hint, children }) {
  return (
    <label className='flex flex-col gap-1 text-sm font-medium text-foreground'>
      <span>{label}</span>
      {children}
      {hint ? <span className='text-xs font-normal text-foreground-muted'>{hint}</span> : null}
    </label>
  )
}

export default function SettingsView () {
  return (
    <div className='space-y-6'>
      <PushRegistrationCard />
    </div>
  )
}

function PushRegistrationCard () {
  const [form, setForm] = useState({
    serviceDid: '',
    appId: '',
    token: '',
    platform: 'web',
    ageRestricted: false
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const activeTransport = useMemo(() => getActivePushTransportName(), [])

  const handleInputChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleCheckboxChange = useCallback((field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }))
  }, [])

  const canSubmit = form.serviceDid.trim() && form.appId.trim() && form.token.trim()

  const sendRequest = useCallback(async (action) => {
    if (!canSubmit) return
    setBusy(true)
    setMessage('')
    setError('')
    const payload = {
      serviceDid: form.serviceDid.trim(),
      appId: form.appId.trim(),
      token: form.token.trim(),
      platform: form.platform || 'web'
    }
    if (form.ageRestricted) payload.ageRestricted = true
    try {
      const res = action === 'register'
        ? await registerPushSubscription(payload)
        : await unregisterPushSubscription(payload)
      const ok = typeof res?.success === 'boolean' ? res.success : true
      if (!ok) {
        setError('Bluesky hat keinen Erfolg gemeldet.')
      } else {
        setMessage(action === 'register' ? 'Registrierung erfolgreich.' : 'Registrierung entfernt.')
      }
    } catch (err) {
      const msg = err?.message || String(err)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }, [canSubmit, form])

  return (
    <Card padding='p-5' className='space-y-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-lg font-semibold text-foreground'>Push-Benachrichtigungen</h2>
        <p className='text-sm text-foreground-muted'>
          Aktiver Transport: <strong className='font-semibold text-foreground'>{activeTransport}</strong>.
          Fülle Service-DID, App-ID und Token aus, um eine Registrierung direkt anzustoßen.
        </p>
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        <Field
          label='Service DID'
          hint='z. B. did:web:example.com oder did:plc:xyz'
        >
          <input
            type='text'
            value={form.serviceDid}
            onChange={(event) => handleInputChange('serviceDid', event.target.value)}
            className='rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
            placeholder='did:web:push.example'
            autoComplete='off'
          />
        </Field>
        <Field
          label='App-ID'
          hint='Kennung der Client-App (z. B. com.example.app)'
        >
          <input
            type='text'
            value={form.appId}
            onChange={(event) => handleInputChange('appId', event.target.value)}
            className='rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
            placeholder='com.example.app'
            autoComplete='off'
          />
        </Field>
      </div>
      <Field
        label='Push-Token'
        hint='Token des Geräts bzw. Browsers (vom Push-Dienst geliefert)'
      >
        <textarea
          rows={3}
          value={form.token}
          onChange={(event) => handleInputChange('token', event.target.value)}
          className='rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
          placeholder='eyJhbGciOi...'
        />
      </Field>
      <div className='grid gap-4 md:grid-cols-2'>
        <Field label='Plattform'>
          <select
            value={form.platform}
            onChange={(event) => handleInputChange('platform', event.target.value)}
            className='rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
          >
            {PLATFORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        <Field label='Optionen'>
          <label className='inline-flex items-center gap-2 text-sm font-normal text-foreground'>
            <input
              type='checkbox'
              checked={form.ageRestricted}
              onChange={() => handleCheckboxChange('ageRestricted')}
              className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
            />
            <span>Aktivieren, wenn der Actor altersbeschränkt ist</span>
          </label>
        </Field>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant='primary'
          disabled={busy || !canSubmit}
          onClick={() => sendRequest('register')}
        >
          Registrieren
        </Button>
        <Button
          type='button'
          variant='secondary'
          disabled={busy || !canSubmit}
          onClick={() => sendRequest('unregister')}
        >
          Registrierung entfernen
        </Button>
      </div>
      {message ? (
        <p className='text-sm text-primary'>
          {message}
        </p>
      ) : null}
      {error ? (
        <p className='text-sm text-destructive'>
          {error}
        </p>
      ) : null}
    </Card>
  )
}
