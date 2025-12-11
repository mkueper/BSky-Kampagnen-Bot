#!/usr/bin/env tsx
/**
 * Seed-Skript: erstellt eine frische SQLite-Datenbank mit Beispiel-Skeets,
 * Threads und Sendelogs, um saemtliche Statuskonstellationen im Dashboard zu
 * testen (Erfolg, Fehler, Pending, Uebersprungen usw.).
 *
 * Aufruf:
 *   npx tsx scripts/seedDemoDatabase.ts [pfad-zur-sqlite-datei]
 *
 * Standardpfad (wenn nicht angegeben):
 *   ./data/demo-seed.sqlite
 */
import fs from 'node:fs'
import path from 'node:path'

type ThreadSeed = {
  key: string
  title: string
  status: string
  scheduledAt: Date
  targetPlatforms: string[]
}

type ThreadSegmentSeed = {
  threadKey: string
  sequence: number
  content: string
  characterCount: number
}

type SkeetSeed = {
  key: string
  content: string
  status: string
  scheduledAt: Date | null
  repeat: 'none' | 'daily' | 'weekly' | 'monthly'
  repeatDayOfWeek?: number | null
  repeatDayOfMonth?: number | null
  repeatDaysOfWeek?: number[] | null
  postedAt?: Date | null
  postUri?: string | null
  pendingReason?: string | null
  targetPlatforms: string[]
  threadKey?: string
  isThreadPost?: boolean
}

type HistorySeed = {
  skeetKey: string
  platform: string
  status: string
  eventType?: string
  postedAt: Date
  postUri?: string
  postCid?: string
  attempt?: number
  error?: string | null
}

const HOURS = 60 * 60 * 1000
const DAYS = 24 * HOURS
const now = Date.now()

const inHours = (value: number) => new Date(now + value * HOURS)
const daysAgo = (value: number) => new Date(now - value * DAYS)

const DEFAULT_DB = path.join(process.cwd(), 'data', 'demo-seed.sqlite')

function resolveOutputPath(args: string[]): string {
  if (args.length === 0) return DEFAULT_DB
  const candidate = args[0]
  if (!candidate || candidate.startsWith('-')) return DEFAULT_DB
  return path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate)
}

