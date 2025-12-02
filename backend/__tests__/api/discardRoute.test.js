import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Testgruppe: discardRoute.test.js
 *
 * Diese Tests überprüfen:
 * - Das Verhalten von POST /pending-skeets/:id/discard
 * - Erfolgreiche Responses für einmalige Pending-Skeets (Status → skipped)
 * - Erfolgsfälle für wiederkehrende Pending-Skeets (Weiterführung des Schedules)
 * - Fehlerausgaben, wenn kein neuer Termin berechnet werden kann
 *
 * Dies ist ein Teil der Pending-Skeet-Logik. Die Tests stellen sicher, dass
 * Statusübergänge, Terminberechnung und API-Verhalten stabil bleiben.
 */

const pendingController = require('@api/controllers/pendingSkeetController')
const skeetService = require('@core/services/skeetService')

describe('pending skeet API: POST /api/pending-skeets/:id/discard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('discards one-shot pending skeet via API', async () => {
    const skeet = {
      id: 321,
      content: 'Discard me',
      status: 'skipped',
      repeat: 'none',
      scheduledAt: null,
      postedAt: null,
      pendingReason: 'discarded_by_user',
    }
    vi.spyOn(skeetService, 'discardPendingSkeet').mockResolvedValue(skeet)

    const req = { params: { id: String(skeet.id) } }
    let payload = null
    let statusCode = 200
    const res = {
      json: (obj) => { payload = obj },
      status: (code) => {
        statusCode = code
        return { json: (obj) => { payload = obj } }
      },
    }

    await pendingController.discard(req, res)

    expect(statusCode).toBe(200)
    expect(payload.status).toBe('skipped')
    expect(payload.pendingReason).toBe('discarded_by_user')
    expect(payload.scheduledAt).toBeNull()
    expect(payload.postedAt).toBeNull()
    expect(skeetService.discardPendingSkeet).toHaveBeenCalledWith(String(skeet.id))
  })

  it('discards recurring pending skeet via API and reschedules it', async () => {
    const lastPost = new Date(Date.UTC(2024, 11, 31, 6, 0, 0))
    const nextAt = new Date(Date.UTC(2025, 0, 3, 6, 0, 0))
    const skeet = {
      id: 777,
      content: 'Recurring',
      status: 'scheduled',
      repeat: 'daily',
      scheduledAt: nextAt,
      postedAt: lastPost,
      pendingReason: null,
    }
    vi.spyOn(skeetService, 'discardPendingSkeet').mockResolvedValue(skeet)

    const req = { params: { id: String(skeet.id) } }
    let payload = null
    let statusCode = 200
    const res = {
      json: (obj) => { payload = obj },
      status: (code) => {
        statusCode = code
        return { json: (obj) => { payload = obj } }
      },
    }

    await pendingController.discard(req, res)

    expect(statusCode).toBe(200)
    expect(payload.status).toBe('scheduled')
    expect(payload.pendingReason).toBeNull()
    expect(new Date(payload.scheduledAt).getTime()).toBe(nextAt.getTime())
    expect(new Date(payload.postedAt).getTime()).toBe(lastPost.getTime())
  })

  it('returns 400 when next scheduled date cannot be determined', async () => {
    const err = new Error('Konnte den nächsten Wiederholungstermin nicht bestimmen.')
    err.status = 400
    vi.spyOn(skeetService, 'discardPendingSkeet').mockRejectedValue(err)

    const req = { params: { id: '888' } }
    let payload = null
    let statusCode = 200
    const res = {
      json: (obj) => { payload = obj },
      status: (code) => {
        statusCode = code
        return { json: (obj) => { payload = obj } }
      },
    }

    await pendingController.discard(req, res)

    expect(statusCode).toBe(400)
    expect(String(payload?.error || '').toLowerCase()).toContain('wiederholungstermin')
  })
})

