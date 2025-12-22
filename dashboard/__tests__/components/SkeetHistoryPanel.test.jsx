/**
 * Testgruppe: SkeetHistoryPanel.test.jsx
 *
 * Diese Tests prüfen:
 * - Rendering-Gates nach repeat/skeetId
 * - Anzeige der Lade-, Fehler- und Erfolgszustände
 */
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import SkeetHistoryPanel from '../../src/components/skeets/SkeetHistoryPanel.jsx'
import { useSkeetHistory } from '../../src/hooks/useSkeetHistory.js'

vi.mock('../../src/hooks/useSkeetHistory.js', () => ({
  useSkeetHistory: vi.fn()
}))

describe('SkeetHistoryPanel', () => {
  beforeEach(() => {
    useSkeetHistory.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false
    })
  })

  it('rendert nichts wenn repeat none ist', () => {
    const { container } = render(
      <SkeetHistoryPanel skeetId={123} repeat='none' />
    )
    expect(container).toBeEmptyDOMElement()
    expect(useSkeetHistory).toHaveBeenCalledWith(123, { enabled: false })
  })

  it('zeigt einen Ladehinweis', () => {
    useSkeetHistory.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false
    })
    render(<SkeetHistoryPanel skeetId={1} repeat='daily' />)
    fireEvent.click(screen.getByRole('button', { name: /Sendehistorie/i }))
    expect(screen.getByText(/Lade Sendehistorie/i)).toBeInTheDocument()
  })

  it('zeigt einen Fehlerhinweis', () => {
    useSkeetHistory.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true
    })
    render(<SkeetHistoryPanel skeetId={1} repeat='daily' />)
    fireEvent.click(screen.getByRole('button', { name: /Sendehistorie/i }))
    expect(
      screen.getByText(/Sendehistorie konnte nicht geladen werden/i)
    ).toBeInTheDocument()
  })

  it('zeigt Einträge inkl. Statusanzeigen', () => {
    const entries = [
      { id: 'a', status: 'success', postedAt: '2024-01-02T10:00:00Z' },
      {
        id: 'b',
        status: 'failed',
        postedAt: '2024-01-02T12:00:00Z',
        errorMessage: 'API down'
      }
    ]
    useSkeetHistory.mockReturnValue({
      data: entries,
      isLoading: false,
      isError: false
    })
    const { container } = render(<SkeetHistoryPanel skeetId={1} repeat='weekly' />)
    fireEvent.click(screen.getByRole('button', { name: /Sendehistorie/i }))
    expect(container.querySelectorAll('.skeet-history-item')).toHaveLength(entries.length)
    expect(screen.getByText('Erfolgreich')).toBeInTheDocument()
    expect(screen.getByText('Fehlgeschlagen')).toBeInTheDocument()
    expect(screen.getByText('API down')).toBeInTheDocument()
  })
})
