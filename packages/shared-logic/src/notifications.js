export const NOTIFICATION_FILTER_ALL = 'all'
export const NOTIFICATION_FILTER_MENTIONS = 'mentions'

export function normalizeNotificationFilter(filter) {
  return filter === NOTIFICATION_FILTER_MENTIONS ? NOTIFICATION_FILTER_MENTIONS : NOTIFICATION_FILTER_ALL
}

export function getMentionsReasons() {
  return ['mention', 'reply']
}

export function isMentionsReason(reason) {
  return reason === 'mention' || reason === 'reply'
}

export function isMentionNotification(entry) {
  return isMentionsReason(entry?.reason)
}

export function getNotificationItemId(entry) {
  if (!entry) return null
  if (entry.listEntryId) return entry.listEntryId
  if (entry.groupKey) return entry.groupKey
  return entry.uri || entry.cid || entry.id || `${entry.reason}:${entry.reasonSubject}:${entry.indexedAt}`
}

