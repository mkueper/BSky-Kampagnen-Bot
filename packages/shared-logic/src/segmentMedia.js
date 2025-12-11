function normalizeSegmentIndex (segmentIndex) {
  const num = Number(segmentIndex)
  return Number.isNaN(num) ? segmentIndex : num
}

function getSegmentBySequence (segments, segmentIndex) {
  if (!Array.isArray(segments)) return null
  const normalized = normalizeSegmentIndex(segmentIndex)
  return segments.find(
    seg => Number(seg?.sequence) === Number(normalized)
  )
}

function getPendingList (pendingMediaMap, segmentIndex) {
  if (
    !pendingMediaMap ||
    typeof pendingMediaMap !== 'object'
  ) {
    return []
  }
  const direct = pendingMediaMap[segmentIndex]
  if (Array.isArray(direct)) return direct
  const asString = pendingMediaMap[String(segmentIndex)]
  if (Array.isArray(asString)) return asString
  const asNumber = pendingMediaMap[Number(segmentIndex)]
  if (Array.isArray(asNumber)) return asNumber
  return []
}

export function buildSegmentMediaItems ({
  segmentIndex,
  existingSegments = [],
  pendingMediaMap = {},
  removedMediaMap = {},
  editedMediaAltMap = {}
}) {
  const items = []
  const segment = getSegmentBySequence(existingSegments, segmentIndex)
  if (segment && Array.isArray(segment.media)) {
    segment.media.forEach(mediaItem => {
      const id = mediaItem?.id
      if (id && removedMediaMap[id]) return
      if (!mediaItem?.previewUrl) return
      items.push({
        type: 'existing',
        id,
        src: mediaItem.previewUrl,
        alt: editedMediaAltMap[id] ?? mediaItem?.altText ?? '',
        pendingIndex: null
      })
    })
  }
  const pendingList = getPendingList(pendingMediaMap, segmentIndex)
  pendingList.forEach((mediaItem, idx) => {
    if (!mediaItem) return
    items.push({
      type: 'pending',
      id: null,
      tempId: mediaItem.tempId ?? `${segmentIndex}-pending-${idx}`,
      src: mediaItem.previewUrl || mediaItem.data || '',
      alt: mediaItem.altText || '',
      pendingIndex: idx
    })
  })
  return items
}

export function countSegmentMedia ({
  segmentIndex,
  existingSegments = [],
  pendingMediaMap = {},
  removedMediaMap = {}
}) {
  const segment = getSegmentBySequence(existingSegments, segmentIndex)
  let existingCount = 0
  if (segment && Array.isArray(segment.media)) {
    existingCount = segment.media.reduce((sum, mediaItem) => {
      const id = mediaItem?.id
      if (id && removedMediaMap[id]) return sum
      return mediaItem ? sum + 1 : sum
    }, 0)
  }
  const pendingCount = getPendingList(pendingMediaMap, segmentIndex).length
  return existingCount + pendingCount
}
