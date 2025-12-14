function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function applyEngagementPatch({ viewer = null, stats = null } = {}, patch = {}) {
  const nextViewer = viewer && typeof viewer === 'object' ? { ...viewer } : {}
  const nextStats = stats && typeof stats === 'object' ? { ...stats } : {}

  if (Object.prototype.hasOwnProperty.call(patch, 'likeUri')) {
    nextViewer.like = patch.likeUri || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'repostUri')) {
    nextViewer.repost = patch.repostUri || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'bookmarked')) {
    nextViewer.bookmarked = Boolean(patch.bookmarked)
  }

  if (patch.likeCount != null) nextStats.likeCount = toNumber(patch.likeCount, nextStats.likeCount ?? 0)
  if (patch.repostCount != null) nextStats.repostCount = toNumber(patch.repostCount, nextStats.repostCount ?? 0)
  if (patch.replyCount != null) nextStats.replyCount = toNumber(patch.replyCount, nextStats.replyCount ?? 0)

  if (patch.likeDelta != null) nextStats.likeCount = Math.max(0, toNumber(nextStats.likeCount, 0) + toNumber(patch.likeDelta, 0))
  if (patch.repostDelta != null) nextStats.repostCount = Math.max(0, toNumber(nextStats.repostCount, 0) + toNumber(patch.repostDelta, 0))
  if (patch.replyDelta != null) nextStats.replyCount = Math.max(0, toNumber(nextStats.replyCount, 0) + toNumber(patch.replyDelta, 0))

  return {
    viewer: nextViewer,
    stats: nextStats
  }
}

