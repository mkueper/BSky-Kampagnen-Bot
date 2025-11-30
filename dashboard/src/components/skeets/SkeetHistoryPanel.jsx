import React from 'react'
import { useSkeetHistory } from '../../hooks/useSkeetHistory.js'
import SkeetHistoryTimeline from './SkeetHistoryTimeline.jsx'

export default function SkeetHistoryPanel ({ skeetId, repeat = 'none' }) {
  const shouldRender = Boolean(skeetId) && repeat !== 'none'
  const { data, isLoading, isError } = useSkeetHistory(skeetId, {
    enabled: shouldRender
  })

  if (!shouldRender) {
    return null
  }

  if (isLoading) {
    return (
      <section className='skeet-history' aria-live='polite'>
        <p className='skeet-history-title'>Sendehistorie</p>
        <p className='mt-2 text-xs text-foreground-muted'>Lade Sendehistorie…</p>
      </section>
    )
  }

  if (isError) {
    return (
      <section className='skeet-history' aria-live='polite'>
        <p className='skeet-history-title'>Sendehistorie</p>
        <p className='mt-2 text-xs text-destructive'>Sendehistorie konnte nicht geladen werden.</p>
      </section>
    )
  }

  return <SkeetHistoryTimeline history={data} />
}
