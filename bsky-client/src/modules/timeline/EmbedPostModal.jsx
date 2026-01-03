import { useCallback, useMemo, useState } from 'react'
import { CopyIcon } from '@radix-ui/react-icons'
import { Button } from '../shared'
import { Modal } from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

function buildEmbedCode (uri) {
  if (!uri) return ''
  return `<blockquote class="bluesky-embed" data-bluesky-uri="${uri}"></blockquote>\n<script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script>`
}

export default function EmbedPostModal ({ open, item, shareUrl = '', onClose }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const uri = typeof item?.uri === 'string' ? item.uri : ''
  const embedCode = useMemo(() => buildEmbedCode(uri), [uri])

  const handleCopy = useCallback(async () => {
    if (!embedCode) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(embedCode)
      } else {
        const temp = document.createElement('textarea')
        temp.value = embedCode
        document.body.appendChild(temp)
        temp.select()
        document.execCommand('copy')
        document.body.removeChild(temp)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }, [embedCode])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('skeet.share.embedTitle', 'Post einbetten')}
      panelClassName='w-full max-w-lg'
      actions={(
        <>
          <Button variant='secondary' size='pill' onClick={onClose}>
            {t('common.actions.close', 'Schliessen')}
          </Button>
          <Button variant='primary' size='pill' onClick={handleCopy} disabled={!embedCode}>
            <CopyIcon className='h-4 w-4' />
            {copied ? t('skeet.share.embedCopied', 'Kopiert') : t('skeet.share.embedCopy', 'Code kopieren')}
          </Button>
        </>
      )}
    >
      <div className='space-y-3'>
        <p className='text-sm text-foreground-muted'>
          {t('skeet.share.embedHint', 'Fuege den folgenden Code in deine Website ein.')}
        </p>
        <textarea
          readOnly
          value={embedCode || shareUrl}
          rows={4}
          className='w-full resize-none rounded-2xl border border-border bg-background-subtle p-3 text-xs text-foreground focus:outline-none'
        />
      </div>
    </Modal>
  )
}
