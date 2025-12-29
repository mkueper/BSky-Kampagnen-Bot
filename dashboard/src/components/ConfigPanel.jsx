import { useEffect, useMemo, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Button, Card, InfoDialog, TimeZonePicker } from '@bsky-kampagnen-bot/shared-ui'
import { useToast } from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../i18n/I18nProvider.jsx'

const NUMBER_FIELDS = ['postRetries', 'postBackoffMs', 'postBackoffMaxMs', 'randomOffsetMinutes']

function formatNumberInput (value) {
  return value == null ? '' : String(value)
}

function normalizeFormPayload (values) {
  return {
    scheduleTime: values.scheduleTime?.trim(),
    postRetries: values.postRetries !== '' ? Number(values.postRetries) : null,
    postBackoffMs:
      values.postBackoffMs !== '' ? Number(values.postBackoffMs) : null,
    postBackoffMaxMs:
      values.postBackoffMaxMs !== '' ? Number(values.postBackoffMaxMs) : null,
    randomOffsetMinutes:
      values.randomOffsetMinutes !== ''
        ? Number(values.randomOffsetMinutes)
        : null
  }
}

export default function ConfigPanel () {
  const toast = useToast()
  const { t, setLocale } = useTranslation()
  const [cronInfoOpen, setCronInfoOpen] = useState(false)
  const [retryInfoOpen, setRetryInfoOpen] = useState(false)
  const [pollInfoOpen, setPollInfoOpen] = useState(false)
  const [timeZoneInfoOpen, setTimeZoneInfoOpen] = useState(false)
  const [tab, setTab] = useState('general')
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
      } catch {
        /* ignore */
      }
    })()
    return () => {
      ignore = true
    }
  }, [])
  const [formValues, setFormValues] = useState({
    scheduleTime: '',
    postRetries: '',
    postBackoffMs: '',
    postBackoffMaxMs: '',
    graceWindowMinutes: '',
    randomOffsetMinutes: ''
  })
  const [initialValues, setInitialValues] = useState(formValues)
  const [defaults, setDefaults] = useState(formValues)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Allgemeine Einstellungen (Zeitzone)
  const [generalValues, setGeneralValues] = useState({
    timeZone: '',
    locale: 'de'
  })
  const [generalInitialValues, setGeneralInitialValues] = useState(
    generalValues
  )
  const [generalDefaults, setGeneralDefaults] = useState(generalValues)
  const [generalLoading, setGeneralLoading] = useState(true)
  const [generalSaving, setGeneralSaving] = useState(false)

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

  const mapGeneralErrorMessage = (data) => {
    const rawCode = typeof data?.error === 'string' ? data.error : null
    const code = rawCode && rawCode.startsWith('SETTINGS_GENERAL_') ? rawCode : null
    const backendMessage = typeof data?.message === 'string' ? data.message : null

    if (code === 'SETTINGS_GENERAL_TIME_ZONE_REQUIRED') {
      return t(
        'config.general.errors.timeZoneRequired',
        'TIME_ZONE muss angegeben werden.'
      )
    }
    if (code === 'SETTINGS_GENERAL_LOCALE_REQUIRED') {
      return t(
        'config.general.errors.localeRequired',
        'LOCALE muss angegeben werden.'
      )
    }
    if (code === 'SETTINGS_GENERAL_LOCALE_UNSUPPORTED') {
      return t(
        'config.general.errors.localeUnsupported',
        'LOCALE muss entweder "de" oder "en" sein.'
      )
    }

    if (backendMessage) return backendMessage
    if (rawCode && !code) return rawCode

    return t(
      'config.general.saveErrorFallback',
      'Fehler beim Speichern der allgemeinen Einstellungen.'
    )
  }

  const mapSchedulerErrorMessage = (data) => {
    const rawCode = typeof data?.error === 'string' ? data.error : null
    const code = rawCode && rawCode.startsWith('SETTINGS_SCHEDULER_') ? rawCode : null
    const backendMessage = typeof data?.message === 'string' ? data.message : null

    if (code === 'SETTINGS_SCHEDULER_INVALID_CRON') {
      return t(
        'config.scheduler.errors.invalidCron',
        'Ungültiger Cron-Ausdruck für den Scheduler.'
      )
    }
    if (code === 'SETTINGS_SCHEDULER_INVALID_NUMBERS') {
      return t(
        'config.scheduler.errors.invalidNumbers',
        'POST_RETRIES und Backoff-Werte müssen positive Zahlen sein.'
      )
    }
    if (code === 'SETTINGS_SCHEDULER_INVALID_GRACE_WINDOW') {
      return t(
        'config.scheduler.errors.invalidGraceWindow',
        'SCHEDULER_GRACE_WINDOW_MINUTES muss mindestens 2 Minuten betragen.'
      )
    }

    if (backendMessage) return backendMessage
    if (rawCode && !code) return rawCode

    return t(
      'config.scheduler.saveErrorFallback',
      'Speichern fehlgeschlagen.'
    )
  }

  const mapPollingErrorMessage = (data) => {
    const rawCode = typeof data?.error === 'string' ? data.error : null
    const code = rawCode && rawCode.startsWith('SETTINGS_POLLING_') ? rawCode : null
    const backendMessage = typeof data?.message === 'string' ? data.message : null

    if (code === 'SETTINGS_POLLING_INVALID_NUMBERS') {
      return t(
        'config.polling.errors.invalidNumbers',
        'Polling-Intervalle und Backoff-Werte müssen positive Zahlen sein.'
      )
    }
    if (code === 'SETTINGS_POLLING_INVALID_JITTER') {
      return t(
        'config.polling.errors.invalidJitter',
        'POLL_JITTER_RATIO muss zwischen 0 und 1 liegen.'
      )
    }

    if (backendMessage) return backendMessage
    if (rawCode && !code) return rawCode

    return t(
      'config.polling.saveErrorFallback',
      'Fehler beim Speichern der Client-Konfiguration.'
    )
  }

  const hasChanges = useMemo(() => {
    return Object.keys(formValues).some(
      key => String(formValues[key]) !== String(initialValues[key] ?? '')
    )
  }, [formValues, initialValues])
  const generalHasChanges = useMemo(() => {
    return (
      String(generalValues.timeZone ?? '') !==
        String(generalInitialValues.timeZone ?? '') ||
      String(generalValues.locale ?? '') !==
        String(generalInitialValues.locale ?? '')
    )
  }, [generalValues, generalInitialValues])

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
          postRetries: formatNumberInput(data.values?.postRetries),
          postBackoffMs: formatNumberInput(data.values?.postBackoffMs),
          postBackoffMaxMs: formatNumberInput(data.values?.postBackoffMaxMs),
          graceWindowMinutes: formatNumberInput(data.values?.graceWindowMinutes),
          randomOffsetMinutes: formatNumberInput(
            data.values?.randomOffsetMinutes
          )
        }
        const nextDefaults = {
          scheduleTime: data.defaults?.scheduleTime ?? '',
          postRetries: formatNumberInput(data.defaults?.postRetries),
          postBackoffMs: formatNumberInput(data.defaults?.postBackoffMs),
          postBackoffMaxMs: formatNumberInput(data.defaults?.postBackoffMaxMs),
          graceWindowMinutes: formatNumberInput(
            data.defaults?.graceWindowMinutes
          ),
          randomOffsetMinutes: formatNumberInput(
            data.defaults?.randomOffsetMinutes
          )
        }
        if (!ignore) {
          setFormValues(nextValues)
          setInitialValues(nextValues)
          setDefaults(nextDefaults)
        }
      } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error)
        toast.error({
          title: t('config.scheduler.toastTitle', 'Konfiguration'),
          description:
            error.message ||
            t(
              'config.scheduler.loadErrorDescription',
              'Einstellungen konnten nicht geladen werden.'
            )
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

  // Allgemeine Settings laden (aktuell: Zeitzone)
  useEffect(() => {
    let ignore = false
    async function loadGeneral () {
      setGeneralLoading(true)
      try {
        const res = await fetch('/api/settings/general')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(
            data.error || 'Fehler beim Laden der allgemeinen Einstellungen.'
          )
        }
        const data = await res.json()
        const nextValues = {
          timeZone: data.values?.timeZone ?? data.defaults?.timeZone ?? '',
          locale: data.values?.locale ?? data.defaults?.locale ?? 'de'
        }
        const nextDefaults = {
          timeZone: data.defaults?.timeZone ?? '',
          locale: data.defaults?.locale ?? 'de'
        }
        if (!ignore) {
          setGeneralValues(nextValues)
          setGeneralInitialValues(nextValues)
          setGeneralDefaults(nextDefaults)
          if (nextValues.locale && typeof nextValues.locale === 'string') {
            setLocale(nextValues.locale)
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der allgemeinen Einstellungen:', error)
        toast.error({
          title: t('config.general.toastTitle', 'Allgemeine Einstellungen'),
          description:
            error.message ||
            t(
              'config.general.loadErrorDescription',
              'Allgemeine Einstellungen konnten nicht geladen werden.'
            )
        })
      } finally {
        if (!ignore) setGeneralLoading(false)
      }
    }
    loadGeneral()
    return () => {
      ignore = true
    }
  }, [toast, setLocale])

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
          title: t('config.polling.toastTitle', 'Konfiguration'),
          description:
            error.message ||
            t(
              'config.polling.loadErrorDescription',
              'Client-Config konnte nicht geladen werden.'
            )
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

  const handleGeneralSubmit = async event => {
    event.preventDefault()
    setGeneralSaving(true)
    try {
      const payload = {
        timeZone: generalValues.timeZone?.trim() || null,
        locale: generalValues.locale || null
      }
      const res = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = mapGeneralErrorMessage(data)
        throw new Error(message)
      }
      const data = await res.json()
      const nextValues = {
        timeZone: data.values?.timeZone ?? payload.timeZone ?? '',
        locale: data.values?.locale ?? payload.locale ?? generalValues.locale ?? 'de'
      }
      const nextDefaults = {
        timeZone: data.defaults?.timeZone ?? generalDefaults.timeZone,
        locale: data.defaults?.locale ?? generalDefaults.locale ?? 'de'
      }
      setGeneralValues(nextValues)
      setGeneralInitialValues(nextValues)
      setGeneralDefaults(nextDefaults)
      if (nextValues.locale && typeof nextValues.locale === 'string') {
        setLocale(nextValues.locale)
      }
      toast.success({
        title: t(
          'config.general.saveSuccessTitle',
          'Allgemeine Einstellungen gespeichert'
        ),
        description: t(
          'config.general.saveSuccessDescription',
          'Zeitzone wurde aktualisiert. Der Scheduler verwendet künftig die neue Einstellung.'
        )
      })
    } catch (error) {
      console.error(
        'Fehler beim Speichern der allgemeinen Einstellungen:',
        error
      )
      toast.error({
        title: t('config.general.saveErrorTitle', 'Speichern fehlgeschlagen'),
        description:
          error.message ||
          t(
            'config.general.saveErrorDescription',
            'Die allgemeinen Einstellungen konnten nicht gespeichert werden.'
          )
      })
    } finally {
      setGeneralSaving(false)
    }
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!hasChanges) {
      toast.info({
        title: t('config.scheduler.noChangesTitle', 'Keine Änderungen'),
        description: t(
          'config.scheduler.noChangesDescription',
          'Die Einstellungen sind bereits aktuell.'
        )
      })
      return
    }

    const payload = normalizeFormPayload(formValues)
    payload.graceWindowMinutes =
      formValues.graceWindowMinutes === ''
        ? null
        : Number(formValues.graceWindowMinutes)
    payload.randomOffsetMinutes =
      formValues.randomOffsetMinutes === ''
        ? null
        : Number(formValues.randomOffsetMinutes)

    if (!payload.scheduleTime) {
      toast.error({
        title: t('config.scheduler.cronMissingTitle', 'Cron-Ausdruck fehlt'),
        description: t(
          'config.scheduler.cronMissingDescription',
          'Bitte einen gültigen Cron-Ausdruck angeben.'
        )
      })
      return
    }
    for (const key of NUMBER_FIELDS) {
      const value = payload[key]
      if (value == null || Number.isNaN(value) || value < 0) {
        toast.error({
          title: t('config.scheduler.invalidNumberTitle', 'Ungültiger Wert'),
          description: t(
            'config.scheduler.invalidNumberDescription',
            '{label} muss eine positive Zahl sein.',
            {
              label: t(`config.scheduler.labels.${key}`, key)
            }
          )
        })
        return
      }
    }
    if (payload.randomOffsetMinutes != null && payload.randomOffsetMinutes > 120) {
      toast.error({
        title: t('config.scheduler.invalidNumberTitle', 'Ungültiger Wert'),
        description: t(
          'config.scheduler.randomOffsetMaxDescription',
          'Zufallsversatz darf maximal 120 Minuten betragen.'
        )
      })
      return
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
        const message = mapSchedulerErrorMessage(data)
        throw new Error(message)
      }

      const data = await res.json()
      const nextValues = {
        scheduleTime: data.values?.scheduleTime ?? payload.scheduleTime,
        postRetries: formatNumberInput(data.values?.postRetries),
        postBackoffMs: formatNumberInput(data.values?.postBackoffMs),
        postBackoffMaxMs: formatNumberInput(data.values?.postBackoffMaxMs),
        graceWindowMinutes: formatNumberInput(
          data.values?.graceWindowMinutes ?? payload.graceWindowMinutes
        ),
        randomOffsetMinutes: formatNumberInput(
          data.values?.randomOffsetMinutes ?? payload.randomOffsetMinutes
        )
      }
      const nextDefaults = {
        scheduleTime: data.defaults?.scheduleTime ?? defaults.scheduleTime,
        postRetries: formatNumberInput(
          data.defaults?.postRetries ?? defaults.postRetries
        ),
        postBackoffMs: formatNumberInput(
          data.defaults?.postBackoffMs ?? defaults.postBackoffMs
        ),
        postBackoffMaxMs: formatNumberInput(
          data.defaults?.postBackoffMaxMs ?? defaults.postBackoffMaxMs
        ),
        graceWindowMinutes: formatNumberInput(
          data.defaults?.graceWindowMinutes ?? defaults.graceWindowMinutes
        ),
        randomOffsetMinutes: formatNumberInput(
          data.defaults?.randomOffsetMinutes ?? defaults.randomOffsetMinutes
        )
      }
      setFormValues(nextValues)
      setInitialValues(nextValues)
      setDefaults(nextDefaults)

      toast.success({
        title: t(
          'config.scheduler.saveSuccessTitle',
          'Einstellungen gespeichert'
        ),
        description: t(
          'config.scheduler.saveSuccessDescription',
          'Scheduler und Retry-Strategie wurden aktualisiert.'
        )
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error)
      toast.error({
        title: t('config.scheduler.saveErrorTitle', 'Speichern fehlgeschlagen'),
        description:
          error.message ||
          t(
            'config.scheduler.saveErrorDescription',
            'Die Einstellungen konnten nicht gespeichert werden.'
          )
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
        title: t('config.polling.noChangesTitle', 'Keine Änderungen'),
        description: t(
          'config.polling.noChangesDescription',
          'Die Client-Polling-Einstellungen sind bereits aktuell.'
        )
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
        title: t('config.polling.invalidValuesTitle', 'Ungültige Werte'),
        description: t(
          'config.polling.invalidValuesDescription',
          'Intervalle und Backoff müssen positive Zahlen sein.'
        )
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
        title: t('config.polling.invalidJitterTitle', 'Ungültiger Jitter'),
        description: t(
          'config.polling.invalidJitterDescription',
          'POLL_JITTER_RATIO muss zwischen 0 und 1 liegen.'
        )
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
        const message = mapPollingErrorMessage(data)
        throw new Error(message)
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
        title: t(
          'config.polling.saveSuccessTitle',
          'Client-Konfiguration gespeichert'
        ),
        description: t(
          'config.polling.saveSuccessDescription',
          'Polling & Backoff aktualisiert.'
        )
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Client-Konfiguration:', error)
      toast.error({
        title: t('config.polling.saveErrorTitle', 'Speichern fehlgeschlagen'),
        description:
          error.message ||
          t(
            'config.polling.saveErrorDescription',
            'Client-Config konnte nicht gespeichert werden.'
          )
      })
    } finally {
      setPollSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      <InfoDialog
        open={cronInfoOpen}
        title={t('config.scheduler.cronInfoTitle', 'Cron-Ausdruck')}
        onClose={() => setCronInfoOpen(false)}
        closeLabel={t('common.actions.close', 'Schließen')}
        panelClassName='max-w-[80vw] md:max-w-[900px]'
        content={(
          <>
            <p>
              {t(
                'config.scheduler.tips.serverTime',
                'Cron-Ausdrücke beziehen sich auf die Serverzeit – beim Deployment sollte auf die korrekte Zeitzone geachtet werden.'
              )}
            </p>
            <p>
              {t(
                'config.scheduler.cronInfoSummary',
                'Cron-Ausdrücke steuern, wann das Kampagnen‑Tool geplante Posts verarbeitet.'
              )}
            </p>
            <p>
              <span className='font-semibold'>
                {t(
                  'config.scheduler.cronInfoRandomHeading',
                  'Zufallsversatz (± Minuten)'
                )}
                {': '}
              </span>
              {t(
                'config.scheduler.cronInfoRandom',
                'Wird ein Versatz gesetzt, erh alten wiederkehrende Posts pro Turnus einen zufälligen Vor- oder Nachlauf innerhalb des Fensters. So starten mehrere Serien nicht exakt zeitgleich, während die eigentliche Referenzzeit (`repeatAnchorAt`) beibehalten wird.'
              )}
            </p>
          </>
        )}
        examples={t(
          'config.scheduler.cronInfoBody',
          'Beispiele:\n' +
          '0   *    *    *    *      – jede volle Stunde\n' +
          '*/5 *    *    *    *      – alle 5 Minuten\n' +
          '0   12   *    *    *      – täglich um 12:00\n' +
          '30  7    *    *    *      – täglich um 07:30\n' +
          '0   9    *    *    1      – jeden Montag um 09:00\n' +
          '0   8    1    *    *      – am 1. des Monats um 08:00\n\n'
        )}
      />
      <InfoDialog
        open={timeZoneInfoOpen}
        title={t(
          'config.general.timeZoneInfoTitle',
          'Zeitzone im Scheduler'
        )}
        onClose={() => setTimeZoneInfoOpen(false)}
        closeLabel={t('common.actions.close', 'Schließen')}
        panelClassName='max-w-[80vw] md:max-w-[700px]'
        content={(
          <div className='space-y-3 text-sm text-foreground'>
            <p>
              {t(
                'config.general.timeZoneInfoIntro',
                'Die Standard-Zeitzone definiert die Referenzzeitzone für Scheduler und Dashboard.'
              )}
            </p>
            <p>
              {t(
                'config.general.timeZoneInfoServer',
                'Cron-Ausdrücke und die Ausführung des Schedulers orientieren sich an der konfigurierten Zeitzone auf dem Server. Die lokale Browser-Zeitzone bleibt davon unabhängig.'
              )}
            </p>
            <p>
              {t(
                'config.general.timeZoneInfoForms',
                'Datums- und Zeitfelder in den Planungsformularen verwenden die Standard-Zeitzone für Vorschlagswerte und Darstellung.'
              )}
            </p>
            <p className='text-xs text-foreground-muted'>
              {t(
                'config.general.timeZoneInfoHint',
                'In den meisten Installationen ist die Zeitzone des Deployment-Standorts (z. B. Europe/Berlin) sinnvoll. UTC eignet sich für rein technische Umgebungen.'
              )}
            </p>
          </div>
        )}
      />
      <InfoDialog
        open={retryInfoOpen}
        title={t(
          'config.scheduler.retryInfoTitle',
          'Wiederholversuche & Backoff'
        )}
        onClose={() => setRetryInfoOpen(false)}
        closeLabel={t('common.actions.close', 'Schließen')}
        panelClassName='max-w-[80vw] md:max-w-[700px]'
        content={(
          <div className='space-y-3 text-sm text-foreground'>
            <p className='whitespace-pre-line'>
              {t(
                'config.scheduler.retryInfoIntro',
                'Wiederholversuche helfen dabei, vorübergehende Fehler beim Senden von Posts abzufedern – etwa Rate-Limits oder kurzzeitige Verbindungsprobleme.'
              )}
            </p>
            <p>
              <span className='font-semibold'>
                {t(
                  'config.scheduler.retryInfoRetriesHeading',
                  'Maximale Wiederholversuche'
                )}
                {': '}
              </span>
              {t(
                'config.scheduler.retryInfoRetries',
                'Legt fest, wie oft ein Post nach einem Fehler erneut versucht wird, bevor er als fehlgeschlagen gilt.'
              )}
            </p>
            <p>
              <span className='font-semibold'>
                {t(
                  'config.scheduler.retryInfoBackoffHeading',
                  'Basis-Backoff & maximaler Backoff'
                )}
                {': '}
              </span>
              {t(
                'config.scheduler.retryInfoBackoff',
                'Der Basis-Backoff bestimmt die anfängliche Wartezeit zwischen zwei Versuchen. Der maximale Backoff begrenzt, wie weit sich diese Wartezeit bei mehrfachen Fehlern erhöhen kann.'
              )}
            </p>
            <p>
              <span className='font-semibold'>
                {t(
                  'config.scheduler.retryInfoGraceHeading',
                  'Grace-Zeit für verpasste Termine'
                )}
                {': '}
              </span>
              {t(
                'config.scheduler.retryInfoGrace',
                'Die Grace-Zeit legt fest, wie lange nach einem Neustart verpasste Sendezeitpunkte noch nachgeholt werden. Liegt ein Termin außerhalb dieses Fensters, wird der Post nicht mehr automatisch nachträglich versendet.'
              )}
            </p>
            <p className='text-xs text-foreground-muted'>
              {t(
                'config.scheduler.retryInfoHint',
                'Für die meisten Setups ist eine geringe Anzahl an Wiederholversuchen (z. B. 2–3) und eine moderate Grace-Zeit ausreichend, um kurzfristige Ausfälle abzufangen, ohne alte Posts stark zu verzögern.'
              )}
            </p>
          </div>
        )}
      />
      <InfoDialog
        open={pollInfoOpen}
        title={t(
          'config.polling.infoTitle',
          'Dashboard-Polling & Backoff'
        )}
        onClose={() => setPollInfoOpen(false)}
        closeLabel={t('common.actions.close', 'Schließen')}
        panelClassName='max-w-[80vw] md:max-w-[700px]'
        content={(
          <div className='max-h-[60vh] overflow-y-auto space-y-3 text-sm text-foreground'>
            <p>
              {t(
                'config.polling.infoIntro',
                'Dashboard-Polling ergänzt die Live-Updates (SSE), damit Listen für Threads und Posts auch bei Verbindungsproblemen aktualisiert werden können.'
              )}
            </p>
            <p>
              <span className='font-semibold'>
                {t(
                  'config.polling.infoIntervalsHeading',
                  'Intervalle für Threads & Posts'
                )}
                {': '}
              </span>
              {t(
                'config.polling.infoIntervals',
                'Aktiv-, Idle- und Hidden-Intervalle steuern, wie häufig Threads und Posts im jeweiligen Zustand abgefragt werden.'
              )}
            </p>
            <p>
              <span className='font-semibold'>
                {t(
                  'config.polling.infoBackoffHeading',
                  'Backoff & Jitter'
                )}
                {': '}
              </span>
              {t(
                'config.polling.infoBackoff',
                'Backoff-Werte bestimmen, wie stark Polling bei wiederholten Fehlern verlangsamt wird. Jitter streut die Intervalle leicht, um gleichzeitige Anfragen mehrerer Clients zu vermeiden.'
              )}
            </p>
            <p>
              <span className='font-semibold'>
                {t(
                  'config.polling.infoHeartbeatHeading',
                  'Heartbeat & aktiver Tab'
                )}
                {': '}
              </span>
              {t(
                'config.polling.infoHeartbeat',
                'Der Heartbeat signalisiert dem Backend, ob ein aktiver Client vorhanden ist. Nur bei aktiven Clients wird Polling für Engagement-Updates häufiger ausgeführt.'
              )}
            </p>
            <p className='text-xs text-foreground-muted'>
              {t(
                'config.polling.infoHint',
                'Für die meisten Setups sind moderate Intervalle ausreichend. Aggressives Polling erhöht die Serverlast und ist meist nur für Debug- oder Testumgebungen sinnvoll.'
              )}
            </p>
          </div>
        )}
      />

      {needsCreds ? (
        <Card
          padding='p-4 lg:p-5'
          className='border border-primary/40 bg-primary/5'
        >
          <div className='space-y-1'>
            <h4 className='text-base font-semibold text-foreground'>
              {t(
                'config.credentials.required.heading',
                'Zugangsdaten erforderlich'
              )}
            </h4>
            <p className='text-sm text-foreground-muted'>
              {t(
                'config.credentials.required.body',
                'Zunächst sollten Zugangsdaten für Bluesky (und optional Mastodon) hinterlegt werden. Anschließend lassen sich die weiteren Optionen nach Bedarf anpassen.'
              )}
            </p>
          </div>
        </Card>
      ) : null}
      <Tabs.Root value={tab} onValueChange={setTab} className='block'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <Tabs.List
            className='inline-flex rounded-full bg-background-subtle p-1'
            aria-label={t('config.tabs.ariaLabel', 'Konfig-Themen')}
          >
            <Tabs.Trigger
              value='general'
              className='rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background-elevated data-[state=active]:shadow-soft text-foreground-muted hover:text-foreground'
            >
              {t('config.tabs.general', 'Allgemein')}
            </Tabs.Trigger>
            <Tabs.Trigger
              value='credentials'
              className='rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background-elevated data-[state=active]:shadow-soft text-foreground-muted hover:text-foreground'
            >
              {t('config.tabs.credentials', 'Zugangsdaten')}
            </Tabs.Trigger>
            <Tabs.Trigger
              value='external-services'
              className='rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background-elevated data-[state=active]:shadow-soft text-foreground-muted hover:text-foreground'
            >
              {t('config.tabs.externalServices', 'Externe Dienste')}
            </Tabs.Trigger>
            <Tabs.Trigger
              value='scheduler'
              className='rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background-elevated data-[state=active]:shadow-soft text-foreground-muted hover:text-foreground'
            >
              {t('config.tabs.scheduler', 'Scheduler & Retry')}
            </Tabs.Trigger>
            <Tabs.Trigger
              value='polling'
              className='rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background-elevated data-[state=active]:shadow-soft text-foreground-muted hover:text-foreground'
            >
              {t('config.tabs.polling', 'Dashboard-Polling')}
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value='general' className='outline-none'>
          <Card padding='p-6 lg:p-10'>
            <div className='flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between'>
              <div>
                <h3 className='text-2xl font-semibold'>
                  {t('config.general.heading', 'Allgemein')}
                </h3>
                <p className='text-sm text-foreground-muted'>
                  {t(
                    'config.general.subtitle',
                    'Basis-Einstellungen für Sprache und Zeitzone des Kampagnen‑Tools.'
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleGeneralSubmit} className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='relative space-y-2 focus-within:z-20'>
                  <label
                    htmlFor='general-locale'
                    className='text-sm font-semibold text-foreground'
                  >
                    {t('config.general.labels.locale', 'Anzeigesprache')}
                  </label>
                  <select
                    id='general-locale'
                    value={generalValues.locale || 'de'}
                    onChange={e => {
                      const value = e.target.value
                      setGeneralValues(prev => ({ ...prev, locale: value }))
                    }}
                    disabled={generalLoading || generalSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                  >
                    <option value='de'>Deutsch</option>
                    <option value='en'>English</option>
                  </select>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'config.general.localeHint',
                      'Steuert die Anzeigesprache des Kampagnen‑Tools.'
                    )}
                  </p>
                </div>

                <div className='space-y-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <label
                      htmlFor='general-timeZone'
                      className='text-sm font-semibold text-foreground'
                    >
                      {t('config.general.labels.timeZone', 'Standard-Zeitzone')}
                    </label>
                    <button
                      type='button'
                      className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-background-elevated'
                      aria-label={t(
                        'config.general.timeZoneInfoAria',
                        'Hinweis zur Zeitzone anzeigen'
                      )}
                      title={t(
                        'posts.form.infoButtonTitle',
                        'Hinweis anzeigen'
                      )}
                      onClick={() => setTimeZoneInfoOpen(true)}
                    >
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 15 15'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        aria-hidden='true'
                      >
                        <path
                          d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z'
                          fill='currentColor'
                        />
                        <path
                          fillRule='evenodd'
                          clipRule='evenodd'
                          d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z'
                          fill='currentColor'
                        />
                      </svg>
                      {t('posts.form.infoButtonLabel', 'Info')}
                    </button>
                  </div>
                  <TimeZonePicker
                    id='general-timeZone'
                    value={generalValues.timeZone || null}
                    onChange={(tz) =>
                      setGeneralValues(current => ({
                        ...current,
                        timeZone: tz || ''
                      }))
                    }
                    disabled={generalLoading || generalSaving}
                    placeholder={generalDefaults.timeZone || 'Europe/Berlin'}
                    helperText={t(
                      'config.general.timeZoneHint',
                      'Beispiel: Europe/Berlin oder UTC (IANA-Zeitzone).'
                    )}
                    favoriteTimeZones={['Europe/Berlin', 'UTC']}
                  />
                </div>
              </div>

              <div className='flex flex-wrap justify-end gap-3 border-t border-border-muted pt-6'>
                <div className='flex flex-wrap gap-3'>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={() => setGeneralValues(generalDefaults)}
                    disabled={generalLoading || generalSaving}
                  >
                    {t(
                      'config.general.resetButton',
                      'Standard wiederherstellen'
                    )}
                  </Button>
                  <Button
                    type='submit'
                    variant='primary'
                    disabled={generalLoading || generalSaving || !generalHasChanges}
                  >
                    {generalSaving
                      ? t('config.general.saveBusy', 'Übernehmen…')
                      : t(
                          'config.general.saveLabel',
                          'Übernehmen'
                        )}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </Tabs.Content>

        <Tabs.Content value='scheduler' className='outline-none'>
          <Card padding='p-6 lg:p-10'>
            <div className='flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between'>
              <div>
                <h3 className='text-2xl font-semibold'>
                  {t('config.scheduler.heading', 'Scheduler & Retry')}
                </h3>
                <p className='text-sm text-foreground-muted'>
                  {t(
                    'config.scheduler.subtitle',
                    'Passe Cron, Zeitzone und Retry-Strategie für das Kampagnen‑Tool an.'
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div className='grid gap-6 md:grid-cols-2'>
                <div className='md:col-span-2 space-y-6'>
                  <div className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
                    <div className='flex items-center justify-between gap-2'>
                      <h3 className='text-sm font-semibold text-foreground'>
                        {t(
                          'config.scheduler.labels.scheduleCronBlockTitle',
                          'Cron'
                        )}
                      </h3>
                      <button
                        type='button'
                        className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-background-elevated'
                        aria-label={t(
                          'config.scheduler.cronInfoAria',
                          'Hinweis zu Cron-Ausdruck anzeigen'
                        )}
                        onClick={() => setCronInfoOpen(true)}
                        title={t(
                          'posts.form.infoButtonTitle',
                          'Hinweis anzeigen'
                        )}
                      >
                        <svg
                          width='12'
                          height='12'
                          viewBox='0 0 15 15'
                          fill='none'
                          xmlns='http://www.w3.org/2000/svg'
                          aria-hidden='true'
                        >
                          <path
                            d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z'
                            fill='currentColor'
                          />
                          <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z'
                            fill='currentColor'
                          />
                        </svg>
                        {t('posts.form.infoButtonLabel', 'Info')}
                      </button>
                    </div>
                    <div className='grid gap-4 md:grid-cols-3 md:items-start'>
                      <div className='space-y-4 md:col-span-2'>
                        <div className='space-y-2'>
                        <div className='flex items-center justify-between gap-2'>
                          <label
                            htmlFor='scheduleTime'
                            className='text-sm font-semibold text-foreground'
                          >
                            {t(
                              'config.scheduler.labels.scheduleTime',
                              'Cron-Ausdruck'
                            )}
                          </label>
                        </div>
                        <input
                          id='scheduleTime'
                          type='text'
                          value={formValues.scheduleTime}
                          onChange={e =>
                            updateField('scheduleTime', e.target.value)
                          }
                          disabled={loading || saving}
                          className='w- rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                          placeholder={defaults.scheduleTime}
                        />
                      </div>
                        <div className='flex h-full flex-col'>
                          <label
                            htmlFor='randomOffsetMinutes'
                            className='text-sm font-semibold text-foreground'
                          >
                            {t(
                              'config.scheduler.labels.randomOffsetMinutes',
                              'Zufallsversatz (± Minuten)'
                            )}
                          </label>
                          <input
                            id='randomOffsetMinutes'
                            type='number'
                            min={0}
                            max={120}
                            step={1}
                            value={formValues.randomOffsetMinutes}
                            onChange={e =>
                              updateField('randomOffsetMinutes', e.target.value)
                            }
                            disabled={loading || saving}
                            className='mt-2 w-32 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                            placeholder={defaults.randomOffsetMinutes}
                          />
                          <p className='mt-1 text-xs text-foreground-muted'>
                            {t(
                              'config.scheduler.randomOffsetHint',
                              'Optionaler jitter für wiederkehrende Posts. 5 ⇒ Versatz zwischen −5 und +5 Minuten.'
                            )}
                          </p>
                        </div>
                      </div>
                      <div className='border-l border-solid pl-4 md:col-span-1 space-y-2 text-xs text-foreground-muted md:text-sm'>
                        <div className='font-semibold'>
                          {t('config.scheduler.examplesTitle', 'Beispiele:')}
                        </div>
                        <div className='grid grid-cols-[auto,minmax(0,1fr)] gap-x-3 gap-y-1'>
                          <div>0 * * * *</div>
                          <div>
                            {t('config.scheduler.examplesHourly', 'stündlich')}
                          </div>
                          <div>*/5 * * * *</div>
                          <div>
                            {t(
                              'config.scheduler.examplesEveryFive',
                              'alle 5 Minuten'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
                    <div className='flex items-center justify-between gap-2'>
                      <h3 className='text-sm font-semibold text-foreground'>
                        {t(
                          'config.scheduler.sections.retryTitle',
                          'Wiederholversuche & Backoff'
                        )}
                      </h3>
                      <button
                        type='button'
                        className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-background-elevated'
                        aria-label={t(
                          'config.scheduler.retryInfoAria',
                          'Hinweis zu Wiederholversuchen & Backoff anzeigen'
                        )}
                        title={t(
                          'posts.form.infoButtonTitle',
                          'Hinweis anzeigen'
                        )}
                        onClick={() => setRetryInfoOpen(true)}
                      >
                        <svg
                          width='12'
                          height='12'
                          viewBox='0 0 15 15'
                          fill='none'
                          xmlns='http://www.w3.org/2000/svg'
                          aria-hidden='true'
                        >
                          <path
                            d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z'
                            fill='currentColor'
                          />
                          <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z'
                            fill='currentColor'
                          />
                        </svg>
                        {t('posts.form.infoButtonLabel', 'Info')}
                      </button>
                    </div>
                    <div className='grid gap-4 md:grid-cols-3'>
                      <div className='md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='flex h-full flex-col'>
                          <div className='flex items-center justify-between gap-2'>
                            <label
                              htmlFor='postRetries'
                              className='text-sm font-semibold text-foreground'
                            >
                              {t(
                                'config.scheduler.labels.postRetries',
                                'Maximale Wiederholversuche'
                              )}
                            </label>
                          </div>
                          <input
                            id='postRetries'
                            type='number'
                            min={0}
                            max={5}
                            step={1}
                            value={formValues.postRetries}
                            onChange={e =>
                              updateField('postRetries', e.target.value)
                            }
                            disabled={loading || saving}
                            className='mt-auto w-32 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                            placeholder={defaults.postRetries}
                          />
                        </div>
                        <div className='flex h-full flex-col'>
                          <label
                            htmlFor='postBackoffMs'
                            className='text-sm font-semibold text-foreground'
                          >
                            {t(
                              'config.scheduler.labels.postBackoffMs',
                              'Basis-Backoff (ms)'
                            )}
                          </label>
                          <input
                            id='postBackoffMs'
                            type='number' min={100} max={10000} step={1}
                            value={formValues.postBackoffMs}
                            onChange={e =>
                              updateField('postBackoffMs', e.target.value)
                            }
                            disabled={loading || saving}
                            className='mt-auto w-32 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                            placeholder={defaults.postBackoffMs}
                          />
                        </div>
                        <div className='flex h-full flex-col'>
                          <label
                            htmlFor='postBackoffMaxMs'
                            className='text-sm font-semibold text-foreground'
                          >
                            {t(
                              'config.scheduler.labels.postBackoffMaxMs',
                              'Maximaler Backoff (ms)'
                            )}
                          </label>
                          <input
                            id='postBackoffMaxMs'
                            type='number'  min={100} max={120000} step={1}
                            value={formValues.postBackoffMaxMs}
                            onChange={e =>
                              updateField('postBackoffMaxMs', e.target.value)
                            }
                            disabled={loading || saving}
                            className='mt-auto w-32 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                            placeholder={defaults.postBackoffMaxMs}
                          />
                        </div>
                        <div className='flex h-full flex-col'>
                          <label
                            htmlFor='graceWindowMinutes'
                            className='text-sm font-semibold text-foreground'
                          >
                            {t(
                              'config.scheduler.labels.graceWindowMinutes',
                              'Grace-Zeit für verpasste Termine (Minuten)'
                            )}
                          </label>
                          <input
                            id='graceWindowMinutes'
                            type='number' min={2} max={120} step={1}
                            value={formValues.graceWindowMinutes}
                            onChange={e =>
                              updateField('graceWindowMinutes', e.target.value)
                            }
                            disabled={loading || saving}
                            className='mt-auto w-32 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                            placeholder={defaults.graceWindowMinutes}
                          />
                        </div>
                      </div>
                      <div className='border-l border-solid pl-4 md:col-span-1 md:flex md:items-center'>
                        <p className='text-xs text-foreground-muted md:text-sm whitespace-pre-line'>
                          {t(
                            'config.scheduler.retryInfoInline',
                            'Bei vorübergehenden Fehlern (z. B. Rate-Limits) werden Posts automatisch erneut versucht. Über Wiederholversuche, Backoff und Grace-Zeit wird festgelegt, wie lange das Nachholen erlaubt ist.'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex flex-wrap justify-end gap-3 border-t border-border-muted pt-6'>
                <div className='flex flex-wrap gap-3'>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={resetToDefaults}
                    disabled={loading || saving}
                    title={t(
                      'config.scheduler.summary',
                      'Standardwerte: Cron {cron}, Zeitzone {tz}, Retries {retries}, Backoff {backoffMs}ms (max. {backoffMaxMs}ms)',
                      {
                        cron: defaults.scheduleTime,
                        tz: defaults.timeZone || '–',
                        retries: defaults.postRetries,
                        backoffMs: defaults.postBackoffMs,
                        backoffMaxMs: defaults.postBackoffMaxMs
                      }
                    )}
                  >
                    {t(
                      'config.scheduler.resetButton',
                      'Zurücksetzen auf Standard'
                    )}
                  </Button>
                  <Button
                    type='submit'
                    variant='primary'
                    disabled={loading || saving || !hasChanges}
                  >
                    {saving
                      ? t('config.scheduler.saveBusy', 'Übernehmen…')
                      : t(
                          'config.scheduler.saveLabel',
                          'Übernehmen'
                        )}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </Tabs.Content>

        <Tabs.Content value='polling' className='outline-none'>
          <Card padding='p-6 lg:p-10'>
            <div className='flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between'>
              <div>
                <h3 className='text-2xl font-semibold'>
                  {t('config.polling.heading', 'Dashboard-Polling')}
                </h3>
                <p className='text-sm text-foreground-muted'>
                  {t(
                    'config.polling.subtitle',
                    'Steuere Intervalle und Backoff für Listen (Threads & Posts).'
                  )}
                </p>
              </div>
              <div className='flex flex-col items-end text-xs text-foreground-muted md:text-sm'>
                <button
                  type='button'
                  className='mb-1 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-background-elevated'
                  aria-label={t(
                    'config.polling.infoAria',
                    'Hinweis zum Dashboard-Polling anzeigen'
                  )}
                  title={t(
                    'posts.form.infoButtonTitle',
                    'Hinweis anzeigen'
                  )}
                  onClick={() => setPollInfoOpen(true)}
                >
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 15 15'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                    aria-hidden='true'
                  >
                    <path
                      d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z'
                      fill='currentColor'
                    />
                    <path
                      fillRule='evenodd'
                      clipRule='evenodd'
                      d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z'
                      fill='currentColor'
                    />
                  </svg>
                  {t('posts.form.infoButtonLabel', 'Info')}
                </button>
                <p className='text-right'>
                  {t(
                    'config.polling.hintDefaults',
                    'Polling ergänzt Live-Updates (SSE) und wird vor allem bei Verbindungsproblemen aktiv.'
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handlePollSubmit} className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t(
                      'config.polling.labels.threadActiveMs',
                      'Threads: Aktiv (ms)'
                    )}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.threadActiveMs}
                    onChange={e =>
                      updatePollField('threadActiveMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={pollDefaults.threadActiveMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t(
                      'config.polling.labels.threadIdleMs',
                      'Threads: Idle (ms)'
                    )}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.threadIdleMs}
                    onChange={e =>
                      updatePollField('threadIdleMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={pollDefaults.threadIdleMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t(
                      'config.polling.labels.threadHiddenMs',
                      'Threads: Hidden (ms)'
                    )}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.threadHiddenMs}
                    onChange={e =>
                      updatePollField('threadHiddenMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
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
                    <span>
                      {t(
                        'config.polling.labels.threadMinimalHidden',
                        'Threads: Minimal Ping hidden'
                      )}
                    </span>
                  </label>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t(
                      'config.polling.labels.skeetActiveMs',
                      'Posts: Aktiv (ms)'
                    )}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.skeetActiveMs}
                    onChange={e =>
                      updatePollField('skeetActiveMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={pollDefaults.skeetActiveMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t('config.polling.labels.skeetIdleMs', 'Posts: Idle (ms)')}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.skeetIdleMs}
                    onChange={e =>
                      updatePollField('skeetIdleMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={pollDefaults.skeetIdleMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t(
                      'config.polling.labels.skeetHiddenMs',
                      'Posts: Hidden (ms)'
                    )}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.skeetHiddenMs}
                    onChange={e =>
                      updatePollField('skeetHiddenMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
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
                    <span>
                      {t(
                        'config.polling.labels.skeetMinimalHidden',
                        'Posts: Minimal Ping hidden'
                      )}
                    </span>
                  </label>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t(
                      'config.polling.labels.backoffStartMs',
                      'Backoff Start (ms)'
                    )}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.backoffStartMs}
                    onChange={e =>
                      updatePollField('backoffStartMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={pollDefaults.backoffStartMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t(
                      'config.polling.labels.backoffMaxMs',
                      'Backoff Max (ms)'
                    )}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.backoffMaxMs}
                    onChange={e =>
                      updatePollField('backoffMaxMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={pollDefaults.backoffMaxMs}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t(
                      'config.polling.labels.jitterRatio',
                      'Jitter Ratio (0..1)'
                    )}
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
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={pollDefaults.jitterRatio}
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-semibold text-foreground'>
                    {t('config.polling.labels.heartbeatMs', 'Heartbeat (ms)')}
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={pollValues.heartbeatMs}
                    onChange={e =>
                      updatePollField('heartbeatMs', e.target.value)
                    }
                    disabled={pollLoading || pollSaving}
                    className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={pollDefaults.heartbeatMs}
                  />
                </div>
              </div>

              <div className='flex flex-wrap justify-end gap-3 border-t border-border-muted pt-6'>
                <div className='flex flex-wrap gap-3'>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={resetPollToDefaults}
                    disabled={pollLoading || pollSaving}
                  >
                    {t(
                      'config.polling.resetButton',
                      'Zurücksetzen auf Standard'
                    )}
                  </Button>
                  <Button
                    type='submit'
                    variant='primary'
                    disabled={pollLoading || pollSaving || !pollHasChanges}
                  >
                    {pollSaving
                      ? t('config.polling.saveBusy', 'Übernehmen…')
                      : t(
                          'config.polling.saveLabel',
                          'Übernehmen'
                        )}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </Tabs.Content>
        <Tabs.Content value='credentials' className='outline-none'>
          <CredentialsSection />
        </Tabs.Content>
        <Tabs.Content value='external-services' className='outline-none'>
          <ExternalServicesSection />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

function CredentialsSection () {
  const toast = useToast()
  const { t } = useTranslation()
  const [infoOpen, setInfoOpen] = useState(false)
  const SESSION_TTL_STORAGE_KEY = 'dashboardSessionTtlHours'
  const SESSION_TTL_MIN_HOURS = 6
  const SESSION_TTL_MAX_HOURS = 168
  const SESSION_TTL_DEFAULT_HOURS = 12
  const [values, setValues] = useState({
    blueskyServerUrl: '',
    blueskyIdentifier: '',
    blueskyAppPassword: '',
    blueskyClientApp: '',
    mastodonApiUrl: '',
    mastodonAccessToken: '',
    mastodonClientApp: ''
  })
  const [initialValues, setInitialValues] = useState({
    blueskyServerUrl: '',
    blueskyIdentifier: '',
    blueskyAppPassword: '',
    blueskyClientApp: '',
    mastodonApiUrl: '',
    mastodonAccessToken: '',
    mastodonClientApp: ''
  })
  const [hasSecret, setHasSecret] = useState({
    bsky: false,
    masto: false
  })
  const [sessionTtlInput, setSessionTtlInput] = useState(() => {
    if (typeof window === 'undefined') return String(SESSION_TTL_DEFAULT_HOURS)
    const stored = window.localStorage.getItem(SESSION_TTL_STORAGE_KEY)
    const parsed = Number(stored)
    const safe = Number.isFinite(parsed) ? parsed : SESSION_TTL_DEFAULT_HOURS
    const clamped = Math.min(SESSION_TTL_MAX_HOURS, Math.max(SESSION_TTL_MIN_HOURS, Math.round(safe)))
    return String(clamped)
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [blink, setBlink] = useState({})
  const [clientUrlErrors, setClientUrlErrors] = useState({})

  const triggerBlink = (keys = []) => {
    const obj = {}
    keys.forEach(k => {
      obj[k] = true
    })
    setBlink(obj)
    setTimeout(() => setBlink({}), 900)
  }

  const isPrivateHostname = (hostname) => {
    if (!hostname) return false
    const host = hostname.toLowerCase()
    if (host === 'localhost') return true
    const v4 = host.split('.').map(part => Number(part))
    if (v4.length !== 4 || v4.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false
    if (v4[0] === 10) return true
    if (v4[0] === 172 && v4[1] >= 16 && v4[1] <= 31) return true
    if (v4[0] === 192 && v4[1] === 168) return true
    return false
  }

  const validateClientUrl = (value) => {
    const raw = (value ?? '').toString().trim()
    if (!raw) return ''
    try {
      const parsed = new URL(raw)
      if (parsed.protocol === 'https:') return ''
      if (parsed.protocol === 'http:' && isPrivateHostname(parsed.hostname)) return ''
      return t(
        'config.credentials.clientUrlInvalidProtocol',
        'Nur https:// erlaubt (http:// nur für localhost/private IPs).'
      )
    } catch {
      return t('config.credentials.clientUrlInvalid', 'Bitte eine gültige URL angeben.')
    }
  }

  useEffect(() => {
    let ignore = false
    async function loadCreds () {
      setLoading(true)
      try {
        const res = await fetch('/api/config/credentials')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(
            data.error ||
              t(
                'config.credentials.loadErrorFallback',
                'Fehler beim Laden der Zugangsdaten.'
              )
          )
        }
        const data = await res.json()
        if (!ignore) {
          const nextValues = {
            blueskyServerUrl: data?.bluesky?.serverUrl || '',
            blueskyIdentifier: data?.bluesky?.identifier || '',
            blueskyAppPassword: '',
            blueskyClientApp: data?.bluesky?.clientApp || '',
            mastodonApiUrl: data?.mastodon?.apiUrl || '',
            mastodonAccessToken: '',
            mastodonClientApp: data?.mastodon?.clientApp || ''
          }
          setValues(nextValues)
          setInitialValues(nextValues)
          setHasSecret({
            bsky: Boolean(data?.bluesky?.hasAppPassword),
            masto: Boolean(data?.mastodon?.hasAccessToken)
          })
        }
      } catch (error) {
        console.error('Zugangsdaten laden fehlgeschlagen:', error)
        toast.error({
          title: t('config.credentials.toastTitle', 'Zugangsdaten'),
          description:
            error.message ||
            t(
              'config.credentials.loadErrorDescription',
              'Die Zugangsdaten konnten nicht geladen werden.'
            )
        })
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadCreds()
    return () => {
      ignore = true
    }
  }, [toast])

  const onChange = key => e => setValues({ ...values, [key]: e.target.value })
  const onClientUrlBlur = key => () => {
    const message = validateClientUrl(values[key])
    setClientUrlErrors(current => ({ ...current, [key]: message }))
  }
  const clearClientUrl = key => () => {
    setValues(current => ({ ...current, [key]: '' }))
    setClientUrlErrors(current => ({ ...current, [key]: '' }))
  }
  const onSessionTtlChange = (event) => {
    const nextValue = event.target.value
    if (nextValue === '' || /^\d+$/.test(nextValue)) {
      setSessionTtlInput(nextValue)
    }
  }

  const normalizeSessionTtl = () => {
    const parsed = Number(sessionTtlInput)
    const safe = Number.isFinite(parsed) ? parsed : SESSION_TTL_DEFAULT_HOURS
    const clamped = Math.min(SESSION_TTL_MAX_HOURS, Math.max(SESSION_TTL_MIN_HOURS, Math.round(safe)))
    setSessionTtlInput(String(clamped))
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_TTL_STORAGE_KEY, String(clamped))
    }
  }

  const hasCredentialChanges = useMemo(() => {
    return Object.keys(values).some(
      key => String(values[key] ?? '') !== String(initialValues[key] ?? '')
    )
  }, [values, initialValues])

  const handleCancel = () => {
    setValues(initialValues)
    setBlink({})
  }

  const handleSave = async e => {
    e.preventDefault()

    // Clientseitige Minimal-Validierung
    const next = { ...values }
    if (!next.blueskyServerUrl) {
      next.blueskyServerUrl = 'https://bsky.social'
    }
    const missing = []
    if (!next.blueskyIdentifier) missing.push('blueskyIdentifier')
    if (!hasSecret.bsky && !next.blueskyAppPassword)
      missing.push('blueskyAppPassword')
    const blueskyUrlError = validateClientUrl(next.blueskyClientApp)
    const mastodonUrlError = validateClientUrl(next.mastodonClientApp)
    if (blueskyUrlError) missing.push('blueskyClientApp')
    if (mastodonUrlError) missing.push('mastodonClientApp')
    if (missing.length) {
      triggerBlink(missing)
      setClientUrlErrors({
        blueskyClientApp: blueskyUrlError,
        mastodonClientApp: mastodonUrlError
      })
      toast.error({
        title: 'Eingaben fehlen',
        description: 'Bitte markierte Felder prüfen.'
      })
      return
    }

    setSaving(true)
    try {
      const payload = { ...next }
      if (!payload.blueskyAppPassword) delete payload.blueskyAppPassword
      if (!payload.mastodonAccessToken) delete payload.mastodonAccessToken
      const res = await fetch('/api/config/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error ||
            t(
              'config.credentials.saveErrorFallback',
              'Fehler beim Speichern der Zugangsdaten.'
            )
        )
      }
      await res.json().catch(() => ({}))
      if (values.blueskyAppPassword) setHasSecret(s => ({ ...s, bsky: true }))
      if (values.mastodonAccessToken) setHasSecret(s => ({ ...s, masto: true }))
      setValues(v => ({
        ...v,
        blueskyAppPassword: '',
        mastodonAccessToken: ''
      }))
      toast.success({
        title: t('config.credentials.saveSuccessTitle', 'Gespeichert'),
        description: t(
          'config.credentials.saveSuccessDescription',
          'Zugangsdaten aktualisiert.'
        )
      })

      // Nach dem Speichern direkt entsperren und zur Übersicht wechseln.
      // Konfiguration wird parallel aktualisiert; Navigation soll nicht blockieren.
      window.dispatchEvent(new Event('app:credentials-ok'))
      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: { view: 'overview', force: true }
        })
      )
      try {
        window.dispatchEvent(new Event('client-config:refresh'))
        window.dispatchEvent(new Event('client-apps:refresh'))
        // Hintergrund-Refresh mit Cache-Bust, falls Browser cached
        await fetch(`/api/client-config?t=${Date.now()}`).catch(() => null)
      } catch {
        /* ignore */
      }
    } catch (error) {
      console.error('Zugangsdaten speichern fehlgeschlagen:', error)
      toast.error({
        title: t(
          'config.credentials.saveErrorTitle',
          'Speichern fehlgeschlagen'
        ),
        description:
          error.message ||
          t(
            'config.credentials.saveErrorDescription',
            'Die Zugangsdaten konnten nicht gespeichert werden.'
          )
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <InfoDialog
        open={infoOpen}
        title={t(
          'config.credentials.infoTitle',
          'Zugangsdaten & Sicherheit'
        )}
        onClose={() => setInfoOpen(false)}
        closeLabel={t('common.actions.close', 'Schließen')}
        panelClassName='max-w-[80vw] md:max-w-[700px]'
        content={(
          <div className='max-h-[60vh] overflow-y-auto space-y-3 text-sm text-foreground'>
            <p>
              {t(
                'config.credentials.infoIntro',
                'Für den Betrieb des Kampagnen‑Tools werden Zugangsdaten für Bluesky (und optional Mastodon) benötigt. Ohne gültige Zugangsdaten sind Scheduler und Dashboard nur eingeschränkt nutzbar.'
              )}
            </p>
            <p>
              {t(
                'config.credentials.infoBluesky',
                'Bluesky verwendet Server‑URL, Identifier (Handle/E‑Mail) und ein App Password. Das App Password ist ein separates Passwort, das ausschließlich für API‑Zugriffe genutzt werden sollte.'
              )}
            </p>
            <p>
              {t(
                'config.credentials.infoMastodon',
                'Für Mastodon werden die API‑URL der Instanz und ein Access Token benötigt. Das Access Token sollte nur die Rechte enthalten, die für das Veröffentlichen und Verwalten der Posts erforderlich sind.'
              )}
            </p>
            <p>
              {t(
                'config.credentials.infoSecurity',
                'Zugangsdaten werden serverseitig gespeichert. Felder für Passwörter und Tokens können leer gelassen werden, um vorhandene Werte beizubehalten.'
              )}
            </p>
            <p className='text-xs text-foreground-muted'>
              {t(
                'config.credentials.infoHint',
                'In der Praxis sollten Zugangsdaten zuerst eingerichtet und getestet werden, bevor Scheduler‑ und Polling‑Einstellungen angepasst werden.'
              )}
            </p>
          </div>
        )}
      />
      <Card padding='p-6 lg:p-10'>
      <div className='flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between'>
        <div>
          <h3 className='text-2xl font-semibold'>
            {t('config.credentials.heading', 'Zugangsdaten')}
          </h3>
          <p className='text-sm text-foreground-muted'>
            {t(
              'config.credentials.subtitle',
              'Server-URLs und Logins für Bluesky und Mastodon.'
            )}
          </p>
        </div>
        <div className='mt-2 flex items-center justify-end md:mt-0'>
          <button
            type='button'
            className='inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-background-elevated'
            aria-label={t(
              'config.credentials.infoAria',
              'Hinweis zu Zugangsdaten anzeigen'
            )}
            title={t(
              'posts.form.infoButtonTitle',
              'Hinweis anzeigen'
            )}
            onClick={() => setInfoOpen(true)}
          >
            <svg
              width='12'
              height='12'
              viewBox='0 0 15 15'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M6.5 10.5h2V6h-2v4.5zm1-6.8a.9.9 0 100 1.8.9.9 0 000-1.8z'
                fill='currentColor'
              />
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M7.5 13.5a6 6 0 100-12 6 6 0 000 12zm0 1A7 7 0 107.5-.5a7 7 0 000 14z'
                fill='currentColor'
              />
            </svg>
            {t('posts.form.infoButtonLabel', 'Info')}
          </button>
        </div>
      </div>
      {loading ? (
        <p className='text-sm text-foreground-muted'>
          {t('config.credentials.loading', 'Lade …')}
        </p>
      ) : (
        <form onSubmit={handleSave} className='space-y-6'>
          <section className='space-y-4'>
            <div className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
              <h4 className='text-lg font-semibold'>
                {t('config.credentials.bluesky.heading', 'Bluesky')}
              </h4>
              <div className='grid gap-4 md:grid-cols-2'>
                <label className='space-y-1'>
                  <span className='text-sm font-medium'>
                    {t(
                      'config.credentials.bluesky.serverUrlLabel',
                      'Server URL'
                    )}
                  </span>
                  <input
                    type='url'
                    className={`w-full rounded-md border bg-background p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                      blink.blueskyServerUrl
                        ? 'animate-pulse ring-2 ring-destructive border-destructive'
                        : 'border-border'
                    }`}
                    placeholder='https://bsky.social'
                    value={values.blueskyServerUrl}
                    onChange={onChange('blueskyServerUrl')}
                  />
                </label>
                <label className='space-y-1'>
                  <span className='text-sm font-medium'>
                    {t(
                      'config.credentials.bluesky.identifierLabel',
                      'Identifier (Handle/E-Mail)'
                    )}
                  </span>
                  <input
                    type='text'
                    className={`w-full rounded-md border bg-background p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                      blink.blueskyIdentifier
                        ? 'animate-pulse ring-2 ring-destructive border-destructive'
                        : 'border-border'
                    }`}
                    placeholder='handle.bsky.social'
                    value={values.blueskyIdentifier}
                    onChange={onChange('blueskyIdentifier')}
                  />
                </label>
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <label className='space-y-1'>
                  <span className='text-sm font-medium'>
                    {t(
                      'config.credentials.bluesky.appPasswordLabel',
                      'App Password'
                    )}
                  </span>
                  <input
                    type='password'
                    className={`w-full rounded-md border bg-background p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                      blink.blueskyAppPassword
                        ? 'animate-pulse ring-2 ring-destructive border-destructive'
                        : 'border-border'
                    }`}
                    placeholder={hasSecret.bsky ? '••••••••' : ''}
                    value={values.blueskyAppPassword}
                    onChange={onChange('blueskyAppPassword')}
                  />
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'config.credentials.bluesky.appPasswordHint',
                      'Leer lassen, um das bestehende Passwort zu behalten.'
                    )}
                  </p>
                </label>
                <label className='space-y-1'>
                  <span className='text-sm font-medium'>
                    {t(
                      'config.credentials.bluesky.sessionTtlLabel',
                      'Session-Dauer (Stunden)'
                    )}
                  </span>
                  <input
                    type='number'
                    min={SESSION_TTL_MIN_HOURS}
                    max={SESSION_TTL_MAX_HOURS}
                    step='1'
                    inputMode='numeric'
                    className='w-full rounded-md border border-border bg-background p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    value={sessionTtlInput}
                    onChange={onSessionTtlChange}
                    onBlur={normalizeSessionTtl}
                  />
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'config.credentials.bluesky.sessionTtlHint',
                      'Gilt nur auf diesem Geraet (6 bis 168 Stunden).'
                    )}
                  </p>
                </label>
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <label className='space-y-1 md:col-span-2'>
                  <span className='text-sm font-medium'>
                    {t(
                      'config.credentials.bluesky.clientAppLabel',
                      'Client-App'
                    )}
                  </span>
                  <div className='relative'>
                    <input
                      type='url'
                      className={`w-full rounded-md border bg-background p-2 pr-10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        blink.blueskyClientApp
                          ? 'animate-pulse ring-2 ring-destructive border-destructive'
                          : clientUrlErrors.blueskyClientApp
                            ? 'border-destructive'
                            : 'border-border'
                      }`}
                      placeholder={t(
                        'config.credentials.bluesky.clientAppPlaceholder',
                        'https://client.example oder http://192.168.1.20:5173'
                      )}
                      value={values.blueskyClientApp}
                      onChange={onChange('blueskyClientApp')}
                      onBlur={onClientUrlBlur('blueskyClientApp')}
                    />
                    {values.blueskyClientApp ? (
                      <button
                        type='button'
                        onClick={clearClientUrl('blueskyClientApp')}
                        className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground-muted transition hover:bg-background-subtle hover:text-foreground'
                        aria-label={t('config.credentials.clientUrlClear', 'URL entfernen')}
                        title={t('config.credentials.clientUrlClear', 'URL entfernen')}
                      >
                        <Cross2Icon className='h-4 w-4' />
                      </button>
                    ) : null}
                  </div>
                  {clientUrlErrors.blueskyClientApp ? (
                    <p className='text-xs text-destructive'>
                      {clientUrlErrors.blueskyClientApp}
                    </p>
                  ) : null}
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'config.credentials.bluesky.clientAppHint',
                      'Wird im Dashboard als Link geöffnet. http:// nur für localhost/private IPs.'
                    )}
                  </p>
                </label>
              </div>
            </div>
          </section>
          <section className='space-y-4'>
            <div className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
              <h4 className='text-lg font-semibold'>
                {t('config.credentials.mastodon.heading', 'Mastodon')}
              </h4>
              <div className='grid gap-4 md:grid-cols-2'>
                <label className='space-y-1'>
                  <span className='text-sm font-medium'>
                    {t('config.credentials.mastodon.apiUrlLabel', 'API URL')}
                  </span>
                  <input
                    type='url'
                    className='w-full rounded-md border border-border bg-background p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder='https://mastodon.social'
                    value={values.mastodonApiUrl}
                    onChange={onChange('mastodonApiUrl')}
                  />
                </label>
                <label className='space-y-1'>
                  <span className='text-sm font-medium'>
                    {t(
                      'config.credentials.mastodon.accessTokenLabel',
                      'Access Token'
                    )}
                  </span>
                  <input
                    type='password'
                    className='w-full rounded-md border border-border bg-background p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={hasSecret.masto ? '••••••••' : ''}
                    value={values.mastodonAccessToken}
                    onChange={onChange('mastodonAccessToken')}
                  />
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'config.credentials.mastodon.accessTokenHint',
                      'Leer lassen, um das bestehende Token zu behalten.'
                    )}
                  </p>
                </label>
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <label className='space-y-1 md:col-span-2'>
                  <span className='text-sm font-medium'>
                    {t(
                      'config.credentials.mastodon.clientAppLabel',
                      'Client-App'
                    )}
                  </span>
                  <div className='relative'>
                    <input
                      type='url'
                      className={`w-full rounded-md border bg-background p-2 pr-10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        blink.mastodonClientApp
                          ? 'animate-pulse ring-2 ring-destructive border-destructive'
                          : clientUrlErrors.mastodonClientApp
                            ? 'border-destructive'
                            : 'border-border'
                      }`}
                      placeholder={t(
                        'config.credentials.mastodon.clientAppPlaceholder',
                        'https://client.example oder http://192.168.1.20:5173'
                      )}
                      value={values.mastodonClientApp}
                      onChange={onChange('mastodonClientApp')}
                      onBlur={onClientUrlBlur('mastodonClientApp')}
                    />
                    {values.mastodonClientApp ? (
                      <button
                        type='button'
                        onClick={clearClientUrl('mastodonClientApp')}
                        className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground-muted transition hover:bg-background-subtle hover:text-foreground'
                        aria-label={t('config.credentials.clientUrlClear', 'URL entfernen')}
                        title={t('config.credentials.clientUrlClear', 'URL entfernen')}
                      >
                        <Cross2Icon className='h-4 w-4' />
                      </button>
                    ) : null}
                  </div>
                  {clientUrlErrors.mastodonClientApp ? (
                    <p className='text-xs text-destructive'>
                      {clientUrlErrors.mastodonClientApp}
                    </p>
                  ) : null}
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'config.credentials.mastodon.clientAppHint',
                      'Wird im Dashboard als Link geöffnet. http:// nur für localhost/private IPs.'
                    )}
                  </p>
                </label>
              </div>
            </div>
          </section>
          <div className='flex flex-wrap justify-end gap-3 border-t border-border-muted pt-6'>
            <div className='flex flex-wrap gap-3'>
              <Button
                type='button'
                variant='secondary'
                onClick={handleCancel}
                disabled={loading || saving || !hasCredentialChanges}
              >
                {t('common.actions.cancel', 'Abbrechen')}
              </Button>
              <Button
                type='submit'
                variant='primary'
                disabled={loading || saving || !hasCredentialChanges}
              >
                {saving
                  ? t('config.credentials.saveBusy', 'Übernehmen…')
                  : t('config.credentials.saveLabel', 'Übernehmen')}
              </Button>
            </div>
          </div>
        </form>
      )}
      </Card>
    </>
  )
}

