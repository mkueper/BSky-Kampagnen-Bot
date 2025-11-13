import 'module-alias/register'
import { describe, it, expect } from 'vitest'

process.env.TIME_ZONE = 'Europe/Berlin'

// SkeetService exportiert parseOptionalDate und buildSkeetAttributes
// (siehe module.exports am Datei-Ende)
// Pfad relativ zum Projekt-Root
const skeetService = require('@core/services/skeetService')

describe('parseOptionalDate (skeetService)', () => {
  it('returns null for null/empty', () => {
    expect(skeetService.parseOptionalDate(null)).toBeNull()
    expect(skeetService.parseOptionalDate('')).toBeNull()
  })

  it('parses datetime-local unter Berücksichtigung der konfigurierten Zeitzone', () => {
    const v = '2025-10-13T09:15'
    const d = skeetService.parseOptionalDate(v)
    expect(d.toISOString()).toBe('2025-10-13T07:15:00.000Z') // MEZ (-01:00)
  })

  it('parses ISO with Z unchanged', () => {
    const v = '2025-10-13T07:00:00Z'
    const d = skeetService.parseOptionalDate(v)
    // toISOString sollte exakt dem Eingang entsprechen
    expect(d.toISOString()).toBe('2025-10-13T07:00:00.000Z')
  })

  it('applies MESZ offset im Sommer', () => {
    const value = '2025-07-01T09:00'
    const d = skeetService.parseOptionalDate(value)
    expect(d.toISOString()).toBe('2025-07-01T07:00:00.000Z') // UTC+2
  })

  it('applies MEZ offset im Winter', () => {
    const value = '2025-12-15T09:00'
    const d = skeetService.parseOptionalDate(value)
    expect(d.toISOString()).toBe('2025-12-15T08:00:00.000Z') // UTC+1
  })
})

describe('buildSkeetAttributes', () => {
  it('requires scheduledAt when repeat = none', () => {
    expect(() => skeetService.buildSkeetAttributes({ content: 'hi', repeat: 'none', targetPlatforms: ['bluesky'] }))
      .toThrow(/scheduledAt ist erforderlich/i)
  })

  it('accepts scheduledAt (datetime-local string)', () => {
    const attrs = skeetService.buildSkeetAttributes({
      content: 'hello',
      repeat: 'none',
      scheduledAt: '2030-01-02T10:00',
      targetPlatforms: ['bluesky']
    })
    expect(attrs.scheduledAt instanceof Date).toBe(true)
    const expected = new Date(2030, 0, 2, 10, 0, 0, 0)
    expect(attrs.scheduledAt.getTime()).toBe(expected.getTime())
  })
})
