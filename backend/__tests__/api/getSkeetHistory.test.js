import 'module-alias/register'
import { describe, it, expect, beforeEach } from 'vitest'

const skeetHistoryController = require('@api/controllers/skeetHistoryController')
const models = require('@data/models')

describe('GET /api/skeets/:id/history (controller)', () => {
  beforeEach(async () => {
    await models.PostSendLog.destroy({ where: {}, force: true })
    await models.Skeet.destroy({ where: {}, force: true })
  })

  it('liefert 200 und Logs als Array', async () => {
    const skeet = await models.Skeet.create({
      content: 'History',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: new Date(),
    })
    await models.PostSendLog.create({
      skeetId: skeet.id,
      platform: 'bluesky',
      status: 'success',
      postedAt: new Date(),
    })
    const req = { params: { id: String(skeet.id) }, query: {} }
    let payload = null
    let statusCode = 200
    const res = {
      status(code) {
        statusCode = code
        return this
      },
      json(obj) {
        payload = obj
        return this
      },
    }

    await skeetHistoryController.getSkeetHistory(req, res)

    expect(statusCode).toBe(200)
    expect(Array.isArray(payload)).toBe(true)
    expect(payload.length).toBe(1)
    expect(payload[0].platform).toBe('bluesky')
  })

  it('liefert 404 wenn Skeet fehlt', async () => {
    const req = { params: { id: '999999' }, query: {} }
    let statusCode = 200
    let payload = null
    const res = {
      status(code) {
        statusCode = code
        return this
      },
      json(obj) {
        payload = obj
        return this
      },
    }

    await skeetHistoryController.getSkeetHistory(req, res)
    expect(statusCode).toBe(404)
    expect(payload?.error).toBeTruthy()
  })

  it('unterstützt limit/offset Parameter', async () => {
    const skeet = await models.Skeet.create({
      content: 'Paginated history',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: new Date(),
    })
    await models.PostSendLog.bulkCreate([
      { skeetId: skeet.id, platform: 'bluesky', status: 'success', postedAt: new Date('2025-01-01T10:00:00Z') },
      { skeetId: skeet.id, platform: 'bluesky', status: 'failed', postedAt: new Date('2025-01-02T10:00:00Z') },
      { skeetId: skeet.id, platform: 'bluesky', status: 'success', postedAt: new Date('2025-01-03T10:00:00Z') },
    ])

    const req = { params: { id: String(skeet.id) }, query: { limit: '1', offset: '1' } }
    let statusCode = 200
    let payload = null
    const res = {
      status(code) {
        statusCode = code
        return this
      },
      json(obj) {
        payload = obj
        return this
      },
    }

    await skeetHistoryController.getSkeetHistory(req, res)
    expect(statusCode).toBe(200)
    expect(payload).toHaveLength(1)
    expect(new Date(payload[0].postedAt)).toEqual(new Date('2025-01-02T10:00:00Z'))
  })
})

