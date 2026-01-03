import { useCallback, useEffect, useMemo, useState } from 'react';
import { useComposerDispatch, useComposerState } from '../../context/ComposerContext.jsx';
import { useTimelineDispatch } from '../../context/TimelineContext.jsx';
import { useUIDispatch, useUIState } from '../../context/UIContext.jsx';
import { useMediaLightbox } from '../../hooks/useMediaLightbox';
import { useComposer } from '../../hooks/useComposer';
import { useClientConfig } from '../../hooks/useClientConfig.js'
import { useBskyAuth } from '../auth/AuthContext.jsx'
import { Button, MediaLightbox, publishPost } from '../shared';
import { ConfirmDialog } from '@bsky-kampagnen-bot/shared-ui';
import { Composer, ComposeModal } from '../composer';
import ReplyPreviewCard from '../composer/ReplyPreviewCard.jsx'
import { ThreadComposer } from '@bsky-kampagnen-bot/shared-ui'
import { buildReplyContext, buildReplyInfo } from '../composer/replyUtils.js'
import AuthorThreadUnrollModal from '../timeline/AuthorThreadUnrollModal.jsx';
import { useTranslation } from '../../i18n/I18nProvider.jsx';
import LoginView from '../login/LoginView.jsx'
import { useInteractionSettingsControls } from '../composer/useInteractionSettingsControls.js'
import PostInteractionSettingsModal from '../composer/PostInteractionSettingsModal.jsx'
import ClientSettingsModal from '../settings/ClientSettingsModal.jsx'
import { fetchLinkPreviewMetadata } from '../composer/linkPreviewService.js'
import NotificationSettingsModal from '../notifications/NotificationSettingsModal.jsx'
import ShareToChatModal from '../chat/ShareToChatModal.jsx'
import EmbedPostModal from '../timeline/EmbedPostModal.jsx'
import ReportPostModal from '../shared/ReportPostModal.jsx'

const THREAD_MEDIA_MAX_PER_SEGMENT = 4
const THREAD_MEDIA_MAX_BYTES = 8 * 1024 * 1024
const THREAD_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const THREAD_GIF_MAX_BYTES = 8 * 1024 * 1024
const THREAD_GIF_PICKER_STYLES = { panel: { width: '70vw', maxWidth: '1200px' } }

function resolveThreadSubmitError (segments = [], t) {
  const effective = Array.isArray(segments) ? segments : []
  const usable = effective.filter((segment) => {
    const text = String(segment?.formatted || segment?.raw || '').trim()
    const hasMedia = Array.isArray(segment?.mediaEntries) && segment.mediaEntries.length > 0
    return text.length > 0 || hasMedia
  })
  if (usable.length === 0) return t('compose.thread.empty', 'Thread ist leer.')
  if (usable.some((segment) => segment?.exceedsLimit)) {
    return t('compose.thread.exceedsLimit', 'Mindestens ein Segment überschreitet das Limit.')
  }
  return null
}

function buildThreadReplyContext (root, parent) {
  if (!root?.uri || !root?.cid || !parent?.uri || !parent?.cid) return null
  return {
    root: { uri: root.uri, cid: root.cid },
    parent: { uri: parent.uri, cid: parent.cid }
  }
}

