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
    err.code = 'TENOR_API_KEY_REQUIRED'
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
    err.code = 'TENOR_UPSTREAM_FAILED'
    throw err
  }
  return res.json()
}

function mapTenorError(error, fallbackMessage) {
  const status = typeof error?.status === 'number' ? error.status : 500
  const message = error?.message || fallbackMessage || 'Tenor Proxy Fehler'

  if (error?.code === 'TENOR_API_KEY_REQUIRED') {
    return {
      status,
      code: 'TENOR_API_KEY_REQUIRED',
      message,
    }
  }
  if (error?.code === 'TENOR_UPSTREAM_FAILED') {
    return {
      status,
      code: 'TENOR_UPSTREAM_FAILED',
      message,
    }
  }

  return {
    status,
    code: 'TENOR_PROXY_FAILED',
    message,
  }
}

async function featured(req, res) {
  try {
    const data = await callTenor('featured', req.query)
    res.json(data)
  } catch (e) {
    const { status, code, message } = mapTenorError(
      e,
      'Tenor Proxy Fehler'
    )
    res.status(status).json({
      error: message,
      code,
      message,
    })
  }
}

async function search(req, res) {
  try {
    const data = await callTenor('search', req.query)
    res.json(data)
  } catch (e) {
    const { status, code, message } = mapTenorError(
      e,
      'Tenor Proxy Fehler'
    )
    res.status(status).json({
      error: message,
      code,
      message,
    })
  }
}

async function download (req, res) {
  try {
    const { url, filename, mode } = req.body || {}
    if (!url || typeof url !== 'string') {
      const message = 'GIF-URL fehlt.'
      return res.status(400).json({
        error: message,
        code: 'TENOR_DOWNLOAD_URL_REQUIRED',
        message,
      })
    }
    const response = await fetch(url)
    if (!response.ok) {
      const message = 'GIF konnte nicht geladen werden.'
      return res.status(response.status).json({
        error: message,
        code: 'TENOR_DOWNLOAD_FAILED',
        message,
      })
    }
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || 8 * 1024 * 1024)
    if (buffer.length > maxBytes) {
      const message = 'GIF ist zu groß.'
      return res.status(413).json({
        error: message,
        code: 'TENOR_DOWNLOAD_TOO_LARGE',
        message,
      })
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
    const message = error?.message || 'GIF-Download fehlgeschlagen.'
    return res.status(500).json({
      error: message,
      code: 'TENOR_DOWNLOAD_FAILED',
      message,
    })
  }
}

module.exports = { featured, search, download }
