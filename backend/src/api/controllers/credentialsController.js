/**
 * @file credentialsController.js
 * @summary Endpunkte zum Lesen/Speichern von Plattform-Zugangsdaten (.env-basiert).
 */
const fs = require('fs')
const path = require('path')

function resolveEnvPath () {
  const p = process.env.ENV_PATH || process.env.DOTENV_PATH || process.env.DOTENV_CONFIG_PATH
  return p && p.trim() ? p.trim() : path.join(process.cwd(), '.env')
}

function loadEnvFileMap (filepath) {
  const map = new Map()
  try {
    if (fs.existsSync(filepath)) {
      const text = fs.readFileSync(filepath, 'utf8')
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const key = line.slice(0, eq).trim()
        const val = line.slice(eq + 1)
        if (key) map.set(key, val)
      }
    }
  } catch { /* ignore malformed .env lines */ }
  return map
}

function writeEnvFileMap (filepath, map) {
  const lines = ['# Managed by credentialsController', '#']
  for (const [k, v] of map.entries()) {
    lines.push(`${k}=${v}`)
  }
  const dir = path.dirname(filepath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filepath, lines.join('\n'))
}

function sanitizeValue (v) {
  return (v ?? '').toString().trim()
}

async function getCredentials (req, res) {
  try {
    res.json({
      bluesky: {
        serverUrl: process.env.BLUESKY_SERVER_URL || 'https://bsky.social',
        identifier: process.env.BLUESKY_IDENTIFIER || '',
        hasAppPassword: Boolean(process.env.BLUESKY_APP_PASSWORD)
      },
      mastodon: {
        apiUrl: process.env.MASTODON_API_URL || 'https://mastodon.social',
        hasAccessToken: Boolean(process.env.MASTODON_ACCESS_TOKEN)
      },
      tenor: {
        // Nur Zustand exponieren, Key selbst bleibt verborgen
        hasApiKey: Boolean((process.env.TENOR_API_KEY || process.env.VITE_TENOR_API_KEY || '').trim())
      }
    })
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Zugangsdaten.' })
  }
}

async function updateCredentials (req, res) {
  try {
    const payload = req.body || {}
    const envPath = resolveEnvPath()
    const map = loadEnvFileMap(envPath)

    const entries = {
      BLUESKY_SERVER_URL: sanitizeValue(payload.blueskyServerUrl),
      BLUESKY_IDENTIFIER: sanitizeValue(payload.blueskyIdentifier),
      // Secrets optional: nur setzen, wenn übergeben (nicht leer)
      BLUESKY_APP_PASSWORD: sanitizeValue(payload.blueskyAppPassword),
      MASTODON_API_URL: sanitizeValue(payload.mastodonApiUrl),
      MASTODON_ACCESS_TOKEN: sanitizeValue(payload.mastodonAccessToken),
      TENOR_API_KEY: sanitizeValue(payload.tenorApiKey)
    }

    // Set/merge values; secrets nur wenn nicht leer übergeben
    if (entries.BLUESKY_SERVER_URL) map.set('BLUESKY_SERVER_URL', entries.BLUESKY_SERVER_URL)
    if (entries.BLUESKY_IDENTIFIER) map.set('BLUESKY_IDENTIFIER', entries.BLUESKY_IDENTIFIER)
    if (entries.MASTODON_API_URL) map.set('MASTODON_API_URL', entries.MASTODON_API_URL)
    if (entries.BLUESKY_APP_PASSWORD) map.set('BLUESKY_APP_PASSWORD', entries.BLUESKY_APP_PASSWORD)
    if (entries.MASTODON_ACCESS_TOKEN) map.set('MASTODON_ACCESS_TOKEN', entries.MASTODON_ACCESS_TOKEN)
    if (entries.TENOR_API_KEY) map.set('TENOR_API_KEY', entries.TENOR_API_KEY)

    writeEnvFileMap(envPath, map)

    // Laufzeit-ENV aktualisieren (wirkt ohne Neustart)
    if (map.has('BLUESKY_SERVER_URL')) process.env.BLUESKY_SERVER_URL = map.get('BLUESKY_SERVER_URL')
    if (map.has('BLUESKY_IDENTIFIER')) process.env.BLUESKY_IDENTIFIER = map.get('BLUESKY_IDENTIFIER')
    if (map.has('BLUESKY_APP_PASSWORD')) process.env.BLUESKY_APP_PASSWORD = map.get('BLUESKY_APP_PASSWORD')
    if (map.has('MASTODON_API_URL')) process.env.MASTODON_API_URL = map.get('MASTODON_API_URL')
    if (map.has('MASTODON_ACCESS_TOKEN')) process.env.MASTODON_ACCESS_TOKEN = map.get('MASTODON_ACCESS_TOKEN')
    if (map.has('TENOR_API_KEY')) process.env.TENOR_API_KEY = map.get('TENOR_API_KEY')

    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Speichern der Zugangsdaten.' })
  }
}

module.exports = { getCredentials, updateCredentials }
