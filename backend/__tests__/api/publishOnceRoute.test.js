import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Testgruppe: publishOnceRoute.test.js
 *
 * Diese Tests überprüfen:
 * - Das Verhalten des Controllers POST /pending-skeets/:id/publish-once
 * - Erfolgreiche Antworten für einmalige und wiederkehrende Pending-Skeets
 * - Fehlercodes bei nicht gefundenen oder falsch klassifizierten Skeets
 * - Fehlerweitergabe bei Problemen im Service (z. B. Posting-Fehler)
 *
 * Dies ist ein Teil der Pending-Skeet-Logik. Die Tests stellen sicher, dass
 * Statusübergänge, Terminberechnung und API-Verhalten stabil bleiben.
 */

const pendingController = require('@api/controllers/pendingSkeetController')
const skeetService = require('@core/services/skeetService')

describe('pending skeet API: POST /api/pending-skeets/:id/publish-once', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('publishes one-shot pending skeet via API', async () => {
    const fixedNow = new Date(Date.UTC(2025, 0, 2, 12, 0, 0))
    const skeet = {
      id: 123,
      status: 'sent',
      scheduledAt: null,
      pendingReason: null,
      postedAt: fixedNow,
    }
    vi.spyOn(skeetService, 'publishPendingSkeetOnce').mockResolvedValue(skeet)

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

    await pendingController.publishOnce(req, res)

    expect(statusCode).toBe(200)
    expect(payload.status).toBe('sent')
    expect(payload.scheduledAt).toBeNull()
    expect(payload.pendingReason).toBeNull()
    expect(new Date(payload.postedAt).getTime()).toBe(fixedNow.getTime())
    expect(skeetService.publishPendingSkeetOnce).toHaveBeenCalledWith(String(skeet.id))
  })

  it('publishes recurring pending skeet via API and keeps it scheduled', async () => {
    const fixedNow = new Date(Date.UTC(2025, 0, 2, 12, 0, 0))
    const nextAt = new Date(Date.UTC(2025, 0, 3, 6, 0, 0))
    const skeet = {
      id: 456,
      status: 'scheduled',
      repeat: 'daily',
      scheduledAt: nextAt,
      postedAt: fixedNow,
      pendingReason: null,
    }
    vi.spyOn(skeetService, 'publishPendingSkeetOnce').mockResolvedValue(skeet)

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

    await pendingController.publishOnce(req, res)

    expect(statusCode).toBe(200)
    expect(payload.status).toBe('scheduled')
    expect(payload.pendingReason).toBeNull()
    expect(new Date(payload.postedAt).getTime()).toBe(fixedNow.getTime())
    expect(new Date(payload.scheduledAt).getTime()).toBe(nextAt.getTime())
  })

  it('returns 404 when skeet does not exist', async () => {
    const err = new Error('Skeet nicht gefunden.')
    err.status = 404
    vi.spyOn(skeetService, 'publishPendingSkeetOnce').mockRejectedValue(err)

    const req = { params: { id: '999999' } }
    let payload = null
    let statusCode = 200
    const res = {
      json: (obj) => { payload = obj },
      status: (code) => {
        statusCode = code
        return { json: (obj) => { payload = obj } }
      },
    }

    await pendingController.publishOnce(req, res)

    expect(statusCode).toBe(404)
    expect(String(payload?.error || '').toLowerCase()).toContain('nicht gefunden')
  })

  it('returns 400 when skeet is not pending_manual', async () => {
    const err = new Error('Skeet ist nicht im Status pending_manual.')
    err.status = 400
    vi.spyOn(skeetService, 'publishPendingSkeetOnce').mockRejectedValue(err)

    const req = { params: { id: '123' } }
    let payload = null
    let statusCode = 200
    const res = {
      json: (obj) => { payload = obj },
      status: (code) => {
        statusCode = code
        return { json: (obj) => { payload = obj } }
      },
    }

    await pendingController.publishOnce(req, res)

    expect(statusCode).toBe(400)
    expect(String(payload?.error || '').toLowerCase()).toContain('pending_manual')
  })

  it('returns 500 on posting errors from scheduler', async () => {
    const err = new Error('Posting failed (API)')
    vi.spyOn(skeetService, 'publishPendingSkeetOnce').mockRejectedValue(err)

    const req = { params: { id: '999' } }
    let payload = null
    let statusCode = 200
    const res = {
      json: (obj) => { payload = obj },
      status: (code) => {
        statusCode = code
        return { json: (obj) => { payload = obj } }
      },
    }

    await pendingController.publishOnce(req, res)

    expect(statusCode).toBeGreaterThanOrEqual(400)
    expect(String(payload?.error || '').toLowerCase()).not.toHaveLength(0)
  })
})