export function Modals() {
  const { composeOpen, replyTarget, quoteTarget, confirmDiscard, composeMode, threadSource, threadAppendNumbering } = useComposerState();
  const { clientSettingsOpen, notificationsSettingsOpen, shareToChat, embedPost, reportPost } = useUIState();
  const { mediaLightbox, closeMediaPreview, navigateMediaPreview } = useMediaLightbox();
  const timelineDispatch = useTimelineDispatch()
  const composerDispatch = useComposerDispatch()
  const uiDispatch = useUIDispatch()
  const { clientConfig } = useClientConfig()
  const { closeComposer, setQuoteTarget, setThreadSource, setThreadAppendNumbering, setComposeMode } = useComposer();
  const { addAccount, cancelAddAccount } = useBskyAuth()
  const { t } = useTranslation();
  const [threadSending, setThreadSending] = useState(false)
  const [threadError, setThreadError] = useState('')
  const [threadMediaDraft, setThreadMediaDraft] = useState([])
  const {
    interactionSettings,
    data: interactionData,
    draft: interactionDraft,
    summary: interactionSummary,
    openModal: openInteractionModal,
    closeModal: closeInteractionModal,
    updateDraft: updateInteractionDraft,
    saveInteractions: saveInteractionChanges,
    loadLists,
    reloadSettings
  } = useInteractionSettingsControls(t)

  const tenorAvailable = useMemo(() => {
    const enabled = Boolean(clientConfig?.gifs?.tenorAvailable)
    const apiKey = String(clientConfig?.gifs?.tenorApiKey || '').trim()
    return enabled && Boolean(apiKey)
  }, [clientConfig?.gifs?.tenorAvailable, clientConfig?.gifs?.tenorApiKey])

  const tenorFetcher = useMemo(() => {
    const apiKey = String(clientConfig?.gifs?.tenorApiKey || '').trim()
    if (!apiKey) return null
    return async (endpoint, params) => {
      const safeEndpoint = String(endpoint || '').trim()
      if (!safeEndpoint) throw new Error('Tenor: endpoint fehlt.')
      const baseUrl = `https://tenor.googleapis.com/v2/${encodeURIComponent(safeEndpoint)}`
      const searchParams = new URLSearchParams(typeof params?.toString === 'function' ? params.toString() : '')
      searchParams.set('key', apiKey)
      searchParams.set('client_key', 'bsky-client')
      searchParams.set('media_filter', 'gif,tinygif,nanogif')
      const url = `${baseUrl}?${searchParams.toString()}`
      const res = await fetch(url)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Tenor Fehler: HTTP ${res.status} ${text}`.trim())
      }
      return res.json()
    }
  }, [clientConfig?.gifs?.tenorApiKey])

  const allowReplyPreview = clientConfig?.composer?.showReplyPreview !== false
  const requireAltText = clientConfig?.layout?.requireAltText === true
  const replyInfo = useMemo(() => buildReplyInfo(replyTarget), [replyTarget])
  const initialReplyContext = useMemo(() => buildReplyContext(replyTarget), [replyTarget])
  const threadPreviewLabels = useMemo(() => ({
    previewUnavailable: t('compose.previewUnavailableStandalone', 'Link-Vorschau ist im Standalone-Modus derzeit nicht verfügbar.'),
    previewLoading: t('compose.preview.loading', 'Lade Vorschau…'),
    previewError: t('compose.preview.error', 'Link-Vorschau konnte nicht geladen werden.'),
    previewTimeout: t('compose.preview.timeout', 'Link-Vorschau hat zu lange gebraucht.'),
    previewDismissTitle: t('compose.preview.dismiss', 'Link-Vorschau entfernen'),
    altRequired: t('compose.media.altRequired', 'Bitte ALT-Text für alle Medien hinzufügen.')
  }), [t])

  const effectiveComposeMode = useMemo(() => {
    return composeMode === 'thread' ? 'thread' : 'single'
  }, [composeMode])

  const handleThreadSubmit = useCallback(async (segments) => {
    const error = resolveThreadSubmitError(segments, t)
    if (error) {
      setThreadError(error)
      return
    }
    if (threadSending) return
    setThreadSending(true)
    setThreadError('')
    try {
      const effectiveSegments = (Array.isArray(segments) ? segments : []).map((segment) => {
        const text = String(segment?.formatted || segment?.raw || '').trim()
        const mediaEntries = Array.isArray(segment?.mediaEntries) ? segment.mediaEntries : []
        return { text, mediaEntries }
      })
      const usable = effectiveSegments.filter((segment) => segment.text.length > 0 || segment.mediaEntries.length > 0)
      const interactions = interactionData

      let root = null
      let parent = null
      let replyPatched = false
      for (let i = 0; i < usable.length; i++) {
        const { text: content, mediaEntries } = usable[i]
        const reply = i === 0 ? initialReplyContext : buildThreadReplyContext(root, parent)
        const res = await publishPost({ text: content, mediaEntries, reply, interactions })
        if (!res?.uri || !res?.cid) {
          throw new Error(t('compose.thread.sendFailed', 'Thread konnte nicht gesendet werden.'))
        }
        if (i === 0) root = res
        parent = res
        if (!replyPatched && reply?.parent?.uri) {
          timelineDispatch({ type: 'PATCH_POST_ENGAGEMENT', payload: { uri: reply.parent.uri, patch: { replyDelta: 1 } } })
          replyPatched = true
        }
      }
      setThreadSource('')
      setThreadMediaDraft([])
      closeComposer()
    } catch (e) {
      setThreadError(e?.message || t('compose.thread.sendFailed', 'Thread konnte nicht gesendet werden.'))
    } finally {
      setThreadSending(false)
    }
  }, [closeComposer, publishPost, t, threadSending, setThreadSource, interactionData, initialReplyContext, timelineDispatch])

  const handleThreadDraftTransfer = useCallback(({ text = '', media = [] } = {}) => {
    setThreadSource(text || '')
    setThreadMediaDraft(Array.isArray(media) ? media : [])
    setComposeMode('thread')
  }, [setComposeMode, setThreadSource])

  useEffect(() => {
    if (!composeOpen) {
      setThreadMediaDraft([])
    }
  }, [composeOpen])

  const handleDiscardDecision = useCallback((requiresConfirm) => {
    if (requiresConfirm) {
      composerDispatch({ type: 'SET_CONFIRM_DISCARD', payload: true })
    } else {
      closeComposer()
    }
  }, [closeComposer, composerDispatch])

  const handleComposerCancel = useCallback(({ hasContent }) => {
    handleDiscardDecision(Boolean(hasContent))
  }, [handleDiscardDecision])

  const handleCloseNotificationSettings = useCallback(() => {
    uiDispatch({ type: 'SET_NOTIFICATIONS_SETTINGS_OPEN', payload: false })
  }, [uiDispatch])

  const handleNotificationProfileOpen = useCallback(() => {
    // Modal bleibt offen; ProfileViewer kommt darüber.
  }, [])

  const handleThreadCancel = useCallback(() => {
    const hasThreadContent = Boolean((threadSource || '').trim())
    if (!hasThreadContent) {
      setThreadSource('')
    }
    const hasTransferMedia = threadMediaDraft.length > 0
    if (hasTransferMedia) {
      setThreadMediaDraft([])
    }
    handleDiscardDecision(hasThreadContent || hasTransferMedia)
  }, [threadMediaDraft.length, threadSource, setThreadSource, handleDiscardDecision])

  return (
    <>
      <ComposeModal
        open={composeOpen}
        title={
          replyTarget
            ? t('compose.titleReply', 'Antworten')
            : (quoteTarget
                ? t('compose.titleQuote', 'Post zitieren')
                : (effectiveComposeMode === 'thread'
                    ? t('compose.titleThread', 'Neuer Thread')
                    : t('compose.titleNew', 'Neuer Post')))
        }
      >
        {effectiveComposeMode === 'thread' ? (
          <div className='space-y-4'>
            {allowReplyPreview && replyInfo ? (
              <ReplyPreviewCard info={replyInfo} t={t} />
            ) : null}
            <div className='h-[64vh] min-h-[480px]'>
              <ThreadComposer
                className='h-full'
                value={threadSource || ''}
                onChange={(value) => setThreadSource(value)}
                maxLength={300}
                hardBreakMarker='---'
                appendNumbering={Boolean(threadAppendNumbering)}
                onToggleNumbering={(enabled) => setThreadAppendNumbering(Boolean(enabled))}
                disabled={threadSending}
                submitLabel={threadSending ? t('compose.thread.sending', 'Sende…') : t('compose.submit', 'Posten')}
                onSubmit={handleThreadSubmit}
                mediaMaxPerSegment={THREAD_MEDIA_MAX_PER_SEGMENT}
                mediaMaxBytes={THREAD_MEDIA_MAX_BYTES}
                mediaAllowedMimes={THREAD_ALLOWED_MIMES}
                mediaRequireAltText={requireAltText}
                gifPickerEnabled={tenorAvailable}
                gifPickerFetcher={tenorFetcher}
                gifPickerMaxBytes={THREAD_GIF_MAX_BYTES}
                gifPickerStyles={THREAD_GIF_PICKER_STYLES}
                footerAside={(
                  <div className='flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3'>
                    <button
                      type='button'
                      className='inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-background-elevated'
                      title={t('compose.interactions.buttonTitle', 'Interaktionen konfigurieren')}
                      onClick={openInteractionModal}
                      disabled={interactionSettings?.loading}
                    >
                      {interactionSettings?.loading
                        ? t('compose.interactions.loading', 'Lade Interaktionseinstellungen…')
                        : interactionSummary}
                    </button>
                    {interactionSettings?.error && !interactionSettings?.modalOpen ? (
                      <button
                        type='button'
                        className='text-xs font-semibold text-primary hover:underline'
                        onClick={reloadSettings}
                      >
                        {t('compose.interactions.retry', 'Erneut versuchen')}
                      </button>
                    ) : null}
                  </div>
                )}
                secondaryAction={
                  <Button type='button' variant='secondary' disabled={threadSending} onClick={handleThreadCancel}>
                    {t('compose.cancel', 'Abbrechen')}
                  </Button>
                }
                initialMediaEntries={threadMediaDraft}
                onInitialMediaApplied={() => setThreadMediaDraft([])}
                linkPreviewFetcher={fetchLinkPreviewMetadata}
                labels={threadPreviewLabels}
              />
            </div>
            {threadError ? (
              <p className='text-xs text-red-600'>{threadError}</p>
            ) : null}
          </div>
        ) : (
          <Composer
            reply={replyTarget}
            quote={quoteTarget}
            onCancelQuote={() => setQuoteTarget(null)}
            onSent={() => {
              closeComposer();
            }}
            onCancel={handleComposerCancel}
            onConvertToThread={handleThreadDraftTransfer}
          />
        )}
      </ComposeModal>

      <ConfirmDialog
        open={Boolean(composeOpen && confirmDiscard)}
        title={t('compose.discardTitle', 'Entwurf verwerfen')}
        description={t(
          'compose.discardMessage',
          'Bist du sicher, dass du diesen Entwurf verwerfen möchtest?'
        )}
        cancelLabel={t('compose.cancel', 'Abbrechen')}
        confirmLabel={t('compose.discardConfirm', 'Verwerfen')}
        variant='primary'
        onCancel={() => composerDispatch({ type: 'SET_CONFIRM_DISCARD', payload: false })}
        onConfirm={() => {
          composerDispatch({ type: 'SET_CONFIRM_DISCARD', payload: false });
          closeComposer();
        }}
      />

      {mediaLightbox.open ? (
        <MediaLightbox
          images={mediaLightbox.images}
          index={mediaLightbox.index}
          onClose={closeMediaPreview}
          onNavigate={navigateMediaPreview}
        />
      ) : null}


      <AuthorThreadUnrollModal />

      <LoginView
        variant='modal'
        open={Boolean(addAccount?.open)}
        prefill={addAccount?.prefill || null}
        onClose={cancelAddAccount}
      />

      <PostInteractionSettingsModal
        open={Boolean(interactionSettings?.modalOpen)}
        t={t}
        draft={interactionDraft}
        loading={Boolean(interactionSettings?.loading && !interactionSettings?.initialized)}
        saving={Boolean(interactionSettings?.saving)}
        error={interactionSettings?.modalOpen ? interactionSettings?.error : null}
        lists={{
          items: interactionSettings?.lists?.items || [],
          loading: Boolean(interactionSettings?.lists?.loading),
          error: interactionSettings?.lists?.error || null,
          loaded: Boolean(interactionSettings?.lists?.loaded)
        }}
        onClose={closeInteractionModal}
        onDraftChange={updateInteractionDraft}
        onLoadLists={loadLists}
        onSave={saveInteractionChanges}
      />
      <ClientSettingsModal
        open={Boolean(clientSettingsOpen)}
        onClose={() => uiDispatch({ type: 'SET_CLIENT_SETTINGS_OPEN', payload: false })}
      />
      <NotificationSettingsModal
        open={Boolean(notificationsSettingsOpen)}
        onClose={handleCloseNotificationSettings}
        onProfileOpen={handleNotificationProfileOpen}
      />
      <ShareToChatModal
        open={Boolean(shareToChat?.open)}
        item={shareToChat?.item}
        shareUrl={shareToChat?.shareUrl || ''}
        onClose={() => uiDispatch({ type: 'CLOSE_SHARE_TO_CHAT' })}
      />
      <EmbedPostModal
        open={Boolean(embedPost?.open)}
        item={embedPost?.item}
        shareUrl={embedPost?.shareUrl || ''}
        onClose={() => uiDispatch({ type: 'CLOSE_EMBED_POST' })}
      />
      <ReportPostModal
        open={Boolean(reportPost?.open)}
        subject={reportPost?.subject}
        onClose={() => uiDispatch({ type: 'CLOSE_REPORT_POST' })}
      />

    </>
  );
}
