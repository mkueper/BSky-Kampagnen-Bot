/**
 * Testgruppe: timeUtils.test.js
 *
 * Diese Tests überprüfen:
 * - Beschreibungen für unterschiedliche Wiederholungsarten
 * - Fallback-Zeitberechnung (getDefaultDateParts)
 * - Zusammenspiel mit formatTime-Mock
 *
 * Kontext:
 * Diese Testdateien gehören zur vereinheitlichten Dashboard-Teststruktur.
 * Sie stellen sicher, dass Komponenten, Hooks oder Seiten erwartungsgemäß funktionieren.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getRepeatDescription, getDefaultDateParts } from '../../src/utils/timeUtils.js'

vi.mock('../../src/utils/formatTime.js', () => ({
  formatTime: vi.fn(() => '10:00')
}))

describe('getRepeatDescription', () => {
  const baseSkeet = { scheduledAt: '2025-01-01T09:00:00Z' }

  it('describes one-time skeets with full timestamp', () => {
    const text = getRepeatDescription({ ...baseSkeet, repeat: 'none' })
    expect(text).toContain('Wird gepostet um: 10:00')
  })

  it('describes daily skeets with time only', () => {
    const text = getRepeatDescription({ ...baseSkeet, repeat: 'daily' })
    expect(text).toContain('täglich')
    expect(text).toContain('10:00')
  })

  it('describes weekly skeets with weekday index', () => {
    const text = getRepeatDescription({
      ...baseSkeet,
      repeat: 'weekly',
      repeatDayOfWeek: 4
    })
    expect(text).toContain('wöchentlich')
    expect(text).toContain('Tag 4')
  })

  it('describes monthly skeets with day of month', () => {
    const text = getRepeatDescription({
      ...baseSkeet,
      repeat: 'monthly',
      repeatDayOfMonth: 12
    })
    expect(text).toContain('monatlich')
    expect(text).toContain('12.')
  })
})

describe('getDefaultDateParts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-10T12:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns next day at 09:00 local time', () => {
    const result = getDefaultDateParts()
    expect(result).toEqual({ date: '2025-01-11', time: '09:00' })
  })
})
