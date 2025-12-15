import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { Card, Button } from '../shared'
import { useClientConfig } from '../../hooks/useClientConfig.js'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

function buildLocalConfig(config = {}) {
  const gifs = config?.gifs || {}
  const unroll = config?.unroll || {}
  return {
    gifs: {
      tenorAvailable: Boolean(gifs.tenorAvailable),
      tenorApiKey: gifs.tenorApiKey || ''
    },
    unroll: {
      showDividers: unroll.showDividers !== false
    }
  }
}

export default function ClientSettingsModal ({ open, onClose }) {
  const { clientConfig, setClientConfig } = useClientConfig()
  const { t } = useTranslation()
  const [localConfig, setLocalConfig] = useState(() => buildLocalConfig(clientConfig))

  useEffect(() => {
    if (open) {
      setLocalConfig(buildLocalConfig(clientConfig))
    }
  }, [open, clientConfig])

  const hasChanges = useMemo(() => {
    const savedShowDividers = clientConfig?.unroll?.showDividers !== false
    return (
      Boolean(localConfig.gifs.tenorAvailable) !== Boolean(clientConfig?.gifs?.tenorAvailable) ||
      (localConfig.gifs.tenorApiKey || '') !== (clientConfig?.gifs?.tenorApiKey || '') ||
      Boolean(localConfig.unroll.showDividers) !== savedShowDividers
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
        className='relative z-50 w-[min(560px,92vw)] max-h-[90vh] overflow-y-auto rounded-3xl shadow-card'
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
          <button
            type='button'
            className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background-subtle text-lg text-foreground-muted hover:text-foreground'
            onClick={handleClose}
            aria-label={t('clientSettings.close', 'Schließen')}
          >
            ×
          </button>
        </div>
        <div className='space-y-6 px-6 py-5'>
          <section className='space-y-4'>
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
            <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
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
                type='text'
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
          </section>

          <section className='space-y-4'>
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
            <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60'>
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
              {t('clientSettings.future.heading', 'Weitere Optionen')}
            </p>
            <p>
              {t(
                'clientSettings.future.body',
                'Weitere Optionen – z. B. Darstellung und lokale Workflows – folgen hier in Kürze.'
              )}
            </p>
          </section>
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
