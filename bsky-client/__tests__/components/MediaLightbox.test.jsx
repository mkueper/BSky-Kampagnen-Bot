import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Sicherstellen, dass React global verfügbar ist, damit JSX
// in Modulen ohne expliziten React-Import in der Testumgebung funktioniert.
// eslint-disable-next-line no-undef
globalThis.React = React
/**
 * Testgruppe: MediaLightbox.test.jsx
 *
 * Diese Tests überprüfen:
 * - Keyboard-Navigation (Escape, Pfeiltasten)
 * - Mausklick-Navigation (Vorheriges/Nächstes Bild)
 * - Darstellungen für Bild vs. Video (Grundpfad)
 *
 * Kontext:
 * Ergänzt die Tests für useMediaLightbox um die UI-Ebene
 * der Media-Lightbox-Komponente.
 */
import MediaLightbox from '../../src/modules/shared/MediaLightbox.jsx'
import { I18nProvider } from '../../src/i18n/I18nProvider.jsx'

const renderWithI18n = (ui) =>
  render(
    <I18nProvider initialLocale='de'>
      {ui}
    </I18nProvider>
  )

describe('MediaLightbox', () => {
  beforeEach(() => {
    vi.spyOn(window, 'addEventListener')
    vi.spyOn(window, 'removeEventListener')
  })

  it('ruft onClose und onNavigate bei Keyboard-Ereignissen auf', () => {
    const handleClose = vi.fn()
    const handleNavigate = vi.fn()
    const images = [
      { src: 'img-1.jpg', alt: 'One' },
      { src: 'img-2.jpg', alt: 'Two' }
    ]

    renderWithI18n(
      <MediaLightbox
        images={images}
        index={0}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    )

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(handleNavigate).toHaveBeenCalledWith('next')

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(handleNavigate).toHaveBeenCalledWith('prev')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalled()
  })

  it('rendert Bildmodus und löst Navigation über Buttons aus', () => {
    const handleClose = vi.fn()
    const handleNavigate = vi.fn()
    const images = [
      { src: 'img-1.jpg', alt: 'One' },
      { src: 'img-2.jpg', alt: 'Two' }
    ]

    renderWithI18n(
      <MediaLightbox
        images={images}
        index={0}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    )

    const img = screen.getByAltText('One')
    expect(img).toBeInTheDocument()

    const nextButton = screen.getByRole('button', { name: 'Nächstes Bild' })
    fireEvent.click(nextButton)
    expect(handleNavigate).toHaveBeenCalledWith('next')

    const prevButton = screen.getByRole('button', { name: 'Vorheriges Bild' })
    fireEvent.click(prevButton)
    expect(handleNavigate).toHaveBeenCalledWith('prev')
  })

  it('nutzt Videomodus, wenn mediaItem als Video erkannt wird', () => {
    const images = [
      { src: 'https://example.com/video.m3u8', type: 'video', alt: 'Video' }
    ]

    renderWithI18n(<MediaLightbox images={images} index={0} />)

    const videoEl = document.querySelector('video')
    expect(videoEl).not.toBeNull()
  })
})
