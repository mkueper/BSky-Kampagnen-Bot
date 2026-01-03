import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../shared'
import { Modal } from '@bsky-kampagnen-bot/shared-ui'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { reportPost } from './api/bsky.js'

const REASONS = [
  { value: 'com.atproto.moderation.defs#reasonSpam', key: 'spam', fallback: 'Spam' },
  { value: 'com.atproto.moderation.defs#reasonViolation', key: 'violation', fallback: 'Gesetzesverstoß' },
  { value: 'com.atproto.moderation.defs#reasonMisleading', key: 'misleading', fallback: 'Irreführend' },
  { value: 'com.atproto.moderation.defs#reasonSexual', key: 'sexual', fallback: 'Sexuelle Inhalte' },
  { value: 'com.atproto.moderation.defs#reasonRude', key: 'rude', fallback: 'Belästigung' },
  { value: 'com.atproto.moderation.defs#reasonOther', key: 'other', fallback: 'Sonstiges' }
]

export default function ReportPostModal ({ open, subject, onClose }) {
  const { t } = useTranslation()
  const [reasonType, setReasonType] = useState(REASONS[0].value)
  const [reasonText, setReasonText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const availableReasons = useMemo(() => REASONS.map((entry) => ({
    ...entry,
    label: t(`skeet.report.reason.${entry.key}`, entry.fallback)
  })), [t])

  useEffect(() => {
    if (!open) return
    setReasonType(REASONS[0].value)
    setReasonText('')
    setSubmitting(false)
    setError('')
    setSuccess(false)
  }, [open])

  const handleSubmit = useCallback(async () => {
    if (!subject?.uri || !subject?.cid || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await reportPost({
        uri: subject.uri,
        cid: subject.cid,
        reasonType,
        reason: reasonText
      })
      setSuccess(true)
      window.setTimeout(() => {
        onClose?.()
      }, 1200)
    } catch (err) {
      setError(err?.message || t('skeet.report.error', 'Meldung konnte nicht gesendet werden.'))
    } finally {
      setSubmitting(false)
    }
  }, [onClose, reasonText, reasonType, subject?.cid, subject?.uri, submitting, t])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('skeet.report.title', 'Post melden')}
      panelClassName='w-full max-w-lg'
      actions={(
        <>
          <Button variant='secondary' size='pill' onClick={onClose}>
            {t('skeet.report.cancel', 'Abbrechen')}
          </Button>
          <Button variant='primary' size='pill' onClick={handleSubmit} disabled={submitting || !subject?.uri || !subject?.cid}>
            {submitting ? t('skeet.report.submitting', 'Senden…') : t('skeet.report.submit', 'Melden')}
          </Button>
        </>
      )}
    >
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-semibold text-foreground'>
            {t('skeet.report.reasonLabel', 'Grund')}
          </label>
          <select
            value={reasonType}
            onChange={(event) => setReasonType(event.target.value)}
            className='h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50'
          >
            {availableReasons.map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </select>
        </div>
        <div className='space-y-2'>
          <label className='text-sm font-semibold text-foreground'>
            {t('skeet.report.noteLabel', 'Zusätzliche Hinweise')}
          </label>
          <textarea
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            rows={3}
            placeholder={t('skeet.report.notePlaceholder', 'Optionaler Kontext für das Moderationsteam.')}
            className='w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50'
          />
        </div>
        {success ? (
          <p className='text-sm text-emerald-600'>{t('skeet.report.success', 'Meldung gesendet.')}</p>
        ) : null}
        {error ? (
          <p className='text-sm text-red-600'>{error}</p>
        ) : null}
      </div>
    </Modal>
  )
}
