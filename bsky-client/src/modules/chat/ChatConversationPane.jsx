import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import BskyDetailPane from '../layout/BskyDetailPane.jsx'
import { Button, fetchChatConversation, fetchChatMessages, sendChatMessage, updateChatReadState, InlineMenu, InlineMenuTrigger, InlineMenuContent, InlineMenuItem } from '../shared'
import { useAppDispatch, useAppState } from '../../context/AppContext.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { useBskyAuth } from '../auth/AuthContext.jsx'
import { buildConversationHandles, buildConversationTitle, getInitials } from './chatUtils.js'
import { DotsHorizontalIcon, PersonIcon, SpeakerModerateIcon, SlashIcon, ExclamationTriangleIcon, ExitIcon } from '@radix-ui/react-icons'

const PAGE_SIZE = 40

export default function ChatConversationPane ({ registerLayoutHeader, renderHeaderInLayout = false }) {
  const { chatViewer } = useAppState()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const { session } = useBskyAuth()
  const viewerDid = session?.did || null
  const convoId = chatViewer?.convoId || null
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const autoScrollRef = useRef(true)
  const initialScrollCompleteRef = useRef(false)
  const lastReadMessageIdRef = useRef(null)
  const scrollToBottom = useCallback(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [])

  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE_CHAT_VIEWER' })
  }, [dispatch])

  const handleOpenProfile = useCallback((member) => {
    if (!member) return
    const actor = member.did || member.handle || null
    if (!actor) return
    dispatch({ type: 'OPEN_PROFILE_VIEWER', actor })
  }, [dispatch])

  const {
    data: conversationData,
    error: conversationError,
    isLoading: conversationLoading,
    mutate: mutateConversation
  } = useSWR(
    convoId ? ['bsky-chat-convo', convoId] : null,
    () => fetchChatConversation({ convoId }),
    { revalidateOnFocus: false }
  )

  const conversation = conversationData?.conversation || chatViewer?.conversation || null

  const getMessagesKey = useCallback((pageIndex, previousPageData) => {
    if (!convoId) return null
    if (pageIndex > 0 && (!previousPageData || !previousPageData.cursor)) {
      return null
    }
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-chat-messages', convoId, cursor]
  }, [convoId])

  const {
    data: messagePagesRaw,
    error: messagesError,
    isLoading: messagesLoading,
    isValidating: messagesValidating,
    setSize,
    mutate: mutateMessages
  } = useSWRInfinite(
    getMessagesKey,
    ([, convo, cursor]) => fetchChatMessages({ convoId: convo, cursor: cursor || undefined, limit: PAGE_SIZE }),
    { revalidateFirstPage: true }
  )

  const messagePages = useMemo(
    () => (Array.isArray(messagePagesRaw) ? messagePagesRaw.filter(Boolean) : []),
    [messagePagesRaw]
  )

  const hasMore = Boolean(messagePages.length && messagePages[messagePages.length - 1]?.cursor)
  const orderedMessages = useMemo(() => {
    if (!messagePages.length) return []
    const pagesInChronologicalOrder = [...messagePages].reverse()
    return pagesInChronologicalOrder.flatMap((page) => {
      const entries = Array.isArray(page?.messages) ? page.messages : []
      return [...entries].reverse()
    })
  }, [messagePages])

  const members = Array.isArray(conversation?.members) ? conversation.members : []
  const otherMembers = useMemo(() => {
    if (!members.length) return members
    if (!viewerDid) return members
    return members.filter(member => member?.did !== viewerDid)
  }, [members, viewerDid])
  const displayMembers = otherMembers.length ? otherMembers : members
  const membersByDid = useMemo(() => {
    const map = new Map()
    members.forEach((member) => {
      if (member?.did) map.set(member.did, member)
    })
    return map
  }, [members])

  const formatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short'
  }), [])

  useEffect(() => {
    if (!chatViewer?.open) return
    autoScrollRef.current = true
    initialScrollCompleteRef.current = false
  }, [chatViewer?.open, convoId])

  useEffect(() => {
    if (!chatViewer?.open) return
    if (!orderedMessages.length) return
    if (!listRef.current) return
    if (!autoScrollRef.current && initialScrollCompleteRef.current) return

    const frame = requestAnimationFrame(() => {
      scrollToBottom()
    })
    initialScrollCompleteRef.current = true
    return () => cancelAnimationFrame(frame)
  }, [chatViewer?.open, convoId, orderedMessages, scrollToBottom])

  useEffect(() => {
    if (!convoId || !orderedMessages.length) return
    const newest = orderedMessages[orderedMessages.length - 1]
    if (!newest?.id || newest.type === 'deleted') return
    if (lastReadMessageIdRef.current === newest.id) return
    lastReadMessageIdRef.current = newest.id
    updateChatReadState({ convoId, messageId: newest.id }).catch(() => {})
  }, [convoId, orderedMessages])

  useEffect(() => {
    return () => {
      autoScrollRef.current = true
      lastReadMessageIdRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!chatViewer?.open) return
    const node = inputRef.current
    if (!node) return
    node.focus({ preventScroll: true })
  }, [chatViewer?.open, convoId])

  const handleLoadOlder = useCallback(() => {
    if (!hasMore || messagesLoading || messagesValidating) return
    autoScrollRef.current = false
    setSize((current) => current + 1)
  }, [hasMore, messagesLoading, messagesValidating, setSize])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!convoId) return
    const trimmed = draft.trim()
    if (!trimmed) return
    setSending(true)
    setSendError('')
    try {
      await sendChatMessage({
        convoId,
        text: trimmed
      })
      setDraft('')
      autoScrollRef.current = true
      await Promise.all([
        mutateMessages(),
        mutateConversation()
      ])
    } catch (error) {
      setSendError(error?.message || t('chat.conversation.sendError', 'Nachricht konnte nicht gesendet werden.'))
    } finally {
      setSending(false)
    }
  }, [convoId, draft, mutateConversation, mutateMessages, t])

  if (!chatViewer?.open || !convoId) return null

  const title = buildConversationTitle(displayMembers, t)
  const subtitle = buildConversationHandles(displayMembers) || t('chat.conversation.subtitleFallback', 'Direktnachrichten')
  const participantAvatars = displayMembers.map((member) => (
    <button
      key={member.did || member.handle}
      type='button'
      onClick={() => handleOpenProfile(member)}
      title={`${member.displayName || ''}${member.handle ? ` (@${member.handle})` : ''}`}
      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background-subtle text-xs font-semibold text-foreground transition hover:ring-2 hover:ring-primary/40'
    >
      {member.avatar
        ? <img src={member.avatar} alt='' className='h-8 w-8 rounded-full object-cover pointer-events-none' />
        : getInitials(member.displayName || member.handle || member.did)}
    </button>
  ))

  const showLoadingState = conversationLoading && !conversation
  const showMessagesLoading = messagesLoading && !orderedMessages.length
  const showEmptyState = !orderedMessages.length && !messagesLoading && !messagesError

  return (
    <BskyDetailPane
      header={{
        title,
        subtitle,
        onBack: handleClose,
        actions: otherMembers.length ? (
          <div className='flex items-center gap-2'>
            {participantAvatars.slice(0, 3)}
            <ChatConversationHeaderMenu t={t} onViewProfile={() => handleOpenProfile(otherMembers[0] || null)} />
          </div>
        ) : null
      }}
      bodyClassName='flex flex-col bg-background-subtle/60'
      registerLayoutHeader={registerLayoutHeader}
      renderHeaderInLayout={renderHeaderInLayout}
    >
      <div className='flex h-full flex-col'>
        <div
          className='flex-1 overflow-y-auto p-3'
          ref={listRef}
        >
          {conversationError ? (
            <div className='mb-3 rounded-2xl border border-border bg-background p-3 text-sm text-foreground'>
              <p className='font-semibold'>{t('chat.conversation.errorTitle', 'Konversation konnte nicht geladen werden.')}</p>
              <p>{conversationError?.message}</p>
            </div>
          ) : null}
          {hasMore ? (
            <div className='flex justify-center pb-3'>
              <Button variant='ghost' size='pill' onClick={handleLoadOlder} disabled={messagesLoading || messagesValidating}>
                {messagesValidating ? t('chat.conversation.loadingOlder', 'Lädt…') : t('chat.conversation.loadOlder', 'Ältere Nachrichten laden')}
              </Button>
            </div>
          ) : null}
          {showLoadingState || showMessagesLoading ? (
            <div className='py-6 text-center text-sm text-foreground-muted'>
              {t('chat.conversation.loading', 'Konversation wird geladen…')}
            </div>
          ) : null}
          {messagesError ? (
            <div className='pb-4 text-center text-sm text-danger'>
              {messagesError?.message || t('chat.conversation.errorTitle', 'Konversation konnte nicht geladen werden.')}
            </div>
          ) : null}
          {showEmptyState ? (
            <div className='py-6 text-center text-sm text-foreground-muted'>
              {t('chat.conversation.empty', 'Noch keine Nachrichten.')}
            </div>
          ) : null}
          <div className='flex flex-col gap-3'>
            {orderedMessages.map((message) => (
              <ChatMessageBubble
                key={message.id || `${message.senderDid}-${message.sentAt}`}
                message={message}
                membersByDid={membersByDid}
                viewerDid={viewerDid}
                formatter={formatter}
                t={t}
              />
            ))}
          </div>
        </div>
        <div className='border-t border-border bg-background/80 p-3'>
          {sendError ? (
            <p className='mb-2 text-sm text-danger'>{sendError}</p>
          ) : null}
          <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              className='w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50'
              placeholder={t('chat.conversation.inputPlaceholder', 'Nachricht schreiben…')}
            />
            <div className='flex items-center justify-end gap-2'>
              <Button
                type='submit'
                variant='primary'
                size='pill'
                disabled={sending || !draft.trim()}
              >
                {sending ? t('chat.conversation.sending', 'Senden…') : t('chat.conversation.send', 'Senden')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </BskyDetailPane>
  )
}

