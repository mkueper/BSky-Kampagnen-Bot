import 'module-alias/register'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import Module from 'module'

/**
 * Testgruppe: startupPendingScan.test.js
 *
 * Diese Tests überprüfen:
 * - Den Startup-Scan des Schedulers (markMissedSkeetsPending)
 * - Statuswechsel von überfälligen Skeets zu pending_manual
 * - Ignorieren tolerierbarer oder bereits pending_manual Skeets
 * - Umgang mit wiederkehrenden Skeets und Soft-Deletes
 * - Datumskonstanz über gemockte Uhrzeiten (Date.now)
 *
 * Dies ist ein Teil der Pending-Skeet-Logik. Die Tests stellen sicher, dass
 * Statusübergänge, Terminberechnung und API-Verhalten stabil bleiben.
 */

const models = require('@data/models')
const originalBulkUpdate = models.Skeet.update.bind(models.Skeet)

function loadSchedulerWithStartupScan() {
  const schedulerPath = require.resolve('@core/services/scheduler')
  delete require.cache[schedulerPath]
  const source = fs.readFileSync(schedulerPath, 'utf8')
  const instrumented = `${source}\nmodule.exports._markMissedSkeetsPending = markMissedSkeetsPending;`
  const mod = new Module(schedulerPath, module)
  mod.filename = schedulerPath
  mod.paths = Module._nodeModulePaths(path.dirname(schedulerPath))
  mod._compile(instrumented, schedulerPath)
  require.cache[schedulerPath] = mod
  return mod.exports
}

describe('scheduler startup pending scan', () => {
  const FIXED_NOW = new Date(Date.UTC(2025, 0, 10, 12, 0, 0))
  const schedulerPath = require.resolve('@core/services/scheduler')
  let markMissedSkeetsPending
  const graceMs = Number(process.env.SCHEDULER_GRACE_WINDOW_MINUTES || 10) * 60 * 1000

  beforeAll(async () => {
    const scheduler = loadSchedulerWithStartupScan()
    markMissedSkeetsPending = scheduler._markMissedSkeetsPending
  })

  afterAll(() => {
    delete require.cache[schedulerPath]
    require('@core/services/scheduler')
  })

  const runScan = () => markMissedSkeetsPending(FIXED_NOW)

  beforeEach(async () => {
    await models.Skeet.destroy({ where: {}, force: true })
    vi.spyOn(models.Skeet, 'update').mockImplementation((values, options = {}) =>
      originalBulkUpdate(values, { ...options, validate: false })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('marks overdue one-shot skeets as pending_manual', async () => {
    const overdue = new Date(FIXED_NOW.getTime() - graceMs - 60 * 1000)
    const skeet = await models.Skeet.create({
      content: 'overdue',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: overdue,
    })

    await runScan()

    const reloaded = await models.Skeet.findByPk(skeet.id)
    expect(reloaded.status).toBe('pending_manual')
    expect(reloaded.pendingReason).toBe('missed_while_offline')
  })

  it('leaves recent skeets untouched within grace window', async () => {
    const tolerable = new Date(FIXED_NOW.getTime() - Math.floor(graceMs / 2))
    const skeet = await models.Skeet.create({
      content: 'tolerable',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: tolerable,
    })

    await runScan()

    const reloaded = await models.Skeet.findByPk(skeet.id)
    expect(reloaded.status).toBe('scheduled')
    expect(reloaded.pendingReason).toBeNull()
  })

  it('marks overdue recurring skeets as pending_manual', async () => {
    const overdue = new Date(FIXED_NOW.getTime() - graceMs - 120 * 1000)
    const skeet = await models.Skeet.create({
      content: 'recurring',
      status: 'scheduled',
      repeat: 'daily',
      scheduledAt: overdue,
    })

    await runScan()

    const reloaded = await models.Skeet.findByPk(skeet.id)
    expect(reloaded.status).toBe('pending_manual')
    expect(reloaded.pendingReason).toBe('missed_while_offline')
  })

  it('keeps already pending_manual skeets unchanged', async () => {
    const skeet = await models.Skeet.create({
      content: 'already pending',
      status: 'pending_manual',
      repeat: 'none',
      scheduledAt: new Date(FIXED_NOW.getTime() - graceMs - 1000),
      pendingReason: 'custom_reason',
    })

    await runScan()

    const reloaded = await models.Skeet.findByPk(skeet.id)
    expect(reloaded.status).toBe('pending_manual')
    expect(reloaded.pendingReason).toBe('custom_reason')
  })

  it('ignores soft deleted skeets', async () => {
    const overdue = new Date(FIXED_NOW.getTime() - graceMs - 60 * 1000)
    const skeet = await models.Skeet.create({
      content: 'deleted',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: overdue,
      deletedAt: new Date(),
    })

    await runScan()

    const reloaded = await models.Skeet.findByPk(skeet.id, { paranoid: false })
    expect(reloaded.status).toBe('scheduled')
    expect(reloaded.pendingReason).toBeNull()
  })
})
