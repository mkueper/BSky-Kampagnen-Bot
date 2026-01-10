import { describe, it, expect } from 'vitest'
import {
  WARN_BEFORE_MS,
  IDLE_CUTOFF_MS,
  CLIENT_RENEW_COOLDOWN_MS,
  getRemainingMs,
  getMinutesRemaining,
  isWarningActive,
  isExpired,
  canAutoRenew
} from '../../src/utils/sessionRenewal.js'

describe('sessionRenewal utils', () => {
  it('computes remaining ms and minutes', () => {
    const now = Date.now()
    const expiresAt = now + 2 * 60 * 1000 + 10
    const remaining = getRemainingMs(expiresAt, now)
    expect(remaining).toBeGreaterThan(0)
    expect(getMinutesRemaining(remaining)).toBe(3)
  })

  it('detects warning window and expiry', () => {
    const now = Date.now()
    const warnAt = now + WARN_BEFORE_MS - 1000
    expect(isWarningActive(warnAt, now)).toBe(true)
    expect(isExpired(warnAt, warnAt)).toBe(true)
  })

  it('allows auto renew only when active, not idle, and past cooldown', () => {
    const now = Date.now()
    const expiresAt = now + WARN_BEFORE_MS - 1000
    const lastActivityAt = now - (IDLE_CUTOFF_MS - 1000)
    const lastRenewAttemptAt = now - (CLIENT_RENEW_COOLDOWN_MS + 1000)
    const allowed = canAutoRenew({
      expiresAt,
      now,
      lastActivityAt,
      autoExtendSession: true,
      lastRenewAttemptAt
    })
    expect(allowed).toBe(true)
  })

  it('blocks auto renew when idle too long', () => {
    const now = Date.now()
    const expiresAt = now + WARN_BEFORE_MS - 1000
    const lastActivityAt = now - (IDLE_CUTOFF_MS + 1000)
    const lastRenewAttemptAt = now - (CLIENT_RENEW_COOLDOWN_MS + 1000)
    const allowed = canAutoRenew({
      expiresAt,
      now,
      lastActivityAt,
      autoExtendSession: true,
      lastRenewAttemptAt
    })
    expect(allowed).toBe(false)
  })
})