function ChatMessageBubble ({ message, membersByDid, viewerDid, formatter, t }) {
  const isDeleted = message?.type === 'deleted'
  const isSelf = viewerDid && message?.senderDid && message.senderDid === viewerDid
  const sender = message?.senderDid ? membersByDid.get(message.senderDid) : null
  const senderLabel = isSelf
    ? t('chat.list.preview.you', 'Du')
    : (sender?.displayName || (sender?.handle ? `@${sender.handle}` : message?.senderDid || t('chat.conversation.unknownSender', 'Unbekannt')))
  const timestamp = message?.sentAt ? formatter.format(new Date(message.sentAt)) : ''
  let body = ''
  if (isDeleted) {
    body = t('chat.conversation.deletedMessage', 'Nachricht gelöscht')
  } else if (message?.text?.trim()) {
    body = message.text.trim()
  } else if (message?.hasEmbed) {
    body = t('chat.list.preview.attachment', 'Anhang')
  } else {
    body = t('chat.list.preview.noText', 'Kein Text')
  }

  return (
    <div className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${
          isSelf
            ? 'border-primary/40 bg-primary text-primary-foreground'
            : 'border-border bg-background text-foreground'
        }`}
      >
        <div className='mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide opacity-80'>
          <span>{senderLabel}</span>
          {timestamp ? <time>{timestamp}</time> : null}
        </div>
        <p className='whitespace-pre-wrap break-words text-sm'>{body}</p>
      </div>
    </div>
  )
}

function ChatConversationHeaderMenu ({ t, onViewProfile }) {
  const [open, setOpen] = useState(false)
  const moreLabel = t('chat.list.actions.more', 'Weitere Aktionen')

  const handlePlaceholder = (label) => {
    console.info(`[ChatConversation] ${label}`)
  }

  return (
    <InlineMenu open={open} onOpenChange={setOpen}>
      <InlineMenuTrigger>
        <button
          type='button'
          aria-label={moreLabel}
          title={moreLabel}
          className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
        </button>
      </InlineMenuTrigger>
      <InlineMenuContent align='end' side='bottom' sideOffset={10} className='w-64 space-y-1'>
        <InlineMenuItem icon={PersonIcon} onSelect={() => onViewProfile?.()}>
          {t('chat.list.actions.viewProfile', 'Zum Profil')}
        </InlineMenuItem>
        <InlineMenuItem icon={SpeakerModerateIcon} onSelect={() => handlePlaceholder('Konversation stummschalten')}>
          {t('chat.list.actions.muteConversation', 'Konversation stummschalten')}
        </InlineMenuItem>
        <div className='my-1 border-t border-border/60' />
        <InlineMenuItem icon={SlashIcon} onSelect={() => handlePlaceholder('Account blockieren')}>
          {t('chat.list.actions.blockAccount', 'Account blockieren')}
        </InlineMenuItem>
        <InlineMenuItem icon={ExclamationTriangleIcon} onSelect={() => handlePlaceholder('Konversation melden')}>
          {t('chat.list.actions.reportConversation', 'Konversation melden')}
        </InlineMenuItem>
        <InlineMenuItem icon={ExitIcon} onSelect={() => handlePlaceholder('Konversation verlassen')}>
          {t('chat.list.actions.leaveConversation', 'Konversation verlassen')}
        </InlineMenuItem>
      </InlineMenuContent>
    </InlineMenu>
  )
}
