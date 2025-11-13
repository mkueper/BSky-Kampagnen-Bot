import { describe, it, expect } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

function freshConfig (env = {}, { unsetKeys = [] } = {}) {
  process.env = { ...ORIGINAL_ENV }
  unsetKeys.forEach((key) => {
    delete process.env[key]
  })
  if (env && typeof env === 'object') {
    Object.entries(env).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    })
  }
  const key = require.resolve('@config')
  delete require.cache[key]
  return require('@config')
}

describe('backend config CLIENT_CONFIG defaults', () => {
  it('exposes increased polling fallback defaults', () => {
    const cfg = freshConfig({}, {
      unsetKeys: [
        'THREAD_POLL_ACTIVE_MS',
        'VITE_THREAD_POLL_ACTIVE_MS',
        'THREAD_POLL_HIDDEN_MS',
        'VITE_THREAD_POLL_HIDDEN_MS',
        'POLL_JITTER_RATIO',
        'VITE_POLL_JITTER_RATIO'
      ]
    })
    expect(cfg.CLIENT_CONFIG.polling.threads.activeMs).toBeGreaterThanOrEqual(8000)
    expect(cfg.CLIENT_CONFIG.polling.skeets.hiddenMs).toBeGreaterThanOrEqual(180000)
    expect(cfg.CLIENT_CONFIG.polling.jitterRatio).toBeGreaterThanOrEqual(0.15)
  })

  it('allows server env overrides without rebuild', () => {
    const cfg = freshConfig({ THREAD_POLL_ACTIVE_MS: '12345', SKEET_POLL_HIDDEN_MS: '543210' })
    expect(cfg.CLIENT_CONFIG.polling.threads.activeMs).toBe(12345)
    expect(cfg.CLIENT_CONFIG.polling.skeets.hiddenMs).toBe(543210)
  })
})
