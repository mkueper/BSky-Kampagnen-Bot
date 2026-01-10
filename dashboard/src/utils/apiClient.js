let csrfCookieName = 'kampagnenbot_csrf'

export function setCsrfCookieName (name) {
  if (typeof name !== 'string') return
  const trimmed = name.trim()
  if (trimmed) csrfCookieName = trimmed
}

function readCookieValue (name) {
  if (!name || typeof document === 'undefined') return ''
  const prefix = `${name}=`
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return ''
}

function shouldAttachCsrf (method) {
  const normalized = (method || 'GET').toUpperCase()
  return !['GET', 'HEAD', 'OPTIONS'].includes(normalized)
}

export function fetchWithCsrf (input, init = {}) {
  const headers = new Headers(init.headers || {})
  if (shouldAttachCsrf(init.method)) {
    const token = readCookieValue(csrfCookieName)
    if (token) headers.set('x-csrf-token', token)
  }
  const credentials = init.credentials || 'include'
  return fetch(input, { ...init, headers, credentials })
}
