export function hasVideoMedia (entry) {
  try {
    const post = entry?.raw?.post || entry?.post || {}
    const embed = post?.embed || entry?.raw?.embed || null

    const stack = []
    if (embed) stack.push(embed)

    const inspectCandidate = (candidate) => {
      if (!candidate || typeof candidate !== 'object') return false
      const type = typeof candidate.$type === 'string' ? candidate.$type.toLowerCase() : ''
      if (type.includes('video')) return true

      if (candidate.video && typeof candidate.video === 'object') return true
      if (Array.isArray(candidate.videos) && candidate.videos.some(v => v && typeof v === 'object')) {
        return true
      }
      if (typeof candidate.playlist === 'string' && candidate.playlist.length > 0) return true
      if (typeof candidate.src === 'string' && candidate.src.includes('.m3u8')) return true

      if (candidate.media && typeof candidate.media === 'object') {
        stack.push(candidate.media)
      }
      if (Array.isArray(candidate.embeds)) {
        candidate.embeds.forEach(item => stack.push(item))
      }
      return false
    }

    while (stack.length > 0) {
      const current = stack.pop()
      if (inspectCandidate(current)) return true
    }
  } catch {
    return false
  }
  return false
}
