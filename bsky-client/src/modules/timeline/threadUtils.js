export function buildAuthorTimeline (threadData) {
  if (!threadData) return []
  const focus = threadData?.focus || null
  const parents = Array.isArray(threadData?.parents) ? threadData.parents : []
  if (!focus) return []
  const threadAuthorDid = focus?.author?.did || parents[0]?.author?.did || null
  const timeline = []
  const filteredParents = parents.filter((parent) => !threadAuthorDid || parent?.author?.did === threadAuthorDid)
  for (const parent of filteredParents) {
    timeline.push(parent)
  }
  timeline.push(focus)
  const collectOwnReplies = (node) => {
    const replies = Array.isArray(node?.replies) ? node.replies : []
    const ownReplies = replies
      .filter((reply) => reply?.author?.did && reply.author.did === threadAuthorDid)
      .sort((a, b) => toTimestamp(a) - toTimestamp(b))
    for (const reply of ownReplies) {
      timeline.push(reply)
      collectOwnReplies(reply)
    }
  }
  collectOwnReplies(focus)
  return timeline
}

export function toTimestamp (node) {
  const created = node?.createdAt || node?.record?.createdAt || node?.raw?.post?.record?.createdAt || node?.raw?.post?.indexedAt
  const fallback = node?.indexedAt || node?.raw?.post?.indexedAt
  return Date.parse(created || fallback || '') || 0
}
