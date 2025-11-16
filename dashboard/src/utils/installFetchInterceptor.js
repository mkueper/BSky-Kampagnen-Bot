export function installFetchInterceptor () {
  if (typeof window === 'undefined') return
  if (window.__authFetchInterceptorInstalled) return

  const originalFetch = window.fetch.bind(window)

  const sameOrigin = (input) => {
    try {
      const isRequest = typeof Request !== 'undefined' && input instanceof Request
      if (isRequest) {
        return new URL(input.url, window.location.origin).origin === window.location.origin
      }
      if (typeof input === 'string') {
        if (/^https?:\/\//i.test(input)) {
          return new URL(input).origin === window.location.origin
        }
        return true
      }
      return false
    } catch {
      return false
    }
  }

  window.fetch = async (input, init = {}) => {
    let options = init
    if (sameOrigin(input)) {
      options = { ...init }
      options.credentials = options.credentials || 'include'
      const headers = new Headers(init.headers || {})
      if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest')
      }
      options.headers = headers
    }

    const response = await originalFetch(input, options)
    try {
      const responseUrl = response?.url ? new URL(response.url) : null
      if (responseUrl && responseUrl.origin === window.location.origin && response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
    } catch {
      // ignore
    }
    return response
  }

  window.__authFetchInterceptorInstalled = true
}
