import 'module-alias/register'
import { describe, it, expect } from 'vitest'

/**
 * Testgruppe: authRoutes.test.js
 *
 * Diese Tests überprüfen:
 * - Routing der Auth-Endpunkte auf die korrekten Controller-Methoden
 *   - GET  /session  -> authController.session
 *   - POST /login    -> authController.login
 *   - POST /logout   -> authController.logout
 *
 * Kontext:
 * Stellt sicher, dass die Express-Routen stabil mit dem Controller
 * verdrahtet bleiben, ohne einen vollständigen HTTP-Server zu starten.
 */

const authRoutes = require('@api/routes/authRoutes')
const authController = require('@api/controllers/authController')

function findRoute (router, path, method) {
  const targetMethod = String(method || '').toLowerCase()
  const stack = router.stack || []
  for (const layer of stack) {
    const route = layer.route
    if (!route) continue
    if (route.path !== path) continue
    if (!route.methods || !route.methods[targetMethod]) continue
    return route
  }
  return null
}

describe('authRoutes', () => {
  it('registriert GET /session auf authController.session', () => {
    const route = findRoute(authRoutes, '/session', 'get')
    expect(route).not.toBeNull()
    const handlers = route.stack.map((l) => l.handle)
    expect(handlers).toContain(authController.session)
  })

  it('registriert POST /login auf authController.login', () => {
    const route = findRoute(authRoutes, '/login', 'post')
    expect(route).not.toBeNull()
    const handlers = route.stack.map((l) => l.handle)
    expect(handlers).toContain(authController.login)
  })

  it('registriert POST /logout auf authController.logout', () => {
    const route = findRoute(authRoutes, '/logout', 'post')
    expect(route).not.toBeNull()
    const handlers = route.stack.map((l) => l.handle)
    expect(handlers).toContain(authController.logout)
  })

  it('registriert POST /renew auf authController.renew', () => {
    const route = findRoute(authRoutes, '/renew', 'post')
    expect(route).not.toBeNull()
    const handlers = route.stack.map((l) => l.handle)
    expect(handlers).toContain(authController.renew)
  })
})
