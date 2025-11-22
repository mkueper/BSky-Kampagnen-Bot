export function parseAspectRatioValue (value) {
  if (!value) return null
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (Array.isArray(value) && value.length === 2) {
    const [w, h] = value.map(Number)
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h
  }
  if (typeof value === 'string') {
    if (value.includes(':')) {
      const [w, h] = value.split(':').map(Number)
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h
    }
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return numeric
  }
  return null
}
