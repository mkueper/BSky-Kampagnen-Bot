import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const settingsController = require('@api/controllers/settingsController')

describe('settingsController client-polling API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET /api/settings/client-polling returns values/defaults', async () => {
    const svc = require('@core/services/settingsService')
    vi.spyOn(svc, 'getClientPollingSettings').mockResolvedValue({
      values: { threadActiveMs: 30000, skeetHiddenMs: 300000 },
      defaults: { threadActiveMs: 30000, skeetHiddenMs: 300000 }
    })
    const req = {}
    let payload = null
    const res = { json: (o) => { payload = o }, status: () => ({ json: (o) => { payload = o } }) }
    await settingsController.getClientPollingSettings(req, res)
    expect(payload?.values?.threadActiveMs).toBe(30000)
    expect(payload?.defaults?.skeetHiddenMs).toBe(300000)
  })

  it('PUT /api/settings/client-polling saves and returns values', async () => {
    const svc = require('@core/services/settingsService')
    const spy = vi.spyOn(svc, 'saveClientPollingSettings').mockResolvedValue({
      values: { threadActiveMs: 11111, skeetHiddenMs: 22222, jitterRatio: 0.3, heartbeatMs: 1234 },
      defaults: {}
    })
    const req = { body: { threadActiveMs: 11111, skeetHiddenMs: 22222, jitterRatio: 0.3, heartbeatMs: 1234 } }
    let payload = null
    const res = { json: (o) => { payload = o }, status: () => ({ json: (o) => { payload = o } }) }
    await settingsController.updateClientPollingSettings(req, res)
    expect(payload?.values?.threadActiveMs).toBe(11111)
    expect(payload?.values?.jitterRatio).toBe(0.3)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('PUT /api/settings/client-polling invalid jitter returns 400', async () => {
    const svc = require('@core/services/settingsService')
    const spy = vi.spyOn(svc, 'saveClientPollingSettings').mockRejectedValue(new Error('POLL_JITTER_RATIO muss zwischen 0 und 1 liegen.'))
    const req = { body: { jitterRatio: 2 } }
    let statusCode = 200, payload = null
    const res = { status: (c) => { statusCode = c; return { json: (o) => { payload = o } } }, json: (o) => { payload = o } }
    await settingsController.updateClientPollingSettings(req, res)
    expect(statusCode).toBe(400)
    expect(payload?.error).toBe('SETTINGS_POLLING_INVALID_JITTER')
    expect(String(payload?.message || '')).toMatch(/zwischen 0 und 1/i)
    expect(spy).toHaveBeenCalledOnce()
  })
})
