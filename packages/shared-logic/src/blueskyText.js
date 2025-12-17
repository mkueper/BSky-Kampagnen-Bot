const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi
const GlobalURL = typeof globalThis !== 'undefined' && typeof globalThis.URL === 'function'
  ? globalThis.URL
  : null

function toShortUrl (raw = '') {
  if (!GlobalURL) return String(raw)
  try {
    const parsed = new GlobalURL(String(raw))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return String(raw)
    }
    const path = `${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.search}${parsed.hash}`
    if (path.length > 15) {
      const shortenedPath = path.slice(0, 13)
      return `${parsed.host}${shortenedPath}...`
    }
    return `${parsed.host}${path}`
  } catch {
    return String(raw)
  }
}

export function shortenLinksForCounting (text = '') {
  if (!text) return ''
  return String(text).replace(URL_REGEX, (match) => toShortUrl(match))
}

export function calculateBlueskyPostLength (text = '') {
  if (!text) return 0
  return shortenLinksForCounting(text).length
}
