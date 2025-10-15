const { createLogger } = require('@utils/logging')
const log = createLogger('api:preview')
const { fetch } = require('undici')

function isBlockedHost (hostname) {
  const h = String(hostname || '').toLowerCase()
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.localhost') ||
    h.startsWith('127.') ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
  )
}

function extractMeta (html) {
  const safe = String(html || '')
  const get = (re) => {
    const m = safe.match(re)
    return m && m[1] ? m[1].trim() : ''
  }
  const title = get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["'][^>]*>/i) ||
                get(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["'][^>]*>/i) ||
                get(/<title[^>]*>([^<]{1,200})<\/title>/i)
  const description = get(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["'][^>]*>/i) ||
                      get(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["'][^>]*>/i)
  const image = get(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["'][^>]*>/i) ||
                get(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["'][^>]*>/i)
  return { title, description, image }
}

async function getExternalPreview (req, res) {
  try {
    const urlRaw = String(req.query.url || '').trim()
    if (!urlRaw) return res.status(400).json({ error: 'url fehlt' })
    let parsed
    try { parsed = new URL(urlRaw) } catch { return res.status(400).json({ error: 'Ungültige URL' }) }
    if (!/^https?:$/.test(parsed.protocol)) return res.status(400).json({ error: 'Nur http/https erlaubt' })
    if (isBlockedHost(parsed.hostname)) return res.status(400).json({ error: 'Ziel blockiert' })

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    let resp
    try {
      resp = await fetch(parsed.toString(), {
        redirect: 'follow',
        headers: { 'User-Agent': 'BSky-Kampagnen-Bot/1.1 (+preview)' },
        signal: controller.signal
      })
    } finally { clearTimeout(t) }

    if (!resp.ok) return res.status(502).json({ error: `Abruf fehlgeschlagen (${resp.status})` })
    const ct = String(resp.headers.get('content-type') || '')
    if (!ct.includes('text/html')) {
      return res.json({
        uri: parsed.toString(),
        title: parsed.hostname,
        description: '',
        image: '',
        domain: parsed.hostname.replace(/^www\./, '')
      })
    }

    const html = await resp.text()
    const meta = extractMeta(html)
    const domain = parsed.hostname.replace(/^www\./, '')
    return res.json({
      uri: parsed.toString(),
      title: meta.title || domain,
      description: meta.description || '',
      image: meta.image || '',
      domain
    })
  } catch (e) {
    log.warn('preview failed', { error: e?.message || String(e) })
    return res.status(500).json({ error: 'Preview fehlgeschlagen' })
  }
}

module.exports = { getExternalPreview }

