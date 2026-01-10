const SESSION_AUTO_EXTEND_STORAGE_KEY = 'dashboardSessionAutoExtend'

export function readSessionAutoExtend () {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(SESSION_AUTO_EXTEND_STORAGE_KEY)
  if (stored == null) return true
  return stored === 'true'
}

export function writeSessionAutoExtend (value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    SESSION_AUTO_EXTEND_STORAGE_KEY,
    value ? 'true' : 'false'
  )
}

export { SESSION_AUTO_EXTEND_STORAGE_KEY }
