import React, { useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { useSkeetHistory } from '../../hooks/useSkeetHistory.js'
import SkeetHistoryTimeline from './SkeetHistoryTimeline.jsx'

export default function SkeetHistoryPanel ({ skeetId, repeat = 'none' }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const shouldRender = Boolean(skeetId) && repeat !== 'none'
  const { data, isLoading, isError } = useSkeetHistory(skeetId, {
    enabled: shouldRender
  })

  const historyItems = Array.isArray(data) ? data : []
  const hasEntries = historyItems.length > 0
  const { successCount, failedCount } = useMemo(() => {
    return historyItems.reduce(
      (acc, entry) => {
        if (entry?.status === 'success') acc.successCount += 1
        if (entry?.status === 'failed') acc.failedCount += 1
        return acc
      },
      { successCount: 0, failedCount: 0 }
    )
  }, [historyItems])

  if (!shouldRender) {
    return null
  }

  const toggleLabel = isOpen ? 'Ausblenden' : 'Anzeigen'
  const historyId = `skeet-history-${skeetId || 'unknown'}`
  const toggleText = t(
    `posts.lists.published.history.toggle.${isOpen ? 'hide' : 'show'}`,
    toggleLabel
  )
  const toggleDisabled = !isLoading && !isError && !hasEntries
  const toggleAriaLabel = toggleDisabled
    ? t(
        'posts.lists.published.history.ariaToggleDisabled',
        'Sendehistorie nicht verfügbar (keine Einträge)'
      )
    : t('posts.lists.published.history.ariaToggle', 'Sendehistorie {action}', {
        action: toggleText
      })

  return (
    <section className='skeet-history' aria-live='polite'>
      <p className='skeet-history-title'>
        {t('posts.lists.published.history.title', 'Sendehistorie')}
      </p>
      <div className='skeet-history-counts'>
        <p className='skeet-history-count'>
          {t(
            'posts.lists.published.history.success',
            'Erfolgreich: {count}',
            { count: successCount }
          )}
        </p>
        <p className='skeet-history-count'>
          {t(
            'posts.lists.published.history.failed',
            'Fehlgeschlagen: {count}',
            { count: failedCount }
          )}
        </p>
      </div>
      <button
        type='button'
        className='skeet-history-toggle'
        aria-expanded={isOpen}
        aria-controls={historyId}
        aria-label={toggleAriaLabel}
        disabled={toggleDisabled}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {toggleText}
      </button>
      {toggleDisabled ? (
        <p className='skeet-history-empty'>
          {t(
            'posts.lists.published.history.emptyHint',
            'Noch keine Einträge vorhanden.'
          )}
        </p>
      ) : null}
      {isOpen ? (
        <div id={historyId} className='skeet-history-body'>
          {isLoading ? (
            <p className='skeet-history-empty'>
              {t('posts.lists.published.history.loading', 'Lade Sendehistorie...')}
            </p>
          ) : null}
          {isError ? (
            <p className='skeet-history-error-text'>
              {t(
                'posts.lists.published.history.error',
                'Sendehistorie konnte nicht geladen werden.'
              )}
            </p>
          ) : null}
          {!isLoading && !isError ? (
            <SkeetHistoryTimeline history={historyItems} showTitle={false} />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
