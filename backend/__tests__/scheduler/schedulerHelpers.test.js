import 'module-alias/register'
import { describe, it, expect } from 'vitest'

/**
 * Testgruppe: schedulerHelpers.test.js
 *
 * Diese Tests überprüfen:
 * - Terminverschiebungen für tägliche, wöchentliche und monatliche Wiederholungen
 * - Hilfsfunktionen wie addDaysKeepingTime und computeNextWeekly/Monthly
 * - calculateNextScheduledAt als Basiskalkulation für Wiederholungen
 * - getNextScheduledAt für zukünftige Slots nach einem beliebigen Bezugspunkt
 * - Robustheit bei unbekannten oder fehlkonfigurierten Repeat-Werten
 *
 * Dies ist ein Teil der Pending-Skeet-Logik. Die Tests stellen sicher, dass
 * Statusübergänge, Terminberechnung und API-Verhalten stabil bleiben.
 */

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

  it('computeNextWeekly supports multiple weekdays via repeatDaysOfWeek', () => {
    // Monday, Jan 6, 2025 (UTC)
    const base = new Date(Date.UTC(2025, 0, 6, 9, 0, 0)) // Monday (1)
    const skeet = {
      repeat: 'weekly',
      repeatDaysOfWeek: [1, 3, 5] // Mo, Mi, Fr
    }
    const first = sched.computeNextWeekly(base, skeet)
    expect(first.getUTCDay()).toBe(3) // Mittwoch
    const second = sched.computeNextWeekly(first, skeet)
    expect(second.getUTCDay()).toBe(5) // Freitag
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

  it('getNextScheduledAt computes next daily occurrence after fromDate', () => {
    const from = new Date(Date.UTC(2025, 0, 2, 10, 0, 0)) // 2. Jan 2025, 10:00 UTC
    const skeet = {
      repeat: 'daily',
      scheduledAt: new Date(Date.UTC(2025, 0, 1, 6, 0, 0)), // gestern 06:00 UTC
    }
    const next = sched.getNextScheduledAt(skeet, from)
    expect(next).toBeInstanceOf(Date)
    // Erwartet: morgen 06:00 UTC
    const expected = new Date(Date.UTC(2025, 0, 3, 6, 0, 0))
    expect(next.toISOString()).toBe(expected.toISOString())
    expect(next.getTime()).toBeGreaterThan(from.getTime())
  })

  it('getNextScheduledAt computes next weekly occurrence for given weekday', () => {
    // Ursprünglicher Plan: Mittwoch 06:00 UTC
    const scheduledAt = new Date(Date.UTC(2025, 0, 8, 6, 0, 0)) // Mi, 8. Jan 2025
    const from = new Date(Date.UTC(2025, 0, 9, 12, 0, 0)) // Do, 9. Jan 2025, 12:00 UTC
    const skeet = {
      repeat: 'weekly',
      repeatDayOfWeek: 3, // Mittwoch
      scheduledAt,
    }
    const next = sched.getNextScheduledAt(skeet, from)
    expect(next).toBeInstanceOf(Date)
    // nächster Mittwoch (eine Woche später), Uhrzeit wie im Original
    expect(next.getUTCDay()).toBe(3)
    expect(next.getUTCHours()).toBe(6)
    expect(next.getTime()).toBeGreaterThan(from.getTime())
  })

  it('getNextScheduledAt computes next monthly occurrence for given day', () => {
    const from = new Date(Date.UTC(2025, 0, 20, 10, 0, 0)) // 20. Jan 2025
    const skeet = {
      repeat: 'monthly',
      repeatDayOfMonth: 15,
      scheduledAt: new Date(Date.UTC(2025, 0, 15, 6, 0, 0)), // 15. Jan 2025
    }
    const next = sched.getNextScheduledAt(skeet, from)
    expect(next).toBeInstanceOf(Date)
    // Erwartet: 15. Feb 2025 (nächster Monat), Uhrzeit 06:00 UTC
    expect(next.getUTCMonth()).toBe(1) // Februar
    expect(next.getUTCDate()).toBe(15)
    expect(next.getUTCHours()).toBe(6)
    expect(next.getTime()).toBeGreaterThan(from.getTime())
  })

  it('getNextScheduledAt returns null for unknown repeat values', () => {
    const from = new Date(Date.UTC(2025, 0, 1, 0, 0, 0))
    const skeet = {
      repeat: 'yearly',
      scheduledAt: new Date(Date.UTC(2025, 0, 1, 6, 0, 0)),
    }
    const next = sched.getNextScheduledAt(skeet, from)
    expect(next).toBeNull()
  })
})
