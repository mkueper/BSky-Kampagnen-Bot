import React, { useMemo, useState } from 'react'
import { useSkeetHistory } from '../../hooks/useSkeetHistory.js'
import SkeetHistoryTimeline from './SkeetHistoryTimeline.jsx'

export default function SkeetHistoryPanel ({ skeetId, repeat = 'none' }) {
  const [isOpen, setIsOpen] = useState(false)
  const shouldRender = Boolean(skeetId) && repeat !== 'none'
  const { data, isLoading, isError } = useSkeetHistory(skeetId, {
    enabled: shouldRender
  })

  if (!shouldRender) {
    return null
  }

  const historyItems = Array.isArray(data) ? data : []
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

  const summaryLabel = isLoading
    ? 'Lade...'
    : `Erfolgreich ${successCount} / Fehlgeschlagen ${failedCount}`

  const toggleLabel = isOpen ? 'Ausblenden' : 'Anzeigen'
  const historyId = `skeet-history-${skeetId || 'unknown'}`

  return (
    <section className='skeet-history' aria-live='polite'>
      <button
        type='button'
        className='skeet-history-toggle'
        aria-expanded={isOpen}
        aria-controls={historyId}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className='skeet-history-title'>Sendehistorie</span>
        <span className='skeet-history-toggle-action'>{toggleLabel}</span>
      </button>
      <p className='skeet-history-summary'>{summaryLabel}</p>
      {isOpen ? (
        <div id={historyId} className='skeet-history-body'>
          {isLoading ? (
            <p className='skeet-history-empty'>Lade Sendehistorie...</p>
          ) : null}
          {isError ? (
            <p className='skeet-history-error-text'>Sendehistorie konnte nicht geladen werden.</p>
          ) : null}
          {!isLoading && !isError ? (
            <SkeetHistoryTimeline history={historyItems} showTitle={false} />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
