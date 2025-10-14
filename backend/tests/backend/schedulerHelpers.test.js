import 'module-alias/register'
import { describe, it, expect } from 'vitest'

const sched = require('@core/services/scheduler')

describe('scheduler helper functions', () => {
  it('addDaysKeepingTime adds days in UTC without shifting hours', () => {
    const base = new Date(Date.UTC(2025, 0, 30, 9, 0, 0))
    const next = sched.addDaysKeepingTime(base, 2)
    expect(next.getUTCHours()).toBe(9)
    expect(next.getUTCDate()).toBe(1) // Jan 30 + 2 days = Feb 1
  })

  it('computeNextWeekly moves to the next desired weekday', () => {
    // Monday, Jan 6, 2025 (UTC)
    const base = new Date(Date.UTC(2025, 0, 6, 9, 0, 0)) // Monday (1)
    // desire Friday (5)
    const next = sched.computeNextWeekly(base, 5)
    expect(next.getUTCDay()).toBe(5)
    expect(next.getUTCDate()).toBe(10)
    // same day should roll to next week
    const nextWeek = sched.computeNextWeekly(base, 1)
    expect(nextWeek.getUTCDate()).toBe(13)
  })

  it('computeNextMonthly clamps to last day of next month', () => {
    // Jan 31 -> next month Feb (clamped to 28 or 29)
    const base = new Date(Date.UTC(2025, 0, 31, 9, 0, 0))
    const next = sched.computeNextMonthly(base, 31)
    expect(next.getUTCMonth()).toBe(1) // February
    // 2025 Feb has 28 days
    expect(next.getUTCDate()).toBe(28)
  })

  it('calculateNextScheduledAt handles daily/weekly/monthly', () => {
    const daily = { repeat: 'daily', scheduledAt: '2025-01-10T09:00:00Z' }
    const d = sched.calculateNextScheduledAt(daily)
    const dd = new Date(daily.scheduledAt)
    const expDaily = new Date(dd.getTime()); expDaily.setUTCDate(expDaily.getUTCDate() + 1)
    expect(d.getTime()).toBe(expDaily.getTime())

    const weekly = { repeat: 'weekly', repeatDayOfWeek: 3, scheduledAt: '2025-01-06T09:00:00Z' }
    const w = sched.calculateNextScheduledAt(weekly)
    expect(w.getUTCDay()).toBe(3)

    const monthly = { repeat: 'monthly', repeatDayOfMonth: 30, scheduledAt: '2025-01-31T09:00:00Z' }
    const m = sched.calculateNextScheduledAt(monthly)
    expect(m.getUTCMonth()).toBe(1)
    expect(m.getUTCDate()).toBe(28)
  })
})
