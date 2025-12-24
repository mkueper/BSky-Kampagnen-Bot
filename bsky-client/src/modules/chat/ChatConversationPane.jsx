import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import BskyDetailPane from '../layout/BskyDetailPane.jsx'
import { Button, fetchChatConversation, fetchChatMessages, sendChatMessage, updateChatReadState, addChatReaction, removeChatReaction, InlineMenu, InlineMenuTrigger, InlineMenuContent, InlineMenuItem, RichText } from '../shared'
import { useAppDispatch } from '../../context/AppContext.jsx'
import { useUIState } from '../../context/UIContext.jsx'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { useBskyAuth } from '../auth/AuthContext.jsx'
import { buildConversationHandles, buildConversationTitle, getInitials } from './chatUtils.js'
import { ClipboardCopyIcon, DotsHorizontalIcon, ExitIcon, ExclamationTriangleIcon, FaceIcon, GlobeIcon, PersonIcon, SpeakerModerateIcon, SlashIcon, TrashIcon } from '@radix-ui/react-icons'
import { EmojiPicker } from '@kampagnen-bot/media-pickers'

const PAGE_SIZE = 40

export default function ChatConversationPane ({ registerLayoutHeader, renderHeaderInLayout = false }) {
  const { chatViewer } = useUIState()
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
                convoId={convoId}
                onReactionUpdate={(nextMessage) => {
                  if (!nextMessage?.id) return
                  mutateMessages((current) => {
                    if (!Array.isArray(current)) return current
                    return current.map((page) => {
                      if (!page?.messages?.length) return page
                      const updated = page.messages.map((entry) => {
                        if (!entry || entry.id !== nextMessage.id) return entry
                        return { ...entry, ...nextMessage }
                      })
                      return { ...page, messages: updated }
                    })
                  }, { revalidate: false })
                }}
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

function ChatMessageBubble ({ message, membersByDid, viewerDid, formatter, t, convoId, onReactionUpdate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const emojiButtonRef = useRef(null)
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
  const emojiLabel = t('chat.message.actions.emoji', 'Emoji senden')
  const menuLabel = t('chat.message.actions.more', 'Weitere Aktionen')
  const actionVisibility = menuOpen
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-100 pointer-events-auto sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto'
  const reactions = Array.isArray(message?.reactions) ? message.reactions : []
  const reactionsByValue = useMemo(() => {
    return reactions.reduce((map, reaction) => {
      const value = reaction?.value || ''
      if (!value) return map
      const entry = map.get(value) || { value, count: 0, senders: [] }
      entry.count += 1
      if (reaction?.sender?.did) entry.senders.push(reaction.sender.did)
      map.set(value, entry)
      return map
    }, new Map())
  }, [reactions])
  const groupedReactions = useMemo(() => Array.from(reactionsByValue.values()), [reactionsByValue])
  const viewerReaction = useMemo(() => {
    if (!viewerDid) return null
    const match = reactions.find((reaction) => reaction?.sender?.did === viewerDid)
    return match?.value || null
  }, [reactions, viewerDid])
  const handlePlaceholder = (label) => {
    console.info(`[ChatConversation] ${label}`)
  }
  const handleEmojiPick = async (emoji) => {
    const value = emoji?.native || emoji?.shortcodes || emoji?.id
    if (!value || !convoId || !message?.id) return
    setEmojiPickerOpen(false)
    try {
      if (viewerReaction && viewerReaction !== value) {
        const removed = await removeChatReaction({ convoId, messageId: message.id, value: viewerReaction })
        if (removed?.message) onReactionUpdate?.(removed.message)
      }
      if (viewerReaction === value) {
        const removed = await removeChatReaction({ convoId, messageId: message.id, value })
        if (removed?.message) onReactionUpdate?.(removed.message)
        return
      }
      const added = await addChatReaction({ convoId, messageId: message.id, value })
      if (added?.message) onReactionUpdate?.(added.message)
    } catch (error) {
      console.warn('[ChatConversation] reaction failed', error)
    }
  }

  return (
    <div className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div className='group flex max-w-[85%] items-start gap-2'>
        <div
          className={`relative rounded-2xl border px-3 py-2 text-sm shadow-sm ${
            groupedReactions.length ? 'pb-5' : ''
          } ${
            isSelf
              ? 'border-primary/40 bg-primary text-primary-foreground'
              : 'border-border bg-background text-foreground'
          }`}
        >
          <div className='mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide opacity-80'>
            <span>{senderLabel}</span>
            {timestamp ? <time>{timestamp}</time> : null}
          </div>
          <RichText text={body} facets={message?.facets || undefined} className='whitespace-pre-wrap break-words text-sm' />
          {groupedReactions.length ? (
            <div className={`absolute -bottom-3 ${isSelf ? 'right-2' : 'left-2'}`}>
              <div className='flex flex-wrap gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs shadow-sm'>
                {groupedReactions.map((reaction) => {
                  const active = viewerReaction === reaction.value
                  return (
                    <button
                      key={reaction.value}
                      type='button'
                      onClick={() => handleEmojiPick({ native: reaction.value })}
                      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 transition ${
                        active ? 'bg-primary/10 text-primary' : 'text-foreground'
                      }`}
                      title={reaction.value}
                    >
                      <span>{reaction.value}</span>
                      <span className='text-[11px] font-semibold'>{reaction.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
        <div className={`flex items-center gap-1 pt-1 transition-opacity ${actionVisibility}`}>
          <button
            type='button'
            aria-label={emojiLabel}
            title={emojiLabel}
            onClick={() => setEmojiPickerOpen((current) => !current)}
            aria-expanded={emojiPickerOpen}
            ref={emojiButtonRef}
            className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition hover:bg-background-subtle'
          >
            <FaceIcon className='h-4 w-4' />
          </button>
          <InlineMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <InlineMenuTrigger>
              <button
                type='button'
                aria-label={menuLabel}
                title={menuLabel}
                className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition hover:bg-background-subtle'
              >
                <DotsHorizontalIcon className='h-4 w-4' />
              </button>
            </InlineMenuTrigger>
            <InlineMenuContent align='end' side='bottom' sideOffset={8} className='w-60 space-y-1'>
              <InlineMenuItem icon={GlobeIcon} onSelect={() => handlePlaceholder('Nachricht übersetzen')}>
                {t('chat.message.actions.translate', 'Übersetzen')}
              </InlineMenuItem>
              <InlineMenuItem icon={ClipboardCopyIcon} onSelect={() => handlePlaceholder('Nachricht kopieren')}>
                {t('chat.message.actions.copyText', 'Nachrichtentext kopieren')}
              </InlineMenuItem>
              <div className='my-1 border-t border-border/60' />
              <InlineMenuItem icon={TrashIcon} onSelect={() => handlePlaceholder('Nachricht löschen')}>
                {t('chat.message.actions.deleteForMe', 'Für mich löschen')}
              </InlineMenuItem>
              <InlineMenuItem icon={ExclamationTriangleIcon} onSelect={() => handlePlaceholder('Nachricht melden')}>
                {t('chat.message.actions.report', 'Melden')}
              </InlineMenuItem>
            </InlineMenuContent>
          </InlineMenu>
        </div>
      </div>
      <EmojiPicker
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        anchorRef={emojiButtonRef}
        onPick={handleEmojiPick}
      />
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
