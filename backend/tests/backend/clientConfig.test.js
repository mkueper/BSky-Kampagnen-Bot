import 'module-alias/register'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// mock dependencies BEFORE importing the module under test
vi.mock('@core/services/settingsService', () => {
  return {
    default: {},
    getClientPollingSettings: vi.fn(async () => ({
      values: {
        threadActiveMs: 30000,
        threadIdleMs: 120000,
        threadHiddenMs: 300000,
        threadMinimalHidden: false,
        skeetActiveMs: 30000,
        skeetIdleMs: 120000,
        skeetHiddenMs: 300000,
        skeetMinimalHidden: false,
        backoffStartMs: 10000,
        backoffMaxMs: 300000,
        jitterRatio: 0.15,
        heartbeatMs: 2000,
      }
    }))
  }
})

const { getClientConfig } = require('@api/controllers/configController')

describe('getClientConfig', () => {
  const prevEnv = { ...process.env }
  beforeEach(() => {
    delete process.env.BLUESKY_IDENTIFIER
    delete process.env.BLUESKY_APP_PASSWORD
  })
  afterEach(() => {
    process.env = { ...prevEnv }
  })

  it('returns polling defaults and needsCredentials=true when creds missing', async () => {
    const req = { }
    let payload = null
    const res = {
      json: (obj) => { payload = obj },
      status: () => ({ json: (obj) => { payload = obj } })
    }
    await getClientConfig(req, res)
    expect(payload).toBeTruthy()
    expect(payload.polling.threads.activeMs).toBe(8000)
    expect(payload.polling.skeets.hiddenMs).toBe(300000)
    expect(payload.polling.jitterRatio).toBe(0.15)
    expect(payload.needsCredentials).toBe(true)
  })

  it('needsCredentials=false when BLUESKY creds are present', async () => {
    process.env.BLUESKY_IDENTIFIER = 'user@example'
    process.env.BLUESKY_APP_PASSWORD = 'apppass'
    const req = {}
    let payload = null
    const res = { json: (obj) => { payload = obj }, status: () => ({ json: (o) => { payload = o } }) }
    await getClientConfig(req, res)
    expect(payload.needsCredentials).toBe(false)
  })
})
