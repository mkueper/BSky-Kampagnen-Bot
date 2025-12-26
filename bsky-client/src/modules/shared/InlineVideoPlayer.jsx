import { useEffect, useMemo, useRef } from 'react'

let hlsLoaderPromise = null

function loadHls () {
  if (!hlsLoaderPromise) {
    hlsLoaderPromise = import('hls.js')
      .then((module) => module.default || module)
      .catch((error) => {
        hlsLoaderPromise = null
        throw error
      })
  }
  return hlsLoaderPromise
}

function isHlsSource (src) {
  return /\.m3u8($|\?)/i.test(src || '')
}

export default function InlineVideoPlayer ({ src = '', poster = '', autoPlay = true, className = '' }) {
  const videoRef = useRef(null)
  const isHls = useMemo(() => isHlsSource(src), [src])

  useEffect(() => {
    if (!src || !videoRef.current) return undefined
    const videoEl = videoRef.current
    if (!isHls) {
      if (videoEl.src !== src) {
        videoEl.src = src
        videoEl.load?.()
      }
      if (autoPlay) {
        videoEl.play?.().catch(() => {})
      }
      return undefined
    }

    const canPlayNative = typeof videoEl.canPlayType === 'function'
      ? videoEl.canPlayType('application/vnd.apple.mpegurl')
      : ''
    if (canPlayNative === 'probably' || canPlayNative === 'maybe') {
      if (videoEl.src !== src) {
        videoEl.src = src
        videoEl.load?.()
      }
      if (autoPlay) {
        videoEl.play?.().catch(() => {})
      }
      return undefined
    }

    let hls = null
    let mounted = true
    let handleReady = null
    ;(async () => {
      let Hls
      try {
        Hls = await loadHls()
      } catch (err) {
        console.warn('HLS import failed; cannot play inline sources.', err)
        return
      }
      if (!mounted) return
      if (!Hls.isSupported()) {
        console.warn('HLS wird nicht unterstützt und kann inline nicht abgespielt werden.')
        return
      }
      hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(videoEl)
      handleReady = () => {
        if (autoPlay) {
          videoEl.play?.().catch((playError) => {
            console.warn('Autoplay des HLS-Streams nicht möglich.', playError)
          })
        }
      }
      hls.on(Hls.Events.MANIFEST_PARSED, handleReady)
    })()

    return () => {
      mounted = false
      if (hls) {
        const manifestEvent = hls.Events?.MANIFEST_PARSED
        if (handleReady && typeof hls.off === 'function' && manifestEvent) {
          try {
            hls.off(manifestEvent, handleReady)
          } catch (cleanupError) {
            console.warn('HLS-Listener konnte nicht entfernt werden.', cleanupError)
          }
        }
        if (typeof hls.destroy === 'function') {
          try {
            hls.destroy()
          } catch (cleanupError) {
            console.warn('HLS-Instanz konnte nicht zerstört werden.', cleanupError)
          }
        }
        hls = null
      }
    }
  }, [autoPlay, isHls, src])

  return (
    <video
      ref={videoRef}
      src={!isHls ? src : undefined}
      poster={poster}
      controls
      autoPlay={autoPlay}
      playsInline
      className={className}
    />
  )
}
