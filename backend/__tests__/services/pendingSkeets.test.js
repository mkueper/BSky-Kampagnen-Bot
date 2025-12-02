import 'module-alias/register'
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Testgruppe: pendingSkeets.test.js
 *
 * Diese Tests überprüfen:
 * - Service-Logik für publishPendingSkeetOnce (einmalig & wiederkehrend)
 * - Verwerfen von pending_manual Skeets inklusive Status- und Terminupdates
 * - Fehlerbehandlung bei ungültigen IDs oder fehlenden Wiederholungsterminen
 * - Persistente Datenbankzustände nach allen Statusübergängen
 * - Konsistenz von pendingReason und postedAt nach manuellen Aktionen
 *
 * Dies ist ein Teil der Pending-Skeet-Logik. Die Tests stellen sicher, dass
 * Statusübergänge, Terminberechnung und API-Verhalten stabil bleiben.
 */

const models = require('@data/models')
const scheduler = require('@core/services/scheduler')
const skeetService = require('@core/services/skeetService')
const pendingController = require('@api/controllers/pendingSkeetController')

beforeEach(async () => {
  vi.clearAllMocks()
  // DB-Zustand für Skeets zwischen Tests säubern
  await models.Skeet.destroy({ where: {}, force: true })
})

describe('pending skeet service: publishPendingSkeetOnce', () => {
  it('publishes one-shot pending skeet and updates status/fields (repeat = none)', async () => {
    const past = new Date(Date.UTC(2025, 0, 1, 6, 0, 0))
    const skeet = await models.Skeet.create({
      content: 'Hello world',
      status: 'pending_manual',
      repeat: 'none',
      scheduledAt: past,
      pendingReason: 'missed_while_offline',
    })

    const fixedNow = new Date(Date.UTC(2025, 0, 2, 12, 0, 0))
    vi.spyOn(scheduler, 'publishSkeetNow').mockImplementation(async (id) => {
      const current = await models.Skeet.findByPk(id)
      await current.update({
        status: 'sent',
        postedAt: fixedNow,
        scheduledAt: null,
        postUri: 'mock://sent',
        pendingReason: null,
      })
      return current.id
    })

    const result = await skeetService.publishPendingSkeetOnce(skeet.id)
    const reloaded = await models.Skeet.findByPk(skeet.id)

    expect(result.status).toBe('sent')
    expect(result.scheduledAt).toBeNull()
    expect(result.pendingReason).toBeNull()
    expect(result.postedAt).toBeInstanceOf(Date)
    expect(result.postedAt.getTime()).toBe(fixedNow.getTime())

    expect(reloaded.status).toBe('sent')
    expect(reloaded.scheduledAt).toBeNull()
    expect(reloaded.pendingReason).toBeNull()
    expect(reloaded.postedAt).toBeInstanceOf(Date)
    expect(reloaded.postedAt.getTime()).toBe(fixedNow.getTime())
  })

  it('throws 404 when skeet does not exist', async () => {
    await expect(skeetService.publishPendingSkeetOnce(999999)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('throws 400 when skeet is not pending_manual', async () => {
    const skeet = await models.Skeet.create({
      content: 'Hello',
      status: 'scheduled',
      repeat: 'none',
      scheduledAt: new Date(),
    })

    await expect(skeetService.publishPendingSkeetOnce(skeet.id)).rejects.toMatchObject({
      status: 400,
    })
  })

  it('publishes recurring pending skeet and keeps it scheduled (repeat != none)', async () => {
    const yesterday = new Date(Date.UTC(2025, 0, 1, 6, 0, 0))
    const skeet = await models.Skeet.create({
      content: 'Recurring',
      status: 'pending_manual',
      repeat: 'daily',
      scheduledAt: yesterday,
      pendingReason: 'missed_while_offline',
    })

    const fixedNow = new Date(Date.UTC(2025, 0, 2, 12, 0, 0))
    const nextAt = new Date(Date.UTC(2025, 0, 3, 6, 0, 0))

    vi.spyOn(scheduler, 'publishSkeetNow').mockImplementation(async (id) => {
      const current = await models.Skeet.findByPk(id)
      await current.update({
        status: 'scheduled',
        postedAt: fixedNow,
        scheduledAt: nextAt,
        pendingReason: null,
      })
      return current.id
    })

    const result = await skeetService.publishPendingSkeetOnce(skeet.id)
    const reloaded = await models.Skeet.findByPk(skeet.id)

    expect(result.status).toBe('scheduled')
    expect(result.pendingReason).toBeNull()
    expect(result.postedAt).toBeInstanceOf(Date)
    expect(result.postedAt.getTime()).toBe(fixedNow.getTime())
    expect(result.scheduledAt).toBeInstanceOf(Date)
    expect(result.scheduledAt.getTime()).toBe(nextAt.getTime())

    expect(reloaded.status).toBe('scheduled')
    expect(reloaded.pendingReason).toBeNull()
    expect(reloaded.postedAt).toBeInstanceOf(Date)
    expect(reloaded.postedAt.getTime()).toBe(fixedNow.getTime())
    expect(reloaded.scheduledAt).toBeInstanceOf(Date)
    expect(reloaded.scheduledAt.getTime()).toBe(nextAt.getTime())
  })

  it('propagates posting errors and does not change skeet', async () => {
    const yesterday = new Date(Date.UTC(2025, 0, 1, 6, 0, 0))
    const skeet = await models.Skeet.create({
      content: 'Recurring',
      status: 'pending_manual',
      repeat: 'daily',
      scheduledAt: yesterday,
      pendingReason: 'missed_while_offline',
    })

    const initial = (await models.Skeet.findByPk(skeet.id)).toJSON()

    const err = new Error('Posting failed')
    vi.spyOn(scheduler, 'publishSkeetNow').mockRejectedValue(err)

    await expect(skeetService.publishPendingSkeetOnce(skeet.id)).rejects.toBe(err)

    const reloaded = await models.Skeet.findByPk(skeet.id)
    const current = reloaded.toJSON()
    expect(current.status).toBe(initial.status)
    expect(current.pendingReason).toBe(initial.pendingReason)
    expect(current.scheduledAt).toEqual(initial.scheduledAt)
    expect(current.postedAt).toEqual(initial.postedAt)
  })
})

describe('pending skeet service: discardPendingSkeet', () => {
  it('marks one-shot pending skeet as skipped and clears schedule', async () => {
    let skeet = await models.Skeet.create({
      content: 'Hello world',
      status: 'pending_manual',
      repeat: 'none',
      scheduledAt: new Date(Date.UTC(2025, 0, 2, 6, 0, 0)),
      postedAt: null,
      pendingReason: 'missed_while_offline',
    })

    // Validierung erlaubt scheduledAt=null nur, wenn postUri gesetzt ist
    skeet = await skeet.update({ postUri: 'mock://placeholder' })

    const result = await skeetService.discardPendingSkeet(skeet.id)
    const reloaded = await models.Skeet.findByPk(skeet.id)

    expect(result.status).toBe('skipped')
    expect(result.pendingReason).toBe('discarded_by_user')
    expect(result.scheduledAt).toBeNull()
    expect(result.postedAt).toBeNull()

    expect(reloaded.status).toBe('skipped')
    expect(reloaded.pendingReason).toBe('discarded_by_user')
    expect(reloaded.scheduledAt).toBeNull()
    expect(reloaded.postedAt).toBeNull()
  })

  it('reschedules recurring pending skeet using getNextScheduledAt', async () => {
    const yesterday = new Date(Date.UTC(2025, 0, 1, 6, 0, 0))
    const lastPost = new Date(Date.UTC(2024, 11, 31, 6, 0, 0))
    const skeet = await models.Skeet.create({
      content: 'Recurring',
      status: 'pending_manual',
      repeat: 'daily',
      scheduledAt: yesterday,
      postedAt: lastPost,
      pendingReason: 'missed_while_offline',
    })

    const nextAt = new Date(Date.UTC(2025, 0, 3, 6, 0, 0))
    vi.spyOn(scheduler, 'getNextScheduledAt').mockImplementation(() => nextAt)

    const result = await skeetService.discardPendingSkeet(skeet.id)
    const reloaded = await models.Skeet.findByPk(skeet.id)

    expect(result.status).toBe('scheduled')
    expect(result.pendingReason).toBeNull()
    expect(result.scheduledAt).toBeInstanceOf(Date)
    expect(result.scheduledAt.getTime()).toBe(nextAt.getTime())
    expect(result.postedAt).toBeInstanceOf(Date)
    expect(result.postedAt.getTime()).toBe(lastPost.getTime())

    expect(reloaded.status).toBe('scheduled')
    expect(reloaded.pendingReason).toBeNull()
    expect(reloaded.scheduledAt).toBeInstanceOf(Date)
    expect(reloaded.scheduledAt.getTime()).toBe(nextAt.getTime())
    expect(reloaded.postedAt).toBeInstanceOf(Date)
    expect(reloaded.postedAt.getTime()).toBe(lastPost.getTime())
  })

  it('throws 400 when next scheduled date cannot be determined and keeps skeet unchanged', async () => {
    const yesterday = new Date(Date.UTC(2025, 0, 1, 6, 0, 0))
    const lastPost = new Date(Date.UTC(2024, 11, 31, 6, 0, 0))
    const skeet = await models.Skeet.create({
      content: 'Recurring',
      status: 'pending_manual',
      repeat: 'daily',
      scheduledAt: yesterday,
      postedAt: lastPost,
      pendingReason: 'missed_while_offline',
    })

    const initial = (await models.Skeet.findByPk(skeet.id)).toJSON()
    vi.spyOn(scheduler, 'getNextScheduledAt').mockImplementation(() => null)

    await expect(skeetService.discardPendingSkeet(skeet.id)).rejects.toMatchObject({
      status: 400,
    })

    const reloaded = await models.Skeet.findByPk(skeet.id)
    const current = reloaded.toJSON()
    expect(current.status).toBe(initial.status)
    expect(current.pendingReason).toBe(initial.pendingReason)
    expect(current.scheduledAt).toEqual(initial.scheduledAt)
    expect(current.postedAt).toEqual(initial.postedAt)
  })
})
