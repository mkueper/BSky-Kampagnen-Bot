import { describe, expect, it } from 'vitest'
import { weekdayOrder, weekdayLabel } from '../weekday.js'

describe('weekdayOrder', () => {
  it('starts on Monday for de-DE locales', () => {
    expect(weekdayOrder('de-DE')).toEqual([1, 2, 3, 4, 5, 6, 0])
  })

  it('starts on Sunday for en-US locale', () => {
    expect(weekdayOrder('en-US')).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('weekdayLabel', () => {
  it('creates localized labels', () => {
    const label = weekdayLabel(1, 'de-DE', 'long')
    expect(label.toLowerCase()).toContain('montag'.slice(0, 3))
  })
})
