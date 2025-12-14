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

      let root = null
      let parent = null
      for (let i = 0; i < usable.length; i++) {
        const content = usable[i]
        const reply = i === 0 ? null : buildThreadReplyContext(root, parent)
        const res = await publishPost({ text: content, reply })
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

  return (
    <>
      <ComposeModal
        open={composeOpen}
        onClose={() => {
          closeComposer();
        }}
        title={
          replyTarget
            ? t('compose.titleReply', 'Antworten')
            : (quoteTarget
                ? t('compose.titleQuote', 'Post zitieren')
                : (effectiveComposeMode === 'thread'
                    ? t('compose.titleThread', 'Neuer Thread')
                    : t('compose.titleNew', 'Neuer Post')))
        }
        actions={
          <div className='flex items-center gap-2'>
            <Button variant='secondary' onClick={() => dispatch({ type: 'SET_CONFIRM_DISCARD', payload: true })}>
              {t('compose.cancel', 'Abbrechen')}
            </Button>
            {effectiveComposeMode !== 'thread' ? (
              <Button form='bsky-composer-form' type='submit' variant='primary'>
                {t('compose.submit', 'Posten')}
              </Button>
            ) : null}
          </div>
        }
      >
        {effectiveComposeMode === 'thread' ? (
          <div className='space-y-3'>
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

    </>
  );
}
