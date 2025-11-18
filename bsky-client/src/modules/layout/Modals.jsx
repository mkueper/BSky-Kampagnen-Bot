import { useEffect, lazy, Suspense } from 'react';
import { useAppState, useAppDispatch } from '../../context/AppContext';
import { useMediaLightbox } from '../../hooks/useMediaLightbox';
import { useComposer } from '../../hooks/useComposer';
import { useFeedPicker } from '../../hooks/useFeedPicker';
import { Button, MediaLightbox, Card } from '../shared';
import { Composer, ComposeModal } from '../composer';
import FeedManager from './FeedManager.jsx';
import ProfileMetaSkeleton from '../profile/ProfileMetaSkeleton.jsx';

const ProfileViewLazy = lazy(async () => {
  const module = await import('../profile/ProfileView');
  return { default: module.ProfileView ?? module.default };
});

export function Modals() {
  const { composeOpen, replyTarget, quoteTarget, confirmDiscard, profileViewer } = useAppState();
  const { mediaLightbox, openMediaPreview, closeMediaPreview, navigateMediaPreview } = useMediaLightbox();
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
        title={replyTarget ? 'Antworten' : (quoteTarget ? 'Post zitieren' : 'Neuer Post')}
        actions={
          <div className='flex items-center gap-2'>
            <Button variant='secondary' onClick={() => dispatch({ type: 'SET_CONFIRM_DISCARD', payload: true })}>Abbrechen</Button>
            <Button form='bsky-composer-form' type='submit' variant='primary'>Posten</Button>
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

      {composeOpen && confirmDiscard ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => dispatch({ type: 'SET_CONFIRM_DISCARD', payload: false })} aria-hidden='true' />
          <Card as='div' padding='p-5' className='relative z-50 w-[min(520px,92vw)] shadow-card'>
            <h4 className='text-lg font-semibold text-foreground'>Entwurf verwerfen</h4>
            <p className='mt-2 text-sm text-foreground-muted'>Bist du sicher, dass du diesen Entwurf verwerfen moechtest?</p>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='secondary' onClick={() => dispatch({ type: 'SET_CONFIRM_DISCARD', payload: false })}>Abbrechen</Button>
              <Button variant='primary' onClick={() => {
                dispatch({ type: 'SET_CONFIRM_DISCARD', payload: false });
                closeComposer();
              }}>Verwerfen</Button>
            </div>
          </Card>
        </div>
      ) : null}

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

      {profileViewer?.open ? (
        <div className='fixed inset-0 z-50'>
          <div
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            onClick={() => dispatch({ type: 'CLOSE_PROFILE_VIEWER' })}
            aria-hidden='true'
          />
          <div className='relative z-50 flex h-full w-full items-center justify-center p-0 sm:p-4'>
            <div className='mx-auto flex h-full w-full max-w-2xl overflow-hidden rounded-none bg-background shadow-2xl sm:rounded-2xl'>
              <Suspense fallback={
                <div className='flex h-full w-full items-center justify-center p-4'>
                  <ProfileMetaSkeleton />
                </div>
              }>
                <ProfileViewLazy
                  actor={profileViewer.actor}
                  onClose={() => dispatch({ type: 'CLOSE_PROFILE_VIEWER' })}
                  onViewMedia={openMediaPreview}
                />
              </Suspense>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
