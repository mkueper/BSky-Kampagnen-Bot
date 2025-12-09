import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Testgruppe: requireAuth.test.js
 *
 * Diese Tests überprüfen:
 * - Verhalten bei nicht konfigurierter Auth (503)
 * - Verhalten bei fehlender Session (401)
 * - Erfolgsfall mit angehängter Session und Aufruf von next()
 *
 * Kontext:
 * Middleware für geschützte Backend-Routen. Stellt sicher, dass
 * Login-Konfiguration und Session-Handling stabil funktionieren.
 */

const authService = require('@core/services/authService')
const requireAuthPath = require.resolve('@api/middleware/requireAuth')

function loadMiddlewareWithMocks (status, session) {
  const originalGetStatus = authService.getStatus
  const originalResolveSession = authService.resolveRequestSession

  authService.getStatus = () => status
  authService.resolveRequestSession = () => session

  delete require.cache[requireAuthPath]
  // require after patching, so destructuring in the module sees our mocks
  const mw = require('@api/middleware/requireAuth')

  // Restore original implementations for andere Tests
  authService.getStatus = originalGetStatus
  authService.resolveRequestSession = originalResolveSession

  return mw
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('antwortet mit 503, wenn Auth nicht konfiguriert ist', () => {
    const requireAuth = loadMiddlewareWithMocks({
      configured: false,
      cookieName: 'x',
      ttlSeconds: 3600
    }, null)

    const req = {}
    let statusCode = 200
    let payload = null
    const res = {
      status: (code) => {
        statusCode = code
        return {
          json: (obj) => { payload = obj }
        }
      },
      json: (obj) => { payload = obj }
    }
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(statusCode).toBe(503)
    expect(payload?.error).toBe('AUTH_NOT_CONFIGURED')
    expect(String(payload?.message || '')).toMatch(/nicht konfiguriert/i)
    expect(next).not.toHaveBeenCalled()
  })

  it('antwortet mit 401, wenn keine gültige Session vorhanden ist', () => {
    const requireAuth = loadMiddlewareWithMocks({
      configured: true,
      cookieName: 'sess',
      ttlSeconds: 3600
    }, null)

    const req = { cookies: {} }
    let statusCode = 200
    let payload = null
    const res = {
      status: (code) => {
        statusCode = code
        return {
          json: (obj) => { payload = obj }
        }
      },
      json: (obj) => { payload = obj }
    }
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(statusCode).toBe(401)
    expect(payload?.error).toBe('AUTH_SESSION_REQUIRED')
    expect(String(payload?.message || '')).toMatch(/nicht angemeldet|sitzung abgelaufen/i)
    expect(next).not.toHaveBeenCalled()
  })

  it('hängt Session an req an und ruft next() auf, wenn authentifiziert', () => {
    const session = { username: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }
    const requireAuth = loadMiddlewareWithMocks({
      configured: true,
      cookieName: 'sess',
      ttlSeconds: 3600
    }, session)

    const req = { cookies: { sess: 'token' } }
    const res = {
      status: () => ({ json: () => {} }),
      json: () => {}
    }
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(req.session).toBe(session)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
