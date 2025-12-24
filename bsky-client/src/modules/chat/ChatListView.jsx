import { useMemo, useState, useCallback } from 'react'
import useSWRInfinite from 'swr/infinite'
import { Card, Button, InlineMenu, InlineMenuTrigger, InlineMenuContent, InlineMenuItem, fetchChatConversations } from '../shared'
import { DotsHorizontalIcon, PersonIcon, SpeakerModerateIcon, SlashIcon, ExclamationTriangleIcon, ExitIcon } from '@radix-ui/react-icons'
import { useTranslation } from '../../i18n/I18nProvider.jsx'
import { useBskyAuth } from '../auth/AuthContext.jsx'
import { useAppDispatch } from '../../context/AppContext.jsx'
import { useUIState } from '../../context/UIContext.jsx'
import { buildConversationTitle, buildConversationHandles, buildConversationPreview, getInitials } from './chatUtils.js'

const PAGE_SIZE = 30

export default function ChatListView () {
  const { t } = useTranslation()
  const { session } = useBskyAuth()
  const { chatViewer } = useUIState()
  const dispatch = useAppDispatch()
  const viewerDid = session?.did || null
  const [reloadTick, setReloadTick] = useState(0)
  const formatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short'
  }), [])

  const getKey = useCallback((pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.cursor) return null
    const cursor = pageIndex === 0 ? null : previousPageData?.cursor || null
    return ['bsky-chat-convos', viewerDid, reloadTick, cursor]
  }, [viewerDid, reloadTick])

  const fetchPage = useCallback(async ([, , , cursor]) => {
    return fetchChatConversations({
      cursor: cursor || undefined,
      limit: PAGE_SIZE
    })
  }, [])

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize
  } = useSWRInfinite(getKey, fetchPage, { revalidateFirstPage: false })

  const pages = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data])
  const conversations = useMemo(() => {
    if (!pages.length) return []
    return pages.flatMap((page) => Array.isArray(page?.conversations) ? page.conversations : [])
  }, [pages])

  const lastPage = pages[pages.length - 1] || null
  const hasMore = Boolean(lastPage?.cursor)
  const isLoadingInitial = isLoading && pages.length === 0
  const isLoadingMore = !isLoadingInitial && isValidating && hasMore

  const handleReload = useCallback(() => {
    setReloadTick((tick) => tick + 1)
    setSize(1)
  }, [setSize])

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingInitial || isLoadingMore) return
    setSize(size + 1)
  }, [hasMore, isLoadingInitial, isLoadingMore, setSize, size])

  const hasChats = conversations.length > 0
  const activeConversationId = chatViewer?.open ? chatViewer?.convoId : null

  const handleOpenConversation = useCallback((conversation) => {
    if (!conversation?.id) return
    dispatch({
      type: 'OPEN_CHAT_VIEWER',
      conversationId: conversation.id,
      conversation
    })
  }, [dispatch])

  return (
    <div className='space-y-4' data-component='BskyChatListView'>
      <p className='text-sm text-foreground-muted'>
        {t('chat.list.description', 'Deine laufenden Konversationen.')}
      </p>
      <Card padding='p-0'>
        {error ? (
          <div className='space-y-2 border-b border-border p-6 text-sm text-foreground'>
            <p className='font-semibold'>{t('chat.list.errorTitle', 'Fehler beim Laden deiner Chats.')}</p>
            <p>{error?.message || t('chat.list.errorBody', 'Chats konnten nicht geladen werden.')}</p>
            <Button variant='primary' size='pill' onClick={handleReload}>
              {t('common.actions.retry', 'Erneut versuchen')}
            </Button>
          </div>
        ) : null}

        {isLoadingInitial ? (
          <div className='p-6 text-sm text-foreground-muted'>
            {t('chat.list.loading', 'Chats werden geladen…')}
          </div>
        ) : null}

        {!isLoadingInitial && !error && !hasChats ? (
          <div className='p-6 text-center text-sm text-foreground-muted'>
            {t('chat.list.empty', 'Noch keine Chats vorhanden.')}
          </div>
        ) : null}

        {hasChats ? (
          <>
            <ul className='divide-y divide-border'>
              {conversations.map((conversation) => (
                <ChatListItem
                  key={conversation.id}
                  conversation={conversation}
                  formatter={formatter}
                  viewerDid={viewerDid}
                  t={t}
                  isActive={conversation.id === activeConversationId}
                  onOpenConversation={handleOpenConversation}
                />
              ))}
            </ul>
            {hasMore ? (
              <div className='flex justify-center border-t border-border bg-background-subtle p-3'>
                <Button variant='secondary' size='pill' onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? t('chat.list.loadingMore', 'Lädt…') : t('chat.list.loadMore', 'Mehr laden')}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </Card>
    </div>
  )
}

function ChatListItem ({ conversation, formatter, viewerDid, t, onOpenConversation, isActive = false }) {
  const participants = Array.isArray(conversation?.members) ? conversation.members : []
  const otherMembers = viewerDid ? participants.filter((member) => member?.did !== viewerDid) : participants
  const visibleMembers = otherMembers.length > 0 ? otherMembers : participants
  const primaryMember = visibleMembers[0] || participants[0] || null
  const avatarUrl = primaryMember?.avatar || null
  const initials = getInitials(primaryMember?.displayName || primaryMember?.handle || primaryMember?.did)
  const title = buildConversationTitle(visibleMembers, t)
  const subtitle = buildConversationHandles(visibleMembers)
  const preview = buildConversationPreview(conversation, participants, viewerDid, t)
  const timestamp = conversation?.lastActivityAt ? formatter.format(new Date(conversation.lastActivityAt)) : t('chat.list.noMessages', 'Keine Nachrichten')
  const hasUnread = (conversation?.unreadCount ?? 0) > 0
  const statusLabel = conversation?.status === 'request' ? t('chat.list.requestLabel', 'Anfrage') : null

  const showPlaceholder = (label) => {
    console.info(`[ChatListView] ${label} – ${conversation.id}`)
  }

  const handleViewProfile = () => showPlaceholder(t('chat.list.actions.viewProfile', 'Zum Profil'))
  const handleMuteConversation = () => showPlaceholder(t('chat.list.actions.muteConversation', 'Konversation stummschalten'))
  const handleBlockAccount = () => showPlaceholder(t('chat.list.actions.blockAccount', 'Account blockieren'))
  const handleReportConversation = () => showPlaceholder(t('chat.list.actions.reportConversation', 'Konversation melden'))
  const handleLeaveConversation = () => showPlaceholder(t('chat.list.actions.leaveConversation', 'Konversation verlassen'))

  return (
    <li className='flex w-full items-center px-2 py-1'>
      <button
        type='button'
        className={`flex flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-background-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive ? 'bg-background-subtle/70 ring-2 ring-primary/30' : ''}`}
        onClick={() => onOpenConversation?.(conversation)}
        aria-current={isActive ? 'true' : undefined}
        data-state={isActive ? 'active' : 'inactive'}
      >
        <span className='inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-base font-semibold text-foreground'>
          {avatarUrl
            ? (
              <img src={avatarUrl} alt='' className='h-12 w-12 rounded-full object-cover' />
              )
            : initials}
        </span>
        <div className={`flex flex-1 flex-col ${isActive ? 'opacity-100' : ''}`}>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-sm font-semibold text-foreground'>{title}</p>
            {subtitle ? <span className='text-xs text-foreground-muted truncate'>{subtitle}</span> : null}
            <span className='ml-auto inline-flex items-center gap-2 text-xs text-foreground-muted'>
              {statusLabel ? (
                <span className='inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground'>
                  {statusLabel}
                </span>
              ) : null}
              <span>{timestamp}</span>
            </span>
          </div>
          <div className='flex items-center gap-2 text-sm text-foreground-muted'>
            <span className='line-clamp-1'>{preview}</span>
            {hasUnread ? (
              <span className='ml-auto inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                {conversation.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      <ChatListItemMenu
        t={t}
        onViewProfile={handleViewProfile}
        onMuteConversation={handleMuteConversation}
        onBlockAccount={handleBlockAccount}
        onReportConversation={handleReportConversation}
        onLeaveConversation={handleLeaveConversation}
      />
    </li>
  )
}

function ChatListItemMenu ({
  t,
  onViewProfile,
  onMuteConversation,
  onBlockAccount,
  onReportConversation,
  onLeaveConversation
}) {
  const [open, setOpen] = useState(false)
  const moreLabel = t('chat.list.actions.more', 'Weitere Aktionen')

  return (
    <InlineMenu open={open} onOpenChange={setOpen}>
      <InlineMenuTrigger>
        <button
          type='button'
          aria-label={moreLabel}
          title={moreLabel}
          className='ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background-subtle dark:hover:bg-primary/10 hover:shadow-sm'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
        </button>
      </InlineMenuTrigger>
      <InlineMenuContent align='end' side='top' sideOffset={10} className='w-64 space-y-1'>
        <InlineMenuItem icon={PersonIcon} onSelect={onViewProfile}>
          {t('chat.list.actions.viewProfile', 'Zum Profil')}
        </InlineMenuItem>
        <InlineMenuItem icon={SpeakerModerateIcon} onSelect={onMuteConversation}>
          {t('chat.list.actions.muteConversation', 'Konversation stummschalten')}
        </InlineMenuItem>
        <div className='my-1 border-t border-border/60' />
        <InlineMenuItem icon={SlashIcon} onSelect={onBlockAccount}>
          {t('chat.list.actions.blockAccount', 'Account blockieren')}
        </InlineMenuItem>
        <InlineMenuItem icon={ExclamationTriangleIcon} onSelect={onReportConversation}>
          {t('chat.list.actions.reportConversation', 'Konversation melden')}
        </InlineMenuItem>
        <InlineMenuItem icon={ExitIcon} onSelect={onLeaveConversation}>
          {t('chat.list.actions.leaveConversation', 'Konversation verlassen')}
        </InlineMenuItem>
      </InlineMenuContent>
    </InlineMenu>
  )
}
