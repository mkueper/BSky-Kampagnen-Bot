import { useEffect, useMemo, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Button } from '@bsky-kampagnen-bot/shared-ui'
import { useToast } from '../hooks/useToast'
import Card from './ui/Card'

const NUMBER_FIELDS = ['postRetries', 'postBackoffMs', 'postBackoffMaxMs']

const LABELS = {
  scheduleTime: 'Cron-Ausdruck',
  timeZone: 'Zeitzone',
  postRetries: 'Maximale Wiederholversuche',
  postBackoffMs: 'Basis-Backoff (ms)',
  postBackoffMaxMs: 'Maximaler Backoff (ms)'
}

function formatNumberInput (value) {
  return value == null ? '' : String(value)
}

function normalizeFormPayload (values) {
  return {
    scheduleTime: values.scheduleTime?.trim(),
    timeZone: values.timeZone?.trim(),
    postRetries: values.postRetries !== '' ? Number(values.postRetries) : null,
    postBackoffMs:
      values.postBackoffMs !== '' ? Number(values.postBackoffMs) : null,
    postBackoffMaxMs:
      values.postBackoffMaxMs !== '' ? Number(values.postBackoffMaxMs) : null
  }
}

export default function ConfigPanel () {
  const toast = useToast()
  const [tab, setTab] = useState('scheduler')
  const [needsCreds, setNeedsCreds] = useState(false)
  // Auf Credentials-Tab springen, wenn Backend fehlende Zugangsdaten meldet
  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch('/api/client-config')
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (!ignore && data) {
          if (data.needsCredentials) setTab('credentials')
          setNeedsCreds(Boolean(data.needsCredentials))
        }
      } catch { /* ignore */ }
    })()
    return () => { ignore = true }
  }, [])
  const [formValues, setFormValues] = useState({
    scheduleTime: '',
    timeZone: '',
    postRetries: '',
    postBackoffMs: '',
    postBackoffMaxMs: ''
  })
  const [initialValues, setInitialValues] = useState(formValues)
  const [defaults, setDefaults] = useState(formValues)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Client-Polling Abschnitt
  const [pollValues, setPollValues] = useState({
    // threads
    threadActiveMs: '',
    threadIdleMs: '',
    threadHiddenMs: '',
    threadMinimalHidden: false,
    // skeets
    skeetActiveMs: '',
    skeetIdleMs: '',
    skeetHiddenMs: '',
    skeetMinimalHidden: false,
    // shared
    backoffStartMs: '',
    backoffMaxMs: '',
    jitterRatio: '',
    heartbeatMs: ''
  })
  const [pollDefaults, setPollDefaults] = useState(pollValues)
  const [pollLoading, setPollLoading] = useState(true)
  const [pollSaving, setPollSaving] = useState(false)

  const hasChanges = useMemo(() => {
    return Object.keys(formValues).some(
      key => String(formValues[key]) !== String(initialValues[key] ?? '')
    )
  }, [formValues, initialValues])

  useEffect(() => {
    let ignore = false

    async function load () {
      setLoading(true)
      try {
        const res = await fetch('/api/settings/scheduler')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Fehler beim Laden der Einstellungen.')
        }
        const data = await res.json()
        const nextValues = {
          scheduleTime: data.values?.scheduleTime ?? '',
          timeZone: data.values?.timeZone ?? '',
          postRetries: formatNumberInput(data.values?.postRetries),
          postBackoffMs: formatNumberInput(data.values?.postBackoffMs),
          postBackoffMaxMs: formatNumberInput(data.values?.postBackoffMaxMs)
        }
        const nextDefaults = {
          scheduleTime: data.defaults?.scheduleTime ?? '',
          timeZone: data.defaults?.timeZone ?? '',
          postRetries: formatNumberInput(data.defaults?.postRetries),
          postBackoffMs: formatNumberInput(data.defaults?.postBackoffMs),
          postBackoffMaxMs: formatNumberInput(data.defaults?.postBackoffMaxMs)
        }
        if (!ignore) {
          setFormValues(nextValues)
          setInitialValues(nextValues)
          setDefaults(nextDefaults)
        }
      } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error)
        toast.error({
          title: 'Konfiguration',
          description:
            error.message || 'Einstellungen konnten nicht geladen werden.'
        })
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [toast])

  // Client-Polling laden
  useEffect(() => {
    let ignore = false
    async function loadPolling () {
      setPollLoading(true)
      try {
        const res = await fetch('/api/settings/client-polling')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(
            data.error || 'Fehler beim Laden der Client-Konfiguration.'
          )
        }
        const data = await res.json()
        const v = data.values || {}
        const d = data.defaults || {}
        const nextValues = {
          threadActiveMs: formatNumberInput(v.threadActiveMs),
          threadIdleMs: formatNumberInput(v.threadIdleMs),
          threadHiddenMs: formatNumberInput(v.threadHiddenMs),
          threadMinimalHidden: Boolean(v.threadMinimalHidden),
          skeetActiveMs: formatNumberInput(v.skeetActiveMs),
          skeetIdleMs: formatNumberInput(v.skeetIdleMs),
          skeetHiddenMs: formatNumberInput(v.skeetHiddenMs),
          skeetMinimalHidden: Boolean(v.skeetMinimalHidden),
          backoffStartMs: formatNumberInput(v.backoffStartMs),
          backoffMaxMs: formatNumberInput(v.backoffMaxMs),
          jitterRatio: v.jitterRatio == null ? '' : String(v.jitterRatio),
          heartbeatMs: formatNumberInput(v.heartbeatMs)
        }
        const nextDefaults = {
          threadActiveMs: formatNumberInput(d.threadActiveMs),
          threadIdleMs: formatNumberInput(d.threadIdleMs),
          threadHiddenMs: formatNumberInput(d.threadHiddenMs),
          threadMinimalHidden: Boolean(d.threadMinimalHidden),
          skeetActiveMs: formatNumberInput(d.skeetActiveMs),
          skeetIdleMs: formatNumberInput(d.skeetIdleMs),
          skeetHiddenMs: formatNumberInput(d.skeetHiddenMs),
          skeetMinimalHidden: Boolean(d.skeetMinimalHidden),
          backoffStartMs: formatNumberInput(d.backoffStartMs),
          backoffMaxMs: formatNumberInput(d.backoffMaxMs),
          jitterRatio: d.jitterRatio == null ? '' : String(d.jitterRatio),
          heartbeatMs: formatNumberInput(d.heartbeatMs)
        }
        if (!ignore) {
          setPollValues(nextValues)
          setPollDefaults(nextDefaults)
        }
      } catch (error) {
        console.error('Fehler beim Laden der Client-Konfiguration:', error)
        toast.error({
          title: 'Konfiguration',
          description:
            error.message || 'Client-Config konnte nicht geladen werden.'
        })
      } finally {
        if (!ignore) setPollLoading(false)
      }
    }
    loadPolling()
    return () => {
      ignore = true
    }
  }, [toast])

  const updateField = (key, value) => {
    setFormValues(current => ({ ...current, [key]: value }))
  }

  const resetToDefaults = () => {
    setFormValues(defaults)
  }

  const updatePollField = (key, value) => {
    setPollValues(current => ({ ...current, [key]: value }))
  }

  const resetPollToDefaults = () => {
    setPollValues(pollDefaults)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!hasChanges) {
      toast.info({
        title: 'Keine Änderungen',
        description: 'Die Einstellungen sind bereits aktuell.'
      })
      return
    }

    const payload = normalizeFormPayload(formValues)

    if (!payload.scheduleTime) {
      toast.error({
        title: 'Cron-Ausdruck fehlt',
        description: 'Bitte einen gültigen Cron-Ausdruck angeben.'
      })
      return
    }
    if (!payload.timeZone) {
      toast.error({
        title: 'Zeitzone fehlt',
        description: 'Bitte eine Zeitzone angeben.'
      })
      return
    }
    for (const key of NUMBER_FIELDS) {
      const value = payload[key]
      if (value == null || Number.isNaN(value) || value < 0) {
        toast.error({
          title: 'Ungültiger Wert',
          description: `${LABELS[key]} muss eine positive Zahl sein.`
        })
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings/scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Speichern fehlgeschlagen.')
      }

      const data = await res.json()
      const nextValues = {
        scheduleTime: data.values?.scheduleTime ?? payload.scheduleTime,
        timeZone: data.values?.timeZone ?? payload.timeZone,
        postRetries: formatNumberInput(data.values?.postRetries),
        postBackoffMs: formatNumberInput(data.values?.postBackoffMs),
        postBackoffMaxMs: formatNumberInput(data.values?.postBackoffMaxMs)
      }
      const nextDefaults = {
        scheduleTime: data.defaults?.scheduleTime ?? defaults.scheduleTime,
        timeZone: data.defaults?.timeZone ?? defaults.timeZone,
        postRetries: formatNumberInput(
          data.defaults?.postRetries ?? defaults.postRetries
        ),
        postBackoffMs: formatNumberInput(
          data.defaults?.postBackoffMs ?? defaults.postBackoffMs
        ),
        postBackoffMaxMs: formatNumberInput(
          data.defaults?.postBackoffMaxMs ?? defaults.postBackoffMaxMs
        )
      }
      setFormValues(nextValues)
      setInitialValues(nextValues)
      setDefaults(nextDefaults)

      toast.success({
        title: 'Einstellungen gespeichert',
        description: 'Scheduler und Retry-Strategie wurden aktualisiert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error)
      toast.error({
        title: 'Speichern fehlgeschlagen',
        description:
          error.message || 'Die Einstellungen konnten nicht gespeichert werden.'
      })
    } finally {
      setSaving(false)
    }
  }

  const pollHasChanges = useMemo(() => {
    return Object.keys(pollValues).some(
      k => String(pollValues[k]) !== String(pollDefaults[k] ?? '')
    )
  }, [pollValues, pollDefaults])

  const handlePollSubmit = async event => {
    event.preventDefault()
    if (!pollHasChanges) {
      toast.info({
        title: 'Keine Änderungen',
        description: 'Die Client-Polling-Einstellungen sind bereits aktuell.'
      })
      return
    }
    const num = v => (v === '' || v == null ? null : Number(v))
    const payload = {
      threadActiveMs: num(pollValues.threadActiveMs),
      threadIdleMs: num(pollValues.threadIdleMs),
      threadHiddenMs: num(pollValues.threadHiddenMs),
      threadMinimalHidden: Boolean(pollValues.threadMinimalHidden),
      skeetActiveMs: num(pollValues.skeetActiveMs),
      skeetIdleMs: num(pollValues.skeetIdleMs),
      skeetHiddenMs: num(pollValues.skeetHiddenMs),
      skeetMinimalHidden: Boolean(pollValues.skeetMinimalHidden),
      backoffStartMs: num(pollValues.backoffStartMs),
      backoffMaxMs: num(pollValues.backoffMaxMs),
      jitterRatio:
        pollValues.jitterRatio === '' ? null : Number(pollValues.jitterRatio),
      heartbeatMs: num(pollValues.heartbeatMs)
    }

    // einfache Validierung
    const mustBePos = [
      payload.threadActiveMs,
      payload.threadIdleMs,
      payload.threadHiddenMs,
      payload.skeetActiveMs,
      payload.skeetIdleMs,
      payload.skeetHiddenMs,
      payload.backoffStartMs,
      payload.backoffMaxMs,
      payload.heartbeatMs
    ]
    if (mustBePos.some(v => v == null || Number.isNaN(v) || v < 0)) {
      toast.error({
        title: 'Ungültige Werte',
        description: 'Intervalle und Backoff müssen positive Zahlen sein.'
      })
      return
    }
    if (
      payload.jitterRatio == null ||
      Number.isNaN(payload.jitterRatio) ||
      payload.jitterRatio < 0 ||
      payload.jitterRatio > 1
    ) {
      toast.error({
        title: 'Ungültiger Jitter',
        description: 'POLL_JITTER_RATIO muss zwischen 0 und 1 liegen.'
      })
      return
    }

    setPollSaving(true)
    try {
      const res = await fetch('/api/settings/client-polling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error || 'Fehler beim Speichern der Client-Konfiguration.'
        )
      }
      const data = await res.json()
      const v = data.values || {}
      const d = data.defaults || {}
      const nextValues = {
        threadActiveMs: formatNumberInput(v.threadActiveMs),
        threadIdleMs: formatNumberInput(v.threadIdleMs),
        threadHiddenMs: formatNumberInput(v.threadHiddenMs),
        threadMinimalHidden: Boolean(v.threadMinimalHidden),
        skeetActiveMs: formatNumberInput(v.skeetActiveMs),
        skeetIdleMs: formatNumberInput(v.skeetIdleMs),
        skeetHiddenMs: formatNumberInput(v.skeetHiddenMs),
        skeetMinimalHidden: Boolean(v.skeetMinimalHidden),
        backoffStartMs: formatNumberInput(v.backoffStartMs),
        backoffMaxMs: formatNumberInput(v.backoffMaxMs),
        jitterRatio: v.jitterRatio == null ? '' : String(v.jitterRatio),
        heartbeatMs: formatNumberInput(v.heartbeatMs)
      }
      const nextDefaults = {
        threadActiveMs: formatNumberInput(d.threadActiveMs),
        threadIdleMs: formatNumberInput(d.threadIdleMs),
        threadHiddenMs: formatNumberInput(d.threadHiddenMs),
        threadMinimalHidden: Boolean(d.threadMinimalHidden),
        skeetActiveMs: formatNumberInput(d.skeetActiveMs),
        skeetIdleMs: formatNumberInput(d.skeetIdleMs),
        skeetHiddenMs: formatNumberInput(d.skeetHiddenMs),
        skeetMinimalHidden: Boolean(d.skeetMinimalHidden),
        backoffStartMs: formatNumberInput(d.backoffStartMs),
        backoffMaxMs: formatNumberInput(d.backoffMaxMs),
        jitterRatio: d.jitterRatio == null ? '' : String(d.jitterRatio),
        heartbeatMs: formatNumberInput(d.heartbeatMs)
      }
      setPollValues(nextValues)
      setPollDefaults(nextDefaults)
      toast.success({
        title: 'Client-Konfiguration gespeichert',
        description: 'Polling & Backoff aktualisiert.'
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Client-Konfiguration:', error)
      toast.error({
        title: 'Speichern fehlgeschlagen',
        description:
          error.message || 'Client-Config konnte nicht gespeichert werden.'
      })
    } finally {
      setPollSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      {needsCreds ? (
        <Card padding='p-4 lg:p-5' className='border border-primary/40 bg-primary/5'>
          <div className='space-y-1'>
            <h4 className='text-base font-semibold text-foreground'>Zugangsdaten erforderlich</h4>
            <p className='text-sm text-foreground-muted'>
              Bitte hinterlege zuerst deine Zugangsdaten für Bluesky (und optional Mastodon). Anschließend kannst du die weiteren Optionen nach Bedarf anpassen.
            </p>
          </div>
        </Card>
      ) : null}
      <Tabs.Root value={tab} onValueChange={setTab} className='block'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <Tabs.List
            className='inline-flex rounded-full bg-background-subtle p-1'
            aria-label='Konfig-Themen'
          >
            <Tabs.Trigger
              value='scheduler'
              className='rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background-elevated data-[state=active]:shadow-soft text-foreground-muted hover:text-foreground'
            >
              Scheduler & Retries
            </Tabs.Trigger>
            <Tabs.Trigger
              value='polling'
              className='rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background-elevated data-[state=active]:shadow-soft text-foreground-muted hover:text-foreground'
            >
              Dashboard-Polling
            </Tabs.Trigger>
            <Tabs.Trigger
              value='credentials'
              className='rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background-elevated data-[state=active]:shadow-soft text-foreground-muted hover:text-foreground'
            >
              Zugangsdaten
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value='scheduler' className='outline-none'>
          <Card padding='p-6 lg:p-10'>
            <div className='flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between'>
              <div>
                <h3 className='text-2xl font-semibold'>Scheduler & Retries</h3>
                <p className='text-sm text-foreground-muted'>
                  Passe Cron, Zeitzone und Retry-Strategie für den Kampagnen-Bot
                  an.
                </p>
              </div>
              <div className='text-xs text-foreground-muted'>
                <p>Standardwerte basieren auf deiner aktuellen .env.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <label
                    htmlFor='scheduleTime'
                    className='text-sm font-semibold text-foreground'
                  >
                    {LABELS.scheduleTime}
                  </label>
                  <input
                    id='scheduleTime'
                    type='text'
                    value={formValues.scheduleTime}
                    onChange={e => updateField('scheduleTime', e.target.value)}
                    disabled={loading || saving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60'
                    placeholder={defaults.scheduleTime}
                  />
                  <p className='text-xs text-foreground-muted'>
                    Beispiele: <code className='font-mono'>0 * * * *</code>{' '}
                    (stündlich), <code className='font-mono'>*/5 * * * *</code>{' '}
                    (alle 5 Minuten)
                  </p>
                </div>

                <div className='space-y-2'>
                  <label
                    htmlFor='timeZone'
                    className='text-sm font-semibold text-foreground'
                  >
                    {LABELS.timeZone}
                  </label>
                  <input
                    id='timeZone'
                    type='text'
                    value={formValues.timeZone}
                    onChange={e => updateField('timeZone', e.target.value)}
                    disabled={loading || saving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60'
                    placeholder={defaults.timeZone}
                  />
                  <p className='text-xs text-foreground-muted'>
                    IANA-Zeitzone, z. B. Europe/Berlin oder UTC.
                  </p>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-3'>
                {NUMBER_FIELDS.map(key => (
                  <div key={key} className='space-y-2'>
                    <label
                      htmlFor={key}
                      className='text-sm font-semibold text-foreground'
                    >
                      {LABELS[key]}
                    </label>
                    <input
                      id={key}
                      type='number'
                      min='0'
                      value={formValues[key]}
                      onChange={e => updateField(key, e.target.value)}
                      disabled={loading || saving}
                      className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60'
                      placeholder={defaults[key]}
                    />
                  </div>
                ))}
              </div>

              {null}

              <div className='flex flex-wrap justify-between gap-3 border-t border-border-muted pt-6'>
                <div className='text-xs text-foreground-muted'>
                  <p>
                    <span className='font-semibold'>Standardwerte:</span> Cron{' '}
                    {defaults.scheduleTime}, Zeitzone {defaults.timeZone},
                    Retries {defaults.postRetries}, Backoff{' '}
                    {defaults.postBackoffMs}ms (max. {defaults.postBackoffMaxMs}
                    ms)
                  </p>
                </div>
                <div className='flex flex-wrap gap-3'>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={resetToDefaults}
                    disabled={loading || saving}
                  >
                    Zurücksetzen auf Standard
                  </Button>
                  <Button
                    type='submit'
                    variant='primary'
                    disabled={loading || saving || !hasChanges}
                  >
                    {saving ? 'Speichern…' : 'Einstellungen speichern'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
          <Card hover={false} padding='p-6 lg:p-8' className='mt-4'>
            <h4 className='text-lg font-semibold'>Tipps</h4>
            <ul className='mt-4 space-y-2 text-sm text-foreground-muted'>
              <li>
                • Cron-Ausdrücke beziehen sich auf die Serverzeit – achte bei
                Deployment auf die korrekte Zeitzone.
              </li>
              <li>
                • Backoff-Werte steuern Wartezeiten zwischen Retry-Versuchen und
                helfen bei Rate-Limits.
              </li>
              <li>
                • Änderungen greifen sofort – der Scheduler wird automatisch
                neugestartet.
              </li>
            </ul>
          </Card>
        </Tabs.Content>

        <Tabs.Content value='polling' className='outline-none'>
          <Card padding='p-6 lg:p-10'>
            <div className='flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between'>
              <div>
                <h3 className='text-2xl font-semibold'>Dashboard-Polling</h3>
                <p className='text-sm text-foreground-muted'>
                  Steuere Intervalle und Backoff für Listen (Threads & Skeets).
                </p>
              </div>
              <div className='text-xs text-foreground-muted'>
                <p>
                  Standardwerte stammen aus deiner .env bzw. Build-Defaults.
                </p>
              </div>
            </div>

            <form onSubmit={handlePollSubmit} className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Threads: Aktiv (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.threadActiveMs}
                    onChange={e =>
                      updatePollField('threadActiveMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.threadActiveMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Threads: Idle (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.threadIdleMs}
                    onChange={e =>
                      updatePollField('threadIdleMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.threadIdleMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Threads: Hidden (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.threadHiddenMs}
                    onChange={e =>
                      updatePollField('threadHiddenMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.threadHiddenMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='inline-flex items-center gap-2 text-sm font-semibold text-foreground'>
                    <input
                      type='checkbox'
                      checked={!!pollValues.threadMinimalHidden}
                      onChange={e =>
                        updatePollField('threadMinimalHidden', e.target.checked)
                      }
                      disabled={pollLoading || pollSaving}
                      className='h-4 w-4 rounded border-border'
                    />
                    <span>Threads: Minimal Ping hidden</span>
                  </label>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Skeets: Aktiv (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.skeetActiveMs}
                    onChange={e =>
                      updatePollField('skeetActiveMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.skeetActiveMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Skeets: Idle (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.skeetIdleMs}
                    onChange={e =>
                      updatePollField('skeetIdleMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.skeetIdleMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Skeets: Hidden (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.skeetHiddenMs}
                    onChange={e =>
                      updatePollField('skeetHiddenMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.skeetHiddenMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='inline-flex items-center gap-2 text-sm font-semibold text-foreground'>
                    {' '}
                    <input
                      type='checkbox'
                      checked={!!pollValues.skeetMinimalHidden}
                      onChange={e =>
                        updatePollField('skeetMinimalHidden', e.target.checked)
                      }
                      disabled={pollLoading || pollSaving}
                      className='h-4 w-4 rounded border-border'
                    />{' '}
                    <span>Skeets: Minimal Ping hidden</span>
                  </label>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Backoff Start (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.backoffStartMs}
                    onChange={e =>
                      updatePollField('backoffStartMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.backoffStartMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Backoff Max (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.backoffMaxMs}
                    onChange={e =>
                      updatePollField('backoffMaxMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.backoffMaxMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Jitter Ratio (0..1)
                  </label>
                  <input
                    type='number'
                    min='0'
                    max='1'
                    step='0.01'
                    value={pollValues.jitterRatio}
                    onChange={e =>
                      updatePollField('jitterRatio', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.jitterRatio}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    Heartbeat (ms)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.heartbeatMs}
                    onChange={e =>
                      updatePollField('heartbeatMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm'
                    placeholder={pollDefaults.heartbeatMs}
                  />
                </div>
              </div>

              <div className='flex flex-wrap justify-between gap-3 border-t border-border-muted pt-6'>
                <div className='text-xs text-foreground-muted'>
                  <p>
                    <span className='font-semibold'>Standardwerte:</span>{' '}
                    Threads {pollDefaults.threadActiveMs}/
                    {pollDefaults.threadIdleMs}/{pollDefaults.threadHiddenMs}ms,
                    Skeets {pollDefaults.skeetActiveMs}/
                    {pollDefaults.skeetIdleMs}/{pollDefaults.skeetHiddenMs}ms,
                    Backoff {pollDefaults.backoffStartMs}→
                    {pollDefaults.backoffMaxMs}ms, Jitter{' '}
                    {pollDefaults.jitterRatio}, Heartbeat{' '}
                    {pollDefaults.heartbeatMs}ms
                  </p>
                </div>
                <div className='flex flex-wrap gap-3'>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={resetPollToDefaults}
                    disabled={pollLoading || pollSaving}
                  >
                    Zurücksetzen auf Standard
                  </Button>
                  <Button
                    type='submit'
                    variant='primary'
                    disabled={pollLoading || pollSaving || !pollHasChanges}
                  >
                    {pollSaving ? 'Speichern…' : 'Einstellungen speichern'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </Tabs.Content>
        <Tabs.Content value='credentials' className='outline-none'>
          <CredentialsSection />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

function CredentialsSection () {
  const toast = useToast()
  const [values, setValues] = useState({
    blueskyServerUrl: '',
    blueskyIdentifier: '',
    blueskyAppPassword: '',
    mastodonApiUrl: '',
    mastodonAccessToken: '',
    tenorApiKey: ''
  })
  const [hasSecret, setHasSecret] = useState({ bsky: false, masto: false, tenor: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [blink, setBlink] = useState({})

  const triggerBlink = (keys = []) => {
    const obj = {}
    keys.forEach(k => { obj[k] = true })
    setBlink(obj)
    setTimeout(() => setBlink({}), 900)
  }

  useEffect(() => {
    let ignore = false
    async function loadCreds () {
      setLoading(true)
      try {
        const res = await fetch('/api/config/credentials')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Fehler beim Laden der Zugangsdaten.')
        }
        const data = await res.json()
        if (!ignore) {
          setValues(v => ({
            ...v,
            blueskyServerUrl: data?.bluesky?.serverUrl || '',
            blueskyIdentifier: data?.bluesky?.identifier || '',
            mastodonApiUrl: data?.mastodon?.apiUrl || ''
          }))
          setHasSecret({
            bsky: Boolean(data?.bluesky?.hasAppPassword),
            masto: Boolean(data?.mastodon?.hasAccessToken),
            tenor: Boolean(data?.tenor?.hasApiKey)
          })
        }
      } catch (error) {
        console.error('Zugangsdaten laden fehlgeschlagen:', error)
        toast.error({ title: 'Zugangsdaten', description: error.message })
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadCreds()
    return () => { ignore = true }
  }, [toast])

  const onChange = key => e => setValues({ ...values, [key]: e.target.value })

  const handleSave = async e => {
    e.preventDefault()

    // Clientseitige Minimal-Validierung
    const next = { ...values }
    if (!next.blueskyServerUrl) {
      next.blueskyServerUrl = 'https://bsky.social'
    }
    const missing = []
    if (!next.blueskyIdentifier) missing.push('blueskyIdentifier')
    if (!hasSecret.bsky && !next.blueskyAppPassword) missing.push('blueskyAppPassword')
    if (missing.length) {
      triggerBlink(missing)
      toast.error({
        title: 'Eingaben fehlen',
        description: 'Bitte Bluesky‑Identifier und App‑Passwort ausfüllen.'
      })
      return
    }

    setSaving(true)
    try {
      const payload = { ...next }
      if (!payload.blueskyAppPassword) delete payload.blueskyAppPassword
      if (!payload.mastodonAccessToken) delete payload.mastodonAccessToken
      if (!payload.tenorApiKey) delete payload.tenorApiKey
      const res = await fetch('/api/config/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Fehler beim Speichern der Zugangsdaten.')
      }
      await res.json().catch(() => ({}))
      if (values.blueskyAppPassword) setHasSecret(s => ({ ...s, bsky: true }))
      if (values.mastodonAccessToken) setHasSecret(s => ({ ...s, masto: true }))
      if (values.tenorApiKey) setHasSecret(s => ({ ...s, tenor: true }))
      setValues(v => ({ ...v, blueskyAppPassword: '', mastodonAccessToken: '', tenorApiKey: '' }))
      toast.success({ title: 'Gespeichert', description: 'Zugangsdaten aktualisiert.' })

      // Nach dem Speichern direkt entsperren und zur Übersicht wechseln.
      // Konfiguration wird parallel aktualisiert; Navigation soll nicht blockieren.
      window.dispatchEvent(new Event('app:credentials-ok'))
      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'overview', force: true } }))
      try {
        window.dispatchEvent(new Event('client-config:refresh'))
        // Hintergrund-Refresh mit Cache-Bust, falls Browser cached
        await fetch(`/api/client-config?t=${Date.now()}`).catch(() => null)
      } catch { /* ignore */ }
    } catch (error) {
      console.error('Zugangsdaten speichern fehlgeschlagen:', error)
      toast.error({ title: 'Speichern fehlgeschlagen', description: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card padding='p-6 lg:p-10'>
      <div className='flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between'>
        <div>
          <h3 className='text-2xl font-semibold'>Zugangsdaten</h3>
          <p className='text-sm text-foreground-muted'>Server-URLs und Logins für Bluesky und Mastodon.</p>
        </div>
      </div>
      {loading ? (
        <p className='text-sm text-foreground-muted'>Lade …</p>
      ) : (
        <form onSubmit={handleSave} className='space-y-8'>
          <section className='space-y-4'>
            <h4 className='text-lg font-semibold'>Bluesky</h4>
            <div className='grid gap-4 md:grid-cols-2'>
              <label className='space-y-1'>
                <span className='text-sm font-medium'>Server URL</span>
                <input type='url' className={`w-full rounded-md border bg-background p-2 ${blink.blueskyServerUrl ? 'animate-pulse ring-2 ring-destructive border-destructive' : 'border-border'}`} placeholder='https://bsky.social' value={values.blueskyServerUrl} onChange={onChange('blueskyServerUrl')} />
              </label>
              <label className='space-y-1'>
                <span className='text-sm font-medium'>Identifier (Handle/E-Mail)</span>
                <input type='text' className={`w-full rounded-md border bg-background p-2 ${blink.blueskyIdentifier ? 'animate-pulse ring-2 ring-destructive border-destructive' : 'border-border'}`} placeholder='dein-handle.bsky.social' value={values.blueskyIdentifier} onChange={onChange('blueskyIdentifier')} />
              </label>
            </div>
            <label className='space-y-1 md:w-1/2'>
              <span className='text-sm font-medium'>App Password</span>
              <input type='password' className={`w-full rounded-md border bg-background p-2 ${blink.blueskyAppPassword ? 'animate-pulse ring-2 ring-destructive border-destructive' : 'border-border'}`} placeholder={hasSecret.bsky ? '••••••••' : ''} value={values.blueskyAppPassword} onChange={onChange('blueskyAppPassword')} />
              <p className='text-xs text-foreground-muted'>Leer lassen, um das bestehende Passwort zu behalten.</p>
            </label>
          </section>
          <section className='space-y-4'>
            <h4 className='text-lg font-semibold'>Mastodon</h4>
            <div className='grid gap-4 md:grid-cols-2'>
              <label className='space-y-1'>
                <span className='text-sm font-medium'>API URL</span>
                <input type='url' className='w-full rounded-md border border-border bg-background p-2' placeholder='https://mastodon.social' value={values.mastodonApiUrl} onChange={onChange('mastodonApiUrl')} />
              </label>
              <label className='space-y-1'>
                <span className='text-sm font-medium'>Access Token</span>
                <input type='password' className='w-full rounded-md border border-border bg-background p-2' placeholder={hasSecret.masto ? '••••••••' : ''} value={values.mastodonAccessToken} onChange={onChange('mastodonAccessToken')} />
                <p className='text-xs text-foreground-muted'>Leer lassen, um das bestehende Token zu behalten.</p>
              </label>
            </div>
          </section>
          <section className='space-y-4'>
            <h4 className='text-lg font-semibold'>Tenor (GIF Suche)</h4>
            <div className='grid gap-4 md:grid-cols-2'>
              <label className='space-y-1 md:w-1/2'>
                <span className='text-sm font-medium'>API Key</span>
                <input type='password' className='w-full rounded-md border border-border bg-background p-2' placeholder={hasSecret.tenor ? '••••••••' : ''} value={values.tenorApiKey} onChange={onChange('tenorApiKey')} />
                <p className='text-xs text-foreground-muted'>Leer lassen, um den bestehenden Key zu behalten. Aktiviert die GIF-Suche (Tenor).</p>
              </label>
            </div>
          </section>
          <div className='flex gap-3'>
            <Button type='submit' disabled={saving}>{saving ? 'Speichere …' : 'Zugangsdaten speichern'}</Button>
          </div>
        </form>
      )}
    </Card>
  )
}
