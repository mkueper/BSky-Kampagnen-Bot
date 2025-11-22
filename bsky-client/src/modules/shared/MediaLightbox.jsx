import { Cross2Icon, ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import { parseAspectRatioValue } from './utils/media.js'

function isVideo (item) {
  if (!item) return false
  if (item?.type === 'video') return true
  if (typeof item?.src === 'string') {
    return /\.m3u8($|\?)/i.test(item.src) || /\.mp4($|\?)/i.test(item.src) || /\.webm($|\?)/i.test(item.src)
  }
  return false
}

export default function MediaLightbox ({ images = [], index = 0, onClose, onNavigate }) {
  const current = images[index] || null
  const videoActive = useMemo(() => isVideo(current), [current])
  const aspectRatio = useMemo(() => {
    if (!videoActive) return null
    return parseAspectRatioValue(current?.aspectRatio || current?.raw?.aspectRatio) || (16 / 9)
  }, [current, videoActive])
  const isHlsSource = useMemo(() => {
    if (!videoActive || typeof current?.src !== 'string') return false
    return /\.m3u8($|\?)/i.test(current.src)
  }, [current?.src, videoActive])
  const videoRef = useRef(null)
  const mediaContainerRef = useRef(null)
  const [mediaWidth, setMediaWidth] = useState(0)

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

  useEffect(() => {
    if (!videoActive || !current?.src || !videoRef.current) return undefined
    const videoEl = videoRef.current
    if (!isHlsSource) {
      if (videoEl.src !== current.src) {
        videoEl.src = current.src
        videoEl.load?.()
      }
      videoEl.play?.().catch(() => {})
      return undefined
    }
    const canPlayNative = typeof videoEl.canPlayType === 'function'
      ? videoEl.canPlayType('application/vnd.apple.mpegurl')
      : ''
    if (canPlayNative === 'probably' || canPlayNative === 'maybe') {
      if (videoEl.src !== current.src) {
        videoEl.src = current.src
        videoEl.load?.()
      }
      videoEl.play?.().catch(() => {})
      return undefined
    }
    if (!Hls.isSupported()) {
      console.warn('HLS wird nicht unterstützt und kann nicht abgespielt werden.')
      return undefined
    }
    const hls = new Hls()
    hls.loadSource(current.src)
    hls.attachMedia(videoEl)
    const handleReady = () => {
      videoEl.play?.().catch(() => {})
    }
    hls.on(Hls.Events.MANIFEST_PARSED, handleReady)
    return () => {
      hls.off(Hls.Events.MANIFEST_PARSED, handleReady)
      hls.destroy()
    }
  }, [current?.src, isHlsSource, videoActive])

  useEffect(() => {
    if (!mediaContainerRef.current || typeof ResizeObserver !== 'function') return undefined
    if (!current) return undefined
    const observer = new ResizeObserver((entries) => {
      const [{ contentRect }] = entries
      setMediaWidth(contentRect?.width || 0)
    })
    observer.observe(mediaContainerRef.current)
    return () => {
      observer.disconnect()
    }
  }, [current])

  if (!current) return null

  return (
    <div className='fixed inset-0 z-[999] flex items-center justify-center bg-black/10 backdrop-blur-sm p-4' data-component='BskyMediaLightbox'>
      <button
        type='button'
        className='absolute inset-0 h-full w-full cursor-zoom-out'
        aria-label='Schließen'
        onClick={onClose}
      />
      <div className='relative z-10 max-h-[90vh] max-w-[90vw] rounded-2xl bg-black/40 p-4 shadow-2xl backdrop-blur-sm pointer-events-auto'>
        <div className='flex w-full justify-center'>
          {videoActive ? (
            <div
              ref={mediaContainerRef}
              className='relative overflow-hidden rounded-xl'
              style={{
                width: aspectRatio ? `min(80vw, calc(80vh * ${aspectRatio}))` : '80vw',
                height: aspectRatio ? `min(80vh, calc(80vw / ${aspectRatio}))` : '80vh',
                maxWidth: '80vw',
                maxHeight: '80vh',
                backgroundColor: 'var(--background-subtle, #000)'
              }}
            >
              <video
                ref={videoRef}
                src={!isHlsSource ? current.src : undefined}
                poster={current.poster || current.thumb || ''}
                controls
                autoPlay
                playsInline
                loop
                className='h-full w-full object-contain'
                onClick={(event) => {
                  event.stopPropagation()
                }}
              />
            </div>
          ) : (
            <div
              ref={mediaContainerRef}
              className='relative'
              style={{ maxWidth: '80vw', maxHeight: '80vh' }}
            >
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
            </div>
          )}
        </div>
        {current.alt ? (
          <p
            className='mt-3 text-center text-sm text-white/80 break-words mx-auto'
            style={{ maxWidth: mediaWidth ? `${mediaWidth}px` : '80vw' }}
          >
            {current.alt}
          </p>
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
