import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

function loadThreadController () {
  const key = require.resolve('@api/controllers/threadController')
  delete require.cache[key]
  return require('@api/controllers/threadController')
}
function loadSkeetController () {
  const key = require.resolve('@api/controllers/skeetController')
  delete require.cache[key]
  return require('@api/controllers/skeetController')
}

describe('publish-now API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('threads: publishNow returns thread JSON on success', async () => {
    const scheduler = require('@core/services/scheduler')
    vi.spyOn(scheduler, 'publishThreadNow').mockResolvedValue(123)
    const threadService = require('@core/services/threadService')
    vi.spyOn(threadService, 'getThread').mockResolvedValue({ id: 123, status: 'published' })

    const req = { params: { id: '123' } }
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    const controller = loadThreadController()
    await controller.publishNow(req, res)
    expect(payload?.id).toBe(123)
    expect(payload?.status).toBe('published')
  })

  it('threads: publishNow passes through error status', async () => {
    const scheduler = require('@core/services/scheduler')
    const err = new Error('Thread nicht gefunden.'); err.status = 404
    vi.spyOn(scheduler, 'publishThreadNow').mockRejectedValue(err)
    const req = { params: { id: '999' } }
    let statusCode = 200; let payload = null
    const res = { status: (c) => { statusCode = c; return { json: (o) => { payload = o } } }, json: (o) => { payload = o } }
    const controller = loadThreadController()
    await controller.publishNow(req, res)
    expect(statusCode).toBe(404)
    expect(String(payload?.error || '')).toMatch(/Thread/i)
  })

  it('skeets: publishNow returns skeet JSON', async () => {
    const scheduler = require('@core/services/scheduler')
    vi.spyOn(scheduler, 'publishSkeetNow').mockResolvedValue(77)
    const models = require('@data/models')
    vi.spyOn(models.Skeet, 'findByPk').mockResolvedValue({ toJSON: () => ({ id: 77, isThreadPost: false }) })

    const req = { params: { id: '77' } }
    let payload = null
    const res = { json: (o) => { payload = o }, status: (c) => ({ json: (o) => { payload = { code: c, ...o } } }) }
    const controller = loadSkeetController()
    await controller.publishNow(req, res)
    expect(payload?.id).toBe(77)
  })
})