async function seed() {
  const outputPath = resolveOutputPath(process.argv.slice(2))
  process.env.NODE_ENV = process.env.NODE_ENV || 'development'
  process.env.SQLITE_STORAGE = outputPath

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath)
  }

  // Models erst nach dem Setzen von SQLITE_STORAGE laden.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const models = require(path.join(__dirname, '../backend/src/data/models'))
  const { sequelize, Thread, ThreadSkeet, Skeet, PostSendLog } = models

  await sequelize.sync({ force: true })

  const threadSeeds: ThreadSeed[] = [
    {
      key: 'productLaunch',
      title: 'Produktlaunch-Serie',
      status: 'scheduled',
      scheduledAt: inHours(30),
      targetPlatforms: ['bluesky', 'mastodon']
    },
    {
      key: 'retroWrapUp',
      title: 'retro week Recap',
      status: 'published',
      scheduledAt: daysAgo(3),
      targetPlatforms: ['bluesky']
    }
  ]

  const threadSegmentSeeds: ThreadSegmentSeed[] = [
    {
      threadKey: 'productLaunch',
      sequence: 0,
      content: 'Launch-Thread Teil 1 - Ueberblick & Story.',
      characterCount: 72
    },
    {
      threadKey: 'productLaunch',
      sequence: 1,
      content: 'Launch-Thread Teil 2 - Feature-Breakdown & CTA.',
      characterCount: 78
    },
    {
      threadKey: 'retroWrapUp',
      sequence: 0,
      content: 'Retro-Recap Segment 1 - Lessons learned.',
      characterCount: 54
    }
  ]

  const skeetSeeds: SkeetSeed[] = [
    {
      key: 'dailyStatus',
      content: 'Daily Status Update - Kampagne A',
      status: 'scheduled',
      scheduledAt: inHours(3),
      repeat: 'daily',
      targetPlatforms: ['bluesky', 'mastodon']
    },
    {
      key: 'weeklyHighlights',
      content: 'Weekly Highlights - Dienstag/Donnerstag/Samstag',
      status: 'scheduled',
      scheduledAt: inHours(20),
      repeat: 'weekly',
      repeatDaysOfWeek: [2, 4, 6],
      targetPlatforms: ['bluesky']
    },
    {
      key: 'monthlyDigest',
      content: 'Monthly Metrics Digest',
      status: 'sent',
      repeat: 'monthly',
      repeatDayOfMonth: 15,
      scheduledAt: null,
      postedAt: daysAgo(5),
      postUri: 'at://example.app.bsky.digest/2025-01',
      targetPlatforms: ['bluesky']
    },
    {
      key: 'missedManual',
      content: 'Abendausspielung - Scheduler war offline',
      status: 'pending_manual',
      pendingReason: 'missed_while_offline',
      scheduledAt: daysAgo(2),
      repeat: 'daily',
      targetPlatforms: ['bluesky', 'mastodon']
    },
    {
      key: 'failedOnce',
      content: 'Live-Posting mit API-Fehler',
      status: 'error',
      scheduledAt: daysAgo(1),
      repeat: 'none',
      targetPlatforms: ['bluesky']
    },
    {
      key: 'skippedPromo',
      content: 'Promo entfaellt heute',
      status: 'skipped',
      scheduledAt: daysAgo(3),
      repeat: 'none',
      targetPlatforms: ['mastodon']
    },
    {
      key: 'threadIntro',
      content: 'Produktlaunch Thread - Teil 1',
      status: 'scheduled',
      scheduledAt: inHours(30),
      repeat: 'none',
      threadKey: 'productLaunch',
      isThreadPost: true,
      targetPlatforms: ['bluesky']
    },
    {
      key: 'threadCTA',
      content: 'Produktlaunch Thread - Teil 2',
      status: 'draft',
      scheduledAt: inHours(30),
      repeat: 'none',
      threadKey: 'productLaunch',
      isThreadPost: true,
      targetPlatforms: ['bluesky']
    },
    {
      key: 'retroRecap',
      content: 'Retro Recap Segment',
      status: 'sent',
      scheduledAt: daysAgo(4),
      postedAt: daysAgo(3),
      repeat: 'none',
      threadKey: 'retroWrapUp',
      isThreadPost: true,
      targetPlatforms: ['bluesky']
    }
  ]

  const historySeeds: HistorySeed[] = [
    // Daily recurring - mehrere erfolgreiche Eintraege + ein Fehler
    ...Array.from({ length: 6 }).map((_, idx) => ({
      skeetKey: 'dailyStatus',
      platform: idx % 2 === 0 ? 'bluesky' : 'mastodon',
      status: 'success',
      postedAt: daysAgo(idx + 1),
      eventType: 'send',
      attempt: 1,
      postUri: `at://example.app.daily/${202412 - idx}`
    })),
    {
      skeetKey: 'dailyStatus',
      platform: 'mastodon',
      status: 'failed',
      postedAt: daysAgo(7),
      attempt: 2,
      error: 'HTTP 502 bei Mastodon',
      postCid: 'cid-failure-001'
    },
    // Weekly with mix of failure and success
    {
      skeetKey: 'weeklyHighlights',
      platform: 'bluesky',
      status: 'success',
      postedAt: daysAgo(8),
      postUri: 'at://example.app.weekly/2024-49-1'
    },
    {
      skeetKey: 'weeklyHighlights',
      platform: 'bluesky',
      status: 'failed',
      postedAt: daysAgo(15),
      attempt: 3,
      error: 'Content moderation rejected'
    },
    // Monthly digest success
    {
      skeetKey: 'monthlyDigest',
      platform: 'bluesky',
      status: 'success',
      postedAt: daysAgo(35),
      postUri: 'at://example.app.digest/2024-12'
    },
    // Pending manual entry: Fehler + pending Marker
    {
      skeetKey: 'missedManual',
      platform: 'bluesky',
      status: 'failed',
      postedAt: daysAgo(2),
      attempt: 1,
      error: 'Scheduler offline zum Termin'
    },
    {
      skeetKey: 'missedManual',
      platform: 'bluesky',
      status: 'pending',
      postedAt: daysAgo(1),
      attempt: 2
    },
    // Failed once - harter Fehler
    {
      skeetKey: 'failedOnce',
      platform: 'bluesky',
      status: 'failed',
      postedAt: daysAgo(1),
      attempt: 1,
      error: 'Content violation laut API'
    },
    // Skipped promo - markiert als uebersprungen
    {
      skeetKey: 'skippedPromo',
      platform: 'mastodon',
      status: 'skipped',
      postedAt: daysAgo(3),
      eventType: 'skip'
    },
    // Thread intro - einmaliger Erfolg
    {
      skeetKey: 'threadIntro',
      platform: 'bluesky',
      status: 'success',
      postedAt: daysAgo(10),
      postUri: 'at://example.app.thread/launch-1'
    },
    // Thread CTA - fehlgeschlagener Versuch
    {
      skeetKey: 'threadCTA',
      platform: 'bluesky',
      status: 'failed',
      postedAt: daysAgo(9),
      error: 'Sequenzlimit erreicht'
    },
    // Retro recap - bereits gesendet
    {
      skeetKey: 'retroRecap',
      platform: 'bluesky',
      status: 'success',
      postedAt: daysAgo(3),
      postUri: 'at://example.app.thread/retro-1'
    }
  ]

  const createdThreads = new Map<string, typeof Thread>()
  const createdSkeets = new Map<string, typeof Skeet>()

  await sequelize.transaction(async (trx) => {
    for (const seedThread of threadSeeds) {
      const thread = await Thread.create(
        {
          title: seedThread.title,
          status: seedThread.status,
          scheduledAt: seedThread.scheduledAt,
          targetPlatforms: seedThread.targetPlatforms
        },
        { transaction: trx }
      )
      createdThreads.set(seedThread.key, thread)
    }

    for (const segment of threadSegmentSeeds) {
      const thread = createdThreads.get(segment.threadKey)
      if (!thread) continue
      await ThreadSkeet.create(
        {
          threadId: thread.id,
          sequence: segment.sequence,
          content: segment.content,
          characterCount: segment.characterCount
        },
        { transaction: trx }
      )
    }

    for (const skeetSeed of skeetSeeds) {
      const thread = skeetSeed.threadKey ? createdThreads.get(skeetSeed.threadKey) : null
      const skeet = await Skeet.create(
        {
          content: skeetSeed.content,
          status: skeetSeed.status,
          scheduledAt: skeetSeed.scheduledAt,
          repeat: skeetSeed.repeat,
          repeatDayOfWeek: skeetSeed.repeatDayOfWeek ?? null,
          repeatDayOfMonth: skeetSeed.repeatDayOfMonth ?? null,
          repeatDaysOfWeek: skeetSeed.repeatDaysOfWeek ?? null,
          postedAt: skeetSeed.postedAt ?? null,
          postUri: skeetSeed.postUri ?? null,
          pendingReason: skeetSeed.pendingReason ?? null,
          targetPlatforms: skeetSeed.targetPlatforms,
          threadId: thread ? thread.id : null,
          isThreadPost: Boolean(skeetSeed.isThreadPost)
        },
        { transaction: trx }
      )
      createdSkeets.set(skeetSeed.key, skeet)
    }

    const logRecords = historySeeds
      .map((logSeed) => {
        const target = createdSkeets.get(logSeed.skeetKey)
        if (!target) return null
        return {
          skeetId: target.id,
          platform: logSeed.platform,
          status: logSeed.status,
          eventType: logSeed.eventType || 'send',
          postedAt: logSeed.postedAt,
          postUri: logSeed.postUri || null,
          postCid: logSeed.postCid || null,
          attempt: logSeed.attempt ?? 1,
          error: logSeed.error || null,
          contentSnapshot: target.content,
          mediaSnapshot: null
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>

    await PostSendLog.bulkCreate(logRecords, { transaction: trx })
  })

  const skeetCount = await Skeet.count()
  const threadCount = await Thread.count()
  const logCount = await PostSendLog.count()

  console.log('Demo-Datenbank erstellt:', outputPath)
  console.log(`Threads: ${threadCount} | Skeets: ${skeetCount} | Sendelogs: ${logCount}`)

  await sequelize.close()
}

seed().catch((error) => {
  console.error('Seed fehlgeschlagen:', error)
  process.exit(1)
})
