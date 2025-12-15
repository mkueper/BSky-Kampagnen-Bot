export function getInitials (value) {
  if (!value) return '•'
  const trimmed = String(value).trim()
  if (!trimmed) return '•'
  return trimmed
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function buildConversationTitle (members, t) {
  if (!members?.length) return t('chat.list.untitled', 'Konversation')
  const labels = members
    .map((member) => member?.displayName || member?.handle || member?.did || '')
    .filter(Boolean)
  if (!labels.length) return t('chat.list.untitled', 'Konversation')
  if (labels.length <= 2) return labels.join(', ')
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
}

export function buildConversationHandles (members) {
  if (!members?.length) return ''
  const handles = members
    .map((member) => member?.handle ? `@${member.handle}` : member?.did || '')
    .filter(Boolean)
  if (!handles.length) return ''
  if (handles.length <= 2) return handles.join(', ')
  return `${handles.slice(0, 2).join(', ')}`
}

export function buildConversationPreview (conversation, participants, viewerDid, t) {
  const lastMessage = conversation?.lastMessage
  if (!lastMessage) {
    return t('chat.list.noMessages', 'Keine Nachrichten')
  }
  const senderDid = lastMessage?.senderDid
  const senderProfile = senderDid ? participants.find((member) => member?.did === senderDid) : null
  const youLabel = t('chat.list.preview.you', 'Du')
  const senderLabel = senderDid
    ? (senderDid === viewerDid
        ? youLabel
        : (senderProfile?.displayName || (senderProfile?.handle ? `@${senderProfile.handle}` : senderDid)))
    : null

  let body = ''
  if (lastMessage.type === 'message') {
    if (lastMessage.text?.trim()) {
      body = lastMessage.text.trim()
    } else if (lastMessage.hasEmbed) {
      body = t('chat.list.preview.attachment', 'Anhang')
    } else {
      body = t('chat.list.preview.noText', 'Kein Text')
    }
  } else if (lastMessage.type === 'deleted') {
    body = t('chat.list.preview.deleted', 'Nachricht gelöscht')
  } else {
    body = t('chat.list.preview.noText', 'Kein Text')
  }

  return senderLabel ? `${senderLabel}: ${body}` : body
}
