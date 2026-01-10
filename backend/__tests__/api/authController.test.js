import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Testgruppe: authController.test.js
 *
 * Diese Tests überprüfen:
 * - GET /session: Rückgabe von authenticated/configured Flags und Userdaten
 * - POST /login: Validierung, Fehlerfälle und Erfolgsantwort
 * - POST /logout: Löschen der Session
 *
 * Kontext:
 * Zentrale Authentifizierungslogik für das Dashboard-Backend. Tests stellen
 * sicher, dass Konfiguration, Credentials und Sessions korrekt ausgewertet werden.
 */

const authService = require('@core/services/authService')
const controllerPath = require.resolve('@api/controllers/authController')

function loadController (overrides = {}) {
  const original = {}
  Object.keys(overrides).forEach((key) => {
    original[key] = authService[key]
    authService[key] = overrides[key]
  })

  delete require.cache[controllerPath]
  // Controller mit überschriebenem authService laden
  const ctrl = require('@api/controllers/authController')

  // Originale Implementierungen wiederherstellen
  Object.keys(overrides).forEach((key) => {
    authService[key] = original[key]
  })

  return ctrl
}

describe('authController.session', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('gibt configured=false und authenticated=false zurück, wenn Auth nicht konfiguriert ist', async () => {
    const authController = loadController({
      getStatus: () => ({
        configured: false,
        cookieName: 'sess',
        csrfCookieName: 'csrf',
        ttlSeconds: 3600
      })
    })

    let payload = null
    const res = {
      json: (obj) => { payload = obj }
    }

    await authController.session({}, res)

    expect(payload).toEqual({
      authenticated: false,
      configured: false
    })
  })

  it('gibt authenticated=false zurück, wenn keine Session vorliegt', async () => {
    const authController = loadController({
      getStatus: () => ({
        configured: true,
        cookieName: 'sess',
        csrfCookieName: 'csrf',
        ttlSeconds: 3600
      }),
      resolveRequestSession: () => null
    })

    let payload = null
    const res = {
      json: (obj) => { payload = obj }
    }

    await authController.session({ cookies: {} }, res)

    expect(payload).toEqual({
      authenticated: false,
      configured: true,
      csrfCookieName: 'csrf'
    })
  })

  it('gibt authenticated=true und Userdaten zurück, wenn Session vorhanden ist', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000) + 3600
    const authController = loadController({
      getStatus: () => ({
        configured: true,
        cookieName: 'sess',
        csrfCookieName: 'csrf',
        ttlSeconds: 3600
      }),
      resolveRequestSession: () => ({
        username: 'admin',
        exp: nowSeconds
      })
    })

    let payload = null
    const res = {
      json: (obj) => { payload = obj }
    }

    await authController.session({ cookies: { sess: 'token' } }, res)

    expect(payload?.authenticated).toBe(true)
    expect(payload?.configured).toBe(true)
    expect(payload?.user).toEqual({ username: 'admin' })
    expect(payload?.expiresAt).toBe(nowSeconds * 1000)
    expect(payload?.csrfCookieName).toBe('csrf')
  })
})

describe('authController.login', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('gibt 503 zurück, wenn Auth nicht konfiguriert ist', () => {
    const authController = loadController({
      getStatus: () => ({
        configured: false,
        cookieName: 'sess',
        ttlSeconds: 3600
      })
    })

    const req = { body: { username: 'admin', password: 'secret' } }
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

    authController.login(req, res)

    expect(statusCode).toBe(503)
    expect(payload?.error).toBe('AUTH_NOT_CONFIGURED')
    expect(String(payload?.message || '')).toMatch(/konfiguriert/i)
  })

  it('gibt 400 zurück, wenn Benutzername oder Passwort fehlen', () => {
    const authController = loadController({
      getStatus: () => ({
        configured: true,
        cookieName: 'sess',
        ttlSeconds: 3600
      })
    })

    const req = { body: { username: '', password: '' } }
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

    authController.login(req, res)

    expect(statusCode).toBe(400)
    expect(payload?.error).toBe('AUTH_MISSING_CREDENTIALS')
    expect(String(payload?.message || '')).toMatch(/benutzername.*passwort/i)
  })

  it('gibt 401 zurück, wenn Credentials ungültig sind', () => {
    const authController = loadController({
      getStatus: () => ({
        configured: true,
        cookieName: 'sess',
        ttlSeconds: 3600
      }),
      validateCredentials: () => false
    })

    const req = { body: { username: 'admin', password: 'wrong' } }
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

    authController.login(req, res)

    expect(statusCode).toBe(401)
    expect(payload?.error).toBe('AUTH_INVALID_CREDENTIALS')
    expect(String(payload?.message || '')).toMatch(/ungültig/i)
  })

  it('gibt ok=true und expiresInSeconds zurück, wenn Login erfolgreich ist', () => {
    const issueSpy = vi.fn().mockReturnValue('token123')
    const persistSpy = vi.fn()
    const authController = loadController({
      getStatus: () => ({
        configured: true,
        cookieName: 'sess',
        ttlSeconds: 1234
      }),
      validateCredentials: () => true,
      issueSession: issueSpy,
      persistSession: persistSpy
    })

    const req = { body: { username: 'admin', password: 'secret' } }
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

    authController.login(req, res)

    expect(statusCode).toBe(200)
    expect(issueSpy).toHaveBeenCalledWith('admin', 1234)
    expect(persistSpy).toHaveBeenCalledWith(res, 'token123', 1234)
    expect(payload?.ok).toBe(true)
    expect(payload?.expiresInSeconds).toBe(1234)
  })
})

describe('authController.logout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('ruft clearSession auf und gibt ok=true zurück', () => {
    const clearSpy = vi.fn()
    const authController = loadController({
      clearSession: clearSpy
    })

    const req = {}
    let payload = null
    const res = { json: (obj) => { payload = obj } }

    authController.logout(req, res)

    expect(clearSpy).toHaveBeenCalled()
    expect(payload).toEqual({ ok: true })
  })
})
