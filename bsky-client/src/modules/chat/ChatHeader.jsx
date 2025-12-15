import { useMemo, useState } from 'react'
import { PlusIcon, GearIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Button, InlineMenu, InlineMenuTrigger, InlineMenuContent } from '../shared'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

const SETTINGS_OPTIONS = [
  { value: 'everyone', labelKey: 'chat.settings.option.everyone', fallback: 'Jedem' },
  { value: 'following', labelKey: 'chat.settings.option.following', fallback: 'Nutzer, denen ich folge' },
  { value: 'nobody', labelKey: 'chat.settings.option.nobody', fallback: 'Niemand' }
]

export default function ChatHeader ({ onStartNewChat = () => {} }) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [allowValue, setAllowValue] = useState('following')
  const options = useMemo(() => SETTINGS_OPTIONS, [])

  return (
    <div className='flex flex-wrap items-center justify-between gap-3' data-component='BskyChatHeader'>
      <p className='text-base font-semibold text-foreground'>
        {t('chat.header.title', 'Chats')}
      </p>
      <div className='flex items-center gap-2'>
        <InlineMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <InlineMenuTrigger>
            <button
              type='button'
              aria-label={t('chat.header.settings', 'Chat-Einstellungen')}
              className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm'
            >
              <GearIcon className='h-5 w-5' />
            </button>
          </InlineMenuTrigger>
          <InlineMenuContent side='bottom' align='end' withArrow className='w-80 p-4 space-y-4'>
            <div className='space-y-1'>
              <p className='text-base font-semibold text-foreground'>
                {t('chat.settings.title', 'Chat-Einstellungen')}
              </p>
              <p className='text-sm text-foreground-muted'>
                {t('chat.settings.allowHeading', 'Erlaube neue Nachrichten von')}
              </p>
            </div>
            <div className='space-y-2'>
              {options.map(option => (
                <ChatSettingsOption
                  key={option.value}
                  label={t(option.labelKey, option.fallback)}
                  value={option.value}
                  selected={allowValue === option.value}
                  onSelect={() => setAllowValue(option.value)}
                />
              ))}
            </div>
            <div className='flex items-start gap-2 rounded-2xl border border-border bg-background-subtle/70 px-3 py-2 text-xs text-foreground-muted'>
              <InfoCircledIcon className='mt-0.5 h-4 w-4 shrink-0 text-primary' />
              <span>
                {t('chat.settings.hint', 'Du kannst laufende Konversationen fortsetzen, unabhängig von dieser Einstellung.')}
              </span>
            </div>
          </InlineMenuContent>
        </InlineMenu>
        <Button
          type='button'
          variant='primary'
          size='pill'
          onClick={onStartNewChat}
          className='inline-flex items-center gap-2'
        >
          <PlusIcon className='h-4 w-4' />
          <span>{t('chat.header.newChat', '+ Neuer Chat')}</span>
        </Button>
      </div>
    </div>
  )
}

function ChatSettingsOption ({ label, selected, onSelect }) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition ${
        selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-background-subtle/70 text-foreground'
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
          selected ? 'border-primary' : 'border-border'
        }`}
        aria-hidden='true'
      >
        <span
          className={`h-2.5 w-2.5 rounded-full bg-primary transition ${
            selected ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
        />
      </span>
    </button>
  )
}

