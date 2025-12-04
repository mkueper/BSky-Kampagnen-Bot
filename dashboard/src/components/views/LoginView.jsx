import { useState } from 'react'
import { Button, Card } from '@bsky-kampagnen-bot/shared-ui'

export default function LoginView ({ session, sessionError, refreshSession }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loginError, setLoginError] = useState(null)

  const configured = session?.configured ?? true
  const errorMessage = loginError?.message || sessionError?.message || null

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!configured) return
    setSubmitting(true)
    setLoginError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen.')
      }
      setPassword('')
      await refreshSession()
    } catch (err) {
      setLoginError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground'>
      <Card className='w-full max-w-md space-y-6 shadow-card' padding='p-8'>
        <div>
          <p className='text-xs uppercase tracking-[0.3em] text-foreground-muted'>Control Center</p>
          <h1 className='mt-1 text-2xl font-semibold'>Kampagnen‑Tool Login</h1>
          <p className='mt-2 text-sm text-foreground-muted'>Zugangsdaten werden serverseitig verwaltet.</p>
        </div>

        {errorMessage ? (
          <div className='rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
            {errorMessage}
          </div>
        ) : null}

        {!configured ? (
          <div className='space-y-4 text-sm text-foreground-muted'>
            <p>Bevor sich jemand anmelden kann, muss der Login im Backend konfiguriert werden:</p>
            <ol className='list-decimal space-y-2 pl-5'>
              <li>Gewünschten Admin-Benutzer in `.env` via `AUTH_USERNAME` setzen.</li>
              <li>
                Passwort-Hash mit <code className='rounded bg-background-subtle px-1 py-[1px] text-xs'>npm run tools:hash-password</code> generieren und als
                <code className='ml-1 rounded bg-background-subtle px-1 py-[1px] text-xs'>AUTH_PASSWORD_HASH</code> hinterlegen.
              </li>
              <li>Einen zufälligen Schlüssel als <code className='rounded bg-background-subtle px-1 py-[1px] text-xs'>AUTH_TOKEN_SECRET</code> vergeben und Backend neustarten.</li>
            </ol>
            <Button variant='secondary' onClick={refreshSession}>
              Konfiguration prüfen
            </Button>
          </div>
        ) : (
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='space-y-1'>
              <label className='text-sm font-medium text-foreground' htmlFor='login-username'>
                Benutzername
              </label>
              <input
                id='login-username'
                type='text'
                className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none'
                placeholder='admin'
                value={username}
                disabled={submitting}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete='username'
              />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium text-foreground' htmlFor='login-password'>
                Passwort
              </label>
              <input
                id='login-password'
                type='password'
                className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none'
                placeholder='••••••••'
                value={password}
                disabled={submitting}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete='current-password'
              />
            </div>
            <Button type='submit' variant='primary' disabled={submitting} className='w-full justify-center'>
              {submitting ? 'Anmeldung läuft…' : 'Anmelden'}
            </Button>
          </form>
        )}

        <p className='text-xs text-foreground-muted'>
          Tipp: Mehrere Admins möglich, indem du die Cookies teilst oder den Login via Proxy absicherst.
        </p>
      </Card>
    </div>
  )
}
