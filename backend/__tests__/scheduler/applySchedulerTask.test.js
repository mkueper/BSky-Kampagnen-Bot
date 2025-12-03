import 'module-alias/register'
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import Module from 'module'

/**
 * Testgruppe: applySchedulerTask.test.js
 *
 * Diese Tests überprüfen:
 * - Verwendung der gespeicherten Scheduler-Settings (Cron-Ausdruck, Zeitzone)
 * - Verkabelung des Cron-Ticks mit Engagement-Refresh
 * - Fehlerverhalten bei ungültigem Cron-Ausdruck
 *
 * Vorgehen:
 * Wir laden `scheduler.js` über ein instrumentiertes Modul, das
 * - `node-cron`, `settingsService`, `threadEngagementService`,
 *   `presenceService` und `@config` mit Test-Doubles ersetzt und
 * - `applySchedulerTask` als `_applySchedulerTask` exportiert.
 */

function loadSchedulerForCronTest ({
  scheduleTime = '*/5 * * * *',
  timeZone = 'UTC',
  discardMode = false,
  cronValid = true
} = {}) {
  const schedulerPath = require.resolve('@core/services/scheduler')
  const cronPath = require.resolve('node-cron')
  const settingsPath = require.resolve('@core/services/settingsService')
  const engagementPath = require.resolve('@core/services/threadEngagementService')
  const presencePath = require.resolve('@core/services/presenceService')
  const configPath = require.resolve('@config')

  const cronValidate = vi.fn(() => cronValid)
  const cronSchedule = vi.fn((expr, fn, options) => ({
    start: vi.fn(),
    stop: vi.fn(),
    _expr: expr,
    _fn: fn,
    _options: options
  }))

  const getSchedulerSettings = vi.fn(async () => ({
    values: { scheduleTime, timeZone }
  }))
  const refreshPublishedThreadsBatch = vi.fn(async () => {})
  const getLastSeen = vi.fn(() => Date.now())

  // Fake-Module in den require-Cache eintragen
  require.cache[cronPath] = {
    id: cronPath,
    filename: cronPath,
    loaded: true,
    exports: { validate: cronValidate, schedule: cronSchedule }
  }
  require.cache[settingsPath] = {
    id: settingsPath,
    filename: settingsPath,
    loaded: true,
    exports: { getSchedulerSettings }
  }
  require.cache[engagementPath] = {
    id: engagementPath,
    filename: engagementPath,
    loaded: true,
    exports: { refreshPublishedThreadsBatch }
  }
  require.cache[presencePath] = {
    id: presencePath,
    filename: presencePath,
    loaded: true,
    exports: { getLastSeen }
  }
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      SCHEDULE_TIME: '*/10 * * * *',
      TIME_ZONE: 'Europe/Berlin',
      ENGAGEMENT_ACTIVE_MIN_MS: 1000,
      ENGAGEMENT_IDLE_MIN_MS: 2000,
      CLIENT_IDLE_THRESHOLD_MS: 60000,
      DISCARD_MODE: discardMode
    }
  }

  // Scheduler-Quelle einlesen und applySchedulerTask exportieren
  const source = fs.readFileSync(schedulerPath, 'utf8')
  const instrumented = `${source}\nmodule.exports._applySchedulerTask = applySchedulerTask;`
  const mod = new Module(schedulerPath, module)
  mod.filename = schedulerPath
  mod.paths = Module._nodeModulePaths(path.dirname(schedulerPath))
  mod._compile(instrumented, schedulerPath)
  require.cache[schedulerPath] = mod

  return {
    scheduler: mod.exports,
    cronValidate,
    cronSchedule,
    getSchedulerSettings,
    refreshPublishedThreadsBatch,
    getLastSeen
  }
}

describe('Scheduler Cron-Verkabelung (applySchedulerTask)', () => {
  it('nutzt Scheduler-Settings und verdrahtet Cron mit Callback, der Engagement-Refresh auslöst', async () => {
    const {
      scheduler,
      cronValidate,
      cronSchedule,
      getSchedulerSettings,
      refreshPublishedThreadsBatch,
      getLastSeen
    } = loadSchedulerForCronTest()

    await scheduler._applySchedulerTask()

    expect(getSchedulerSettings).toHaveBeenCalled()
    expect(cronValidate).toHaveBeenCalledWith('*/5 * * * *')
    expect(cronSchedule).toHaveBeenCalledTimes(1)

    const [expr, callback, options] = cronSchedule.mock.calls[0]
    expect(expr).toBe('*/5 * * * *')
    expect(options).toMatchObject({ timezone: 'UTC' })

    // Cron-Tick simulieren
    callback()

    expect(getLastSeen).toHaveBeenCalled()
    expect(refreshPublishedThreadsBatch).toHaveBeenCalledWith(3)
  })

  it('wirft bei ungültigem Cron-Ausdruck einen Fehler', async () => {
    const {
      scheduler
    } = loadSchedulerForCronTest({ scheduleTime: 'invalid-cron', cronValid: false })

    await expect(scheduler._applySchedulerTask()).rejects.toThrow(/Ungültiger Cron-Ausdruck/i)
  })

  it('führt keinen Engagement-Refresh aus, wenn DISCARD_MODE aktiv ist', async () => {
    const {
      scheduler,
      cronSchedule,
      refreshPublishedThreadsBatch
    } = loadSchedulerForCronTest({ discardMode: true })

    await scheduler._applySchedulerTask()

    const [, callback] = cronSchedule.mock.calls[0]
    callback()

    expect(refreshPublishedThreadsBatch).not.toHaveBeenCalled()
  })
})

