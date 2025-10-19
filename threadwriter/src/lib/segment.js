export const BLUESKY_LIMIT = 300

export function splitRawSegments(source) {
  const normalized = String(source || '').replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const segments = []
  let buffer = []
  for (const line of lines) {
    if (line.trim() === '---') {
      segments.push(buffer.join('\n'))
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  segments.push(buffer.join('\n'))
  return segments
}

export function splitIntoSentences(text) {
  const normalized = text.replace(/\s+/g, ' ')
  const pattern = /[^.!?]+[.!?]*(?:\s+|$)/g
  const sentences = []
  let match
  while ((match = pattern.exec(normalized)) !== null) {
    sentences.push(match[0])
  }
  return sentences.length ? sentences : [normalized]
}

export function hardSplit(text, limit) {
  if (!text) return ['']
  const out = []
  let i = 0
  while (i < text.length) {
    out.push(text.slice(i, i + limit))
    i += limit
  }
  return out
}

export function buildSegments(source, { appendNumbering = true, limit = BLUESKY_LIMIT } = {}) {
  const raw = splitRawSegments(source)
  const reserved = appendNumbering ? 8 : 0
  const effLimit = Math.max(20, limit - reserved)
  const out = []
  raw.forEach((segment) => {
    const trimmed = segment.replace(/\s+$/u, '')
    if (!trimmed) {
      out.push('')
      return
    }
    if (trimmed.length <= effLimit) {
      out.push(trimmed)
      return
    }
    const sentences = splitIntoSentences(trimmed)
    let buffer = ''
    sentences.forEach((s) => {
      const cand = buffer ? buffer + s : s
      if (cand.trim().length <= effLimit) {
        buffer = cand
      } else {
        if (buffer.trim()) out.push(buffer.trim())
        let rest = s.trim()
        if (rest.length > effLimit) {
          const chunks = hardSplit(rest, effLimit)
          out.push(...chunks.slice(0, -1).map((c) => c.trim()))
          rest = chunks[chunks.length - 1]
        }
        buffer = rest
      }
    })
    if (buffer.trim()) out.push(buffer.trim())
  })

  const total = out.length
  return out.map((text, i) => {
    if (!appendNumbering) return text
    if (!text || !text.trim()) return text
    const numbering = `\n\n${i + 1}/${total}`
    return `${text}${numbering}`
  })
}
