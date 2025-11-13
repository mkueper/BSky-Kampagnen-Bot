import 'module-alias/register'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const config = require('@config')
const basePolling = config?.CLIENT_CONFIG?.polling

const basePollingValues = {
  threadActiveMs: basePolling?.threads?.activeMs,
  threadIdleMs: basePolling?.threads?.idleMs,
  threadHiddenMs: basePolling?.threads?.hiddenMs,
  threadMinimalHidden: basePolling?.threads?.minimalHidden,
  skeetActiveMs: basePolling?.skeets?.activeMs,
  skeetIdleMs: basePolling?.skeets?.idleMs,
  skeetHiddenMs: basePolling?.skeets?.hiddenMs,
  skeetMinimalHidden: basePolling?.skeets?.minimalHidden,
  backoffStartMs: basePolling?.backoffStartMs,
  backoffMaxMs: basePolling?.backoffMaxMs,
  jitterRatio: basePolling?.jitterRatio,
  heartbeatMs: basePolling?.heartbeatMs,
}

// mock dependencies BEFORE importing the module under test
vi.mock('@core/services/settingsService', () => {
  return {
    default: {},
    getClientPollingSettings: vi.fn(async () => ({
      values: { ...basePollingValues }
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
    expect(payload.polling.threads.activeMs).toBe(basePollingValues.threadActiveMs)
    expect(payload.polling.skeets.hiddenMs).toBe(basePollingValues.skeetHiddenMs)
    expect(payload.polling.jitterRatio).toBe(basePollingValues.jitterRatio)
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
