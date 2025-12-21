let cachedRoot = null

export function getPortalRoot () {
  if (typeof document === 'undefined') return null
  if (cachedRoot && document.body.contains(cachedRoot)) return cachedRoot
  const existing = document.getElementById('bsky-portal-root')
  if (existing) {
    cachedRoot = existing
    return existing
  }
  const root = document.createElement('div')
  root.id = 'bsky-portal-root'
  root.setAttribute('data-component', 'BskyPortalRoot')
  document.body.appendChild(root)
  cachedRoot = root
  return root
}
