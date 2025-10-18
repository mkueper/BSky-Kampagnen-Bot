import { describe, it, expect } from 'vitest'

function freshConfig (env) {
  if (env) process.env = { ...process.env, ...env }
  const key = require.resolve('@config')
  delete require.cache[key]
  return require('@config')
}

describe('backend config CLIENT_CONFIG defaults', () => {
  it('exposes increased polling fallback defaults', () => {
    const cfg = freshConfig()
    expect(cfg.CLIENT_CONFIG.polling.threads.activeMs).toBeGreaterThanOrEqual(30000)
    expect(cfg.CLIENT_CONFIG.polling.skeets.hiddenMs).toBeGreaterThanOrEqual(300000)
    expect(cfg.CLIENT_CONFIG.polling.jitterRatio).toBeGreaterThanOrEqual(0.2)
  })

  it('allows server env overrides without rebuild', () => {
    const cfg = freshConfig({ THREAD_POLL_ACTIVE_MS: '12345', SKEET_POLL_HIDDEN_MS: '543210' })
    expect(cfg.CLIENT_CONFIG.polling.threads.activeMs).toBe(12345)
    expect(cfg.CLIENT_CONFIG.polling.skeets.hiddenMs).toBe(543210)
  })
})
