import { Card } from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

export default function SettingsView () {
  const { t } = useTranslation()
  return (
    <Card padding='p-5' className='rounded-2xl border border-border bg-background-subtle'>
      <div className='space-y-2'>
        <h2 className='text-lg font-semibold text-foreground'>
          {t('settingsPage.title', 'Einstellungen')}
        </h2>
        <p className='text-sm text-foreground-muted'>
          {t('settingsPage.empty', 'Aktuell gibt es hier keine konfigurierbaren Optionen.')}
        </p>
      </div>
    </Card>
  )
}
