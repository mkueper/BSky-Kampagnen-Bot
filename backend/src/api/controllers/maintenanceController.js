const { createLogger } = require('@utils/logging')
const log = createLogger('api:maintenance')
const { cleanupInvalidMastodonEntries } = require('@core/services/threadEngagementService')

/**
 * POST /api/maintenance/cleanup-mastodon
 * Entfernt veraltete/ungültige Mastodon-Engagement-Einträge aus Thread-Metadaten,
 * wenn keine gültigen Identifikatoren vorhanden sind. Reduziert zukünftigen Traffic.
 */
async function cleanupMastodon(req, res) {
  try {
    const { dryRun } = req.body || {}
    const result = await cleanupInvalidMastodonEntries({ dryRun: Boolean(dryRun) })
    res.json({ ok: true, ...result })
  } catch (e) {
    log.error('cleanup-mastodon failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Cleanup fehlgeschlagen.' })
  }
}

module.exports = { cleanupMastodon }

