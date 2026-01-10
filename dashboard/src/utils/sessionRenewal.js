export const WARN_BEFORE_MS = 5 * 60 * 1000
export const CHECK_INTERVAL_MS = 30 * 1000
export const IDLE_CUTOFF_MS = 30 * 60 * 1000
export const CLIENT_RENEW_COOLDOWN_MS = 2 * 60 * 1000

export function getRemainingMs (expiresAt, now) {
  if (!Number.isFinite(expiresAt)) return null
  return expiresAt - now
}

export function getMinutesRemaining (remainingMs) {
  if (!Number.isFinite(remainingMs)) return null
  return Math.max(0, Math.ceil(remainingMs / 60000))
}

export function isWarningActive (expiresAt, now, warnBeforeMs = WARN_BEFORE_MS) {
  const remaining = getRemainingMs(expiresAt, now)
  return Number.isFinite(remaining) && remaining <= warnBeforeMs && remaining > 0
}

export function isExpired (expiresAt, now) {
  const remaining = getRemainingMs(expiresAt, now)
  return Number.isFinite(remaining) && remaining <= 0
}

export function canAutoRenew ({
  expiresAt,
  now,
  lastActivityAt,
  autoExtendSession,
  warnBeforeMs = WARN_BEFORE_MS,
  idleCutoffMs = IDLE_CUTOFF_MS,
  lastRenewAttemptAt = 0,
  cooldownMs = CLIENT_RENEW_COOLDOWN_MS
}) {
  if (!autoExtendSession) return false
  if (!isWarningActive(expiresAt, now, warnBeforeMs)) return false
  if (!Number.isFinite(lastActivityAt)) return false
  if (now - lastActivityAt > idleCutoffMs) return false
  if (now - lastRenewAttemptAt < cooldownMs) return false
  return true
}
