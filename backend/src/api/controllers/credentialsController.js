/**
 * @file credentialsController.js
 * @summary Endpunkte zum Lesen/Speichern von Plattform-Zugangsdaten (.env-basiert).
 */
const fs = require('fs')
const path = require('path')
const settingsService = require('@core/services/settingsService')

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

function isPrivateHostname (hostname) {
  if (!hostname) return false
  const host = hostname.toLowerCase()
  if (host === 'localhost') return true
  const parts = host.split('.').map(part => Number(part))
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false
  if (parts[0] === 10) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  return false
}

function validateClientUrl (value) {
  const raw = sanitizeValue(value)
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    if (parsed.protocol === 'https:') return ''
    if (parsed.protocol === 'http:' && isPrivateHostname(parsed.hostname)) return ''
    return 'CLIENT_URL_PROTOCOL'
  } catch {
    return 'CLIENT_URL_INVALID'
  }
}

function validatePreviewProxyUrl (value) {
  const raw = sanitizeValue(value)
  if (!raw) return ''
  if (raw.startsWith('/')) return ''
  try {
    const parsed = new URL(raw)
    if (parsed.protocol === 'https:') return ''
    if (parsed.protocol === 'http:' && isPrivateHostname(parsed.hostname)) return ''
    return 'PREVIEW_URL_PROTOCOL'
  } catch {
    return 'PREVIEW_URL_INVALID'
  }
}

async function getCredentials (req, res) {
  try {
    const { values: clientApps } = await settingsService.getClientAppSettings().catch(() => ({ values: {} }))
    res.json({
      bluesky: {
        serverUrl: process.env.BLUESKY_SERVER_URL || 'https://bsky.social',
        identifier: process.env.BLUESKY_IDENTIFIER || '',
        hasAppPassword: Boolean(process.env.BLUESKY_APP_PASSWORD),
        clientApp: clientApps?.bluesky || ''
      },
      mastodon: {
        apiUrl: process.env.MASTODON_API_URL || 'https://mastodon.social',
        hasAccessToken: Boolean(process.env.MASTODON_ACCESS_TOKEN),
        clientApp: clientApps?.mastodon || ''
      },
      tenor: {
        // Nur Zustand exponieren, Key selbst bleibt verborgen
        hasApiKey: Boolean((process.env.TENOR_API_KEY || process.env.VITE_TENOR_API_KEY || '').trim())
      },
      previewProxyUrl: clientApps?.previewProxyUrl || ''
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
    const blueskyUrlError = Object.prototype.hasOwnProperty.call(payload, 'blueskyClientApp')
      ? validateClientUrl(payload.blueskyClientApp)
      : ''
    if (blueskyUrlError) {
      const message = blueskyUrlError === 'CLIENT_URL_PROTOCOL'
        ? 'Bluesky-Client-URL: Nur https:// erlaubt (http:// nur für localhost/private IPs).'
        : 'Bluesky-Client-URL ist ungültig.'
      return res.status(400).json({ error: message, code: blueskyUrlError })
    }
    const mastodonUrlError = Object.prototype.hasOwnProperty.call(payload, 'mastodonClientApp')
      ? validateClientUrl(payload.mastodonClientApp)
      : ''
    if (mastodonUrlError) {
      const message = mastodonUrlError === 'CLIENT_URL_PROTOCOL'
        ? 'Mastodon-Client-URL: Nur https:// erlaubt (http:// nur für localhost/private IPs).'
        : 'Mastodon-Client-URL ist ungültig.'
      return res.status(400).json({ error: message, code: mastodonUrlError })
    }
    const previewUrlError = Object.prototype.hasOwnProperty.call(payload, 'previewProxyUrl')
      ? validatePreviewProxyUrl(payload.previewProxyUrl)
      : ''
    if (previewUrlError) {
      const message = previewUrlError === 'PREVIEW_URL_PROTOCOL'
        ? 'Preview-Proxy-URL: Nur https:// erlaubt (http:// nur für localhost/private IPs).'
        : 'Preview-Proxy-URL ist ungültig.'
      return res.status(400).json({ error: message, code: previewUrlError })
    }

    const entries = {
      BLUESKY_SERVER_URL: sanitizeValue(payload.blueskyServerUrl),
      BLUESKY_IDENTIFIER: sanitizeValue(payload.blueskyIdentifier),
      // Secrets optional: nur setzen, wenn übergeben (nicht leer)
      BLUESKY_APP_PASSWORD: sanitizeValue(payload.blueskyAppPassword),
      MASTODON_API_URL: sanitizeValue(payload.mastodonApiUrl),
      MASTODON_ACCESS_TOKEN: sanitizeValue(payload.mastodonAccessToken),
      TENOR_API_KEY: sanitizeValue(payload.tenorApiKey),
      BLUESKY_CLIENT_APP: sanitizeValue(payload.blueskyClientApp),
      MASTODON_CLIENT_APP: sanitizeValue(payload.mastodonClientApp)
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
    if (Object.prototype.hasOwnProperty.call(payload, 'blueskyClientApp') ||
      Object.prototype.hasOwnProperty.call(payload, 'mastodonClientApp') ||
      Object.prototype.hasOwnProperty.call(payload, 'previewProxyUrl')) {
      await settingsService.saveClientAppSettings({
        bluesky: Object.prototype.hasOwnProperty.call(payload, 'blueskyClientApp')
          ? entries.BLUESKY_CLIENT_APP
          : undefined,
        mastodon: Object.prototype.hasOwnProperty.call(payload, 'mastodonClientApp')
          ? entries.MASTODON_CLIENT_APP
          : undefined,
        previewProxyUrl: Object.prototype.hasOwnProperty.call(payload, 'previewProxyUrl')
          ? sanitizeValue(payload.previewProxyUrl)
          : undefined
      })
    }

    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Speichern der Zugangsdaten.' })
  }
}

module.exports = { getCredentials, updateCredentials }
