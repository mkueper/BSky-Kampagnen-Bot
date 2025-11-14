/**
 * Tenor Proxy Controller
 * Proxies Tenor API requests through the backend so no browser key is exposed.
 */
const { fetch } = require('undici')

function getApiKey() {
  const k = String(process.env.TENOR_API_KEY || process.env.VITE_TENOR_API_KEY || '').trim()
  return k || null
}

function parseLimit(v, def = 24, max = 50) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(Math.floor(n), max)
}

async function callTenor(endpoint, query) {
  const key = getApiKey()
  if (!key) {
    const err = new Error('Tenor API‑Key fehlt. Bitte TENOR_API_KEY setzen.')
    err.status = 400
    throw err
  }
  const base = `https://tenor.googleapis.com/v2/${endpoint}`
  const params = new URLSearchParams()
  params.set('key', key)
  params.set('client_key', 'server')
  params.set('media_filter', 'gif,tinygif,nanogif')
  if (query?.q) params.set('q', String(query.q))
  if (query?.pos) params.set('pos', String(query.pos))
  params.set('limit', String(parseLimit(query?.limit)))

  const url = `${base}?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`Tenor Fehler: HTTP ${res.status} ${text}`.trim())
    err.status = res.status
    throw err
  }
  return res.json()
}

async function featured(req, res) {
  try {
    const data = await callTenor('featured', req.query)
    res.json(data)
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Tenor Proxy Fehler' })
  }
}

async function search(req, res) {
  try {
    const data = await callTenor('search', req.query)
    res.json(data)
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Tenor Proxy Fehler' })
  }
}

module.exports = { featured, search }

