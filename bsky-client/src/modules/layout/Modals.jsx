import { useAppState, useAppDispatch } from '../../context/AppContext';
import { useMediaLightbox } from '../../hooks/useMediaLightbox';
import { useComposer } from '../../hooks/useComposer';
import { Button, MediaLightbox } from '../shared';
import { Composer, ComposeModal } from '../composer';

export function Modals() {
  const { composeOpen, replyTarget, quoteTarget, confirmDiscard } = useAppState();
  const { mediaLightbox, closeMediaPreview, navigateMediaPreview } = useMediaLightbox();
  const dispatch = useAppDispatch();
  const { closeComposer, setQuoteTarget } = useComposer();

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
          <div className='relative z-50 w-[min(520px,92vw)] rounded-2xl border border-border bg-background p-5 shadow-card'>
            <h4 className='text-lg font-semibold text-foreground'>Entwurf verwerfen</h4>
            <p className='mt-2 text-sm text-foreground-muted'>Bist du sicher, dass du diesen Entwurf verwerfen moechtest?</p>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='secondary' onClick={() => dispatch({ type: 'SET_CONFIRM_DISCARD', payload: false })}>Abbrechen</Button>
              <Button variant='primary' onClick={() => {
                dispatch({ type: 'SET_CONFIRM_DISCARD', payload: false });
                closeComposer();
              }}>Verwerfen</Button>
            </div>
          </div>
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
    </>
  );
}
