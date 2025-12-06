import { useEffect } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext';
import { useMediaLightbox } from '../../hooks/useMediaLightbox';
import { useComposer } from '../../hooks/useComposer';
import { useFeedPicker } from '../../hooks/useFeedPicker';
import { Button, MediaLightbox } from '../shared';
import { ConfirmDialog } from '@bsky-kampagnen-bot/shared-ui';
import { Composer, ComposeModal } from '../composer';
import FeedManager from './FeedManager.jsx';
import AuthorThreadUnrollModal from '../timeline/AuthorThreadUnrollModal.jsx';
import { useTranslation } from '../../i18n/I18nProvider.jsx';

export function Modals() {
  const { composeOpen, replyTarget, quoteTarget, confirmDiscard } = useAppState();
  const { mediaLightbox, closeMediaPreview, navigateMediaPreview } = useMediaLightbox();
  const dispatch = useAppDispatch();
  const { closeComposer, setQuoteTarget } = useComposer();
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
                : t('compose.titleNew', 'Neuer Post'))
        }
        actions={
          <div className='flex items-center gap-2'>
            <Button variant='secondary' onClick={() => dispatch({ type: 'SET_CONFIRM_DISCARD', payload: true })}>
              {t('compose.cancel', 'Abbrechen')}
            </Button>
            <Button form='bsky-composer-form' type='submit' variant='primary'>
              {t('compose.submit', 'Posten')}
            </Button>
          </div>
        }
      >
        <Composer
          reply={replyTarget}
          quote={quoteTarget}
          onCancelQuote={() => setQuoteTarget(null)}
          onSent={() => {
            closeComposer();
          }}
        />
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

    </>
  );
}
