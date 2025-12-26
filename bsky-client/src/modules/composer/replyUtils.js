export function buildReplyInfo (reply) {
  if (!reply || !reply.uri) return null
  const author = reply.author || reply?.raw?.post?.author || {}
  const record = reply.record || reply?.raw?.post?.record || {}
  const textValue = reply.text ?? record?.text ?? ''
  return {
    uri: String(reply.uri),
    cid: String(reply.cid || record?.cid || ''),
    text: String(textValue || ''),
    author: {
      displayName: author.displayName || author.handle || '',
      handle: author.handle || '',
      avatar: author.avatar || null
    }
  }
}

export function buildReplyContext (reply) {
  if (!reply || !reply.uri || !reply.cid) return null
  const parent = { uri: reply.uri, cid: reply.cid }
  const rootReply = reply.raw?.post?.record?.reply?.root
  const root = rootReply && rootReply.uri && rootReply.cid ? rootReply : parent
  return { root, parent }
}
