const { createLogger } = require('@utils/logging')
const log = createLogger('api:maintenance')
const { cleanupInvalidMastodonEntries } = require('@core/services/threadEngagementService')
const { cleanupOldTempUploads } = require('@utils/tempUploads')

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

/**
 * POST /api/maintenance/cleanup-temp-uploads
 * Entfernt alte temporäre Upload-Dateien aus TEMP_UPLOAD_DIR.
 * Optionaler Body: { maxAgeHours?: number } – Standard sind 24 Stunden.
 */
async function cleanupTempUploads (req, res) {
  try {
    const { maxAgeHours } = req.body || {}
    let maxAgeMs = 24 * 60 * 60 * 1000
    const n = Number(maxAgeHours)
    if (Number.isFinite(n) && n > 0) {
      maxAgeMs = n * 60 * 60 * 1000
    }
    const result = await cleanupOldTempUploads({ maxAgeMs })
    res.json({
      ok: true,
      maxAgeMs,
      ...result
    })
  } catch (e) {
    log.error('cleanup-temp-uploads failed', { error: e?.message || String(e) })
    res.status(500).json({ error: e?.message || 'Cleanup fehlgeschlagen.' })
  }
}

module.exports = { cleanupMastodon, cleanupTempUploads }
