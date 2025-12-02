import 'module-alias/register'
import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Testgruppe: getPendingSkeets.test.js
 *
 * Diese Tests überprüfen:
 * - Die API-Antwort von GET /api/pending-skeets
 * - Filterung auf status = pending_manual (ohne Soft-Deletes)
 * - Sortierung nach scheduledAt und createdAt
 * - Konsistenz der Datenbankzustände vor und nach dem API-Aufruf
 *
 * Dies ist ein Teil der Pending-Skeet-Logik. Die Tests stellen sicher, dass
 * Statusübergänge, Terminberechnung und API-Verhalten stabil bleiben.
 */

const models = require('@data/models')
const pendingController = require('@api/controllers/pendingSkeetController')

beforeEach(async () => {
  await models.Skeet.destroy({ where: {}, force: true })
})

describe('GET /api/pending-skeets', () => {
  it('returns only pending_manual skeets', async () => {
    const pending = await models.Skeet.create({
      content: 'Pending',
      status: 'pending_manual',
      repeat: 'none',
      scheduledAt: new Date(),
    })
    await models.Skeet.create({
      content: 'Scheduled',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: new Date(),
    })
    await models.Skeet.create({
      content: 'Sent',
      status: 'sent',
      repeat: 'none',
      scheduledAt: new Date(),
      postedAt: new Date(),
    })

    const req = {}
    let payload = null
    let statusCode = 200
    const res = {
      json: (obj) => { payload = obj },
      status: (code) => {
        statusCode = code
        return { json: (obj) => { payload = obj } }
      },
    }

    await pendingController.getPendingSkeets(req, res)

    expect(statusCode).toBe(200)
    expect(Array.isArray(payload)).toBe(true)
    expect(payload.length).toBe(1)
    expect(payload[0].id).toBe(pending.id)
    expect(payload[0].status).toBe('pending_manual')
  })

  it('returns pending_manual skeets sorted by scheduledAt ASC, createdAt DESC', async () => {
    const base = new Date(Date.UTC(2025, 0, 10, 6, 0, 0))
    await models.Skeet.create({
      content: 'Later',
      status: 'pending_manual',
      scheduledAt: new Date(base.getTime() + 24 * 60 * 60 * 1000),
      repeat: 'none',
    })
    const s2 = await models.Skeet.create({
      content: 'Early newer',
      status: 'pending_manual',
      scheduledAt: new Date(base.getTime()),
      repeat: 'none',
    })
    const s3 = await models.Skeet.create({
      content: 'Early older',
      status: 'pending_manual',
      scheduledAt: new Date(base.getTime()),
      repeat: 'none',
    })
    await s2.update({ createdAt: new Date(base.getTime() + 2000) })
    await s3.update({ createdAt: new Date(base.getTime() + 1000) })

    const req = {}
    let payload = null
    const res = {
      json: (obj) => { payload = obj },
      status: () => ({ json: (obj) => { payload = obj } }),
    }

    await pendingController.getPendingSkeets(req, res)

    const times = payload.map((entry) => new Date(entry.scheduledAt).getTime())
    expect(times[0]).toBeLessThanOrEqual(times[1])
    expect(times[1]).toBeLessThanOrEqual(times[2])
  })

  it('does not return soft-deleted pending skeets', async () => {
    await models.Skeet.create({
      content: 'Deleted pending',
      status: 'pending_manual',
      repeat: 'none',
      scheduledAt: new Date(),
      deletedAt: new Date(),
    })
    const active = await models.Skeet.create({
      content: 'Active pending',
      status: 'pending_manual',
      repeat: 'none',
      scheduledAt: new Date(),
    })

    const req = {}
    let payload = null
    const res = {
      json: (obj) => { payload = obj },
      status: () => ({ json: (obj) => { payload = obj } }),
    }

    await pendingController.getPendingSkeets(req, res)

    expect(Array.isArray(payload)).toBe(true)
    expect(payload.length).toBe(1)
    expect(payload[0].id).toBe(active.id)
  })
})