function ExternalServicesSection () {
  const toast = useToast()
  const { t } = useTranslation()
  const [values, setValues] = useState({
    tenorApiKey: ''
  })
  const [initialValues, setInitialValues] = useState({
    tenorApiKey: ''
  })
  const [hasSecret, setHasSecret] = useState({
    tenor: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false
    async function loadServices () {
      setLoading(true)
      try {
        const res = await fetch('/api/config/credentials')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(
            data.error ||
              t(
                'config.credentials.loadErrorFallback',
                'Fehler beim Laden der Zugangsdaten.'
              )
          )
        }
        const data = await res.json()
        if (!ignore) {
          const nextValues = { tenorApiKey: '' }
          setValues(nextValues)
          setInitialValues(nextValues)
          setHasSecret({ tenor: Boolean(data?.tenor?.hasApiKey) })
        }
      } catch (error) {
        console.error('Externe Dienste laden fehlgeschlagen:', error)
        toast.error({
          title: t('config.externalServices.toastTitle', 'Externe Dienste'),
          description:
            error.message ||
            t(
              'config.credentials.loadErrorDescription',
              'Die Zugangsdaten konnten nicht geladen werden.'
            )
        })
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadServices()
    return () => {
      ignore = true
    }
  }, [toast])

  const hasChanges = useMemo(() => {
    return Object.keys(values).some(
      key => String(values[key] ?? '') !== String(initialValues[key] ?? '')
    )
  }, [values, initialValues])

  const onChange = key => e => setValues({ ...values, [key]: e.target.value })

  const handleCancel = () => {
    setValues(initialValues)
  }

  const handleSave = async e => {
    e.preventDefault()

    if (!hasChanges) return

    setSaving(true)
    try {
      const payload = { ...values }
      if (!payload.tenorApiKey) delete payload.tenorApiKey
      const res = await fetch('/api/config/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error ||
            t(
              'config.credentials.saveErrorFallback',
              'Fehler beim Speichern der Zugangsdaten.'
            )
        )
      }
      await res.json().catch(() => ({}))
      if (values.tenorApiKey) setHasSecret({ tenor: true })
      setValues(v => ({
        ...v,
        tenorApiKey: ''
      }))
      setInitialValues({ tenorApiKey: '' })
      toast.success({
        title: t(
          'config.externalServices.saveSuccessTitle',
          'Externe Dienste gespeichert'
        ),
        description: t(
          'config.externalServices.saveSuccessDescription',
          'API-Keys wurden aktualisiert.'
        )
      })
      try {
        window.dispatchEvent(new Event('client-config:refresh'))
        window.dispatchEvent(new Event('client-apps:refresh'))
        await fetch(`/api/client-config?t=${Date.now()}`).catch(() => null)
      } catch {
        /* ignore */
      }
    } catch (error) {
      console.error('Externe Dienste speichern fehlgeschlagen:', error)
      toast.error({
        title: t(
          'config.externalServices.saveErrorTitle',
          'Speichern fehlgeschlagen'
        ),
        description:
          error.message ||
          t(
            'config.externalServices.saveErrorDescription',
            'Externe Dienste konnten nicht gespeichert werden.'
          )
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card padding='p-6 lg:p-10'>
      <div className='flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between'>
        <div>
          <h3 className='text-2xl font-semibold'>
            {t('config.externalServices.heading', 'Externe Dienste')}
          </h3>
          <p className='text-sm text-foreground-muted'>
            {t(
              'config.externalServices.subtitle',
              'API-Keys und Zugangsdaten für optionale Integrationen.'
            )}
          </p>
        </div>
      </div>
      {loading ? (
        <p className='text-sm text-foreground-muted'>
          {t('config.credentials.loading', 'Lade …')}
        </p>
      ) : (
        <form onSubmit={handleSave} className='space-y-6'>
          <section className='space-y-4'>
            <div className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
              <h4 className='text-lg font-semibold'>
                {t('config.credentials.tenor.heading', 'Externe API-Keys')}
              </h4>
              <div className='grid gap-4 md:grid-cols-2'>
                <label className='space-y-1 md:w-1/2'>
                  <span className='text-sm font-medium'>
                    {t('config.credentials.tenor.apiKeyLabel', 'Tenor API-Key')}
                  </span>
                  <input
                    type='password'
                    className='w-full rounded-md border border-border bg-background p-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                    placeholder={hasSecret.tenor ? '••••••••' : ''}
                    value={values.tenorApiKey}
                    onChange={onChange('tenorApiKey')}
                  />
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'config.credentials.tenor.apiKeyHint',
                      'Leer lassen, um den bestehenden Key zu behalten.'
                    )}
                  </p>
                </label>
              </div>
            </div>
          </section>
          <div className='flex flex-wrap justify-end gap-3 border-t border-border-muted pt-6'>
            <div className='flex flex-wrap gap-3'>
              <Button
                type='button'
                variant='secondary'
                onClick={handleCancel}
                disabled={loading || saving || !hasChanges}
              >
                {t('common.actions.cancel', 'Abbrechen')}
              </Button>
              <Button
                type='submit'
                variant='primary'
                disabled={loading || saving || !hasChanges}
              >
                {saving
                  ? t('config.credentials.saveBusy', 'Übernehmen…')
                  : t('config.credentials.saveLabel', 'Übernehmen')}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Card>
  )
}
