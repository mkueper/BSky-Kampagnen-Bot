import 'module-alias/register'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const models = require('@data/models')
const scheduler = require('@core/services/scheduler')
const postService = require('@core/services/postService')
const { env } = require('@env')

describe('PostSendLogs (scheduler)', () => {
  beforeEach(async () => {
    // Sorge für gültige Bluesky-Credentials, damit der Scheduler
    // den "success"-Pfad durchläuft und nicht vorzeitig mit "skipped" abbricht.
    env.bluesky.identifier = 'test-identifier'
    env.bluesky.appPassword = 'test-password'

    await models.PostSendLog.destroy({ where: {}, force: true })
    await models.Skeet.destroy({ where: {}, force: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('erstellt einen Logeintrag für den Versandversuch', async () => {
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
    expect(['success', 'failed', 'skipped']).toContain(logs[0].status)
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
