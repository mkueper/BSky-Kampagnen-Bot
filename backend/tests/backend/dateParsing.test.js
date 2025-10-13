import 'module-alias/register'
import { describe, it, expect } from 'vitest'

// SkeetService exportiert parseOptionalDate und buildSkeetAttributes
// (siehe module.exports am Datei-Ende)
// Pfad relativ zum Projekt-Root
// eslint-disable-next-line import/no-commonjs
const skeetService = require('@core/services/skeetService')

describe('parseOptionalDate (skeetService)', () => {
  it('returns null for null/empty', () => {
    expect(skeetService.parseOptionalDate(null)).toBeNull()
    expect(skeetService.parseOptionalDate('')).toBeNull()
  })

  it('parses datetime-local as local time (YYYY-MM-DDTHH:mm)', () => {
    const v = '2025-10-13T09:15'
    const d = skeetService.parseOptionalDate(v)
    const expected = new Date(2025, 9, 13, 9, 15, 0, 0) // local components
    expect(d instanceof Date && !Number.isNaN(d.getTime())).toBe(true)
    expect(d.getTime()).toBe(expected.getTime())
  })

  it('parses ISO with Z unchanged', () => {
    const v = '2025-10-13T07:00:00Z'
    const d = skeetService.parseOptionalDate(v)
    // toISOString sollte exakt dem Eingang entsprechen
    expect(d.toISOString()).toBe('2025-10-13T07:00:00.000Z')
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
