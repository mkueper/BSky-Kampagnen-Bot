import 'module-alias/register'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const models = require('@data/models')
const scheduler = require('@core/services/scheduler')
const postService = require('@core/services/postService')

describe('PostSendLogs (scheduler)', () => {
  beforeEach(async () => {
    await models.PostSendLog.destroy({ where: {}, force: true })
    await models.Skeet.destroy({ where: {}, force: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('erstellt einen Erfolgs-Logeintrag bei erfolgreichem Send', async () => {
    const sendPostSpy = vi.spyOn(postService, 'sendPost').mockResolvedValue({
      ok: true,
      uri: 'at://did:example/post/1',
      postedAt: new Date().toISOString()
    })

    const skeet = await models.Skeet.create({
      content: 'Test',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: new Date(Date.now() - 1000),
      targetPlatforms: ['bluesky']
    })

    await scheduler.publishSkeetNow(skeet.id)

    const logs = await models.PostSendLog.findAll({
      where: { skeetId: skeet.id }
    })
    expect(logs).toHaveLength(1)
    expect(logs[0].status).toBe('success')
    expect(logs[0].platform).toBe('bluesky')
    expect(logs[0].skeetId).toBe(skeet.id)
  })

  // it('erstellt einen Fehler-Logeintrag bei fehlgeschlagenem Send', async () => {
  //   const sendPostSpy = vi
  //     .spyOn(postService, 'sendPost')
  //     .mockRejectedValue(new Error('kaputt'))
  //
  //   const skeet = await models.Skeet.create({
  //     content: 'Fail',
  //     status: 'scheduled',
  //     repeat: 'none',
  //     scheduledAt: new Date(Date.now() - 1000),
  //     targetPlatforms: ['bluesky']
  //   })
  //
  //   await scheduler.publishSkeetNow(skeet.id)
  //
  //   const logs = await models.PostSendLog.findAll({
  //     where: { skeetId: skeet.id }
  //   })
  //   expect(logs).toHaveLength(1)
  //   expect(logs[0].status).toBe('failed')
  //   expect(logs[0].platform).toBe('bluesky')
  //   expect(logs[0].skeetId).toBe(skeet.id)
  // })
})
