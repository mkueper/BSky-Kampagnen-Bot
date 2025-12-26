#!/usr/bin/env node
/**
 * Lokaler Link-Preview-Proxy für die Client-Entwicklung.
 * Start: `node scripts/dev-link-preview.js`
 * Standard-Port: 3456 → http://localhost:3456/preview?url=https://example.org
 */

const express = require('express')
const { getLinkPreview } = require('link-preview-js')

const PORT = Number(process.env.PREVIEW_PROXY_PORT || process.argv[2]) || 3456
const HOST = process.env.PREVIEW_PROXY_HOST || '127.0.0.1'
const ENDPOINT = process.env.PREVIEW_PROXY_PATH || '/preview'
const PREVIEW_TIMEOUT_MS = Number(process.env.PREVIEW_PROXY_TIMEOUT_MS) || 10000

function normalizeUrl (value) {
  if (!value) return ''
  try {
    const parsed = new URL(String(value))
    if (!/^https?:$/i.test(parsed.protocol)) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function formatPreviewResponse (targetUrl, payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      uri: targetUrl,
      title: '',
      description: '',
      image: '',
      domain: ''
    }
  }
  const firstImage = Array.isArray(payload.images) && payload.images.length > 0
    ? payload.images[0]
    : ''
  let domain = payload.siteName || ''
  if (!domain) {
    try {
      const parsed = new URL(payload.url || targetUrl)
      domain = parsed.hostname.replace(/^www\./, '')
    } catch {
      domain = ''
    }
  }
  return {
    uri: payload.url || targetUrl,
    title: payload.title || '',
    description: payload.description || '',
    image: firstImage || payload.favicons?.[0] || '',
    domain
  }
}

async function fetchPreview (targetUrl) {
  return getLinkPreview(targetUrl, {
    timeout: PREVIEW_TIMEOUT_MS,
    headers: {
      'user-agent': 'BSky-Kampagnen-Bot-LinkPreview/1.0 (+https://github.com/mkueper/BSky-Kampagnen-Bot)'
    }
  })
}

function createServer () {
  const app = express()

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    next()
  })

  app.get(ENDPOINT, async (req, res) => {
    const queryUrl = normalizeUrl(req.query.url)
    if (!queryUrl) {
      res.status(400).json({ error: 'PREVIEW_INVALID_URL', message: 'Ungültige URL.' })
      return
    }
    try {
      const payload = await fetchPreview(queryUrl)
      const responseBody = formatPreviewResponse(queryUrl, payload)
      res.json(responseBody)
    } catch (error) {
      console.error('[preview-proxy] Fehler beim Abruf', error?.message || error)
      const status = error?.code === 'ETIMEDOUT' ? 504 : 502
      const code = error?.code === 'ETIMEDOUT' ? 'PREVIEW_TIMEOUT' : 'PREVIEW_ERROR'
      res.status(status).json({
        error: code,
        message: error?.message || 'Link-Vorschau konnte nicht geladen werden.'
      })
    }
  })

  return app
}

function start () {
  const app = createServer()
  app.listen(PORT, HOST, () => {
    console.log('[preview-proxy] läuft auf', `http://${HOST}:${PORT}${ENDPOINT}`)
    console.log('[preview-proxy] Beispiel: http://localhost:%d%s?url=%s', PORT, ENDPOINT, encodeURIComponent('https://bsky.app'))
  })
}

start()
