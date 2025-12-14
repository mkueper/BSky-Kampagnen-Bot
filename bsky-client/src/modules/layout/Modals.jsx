import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext';
import { useMediaLightbox } from '../../hooks/useMediaLightbox';
import { useComposer } from '../../hooks/useComposer';
import { useFeedPicker } from '../../hooks/useFeedPicker';
import { useBskyAuth } from '../auth/AuthContext.jsx'
import { Button, MediaLightbox, publishPost } from '../shared';
import { ConfirmDialog } from '@bsky-kampagnen-bot/shared-ui';
import { Composer, ComposeModal } from '../composer';
import { ThreadComposer } from '@bsky-kampagnen-bot/shared-ui'
import FeedManager from './FeedManager.jsx';
import AuthorThreadUnrollModal from '../timeline/AuthorThreadUnrollModal.jsx';
import { useTranslation } from '../../i18n/I18nProvider.jsx';
import LoginView from '../login/LoginView.jsx'
import { useInteractionSettingsControls } from '../composer/useInteractionSettingsControls.js'
import PostInteractionSettingsModal from '../composer/PostInteractionSettingsModal.jsx'

function resolveThreadSubmitError (segments = [], t) {
  const effective = Array.isArray(segments) ? segments : []
  const usable = effective.filter((segment) => String(segment?.formatted || segment?.raw || '').trim().length > 0)
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
  const { composeOpen, replyTarget, quoteTarget, confirmDiscard, composeMode, threadSource, threadAppendNumbering } = useAppState();
  const { mediaLightbox, closeMediaPreview, navigateMediaPreview } = useMediaLightbox();
  const dispatch = useAppDispatch();
  const { closeComposer, setQuoteTarget, setThreadSource, setThreadAppendNumbering } = useComposer();
  const { addAccount, cancelAddAccount } = useBskyAuth()
  const {
    feedPicker,
    feedManagerOpen,
    refreshFeeds,
    pinFeed,
    unpinFeed,
    reorderPinnedFeeds,
    closeFeedManager
  } = useFeedPicker();
  const { t } = useTranslation();
  const [threadSending, setThreadSending] = useState(false)
  const [threadError, setThreadError] = useState('')
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

  const effectiveComposeMode = useMemo(() => {
    if (replyTarget || quoteTarget) return 'single'
    return composeMode === 'thread' ? 'thread' : 'single'
  }, [composeMode, quoteTarget, replyTarget])

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
      const usable = segments
        .filter((segment) => String(segment?.formatted || segment?.raw || '').trim().length > 0)
        .map((segment) => String(segment.formatted || segment.raw || '').trim())
      const interactions = interactionData

      let root = null
      let parent = null
      for (let i = 0; i < usable.length; i++) {
        const content = usable[i]
        const reply = i === 0 ? null : buildThreadReplyContext(root, parent)
        const res = await publishPost({ text: content, reply, interactions })
        if (!res?.uri || !res?.cid) {
          throw new Error(t('compose.thread.sendFailed', 'Thread konnte nicht gesendet werden.'))
        }
        if (i === 0) root = res
        parent = res
      }
      setThreadSource('')
      closeComposer()
    } catch (e) {
      setThreadError(e?.message || t('compose.thread.sendFailed', 'Thread konnte nicht gesendet werden.'))
    } finally {
      setThreadSending(false)
    }
  }, [closeComposer, publishPost, t, threadSending, setThreadSource])

  useEffect(() => {
    if (feedManagerOpen) {
      refreshFeeds({ force: true });
    }
  }, [feedManagerOpen, refreshFeeds]);

  const handleDiscardDecision = useCallback((requiresConfirm) => {
    if (requiresConfirm) {
      dispatch({ type: 'SET_CONFIRM_DISCARD', payload: true })
    } else {
      closeComposer()
    }
  }, [closeComposer, dispatch])

  const handleComposerCancel = useCallback(({ hasContent }) => {
    handleDiscardDecision(Boolean(hasContent))
  }, [handleDiscardDecision])

  const handleThreadCancel = useCallback(() => {
    const hasThreadContent = Boolean((threadSource || '').trim())
    if (!hasThreadContent) {
      setThreadSource('')
    }
    handleDiscardDecision(hasThreadContent)
  }, [threadSource, setThreadSource, handleDiscardDecision])

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
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <button
                type='button'
                className='inline-flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-background-elevated disabled:opacity-60 md:flex-none'
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
                submitLabel={threadSending ? t('compose.thread.sending', 'Sende…') : t('compose.thread.submit', 'Thread posten')}
                onSubmit={handleThreadSubmit}
                secondaryAction={
                  <Button type='button' variant='secondary' disabled={threadSending} onClick={handleThreadCancel}>
                    {t('compose.cancel', 'Abbrechen')}
                  </Button>
                }
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
        onCancel={() => dispatch({ type: 'SET_CONFIRM_DISCARD', payload: false })}
        onConfirm={() => {
          dispatch({ type: 'SET_CONFIRM_DISCARD', payload: false });
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

      {feedManagerOpen ? (
        <FeedManager
          open={feedManagerOpen}
          loading={feedPicker.loading}
          error={feedPicker.error}
          feeds={feedPicker}
          onClose={closeFeedManager}
          onRefresh={() => refreshFeeds({ force: true })}
          onPin={pinFeed}
          onUnpin={unpinFeed}
          onReorder={reorderPinnedFeeds}
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

    </>
  );
}
