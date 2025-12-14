export { useClientConfig } from './hooks/useClientConfig.js'
export {
  splitThread,
  splitThreadSource,
  buildEffectiveSegments,
  buildPreviewSegments
} from './threadComposer.js'
export {
  buildSegmentMediaItems,
  countSegmentMedia
} from './segmentMedia.js'
export {
  NOTIFICATION_FILTER_ALL,
  NOTIFICATION_FILTER_MENTIONS,
  normalizeNotificationFilter,
  getMentionsReasons,
  isMentionsReason,
  isMentionNotification,
  getNotificationItemId
} from './notifications.js'

export { applyEngagementPatch } from './engagementPatch.js'
