import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { Card, Button } from '../shared'
import { useClientConfig } from '../../hooks/useClientConfig.js'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

function buildLocalConfig (config = {}) {
  const gifs = config?.gifs || {}
  const unroll = config?.unroll || {}
  const translation = config?.translation || {}
  return {
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
      allowGoogle: translation.allowGoogle !== false
    }
  }
}

const CLIENT_SETTING_TABS = [
  { id: 'general', labelKey: 'clientSettings.tabs.general', fallback: 'Allgemein' },
  { id: 'layout', labelKey: 'clientSettings.tabs.layout', fallback: 'Layout' },
  { id: 'services', labelKey: 'clientSettings.tabs.services', fallback: 'Fremddienste' }
]

export default function ClientSettingsModal ({ open, onClose }) {
  const { clientConfig, setClientConfig } = useClientConfig()
  const { t } = useTranslation()
  const [localConfig, setLocalConfig] = useState(() => buildLocalConfig(clientConfig))
  const [activeTab, setActiveTab] = useState(CLIENT_SETTING_TABS[0].id)

  useEffect(() => {
    if (open) {
      setLocalConfig(buildLocalConfig(clientConfig))
      setActiveTab(CLIENT_SETTING_TABS[0].id)
    }
  }, [open, clientConfig])

  const hasChanges = useMemo(() => {
    const savedShowDividers = clientConfig?.unroll?.showDividers !== false
    const savedTranslationEnabled = clientConfig?.translation?.enabled === true
    const savedTranslationBase = clientConfig?.translation?.baseUrl || ''
    const savedTranslationAllowGoogle = clientConfig?.translation?.allowGoogle !== false
    return (
      Boolean(localConfig.gifs.tenorAvailable) !== Boolean(clientConfig?.gifs?.tenorAvailable) ||
      (localConfig.gifs.tenorApiKey || '') !== (clientConfig?.gifs?.tenorApiKey || '') ||
      Boolean(localConfig.unroll.showDividers) !== savedShowDividers ||
      Boolean(localConfig.translation.enabled) !== savedTranslationEnabled ||
      (localConfig.translation.baseUrl || '') !== savedTranslationBase ||
      Boolean(localConfig.translation.allowGoogle) !== savedTranslationAllowGoogle
    )
  }, [clientConfig, localConfig])

  if (!open) return null

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose()
    }
  }

  const handleSave = () => {
    setClientConfig({
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
        allowGoogle: Boolean(localConfig.translation.allowGoogle)
      }
    })
    handleClose()
  }

  const content = (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        aria-hidden='true'
        onClick={handleClose}
      />
      <Card
        as='div'
        padding='p-0'
        className='relative z-50 w-[min(1040px,92vw)] max-h-[90vh] overflow-y-auto rounded-3xl shadow-card'
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
        <div className='px-6 py-5 min-h-[460px]'>
          {activeTab === 'general' && (
            <div className='grid gap-6 md:grid-cols-2'>
              <section className='space-y-3 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <p className='text-sm font-semibold text-foreground'>
                  {t('clientSettings.general.introTitle', 'Lokale Steuerung')}
                </p>
                <p className='text-sm text-foreground-muted'>
                  {t(
                    'clientSettings.general.introBody',
                    'Diese Einstellungen gelten ausschließlich im aktuellen Browser und helfen dir, den Client an deine Arbeitsweise anzupassen.'
                  )}
                </p>
              </section>
              <section className='space-y-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-foreground-muted'>
                <p className='font-semibold text-foreground'>
                  {t('clientSettings.future.heading', 'Weitere Optionen')}
                </p>
                <p>
                  {t(
                    'clientSettings.future.body',
                    'Allgemeine Features wie Barrierefreiheit, Medien-Handling und Tastaturkürzel folgen hier in Kürze.'
                  )}
                </p>
              </section>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className='grid gap-6 md:grid-cols-2'>
              <section className='space-y-4 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                    {t('clientSettings.sections.unrollTitle', 'Unroll')}
                  </p>
                  <p className='text-sm text-foreground-muted'>
                    {t(
                      'clientSettings.sections.unrollDescription',
                      'Passe an, wie der Unroll-Dialog Threads darstellt.'
                    )}
                  </p>
                </div>
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
              </section>
              <section className='space-y-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-foreground-muted'>
                <p className='font-semibold text-foreground'>
                  {t('clientSettings.layout.futureHeading', 'Weitere Layout-Optionen')}
                </p>
                <p>
                  {t(
                    'clientSettings.layout.futureBody',
                    'Hier folgen bald Optionen für Abstände, Schriftgrößen oder alternative Timelines.'
                  )}
                </p>
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
                  <p className='text-sm text-foreground-muted'>
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
                      className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-2 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'
                      disabled={!localConfig.translation.enabled}
                    />
                    <p className='text-xs text-foreground-muted'>
                      {t(
                        'clientSettings.translation.baseUrlHelp',
                        'Nur lokale oder private Endpunkte werden akzeptiert. Der Pfad /translate wird automatisch ergänzt.'
                      )}
                    </p>
                  </div>
                  <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                      checked={Boolean(localConfig.translation.allowGoogle)}
                      onChange={(event) =>
                        setLocalConfig((current) => ({
                          ...current,
                          translation: {
                            ...current.translation,
                            allowGoogle: event.target.checked
                          }
                        }))
                      }
                      disabled={!localConfig.translation.enabled}
                    />
                    <span>{t('clientSettings.translation.allowGoogleLabel', 'Google-Übersetzung als Fallback verwenden')}</span>
                  </label>
                  <p className='text-xs text-foreground-muted'>
                    {t(
                      'clientSettings.translation.allowGoogleHelp',
                      'Wenn kein Server eingetragen ist, öffnet der Button Google Translate in einem neuen Tab.'
                    )}
                  </p>
                </div>
              </section>
              <section className='space-y-4 rounded-3xl border border-border bg-background px-5 py-4 shadow-soft'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.2em] text-foreground-muted'>
                    {t('clientSettings.sections.gifsTitle', 'GIF-Integration')}
                  </p>
                  <p className='text-sm text-foreground-muted'>
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
                      className='w-full rounded-2xl border border-border bg-background-subtle px-4 py-2 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'
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

          {activeTab !== 'general' && activeTab !== 'layout' && activeTab !== 'services' && (
            <div className='py-16 text-center text-sm text-foreground-muted'>
              {t('clientSettings.tabs.placeholder', 'Dieser Bereich wird demnächst freigeschaltet.')}
            </div>
          )}
        </div>
        <div className='flex items-center justify-end gap-3 border-t border-border bg-background-subtle px-6 py-4'>
          <Button variant='ghost' onClick={handleClose}>
            {t('compose.cancel', 'Abbrechen')}
          </Button>
          <Button variant='primary' onClick={handleSave} disabled={!hasChanges}>
            {t('clientSettings.save', 'Speichern')}
          </Button>
        </div>
      </Card>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

ClientSettingsModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func
}
