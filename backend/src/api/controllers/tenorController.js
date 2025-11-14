/**
 * Tenor Proxy Controller
 * Proxies Tenor API requests through the backend so no browser key is exposed.
 */
const { fetch } = require('undici')
const { writeBufferToTemp } = require('@utils/tempUploads')

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

async function download (req, res) {
  try {
    const { url, filename, mode } = req.body || {}
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'GIF-URL fehlt.' })
    }
    const response = await fetch(url)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'GIF konnte nicht geladen werden.' })
    }
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 8 * 1024 * 1024)
    if (buffer.length > maxBytes) {
      return res.status(413).json({ error: 'GIF ist zu groß.' })
    }
    const mime = response.headers.get('content-type') || 'image/gif'
    const safeName = filename || 'tenor.gif'

    if (mode === 'base64') {
      const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
      return res.status(200).json({
        filename: safeName,
        mime,
        size: buffer.length,
        dataUrl
      })
    }

    const stored = writeBufferToTemp(buffer, { filename: safeName, mime })
    return res.status(201).json(stored)
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'GIF-Download fehlgeschlagen.' })
  }
}

module.exports = { featured, search, download }
