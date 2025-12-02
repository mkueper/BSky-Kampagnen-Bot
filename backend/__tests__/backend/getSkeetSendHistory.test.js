import 'module-alias/register'
import { describe, it, expect, beforeEach } from 'vitest'

const models = require('@data/models')
const skeetService = require('@core/services/skeetService')

describe('getSkeetSendHistory (service)', () => {
  beforeEach(async () => {
    await models.PostSendLog.destroy({ where: {}, force: true })
    await models.Skeet.destroy({ where: {}, force: true })
  })

  it('wirft 404 wenn Skeet nicht existiert', async () => {
    await expect(skeetService.getSkeetSendHistory(999999)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('liefert nur Logs des gewünschten Skeets sortiert nach postedAt DESC', async () => {
    const skeetA = await models.Skeet.create({
      content: 'A',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: new Date(),
    })
    const skeetB = await models.Skeet.create({
      content: 'B',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: new Date(),
    })

    await models.PostSendLog.bulkCreate([
      { skeetId: skeetA.id, platform: 'bluesky', status: 'success', postedAt: new Date('2025-01-02T10:00:00Z') },
      { skeetId: skeetA.id, platform: 'bluesky', status: 'failed', postedAt: new Date('2025-01-03T10:00:00Z') },
      { skeetId: skeetB.id, platform: 'bluesky', status: 'success', postedAt: new Date('2025-01-04T10:00:00Z') },
    ])

    const history = await skeetService.getSkeetSendHistory(skeetA.id)
    expect(history).toHaveLength(2)
    expect(history[0].status).toBe('failed')
    expect(new Date(history[0].postedAt).getTime()).toBeGreaterThan(new Date(history[1].postedAt).getTime())
    expect(history.every((entry) => entry.platform === 'bluesky')).toBe(true)
  })

  it('unterstützt limit und offset', async () => {
    const skeet = await models.Skeet.create({
      content: 'Paginate',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: new Date(),
    })

    await models.PostSendLog.bulkCreate([
      { skeetId: skeet.id, platform: 'bluesky', status: 'success', postedAt: new Date('2025-01-01T10:00:00Z') },
      { skeetId: skeet.id, platform: 'bluesky', status: 'failed', postedAt: new Date('2025-01-02T10:00:00Z') },
      { skeetId: skeet.id, platform: 'bluesky', status: 'success', postedAt: new Date('2025-01-03T10:00:00Z') },
    ])

    const firstTwo = await skeetService.getSkeetSendHistory(skeet.id, { limit: 2, offset: 0 })
    expect(firstTwo).toHaveLength(2)
    expect(new Date(firstTwo[0].postedAt)).toEqual(new Date('2025-01-03T10:00:00Z'))

    const lastEntry = await skeetService.getSkeetSendHistory(skeet.id, { limit: 2, offset: 2 })
    expect(lastEntry).toHaveLength(1)
    expect(new Date(lastEntry[0].postedAt)).toEqual(new Date('2025-01-01T10:00:00Z'))
  })
})

