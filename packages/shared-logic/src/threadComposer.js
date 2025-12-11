function splitIntoSentences (text) {
  const normalized = text.replace(/\r\n/g, '\n')
  if (!normalized.trim()) {
    return ['']
  }
  return [normalized]
}

function splitAtWordBoundaries (text, limit) {
  if (!text) return ['']
  const chunks = []
  let remaining = text

  while (remaining.length > limit) {
    const window = remaining.slice(0, limit + 1)
    const lastWhitespace = window.lastIndexOf(' ')
    const splitIndex = lastWhitespace > 0 ? lastWhitespace : limit
    const chunk = remaining.slice(0, splitIndex).trimEnd()
    if (chunk) {
      chunks.push(chunk)
    }
    remaining = remaining.slice(splitIndex).replace(/^\s+/, '')
  }

  if (remaining.trim()) {
    chunks.push(remaining.trim())
  }

  return chunks.length ? chunks : ['']
}

function splitThreadSource (source = '', hardBreakMarker = '---') {
  const normalized = source.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const segments = []
  let buffer = []

  for (const line of lines) {
    if (line.trim() === hardBreakMarker) {
      segments.push(buffer.join('\n'))
      buffer = []
    } else {
      buffer.push(line)
    }
  }

  segments.push(buffer.join('\n'))

  if (segments.length === 0) {
    return ['']
  }

  return segments
}

function buildEffectiveSegments (rawSegments, limit, appendNumbering) {
  if (!Number.isFinite(limit)) {
    const effectiveSegments = rawSegments.map(segment =>
      segment.replace(/\s+$/u, '')
    )
    const rawToEffectiveStartIndex = rawSegments.map((_, index) => index)
    const effectiveOffsets = new Array(effectiveSegments.length)

    rawSegments.forEach((segment, rawIndex) => {
      const raw = segment.replace(/\r\n/g, '\n')
      const start = rawToEffectiveStartIndex[rawIndex]
      const end =
        rawIndex + 1 < rawToEffectiveStartIndex.length
          ? rawToEffectiveStartIndex[rawIndex + 1]
          : effectiveSegments.length
      let searchFrom = 0
      for (let i = start; i < end; i++) {
        const chunk = effectiveSegments[i]
        const needle = chunk.trimStart()
        let idx = raw.indexOf(needle, searchFrom)
        if (idx === -1) idx = searchFrom
        effectiveOffsets[i] = { rawIndex, offsetInRaw: idx }
        searchFrom = idx + needle.length
      }
    })

    return {
      effectiveSegments,
      rawToEffectiveStartIndex,
      effectiveOffsets
    }
  }

  const reservedForNumbering = appendNumbering ? 8 : 0
  const effectiveLimit = Math.max(20, limit - reservedForNumbering)
  const effectiveSegments = []
  const rawToEffectiveStartIndex = []
  const effectiveOffsets = []
  let totalCount = 0

  rawSegments.forEach((segment, rawIndex) => {
    rawToEffectiveStartIndex.push(totalCount)
    const trimmed = segment.replace(/\s+$/u, '')
    const raw = segment.replace(/\r\n/g, '\n')
    let searchFrom = 0

    if (!trimmed) {
      effectiveSegments.push('')
      effectiveOffsets.push({ rawIndex, offsetInRaw: 0 })
      totalCount += 1
      return
    }
    if (trimmed.length <= effectiveLimit) {
      effectiveSegments.push(trimmed)
      effectiveOffsets.push({ rawIndex, offsetInRaw: 0 })
      totalCount += 1
      return
    }
    const sentences = splitIntoSentences(trimmed)
    let buffer = ''
    sentences.forEach(sentence => {
      const candidate = buffer ? `${buffer}${sentence}` : sentence
      if (candidate.trim().length <= effectiveLimit) {
        buffer = candidate
      } else {
        if (buffer.trim()) {
          const chunk = buffer.trim()
          effectiveSegments.push(chunk)
          const needle = chunk.trimStart()
          let idx = raw.indexOf(needle, searchFrom)
          if (idx === -1) idx = searchFrom
          effectiveOffsets.push({ rawIndex, offsetInRaw: idx })
          searchFrom = idx + needle.length
          totalCount += 1
        }
        let fallback = sentence.trim()
        if (fallback.length > effectiveLimit) {
          const wordChunks = splitAtWordBoundaries(fallback, effectiveLimit)
          wordChunks.slice(0, -1).forEach(chunk => {
            const needle = chunk.trimStart()
            let idx = raw.indexOf(needle, searchFrom)
            if (idx === -1) idx = searchFrom
            effectiveSegments.push(chunk)
            effectiveOffsets.push({ rawIndex, offsetInRaw: idx })
            searchFrom = idx + needle.length
            totalCount += 1
          })
          fallback = wordChunks[wordChunks.length - 1]
        }
        buffer = fallback
      }
    })
    if (buffer.trim()) {
      const chunk = buffer.trim()
      effectiveSegments.push(chunk)
      const needle = chunk.trimStart()
      let idx = raw.indexOf(needle, searchFrom)
      if (idx === -1) idx = searchFrom
      effectiveOffsets.push({ rawIndex, offsetInRaw: idx })
      totalCount += 1
    }
  })

  return { effectiveSegments, rawToEffectiveStartIndex, effectiveOffsets }
}

function buildPreviewSegments (effectiveSegments, appendNumbering, limit) {
  const totalSegments = effectiveSegments.length || 1
  return effectiveSegments.map((segment, index) => {
    const trimmedEnd = segment.replace(/\s+$/u, '')
    const numbering = appendNumbering
      ? `\n\n${index + 1}/${totalSegments}`
      : ''
    const formattedContent = appendNumbering
      ? `${trimmedEnd}${numbering}`
      : trimmedEnd
    const characterCount = formattedContent.length
    const isEmpty = trimmedEnd.trim().length === 0
    const exceedsLimit =
      typeof limit === 'number' ? characterCount > limit : false

    return {
      id: index,
      raw: segment,
      formatted: formattedContent,
      characterCount,
      isEmpty,
      exceedsLimit
    }
  })
}

export function splitThread ({
  text = '',
  hardBreakMarker = '---',
  limit = null,
  appendNumbering = true
} = {}) {
  const rawSegments = splitThreadSource(text, hardBreakMarker)
  const {
    effectiveSegments,
    rawToEffectiveStartIndex,
    effectiveOffsets
  } = buildEffectiveSegments(rawSegments, limit, appendNumbering)
  const previewSegments = buildPreviewSegments(
    effectiveSegments,
    appendNumbering,
    limit
  )
  return {
    rawSegments,
    effectiveSegments,
    previewSegments,
    totalSegments: previewSegments.length,
    rawToEffectiveStartIndex,
    effectiveOffsets
  }
}

export {
  splitThreadSource,
  buildEffectiveSegments,
  buildPreviewSegments
}
