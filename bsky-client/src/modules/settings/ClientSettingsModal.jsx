import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { Card, Button, getPortalRoot } from '../shared'
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import * as Select from '@radix-ui/react-select'
import { useClientConfig } from '../../hooks/useClientConfig.js'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const LANGUAGE_OPTIONS = [
  { value: 'de', labelKey: 'clientSettings.language.options.de', fallback: 'Deutsch' },
  { value: 'en', labelKey: 'clientSettings.language.options.en', fallback: 'English' }
]

const TRANSLATION_FALLBACK_OPTIONS = [
  { value: 'google', labelKey: 'clientSettings.translation.fallback.google', fallback: 'Google Translate' },
  { value: 'deepl', labelKey: 'clientSettings.translation.fallback.deepl', fallback: 'DeepL' },
  { value: 'bing', labelKey: 'clientSettings.translation.fallback.bing', fallback: 'Microsoft Translator' },
  { value: 'yandex', labelKey: 'clientSettings.translation.fallback.yandex', fallback: 'Yandex Translate' },
  { value: 'none', labelKey: 'clientSettings.translation.fallback.none', fallback: 'Kein Fallback' }
]

const isPrivateHost = (hostname) => {
  if (!hostname || typeof hostname !== 'string') return false
  const normalized = hostname.trim().toLowerCase()
  if (!normalized) return false
  if (normalized === 'localhost') return true
  if (normalized === '127.0.0.1' || normalized === '0.0.0.0') return true
  if (normalized.startsWith('192.168.')) return true
  if (normalized.startsWith('10.')) return true
  if (normalized.startsWith('172.')) {
    const parts = normalized.split('.')
    const second = Number(parts[1])
    if (parts.length >= 2 && Number.isFinite(second) && second >= 16 && second <= 31) {
      return true
    }
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  return false
}

const normalizeTranslateEndpoint = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  try {
    const parsed = new URL(rawUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (!isPrivateHost(parsed.hostname)) return null
    const trimmedPath = (parsed.pathname || '/').replace(/\/+$/, '')
    const hasTranslateSuffix = trimmedPath.toLowerCase().endsWith('/translate')
    const basePath = hasTranslateSuffix
      ? (trimmedPath || '/translate')
      : `${trimmedPath || ''}/translate`
    const finalPath = basePath.startsWith('/') ? basePath : `/${basePath}`
    return `${parsed.origin}${finalPath}`
  } catch {
    return null
  }
}

function buildLocalConfig (config = {}) {
  const gifs = config?.gifs || {}
  const unroll = config?.unroll || {}
  const translation = config?.translation || {}
  const composer = config?.composer || {}
  const layout = config?.layout || {}
  return {
    locale: config?.locale || 'de',
    gifs: {
      tenorAvailable: Boolean(gifs.tenorAvailable),
      tenorApiKey: gifs.tenorApiKey || ''
    },
    unroll: {
      showDividers: unroll.showDividers !== false
    },
    translation: {
      enabled: translation.enabled === true,
      baseUrl: translation.baseUrl || '',
      fallbackService: translation.fallbackService ||
        (translation.allowGoogle === false ? 'none' : 'google')
    },
    composer: {
      showReplyPreview: composer.showReplyPreview !== false
    },
    layout: {
      autoPlayGifs: layout.autoPlayGifs === true,
      inlineVideo: layout.inlineVideo === true || layout.inlineYoutube === true,
      requireAltText: layout.requireAltText === true,
      videoAllowListEnabled: layout.videoAllowListEnabled !== false,
      videoAllowList: Array.isArray(layout.videoAllowList)
        ? layout.videoAllowList
        : (Array.isArray(layout.youtubeAllowList) ? layout.youtubeAllowList : []),
      timeFormat: layout.timeFormat === 'absolute' ? 'absolute' : 'relative'
    }
  }
}

const CLIENT_SETTING_TABS = [
  { id: 'layout', labelKey: 'clientSettings.tabs.layout', fallback: 'Darstellung' },
  { id: 'video', labelKey: 'clientSettings.tabs.video', fallback: 'Medien' },
  { id: 'services', labelKey: 'clientSettings.tabs.services', fallback: 'Externe Dienste' }
]

export default function ClientSettingsModal ({ open, onClose }) {
  const { clientConfig, setClientConfig } = useClientConfig()
  const { t } = useTranslation()
  const [localConfig, setLocalConfig] = useState(() => buildLocalConfig(clientConfig))
  const [activeTab, setActiveTab] = useState(CLIENT_SETTING_TABS[0].id)
  const [newVideoHost, setNewVideoHost] = useState('')
  const [translationCheck, setTranslationCheck] = useState({ status: 'idle', message: '' })
  const portalRoot = useMemo(() => getPortalRoot(), [])

  useEffect(() => {
    if (open) {
      setLocalConfig(buildLocalConfig(clientConfig))
      setActiveTab(CLIENT_SETTING_TABS[0].id)
      setNewVideoHost('')
      setTranslationCheck({ status: 'idle', message: '' })
    }
  }, [open, clientConfig])

  useEffect(() => {
    if (!open) return
    if (!localConfig.translation.enabled) {
      setTranslationCheck({ status: 'idle', message: '' })
      return
    }
    const rawBase = localConfig.translation.baseUrl?.trim() || ''
    if (!rawBase) {
      setTranslationCheck({ status: 'idle', message: '' })
      return
    }
    const endpoint = normalizeTranslateEndpoint(rawBase)
    if (!endpoint) {
      setTranslationCheck({
        status: 'invalid',
        message: t('clientSettings.translation.status.invalid', 'Ungültige oder nicht lokale Server-URL.')
      })
      return
    }
    let ignore = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setTranslationCheck({
        status: 'checking',
        message: t('clientSettings.translation.status.checking', 'Server wird geprüft…')
      })
      const detectUrl = endpoint.replace(/\/translate$/i, '/detect')
      fetch(detectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ q: 'Hallo' }),
        signal: controller.signal
      })
        .then((response) => {
          if (!response.ok) throw new Error('Check failed')
          if (!ignore) {
            setTranslationCheck({
              status: 'valid',
              message: t('clientSettings.translation.status.valid', 'Server erreichbar.')
            })
          }
        })
        .catch((error) => {
          if (error?.name === 'AbortError') return
          if (!ignore) {
            setTranslationCheck({
              status: 'error',
              message: t('clientSettings.translation.status.error', 'Server nicht erreichbar.')
            })
          }
        })
    }, 600)
    return () => {
      ignore = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [localConfig.translation.baseUrl, localConfig.translation.enabled, open, t])

  const hasChanges = useMemo(() => {
    const savedLocale = clientConfig?.locale || 'de'
    const savedShowDividers = clientConfig?.unroll?.showDividers !== false
    const savedTranslationEnabled = clientConfig?.translation?.enabled === true
    const savedTranslationBase = clientConfig?.translation?.baseUrl || ''
    const savedTranslationFallback = clientConfig?.translation?.fallbackService ||
      (clientConfig?.translation?.allowGoogle === false ? 'none' : 'google')
    const savedShowReplyPreview = clientConfig?.composer?.showReplyPreview !== false
    const savedAutoPlayGifs = clientConfig?.layout?.autoPlayGifs === true
    const savedInlineVideo = clientConfig?.layout?.inlineVideo === true
    const savedRequireAltText = clientConfig?.layout?.requireAltText === true
    const savedVideoAllowListEnabled = clientConfig?.layout?.videoAllowListEnabled !== false
    const savedTimeFormat = clientConfig?.layout?.timeFormat === 'absolute' ? 'absolute' : 'relative'
    const savedVideoAllowList = Array.isArray(clientConfig?.layout?.videoAllowList)
      ? clientConfig.layout.videoAllowList
      : []
    const normalizedSavedAllowList = savedVideoAllowList
      .map((entry) => String(entry || '').trim().toLowerCase())
      .filter(Boolean)
      .sort()
    const normalizedLocalAllowList = (localConfig.layout.videoAllowList || [])
      .map((entry) => String(entry || '').trim().toLowerCase())
      .filter(Boolean)
      .sort()
    return (
      (localConfig.locale || 'de') !== savedLocale ||
      Boolean(localConfig.gifs.tenorAvailable) !== Boolean(clientConfig?.gifs?.tenorAvailable) ||
      (localConfig.gifs.tenorApiKey || '') !== (clientConfig?.gifs?.tenorApiKey || '') ||
      Boolean(localConfig.unroll.showDividers) !== savedShowDividers ||
      Boolean(localConfig.translation.enabled) !== savedTranslationEnabled ||
      (localConfig.translation.baseUrl || '') !== savedTranslationBase ||
      (localConfig.translation.fallbackService || 'google') !== savedTranslationFallback ||
      Boolean(localConfig.composer.showReplyPreview) !== savedShowReplyPreview ||
      Boolean(localConfig.layout.autoPlayGifs) !== savedAutoPlayGifs ||
      Boolean(localConfig.layout.inlineVideo) !== savedInlineVideo ||
      Boolean(localConfig.layout.requireAltText) !== savedRequireAltText ||
      Boolean(localConfig.layout.videoAllowListEnabled) !== savedVideoAllowListEnabled ||
      (localConfig.layout.timeFormat || 'relative') !== savedTimeFormat ||
      JSON.stringify(normalizedLocalAllowList) !== JSON.stringify(normalizedSavedAllowList)
    )
  }, [clientConfig, localConfig])

  const selectedLanguageLabel = useMemo(() => {
    const current = LANGUAGE_OPTIONS.find(opt => opt.value === (localConfig.locale || 'de')) || LANGUAGE_OPTIONS[0]
    return t(current.labelKey, current.fallback)
  }, [localConfig.locale, t])
  const selectedFallbackLabel = useMemo(() => {
    const fallbackValue = localConfig.translation.fallbackService || 'google'
    const current = TRANSLATION_FALLBACK_OPTIONS.find(opt => opt.value === fallbackValue) || TRANSLATION_FALLBACK_OPTIONS[0]
    return t(current.labelKey, current.fallback)
  }, [localConfig.translation.fallbackService, t])
  const translationCheckBlocksSave = useMemo(() => {
    const base = localConfig.translation.baseUrl?.trim() || ''
    if (!localConfig.translation.enabled || !base) return false
    return translationCheck.status === 'invalid' ||
      translationCheck.status === 'error' ||
      translationCheck.status === 'checking'
  }, [localConfig.translation.baseUrl, localConfig.translation.enabled, translationCheck.status])

  if (!open) return null

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose()
    }
  }

  const handleSave = () => {
    setClientConfig({
      locale: localConfig.locale || 'de',
      gifs: {
        tenorAvailable: Boolean(localConfig.gifs.tenorAvailable),
        tenorApiKey: localConfig.gifs.tenorApiKey?.trim() || ''
      },
      unroll: {
        showDividers: Boolean(localConfig.unroll.showDividers)
      },
      translation: {
        enabled: Boolean(localConfig.translation.enabled),
        baseUrl: localConfig.translation.baseUrl?.trim() || '',
        fallbackService: localConfig.translation.fallbackService || 'google',
        allowGoogle: (localConfig.translation.fallbackService || 'google') === 'google'
      },
      composer: {
        showReplyPreview: Boolean(localConfig.composer.showReplyPreview)
      },
      layout: {
        autoPlayGifs: Boolean(localConfig.layout.autoPlayGifs),
        inlineVideo: Boolean(localConfig.layout.inlineVideo),
        requireAltText: Boolean(localConfig.layout.requireAltText),
        videoAllowListEnabled: Boolean(localConfig.layout.videoAllowListEnabled),
        videoAllowList: Array.isArray(localConfig.layout.videoAllowList)
          ? localConfig.layout.videoAllowList
          : [],
        timeFormat: localConfig.layout.timeFormat === 'absolute' ? 'absolute' : 'relative'
      }
    })
    handleClose()
  }

  const normalizeVideoHost = (value) => {
    if (!value) return ''
    const trimmed = String(value || '').trim().toLowerCase()
    if (!trimmed) return ''
    try {
      const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`
      const parsed = new URL(withProtocol)
      return parsed.hostname.replace(/^www\./, '')
    } catch {
      return trimmed.split('/')[0].replace(/^www\./, '')
    }
  }

  const handleAddVideoHost = () => {
    const normalized = normalizeVideoHost(newVideoHost)
    if (!normalized) return
    setLocalConfig((current) => {
      const currentList = Array.isArray(current.layout.videoAllowList)
        ? current.layout.videoAllowList
        : []
      if (currentList.includes(normalized)) {
        return current
      }
      if (currentList.length >= 10) {
        return current
      }
      const limitedList = [...currentList, normalized]
      return {
        ...current,
        layout: {
          ...current.layout,
          videoAllowList: limitedList
        }
      }
    })
    setNewVideoHost('')
  }

  const handleRemoveVideoHost = (host) => {
    setLocalConfig((current) => ({
      ...current,
      layout: {
        ...current.layout,
        videoAllowList: (current.layout.videoAllowList || []).filter((entry) => entry !== host)
      }
    }))
  }

  const content = (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        aria-hidden='true'
      />
      <Card
        as='div'
        padding='p-0'
        className='relative z-50 flex h-[65vh] w-[min(80vh,92vw)] flex-col overflow-hidden rounded-3xl shadow-card'
      >
        <div className='flex items-start justify-between border-b border-border px-6 py-4'>
          <div>
            <h3 className='text-lg font-semibold text-foreground'>
              {t('clientSettings.title', 'Client-Einstellungen')}
            </h3>
            <p className='text-sm text-foreground-muted'>
              {t(
                'clientSettings.subtitle',
                'Diese Optionen gelten nur lokal auf diesem Gerät.'
              )}
            </p>
          </div>
        </div>
        <div className='px-6 pt-3'>
          <div className='flex flex-wrap gap-2'>
            {CLIENT_SETTING_TABS.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type='button'
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70 ${isActive ? 'bg-primary text-white shadow-lg' : 'border border-border text-foreground-muted hover:text-foreground hover:bg-background-subtle'}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(tab.labelKey, tab.fallback)}
                </button>
              )
            })}
          </div>
        </div>
        <div className='flex-1 overflow-y-auto px-6 py-5 min-h-[460px]'>
          {activeTab === 'layout' && (
            <div className='grid gap-6 md:grid-cols-2'>
              <section className='space-y-3 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                    {t('clientSettings.general.languageTitle', 'Sprache')}
                  </p>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'clientSettings.general.languageBody',
                      'Steuert die Sprache für Navigation, Buttons und Meldungen. Die Auswahl wird lokal gespeichert.'
                    )}
                  </p>
                </div>
                <div className='space-y-2 text-sm font-semibold text-foreground'>
                  <span>{t('clientSettings.general.languageLabel', 'Anzeigesprache')}</span>
                  <Select.Root
                    value={localConfig.locale || 'de'}
                    onValueChange={(nextValue) => {
                      setLocalConfig((current) => ({
                        ...current,
                        locale: nextValue
                      }))
                    }}
                  >
                    <Select.Trigger className='flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold text-foreground shadow-soft transition hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70' aria-label={t('clientSettings.general.languageLabel', 'Anzeigesprache')}>
                      <div className='flex w-full items-center justify-between'>
                        <Select.Value aria-label={selectedLanguageLabel}>
                          {selectedLanguageLabel}
                        </Select.Value>
                        <span className='inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-foreground-muted'>
                          {t('clientSettings.general.languageSelectHint', 'Ändern')}
                          <ChevronDownIcon className='h-4 w-4' />
                        </span>
                      </div>
                    </Select.Trigger>
                    <Select.Portal container={portalRoot || undefined}>
                      <Select.Content
                        align='start'
                        sideOffset={6}
                        className='z-[300] overflow-hidden rounded-2xl border border-border bg-background-elevated text-sm text-foreground shadow-2xl focus-visible:outline-none'
                      >
                        <Select.Viewport className='space-y-1 p-2'>
                          {LANGUAGE_OPTIONS.map((option) => (
                            <Select.Item
                              key={option.value}
                              value={option.value}
                              className='flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 font-medium outline-none transition data-[highlighted]:bg-background-subtle/80 data-[state=checked]:bg-primary/10'
                            >
                              <Select.ItemText>{t(option.labelKey, option.fallback)}</Select.ItemText>
                              <Select.ItemIndicator>
                                <CheckIcon className='h-4 w-4 text-primary' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
                <p className='text-xs text-foreground-muted'>
                  {t(
                    'clientSettings.general.languageHint',
                    'Wirken sofort und nur auf diesem Gerät – perfekt, wenn du mehrere Accounts mit unterschiedlichen Sprachen nutzt.'
                  )}
                </p>
              </section>
              <section className='space-y-4 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                    {t('clientSettings.sections.postsTitle', 'Beiträge')}
                  </p>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'clientSettings.sections.postsDescription',
                      'Steuert die Darstellung von Antworten, Threads und Zeitangaben.'
                    )}
                  </p>
                </div>
                <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                    checked={Boolean(localConfig.composer.showReplyPreview)}
                    onChange={(event) =>
                      setLocalConfig((current) => ({
                        ...current,
                        composer: {
                          ...current.composer,
                          showReplyPreview: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>{t('clientSettings.composer.showReplyPreviewLabel', 'Antwort-Vorschau anzeigen')}</span>
                </label>
                <p className='text-xs text-foreground-muted'>
                  {t(
                    'clientSettings.composer.showReplyPreviewHelp',
                    'Blendet den Beitrag ein, auf den du antwortest. Deaktiviere die Option für ein kompakteres Composer-Layout.'
                  )}
                </p>
                <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                    checked={Boolean(localConfig.unroll.showDividers)}
                    onChange={(event) =>
                      setLocalConfig((current) => ({
                        ...current,
                        unroll: {
                          ...current.unroll,
                          showDividers: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>{t('clientSettings.unroll.showDividersLabel', 'Trennlinien zwischen Posts anzeigen')}</span>
                </label>
                <p className='text-xs text-foreground-muted'>
                  {t(
                    'clientSettings.unroll.showDividersHelp',
                    'Deaktiviere die Trennlinien für eine kompakteste Darstellung.'
                  )}
                </p>
                <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                    checked={localConfig.layout.timeFormat === 'absolute'}
                    onChange={(event) =>
                      setLocalConfig((current) => ({
                        ...current,
                        layout: {
                          ...current.layout,
                          timeFormat: event.target.checked ? 'absolute' : 'relative'
                        }
                      }))
                    }
                  />
                  <div className='space-y-1'>
                    <span>{t('clientSettings.time.absoluteLabel', 'Absolute Zeitangaben anzeigen')}</span>
                    <p className='text-xs font-normal text-foreground-muted'>
                      {t(
                        'clientSettings.time.absoluteHelp',
                        'Zeigt z. B. 20.12.2025, 11:35 statt „vor 3 Min.“.'
                      )}
                    </p>
                  </div>
                </label>
              </section>
            </div>
          )}

          {activeTab === 'services' && (
            <div className='grid gap-6 md:grid-cols-2'>
              <section className='space-y-4 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                    {t('clientSettings.sections.translationTitle', 'Übersetzungshilfe')}
                  </p>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'clientSettings.sections.translationDescription',
                      'Steuert lokale Übersetzungen über LibreTranslate oder den Google-Fallback.'
                    )}
                  </p>
                </div>
                <div className='space-y-3'>
                  <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                      checked={Boolean(localConfig.translation.enabled)}
                      onChange={(event) =>
                        setLocalConfig((current) => ({
                          ...current,
                          translation: {
                            ...current.translation,
                            enabled: event.target.checked
                          }
                        }))
                      }
                    />
                    <span>{t('clientSettings.translation.enableLabel', 'Übersetzungshilfe anzeigen')}</span>
                  </label>
                  <div className='space-y-2'>
                    <label className='block text-sm font-medium text-foreground'>
                      {t('clientSettings.translation.baseUrlLabel', 'LibreTranslate-Server')}
                    </label>
                    <input
                      type='text'
                      placeholder={t('clientSettings.translation.baseUrlPlaceholder', 'z. B. http://localhost:5000')}
                      value={localConfig.translation.baseUrl}
                      onChange={(event) =>
                        setLocalConfig((current) => ({
                          ...current,
                          translation: {
                            ...current.translation,
                            baseUrl: event.target.value
                          }
                        }))
                      }
                      className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-2 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                      disabled={!localConfig.translation.enabled}
                    />
                    <p className='text-xs text-foreground-muted'>
                      {t(
                        'clientSettings.translation.baseUrlHelp',
                        'Nur lokale oder private Endpunkte werden akzeptiert. Der Pfad /translate wird automatisch ergänzt.'
                      )}
                    </p>
                    {translationCheck.message ? (
                      <p className='text-xs text-foreground-muted'>
                        {translationCheck.message}
                      </p>
                    ) : null}
                  </div>
                  <div className='space-y-2'>
                    <label className='block text-sm font-medium text-foreground'>
                      {t('clientSettings.translation.fallbackLabel', 'Web-Übersetzer als Fallback')}
                    </label>
                    <Select.Root
                      value={localConfig.translation.fallbackService || 'google'}
                      onValueChange={(value) =>
                        setLocalConfig((current) => ({
                          ...current,
                          translation: {
                            ...current.translation,
                            fallbackService: value
                          }
                        }))
                      }
                      disabled={!localConfig.translation.enabled}
                    >
                    <Select.Trigger className='flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold text-foreground shadow-soft transition hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70' aria-label={t('clientSettings.translation.fallbackLabel', 'Web-Übersetzer als Fallback')}>
                      <div className='flex w-full items-center justify-between'>
                        <Select.Value aria-label={selectedFallbackLabel}>
                          {selectedFallbackLabel}
                        </Select.Value>
                        <span className='inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-foreground-muted'>
                          {t('clientSettings.translation.fallbackChange', 'Ändern')}
                          <ChevronDownIcon className='h-4 w-4' />
                        </span>
                      </div>
                    </Select.Trigger>
                  <Select.Portal container={portalRoot || undefined}>
                        <Select.Content
                          align='start'
                          sideOffset={6}
                          className='z-[300] overflow-hidden rounded-2xl border border-border bg-background-elevated text-sm text-foreground shadow-2xl focus-visible:outline-none'
                        >
                          <Select.Viewport className='space-y-1 p-2'>
                            {TRANSLATION_FALLBACK_OPTIONS.map((option) => (
                              <Select.Item
                                key={option.value}
                                value={option.value}
                                className='flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 font-medium outline-none transition data-[highlighted]:bg-background-subtle/80 data-[state=checked]:bg-primary/10'
                              >
                                <Select.ItemText>{t(option.labelKey, option.fallback)}</Select.ItemText>
                                <Select.ItemIndicator>
                                  <CheckIcon className='h-4 w-4 text-primary' />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                    <p className='text-xs text-foreground-muted'>
                      {t(
                        'clientSettings.translation.fallbackHelp',
                        'Wenn der Server nicht erreichbar ist, wird der ausgewählte Dienst in einem neuen Tab geöffnet.'
                      )}
                    </p>
                  </div>
                </div>
              </section>
              <section className='space-y-4 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                    {t('clientSettings.sections.gifsTitle', 'GIF-Integration')}
                  </p>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'clientSettings.sections.gifsDescription',
                      'Aktiviere Tenor, um GIFs direkt aus dem Composer auswählen zu können.'
                    )}
                  </p>
                </div>
                <div className='space-y-3'>
                  <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                      checked={Boolean(localConfig.gifs.tenorAvailable)}
                      onChange={(event) =>
                        setLocalConfig((current) => ({
                          ...current,
                          gifs: {
                            ...current.gifs,
                            tenorAvailable: event.target.checked
                          }
                        }))
                      }
                    />
                    <span>{t('clientSettings.tenorToggle', 'Tenor-GIFs aktivieren')}</span>
                  </label>
                  <div className='space-y-2'>
                    <label className='block text-sm font-medium text-foreground'>
                      {t('clientSettings.tenorKeyLabel', 'Tenor API-Key')}
                    </label>
                    <input
                      type='password'
                      placeholder={t('clientSettings.tenorKeyPlaceholder', 'API-Key einfügen')}
                      value={localConfig.gifs.tenorApiKey}
                      onChange={(event) =>
                        setLocalConfig((current) => ({
                          ...current,
                          gifs: {
                            ...current.gifs,
                            tenorApiKey: event.target.value
                          }
                        }))
                      }
                      className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-2 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                      disabled={!localConfig.gifs.tenorAvailable}
                    />
                    <p className='text-xs text-foreground-muted'>
                      {t(
                        'clientSettings.tenorKeyHelp',
                        'Der Key wird nur lokal gespeichert. Ohne Key ist die Tenor-Suche deaktiviert.'
                      )}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'video' && (
            <div className='grid gap-6 md:grid-cols-2'>
              <section className='space-y-4 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                    {t('clientSettings.sections.videoSourcesTitle', 'Video-Quellen')}
                  </p>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'clientSettings.sections.videoSourcesDescription',
                      'Lege fest, welche Video-Hosts in Beiträgen als Vorschau oder Inline-Player erscheinen dürfen.'
                    )}
                  </p>
                </div>
                <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary'
                    checked={Boolean(localConfig.layout.videoAllowListEnabled)}
                    onChange={(event) =>
                      setLocalConfig((current) => ({
                        ...current,
                        layout: {
                          ...current.layout,
                          videoAllowListEnabled: event.target.checked
                        }
                      }))
                    }
                  />
                  <div className='space-y-1'>
                    <span>{t('clientSettings.media.videoAllowListEnabledLabel', 'Video-Hosts aktivieren')}</span>
                    <p className='text-xs font-normal text-foreground-muted'>
                      {t(
                        'clientSettings.media.videoAllowListEnabledHelp',
                        'Wenn deaktiviert, werden externe Videos immer als normale Links angezeigt.'
                      )}
                    </p>
                  </div>
                </label>
                <div
                  className={`space-y-2 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground ${localConfig.layout.videoAllowListEnabled ? '' : 'opacity-60'}`}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                      {t('clientSettings.media.videoAllowListLabel', 'Video-Hosts')}
                    </p>
                    <span className='text-xs text-foreground-muted'>
                      {t('clientSettings.media.videoAllowListLimit', 'Max. 10')}
                    </span>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <input
                      type='text'
                      value={newVideoHost}
                      onChange={(event) => setNewVideoHost(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddVideoHost()
                        }
                      }}
                      placeholder={t('clientSettings.media.videoAllowListPlaceholder', 'z. B. youtube.com')}
                      className='min-w-[200px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                      disabled={!localConfig.layout.videoAllowListEnabled}
                    />
                    <button
                      type='button'
                      onClick={handleAddVideoHost}
                      className='rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/60'
                      disabled={
                        !localConfig.layout.videoAllowListEnabled ||
                        (localConfig.layout.videoAllowList || []).length >= 10
                      }
                    >
                      {t('clientSettings.media.videoAllowListAdd', 'Hinzufügen')}
                    </button>
                  </div>
                  <div className='max-h-32 space-y-2 overflow-y-auto pr-1'>
                    {(localConfig.layout.videoAllowList || []).length ? (
                      (localConfig.layout.videoAllowList || []).map((host) => (
                        <div
                          key={host}
                          className='flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs'
                        >
                          <span className='truncate'>{host}</span>
                          <button
                            type='button'
                            onClick={() => handleRemoveVideoHost(host)}
                            className='inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground-muted hover:text-foreground'
                            aria-label={t('clientSettings.media.videoAllowListRemove', 'Host entfernen')}
                            disabled={!localConfig.layout.videoAllowListEnabled}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className='text-xs text-foreground-muted'>
                        {t('clientSettings.media.videoAllowListEmpty', 'Keine Hosts eingetragen.')}
                      </span>
                    )}
                  </div>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'clientSettings.media.videoAllowListHelp',
                      'Nur diese Hosts dürfen als Video-Vorschau oder Inline-Player erscheinen.'
                    )}
                  </p>
                </div>
              </section>
              <section className='space-y-4 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                    {t('clientSettings.sections.mediaTitle', 'Medien')}
                  </p>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'clientSettings.sections.mediaDescription',
                      'Steuert, wie externe Medien in Beiträgen dargestellt werden.'
                    )}
                  </p>
                </div>
                <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary'
                    checked={Boolean(localConfig.layout.autoPlayGifs)}
                    onChange={(event) =>
                      setLocalConfig((current) => ({
                        ...current,
                        layout: {
                          ...current.layout,
                          autoPlayGifs: event.target.checked
                        }
                      }))
                    }
                  />
                  <div className='space-y-1'>
                    <span>{t('clientSettings.media.autoPlayGifsLabel', 'GIFs automatisch abspielen')}</span>
                    <p className='text-xs font-normal text-foreground-muted'>
                      {t(
                        'clientSettings.media.autoPlayGifsHelp',
                        'Kann Performance und Datenverbrauch erhöhen.'
                      )}
                    </p>
                  </div>
                </label>
                <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary'
                    checked={Boolean(localConfig.layout.inlineVideo)}
                    onChange={(event) =>
                      setLocalConfig((current) => ({
                        ...current,
                        layout: {
                          ...current.layout,
                          inlineVideo: event.target.checked
                        }
                      }))
                    }
                  />
                  <div className='space-y-1'>
                    <span>{t('clientSettings.media.inlineVideoLabel', 'Videos inline abspielen')}</span>
                    <p className='text-xs font-normal text-foreground-muted'>
                      {t(
                        'clientSettings.media.inlineVideoHelp',
                        'Videos werden erst nach Klick gestartet (kein Autoplay).'
                      )}
                    </p>
                  </div>
                </label>
                <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary'
                    checked={Boolean(localConfig.layout.requireAltText)}
                    onChange={(event) =>
                      setLocalConfig((current) => ({
                        ...current,
                        layout: {
                          ...current.layout,
                          requireAltText: event.target.checked
                        }
                      }))
                    }
                  />
                  <div className='space-y-1'>
                    <span>{t('clientSettings.media.requireAltTextLabel', 'ALT-Text verpflichtend')}</span>
                    <p className='text-xs font-normal text-foreground-muted'>
                      {t(
                        'clientSettings.media.requireAltTextHelp',
                        'Wenn aktiv, kann der Composer nur senden, wenn alle Medien einen ALT-Text haben.'
                      )}
                    </p>
                  </div>
                </label>
              </section>
            </div>
          )}

          {activeTab !== 'layout' && activeTab !== 'services' && activeTab !== 'video' && (
            <div className='py-16 text-center text-sm text-foreground-muted'>
              {t('clientSettings.tabs.placeholder', 'Dieser Bereich wird demnächst freigeschaltet.')}
            </div>
          )}
        </div>
        <div className='flex items-center justify-end gap-3 border-t border-border bg-background-subtle px-6 py-4'>
          <Button variant='ghost' onClick={handleClose}>
            {t('compose.cancel', 'Abbrechen')}
          </Button>
          <Button variant='primary' onClick={handleSave} disabled={!hasChanges || translationCheckBlocksSave}>
            {t('clientSettings.save', 'Speichern')}
          </Button>
        </div>
      </Card>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, portalRoot || document.body)
}

ClientSettingsModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func
}
