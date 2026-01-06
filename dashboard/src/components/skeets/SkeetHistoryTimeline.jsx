import React from 'react'
import { useTranslation } from '../../i18n/I18nProvider.jsx'

/**
 * Zeigt die Sendehistorie eines Skeets als vertikale Timeline an.
 */
const DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

function resolveTimestamp (value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export default function SkeetHistoryTimeline ({
  history = [],
  title,
  showTitle = true
}) {
  const { t } = useTranslation()
  const placeholderDash = t('common.placeholderDash', '-')
  const resolvedTitle = title ?? t('posts.lists.published.history.title', 'Sendehistorie')
  const statusMetaByKey = {
    success: { label: t('posts.lists.published.history.status.success', 'Erfolgreich'), icon: '✔', tone: 'success' },
    failed: { label: t('posts.lists.published.history.status.failed', 'Fehlgeschlagen'), icon: '✖', tone: 'error' },
    skipped: { label: t('posts.lists.published.history.status.skipped', 'Übersprungen'), icon: '•', tone: 'neutral' },
    pending: { label: t('posts.lists.published.history.status.pending', 'Ausstehend'), icon: '…', tone: 'neutral' }
  }
  const fallbackStatusLabel = t('posts.lists.published.history.status.fallback', 'Aktualisiert')
  const platformLabel = t('common.platformLabel', 'Plattform')

  function formatDate (value) {
    const resolved = resolveTimestamp(value)
    if (!resolved) return placeholderDash
    return DATE_FORMATTER.format(resolved)
  }

  function getStatusMeta (status) {
    return statusMetaByKey[status] || { label: status || fallbackStatusLabel, icon: '•', tone: 'neutral' }
  }
  const items = Array.isArray(history)
    ? [...history]
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = resolveTimestamp(a?.sentAt || a?.postedAt || a?.createdAt)
        const dateB = resolveTimestamp(b?.sentAt || b?.postedAt || b?.createdAt)
        const aTime = dateA ? dateA.getTime() : 0
        const bTime = dateB ? dateB.getTime() : 0
        return bTime - aTime
      })
    : []

  return (
    <section className='skeet-history' aria-live='polite'>
      {showTitle ? (
        <p className='skeet-history-title'>{resolvedTitle}</p>
      ) : null}
      {items.length === 0 ? (
        <p className='skeet-history-empty'>
          {t(
            'posts.lists.published.history.empty',
            'Noch keine Sendehistorie vorhanden.'
          )}
        </p>
      ) : (
        <div className='skeet-history-list'>
          {items.map((entry, index) => {
            const key = entry?.id ?? `${entry?.sentAt || entry?.postedAt || entry?.createdAt}-${index}`
            const statusMeta = getStatusMeta(entry?.status)
            const dateValue = entry?.sentAt || entry?.postedAt || entry?.createdAt
            const statusClass = {
              success: 'skeet-history-status-success',
              error: 'skeet-history-status-error',
              neutral: 'skeet-history-status-neutral'
            }[statusMeta.tone] || 'skeet-history-status-neutral'

            return (
              <div key={key} className='skeet-history-item'>
                <div className='skeet-history-axis'>
                  <span className='skeet-history-dot' aria-hidden />
                </div>
                <div className='skeet-history-card'>
                  <p className='skeet-history-date'>{formatDate(dateValue)}</p>
                  <p className={`skeet-history-status ${statusClass}`}>
                    <span aria-hidden>{statusMeta.icon}</span>
                    <span>{statusMeta.label}</span>
                  </p>
                  {entry?.platform ? (
                    <p className='skeet-history-platform'>
                      {platformLabel}: <span>{entry.platform}</span>
                    </p>
                  ) : null}
                  {entry?.status === 'failed' && entry?.errorMessage ? (
                    <p className='skeet-history-error'>{entry.errorMessage}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
