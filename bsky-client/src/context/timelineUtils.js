import { applyEngagementPatch } from '@bsky-kampagnen-bot/shared-logic'

export function patchObjectIfMatches (obj, targetUri, patch) {
  if (!obj || typeof obj !== 'object') return obj
  if (!targetUri) return obj

  const uri = obj?.uri || obj?.raw?.post?.uri || obj?.raw?.item?.uri || null
  if (uri !== targetUri) return obj

  let changed = false
  const next = { ...obj }

  if (obj?.stats || obj?.viewer) {
    const { viewer, stats } = applyEngagementPatch(
      { viewer: obj?.viewer || null, stats: obj?.stats || null },
      patch
    )
    if (viewer && viewer !== obj.viewer) {
      next.viewer = viewer
      changed = true
    }
    if (stats && stats !== obj.stats) {
      next.stats = stats
      changed = true
    }
  }

  if (obj?.record && typeof obj.record === 'object') {
    const recordStats = obj.record?.stats || null
    const recordViewer = obj.record?.viewer || null
    const { viewer, stats } = applyEngagementPatch({ viewer: recordViewer, stats: recordStats }, patch)
    if (viewer !== recordViewer || stats !== recordStats) {
      next.record = { ...obj.record, ...(viewer !== recordViewer ? { viewer } : {}), ...(stats !== recordStats ? { stats } : {}) }
      changed = true
    }
  }

  const rawPost = obj?.raw?.post
  if (rawPost && typeof rawPost === 'object') {
    const rawViewer = rawPost.viewer || null
    const rawStats = {
      likeCount: rawPost.likeCount,
      repostCount: rawPost.repostCount,
      replyCount: rawPost.replyCount
    }
    const { viewer, stats } = applyEngagementPatch({ viewer: rawViewer, stats: rawStats }, patch)
    const nextRawPost = { ...rawPost }
    let rawChanged = false
    if (viewer !== rawViewer) {
      nextRawPost.viewer = viewer
      rawChanged = true
    }
    if (stats.likeCount !== rawPost.likeCount) {
      nextRawPost.likeCount = stats.likeCount
      rawChanged = true
    }
    if (stats.repostCount !== rawPost.repostCount) {
      nextRawPost.repostCount = stats.repostCount
      rawChanged = true
    }
    if (stats.replyCount !== rawPost.replyCount) {
      nextRawPost.replyCount = stats.replyCount
      rawChanged = true
    }
    if (rawChanged) {
      next.raw = { ...(obj.raw || {}), post: nextRawPost }
      changed = true
    }
  }

  return changed ? next : obj
}

export function patchThreadNode (node, targetUri, patch) {
  if (!node || typeof node !== 'object') return node
  const patchedNode = patchObjectIfMatches(node, targetUri, patch)
  const replies = Array.isArray(patchedNode?.replies) ? patchedNode.replies : null
  if (!replies) return patchedNode
  let repliesChanged = false
  const nextReplies = replies.map((reply) => {
    const nextReply = patchThreadNode(reply, targetUri, patch)
    if (nextReply !== reply) repliesChanged = true
    return nextReply
  })
  if (!repliesChanged) return patchedNode
  return { ...patchedNode, replies: nextReplies }
}
