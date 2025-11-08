import { Cross2Icon, ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { useEffect } from 'react'

export default function MediaLightbox ({ images = [], index = 0, onClose, onNavigate }) {
  const current = images[index] || null

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onNavigate?.('prev')
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNavigate?.('next')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onNavigate])

  if (!current) return null

  return (
    <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4' data-component='BskyMediaLightbox'>
      <button
        type='button'
        className='absolute inset-0 h-full w-full cursor-zoom-out'
        aria-label='Schließen'
        onClick={onClose}
      />
      <div className='relative z-10 max-h-[90vh] max-w-[90vw] rounded-2xl bg-background/10 p-4 shadow-2xl backdrop-blur-sm'>
        <img
          src={current.src}
          alt={current.alt || ''}
          className='max-h-[80vh] max-w-[80vw] cursor-zoom-out object-contain rounded-xl'
          loading='lazy'
          onClick={(event) => {
            event.stopPropagation()
            onClose?.()
          }}
        />
        {current.alt ? (
          <p className='mt-3 text-center text-sm text-white/80'>{current.alt}</p>
        ) : null}
        <button
          type='button'
          className='absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80'
          aria-label='Schließen'
          onClick={onClose}
        >
          <Cross2Icon className='h-5 w-5' />
        </button>
        {images.length > 1 ? (
          <>
            <button
              type='button'
              className='absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80'
              onClick={() => onNavigate?.('prev')}
              aria-label='Vorheriges Bild'
            >
              <ChevronLeftIcon className='h-5 w-5' />
            </button>
            <button
              type='button'
              className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80'
              onClick={() => onNavigate?.('next')}
              aria-label='Nächstes Bild'
            >
              <ChevronRightIcon className='h-5 w-5' />
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
