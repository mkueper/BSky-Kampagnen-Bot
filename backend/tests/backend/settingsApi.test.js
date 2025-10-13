import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

function loadController () {
  const key = require.resolve('@api/controllers/settingsController')
  delete require.cache[key]
  // eslint-disable-next-line import/no-commonjs
  return require('@api/controllers/settingsController')
}

describe('settingsController API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/settings/scheduler returns values and defaults', async () => {
    const svc = require('@core/services/settingsService')
    vi.spyOn(svc, 'getSchedulerSettings').mockResolvedValue({
      values: { scheduleTime: '* * * * *', timeZone: 'Europe/Berlin', postRetries: 3, postBackoffMs: 500, postBackoffMaxMs: 4000 },
      defaults: { scheduleTime: '* * * * *', timeZone: 'Europe/Berlin', postRetries: 3, postBackoffMs: 500, postBackoffMaxMs: 4000 }
    })
    const req = {}
    let sent = null
    const res = { json: (obj) => { sent = obj }, status: () => ({ json: (o) => { sent = o } }) }
    const settingsController = loadController()
    await settingsController.getSchedulerSettings(req, res)
    expect(sent?.values?.timeZone).toBe('Europe/Berlin')
    expect(sent?.defaults?.postRetries).toBe(3)
  })

  it('PUT /api/settings/scheduler with valid payload restarts scheduler', async () => {
    const svc = require('@core/services/settingsService')
    const spy = vi.spyOn(svc, 'saveSchedulerSettings').mockResolvedValue({
      values: { scheduleTime: '* * * * *', timeZone: 'Europe/Berlin', postRetries: 3, postBackoffMs: 500, postBackoffMaxMs: 4000 },
      defaults: { scheduleTime: '* * * * *', timeZone: 'Europe/Berlin', postRetries: 3, postBackoffMs: 500, postBackoffMaxMs: 4000 }
    })
    const scheduler = require('@core/services/scheduler')
    const restartSpy = vi.spyOn(scheduler, 'restartScheduler').mockResolvedValue()
    const req = { body: { scheduleTime: '* * * * *', timeZone: 'Europe/Berlin' } }
    let sent = null
    const res = { json: (obj) => { sent = obj }, status: () => ({ json: (o) => { sent = o } }) }
    const settingsController = loadController()
    await settingsController.updateSchedulerSettings(req, res)
    expect(spy).toHaveBeenCalledOnce()
    expect(restartSpy).toHaveBeenCalledOnce()
    expect(sent?.values?.timeZone).toBe('Europe/Berlin')
  })

  it('PUT /api/settings/scheduler with invalid cron returns 400', async () => {
    const svc = require('@core/services/settingsService')
    const spy = vi.spyOn(svc, 'saveSchedulerSettings').mockRejectedValue(new Error('Ungültiger Cron-Ausdruck'))
    const req = { body: { scheduleTime: 'invalid', timeZone: 'Europe/Berlin' } }
    let statusCode = 200
    let payload = null
    const res = { status: (c) => { statusCode = c; return { json: (o) => { payload = o } } }, json: (o) => { payload = o } }
    const settingsController = loadController()
    await settingsController.updateSchedulerSettings(req, res)
    expect(statusCode).toBe(400)
    expect(String(payload?.error || '')).toMatch(/Cron/i)
    expect(spy).toHaveBeenCalledOnce()
  })
})
