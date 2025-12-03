import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * Testgruppe: env.test.js
 *
 * Diese Tests überprüfen:
 * - Defaultwerte aus backend/src/env.js
 * - Überschreiben durch Prozess-Env-Variablen
 *
 * Kontext:
 * Zentrale Env-Drehscheibe für Backend-Services.
 */

const ORIGINAL_ENV = { ...process.env }

function freshEnv (envPatch = {}, { unsetKeys = [] } = {}) {
  process.env = { ...ORIGINAL_ENV }
  unsetKeys.forEach((key) => {
    delete process.env[key]
  })
  Object.entries(envPatch).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  })
  const key = require.resolve('@env')
  delete require.cache[key]
  // @env exportiert { env }
  return require('@env').env
}

describe('backend env defaults', () => {
  beforeAll(() => {
    // sicherstellen, dass ursprüngliche env-Werte gesichert sind
    Object.assign(ORIGINAL_ENV, process.env)
  })

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('liefert sinnvolle Defaults für Bluesky und Mastodon, wenn nichts gesetzt ist', () => {
    const env = freshEnv({}, {
      unsetKeys: [
        'BLUESKY_SERVER_URL',
        'BLUESKY_IDENTIFIER',
        'BLUESKY_APP_PASSWORD',
        'MASTODON_API_URL',
        'MASTODON_ACCESS_TOKEN'
      ]
    })

    expect(env.bluesky.serverUrl).toBe('https://bsky.social')
    expect(env.bluesky.identifier).toBeTypeOf('string')
    expect(env.bluesky.appPassword).toBeTypeOf('string')

    expect(env.mastodon.apiUrl).toBe('https://mastodon.social')
    expect(env.mastodon.accessToken).toBeTypeOf('string')
  })

  it('übernimmt explizite ENV-Overrides für Plattform-Config', () => {
    const env = freshEnv({
      BLUESKY_SERVER_URL: 'https://example.bsky',
      BLUESKY_IDENTIFIER: 'user@example',
      BLUESKY_APP_PASSWORD: 'secret',
      MASTODON_API_URL: 'https://masto.example',
      MASTODON_ACCESS_TOKEN: 'token-123'
    })

    expect(env.bluesky.serverUrl).toBe('https://example.bsky')
    expect(env.bluesky.identifier).toBe('user@example')
    expect(env.bluesky.appPassword).toBe('secret')

    expect(env.mastodon.apiUrl).toBe('https://masto.example')
    expect(env.mastodon.accessToken).toBe('token-123')
  })

  it('setzt Logging-Defaults und normalisiert Level/Target', () => {
    const envOverride = freshEnv({
      LOG_LEVEL: 'DEBUG',
      LOG_TARGET: 'FILE',
      LOG_FILE: '/tmp/app.log',
      ENGAGEMENT_DEBUG: '1'
    })

    expect(envOverride.logging.level).toBe('debug')
    expect(envOverride.logging.target).toBe('file')
    expect(envOverride.logging.file).toBe('/tmp/app.log')
    expect(envOverride.logging.engagementDebug).toBe(true)
  })

  it('verwendet TIME_ZONE Default und ENV-Override', () => {
    const envDefault = freshEnv({}, { unsetKeys: ['TIME_ZONE'] })
    expect(envDefault.timeZone).toBe('Europe/Berlin')

    const envOverride = freshEnv({ TIME_ZONE: 'UTC' })
    expect(envOverride.timeZone).toBe('UTC')
  })
})
