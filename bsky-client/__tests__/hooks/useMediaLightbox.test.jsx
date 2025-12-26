import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
/**
 * Testgruppe: useMediaLightbox.test.jsx
 *
 * Diese Tests überprüfen:
 * - openMediaPreview (Öffnen, Index-Normalisierung, Ignorieren leerer Listen)
 * - closeMediaPreview (Schließen ohne Bilder zu verändern)
 * - navigateMediaPreview (Vor/Zurück mit Ring-Navigation)
 *
 * Kontext:
 * Teil der vereinheitlichten Teststruktur für Hooks im bsky-client.
 * Stellt sicher, dass die Media-Lightbox-State-Maschine stabil funktioniert.
 */
import { AppProvider } from '../../src/context/AppContext.jsx'
import { useUIState } from '../../src/context/UIContext.jsx'
import { useMediaLightbox } from '../../src/hooks/useMediaLightbox.js'

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>

function useHookWithState () {
  const state = useUIState()
  const lightbox = useMediaLightbox()
  return { state, lightbox }
}

describe('useMediaLightbox', () => {
  beforeEach(() => {
    // /api/me Fetch im AppProvider stubben, damit kein echter Netzwerkzugriff erfolgt
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: null })
    })
  })

  it('öffnet die Lightbox mit gegebener Bildliste und normalisiertem Index', () => {
    const { result } = renderHook(useHookWithState, { wrapper })
    const items = [
      { src: 'image-1.jpg', alt: 'One' },
      { src: 'image-2.jpg', alt: 'Two' },
      { src: 'image-3.jpg', alt: 'Three' }
    ]

    act(() => {
      result.current.lightbox.openMediaPreview(items, 5)
    })

    const { mediaLightbox } = result.current.state
    expect(mediaLightbox.open).toBe(true)
    expect(mediaLightbox.images).toEqual(items)
    expect(mediaLightbox.index).toBe(2)
  })

  it('ignoriert openMediaPreview-Aufrufe mit leerer oder ungültiger Liste', () => {
    const { result } = renderHook(useHookWithState, { wrapper })
    const initial = result.current.state.mediaLightbox

    act(() => {
      result.current.lightbox.openMediaPreview([], 0)
    })
    act(() => {
      result.current.lightbox.openMediaPreview(null, 0)
    })

    expect(result.current.state.mediaLightbox).toEqual(initial)
  })

  it('schließt die Lightbox über closeMediaPreview, ohne Bilder zu verändern', () => {
    const { result } = renderHook(useHookWithState, { wrapper })
    const items = [
      { src: 'image-1.jpg', alt: 'One' },
      { src: 'image-2.jpg', alt: 'Two' }
    ]

    act(() => {
      result.current.lightbox.openMediaPreview(items, 1)
    })

    act(() => {
      result.current.lightbox.closeMediaPreview()
    })

    const { mediaLightbox } = result.current.state
    expect(mediaLightbox.open).toBe(false)
    expect(mediaLightbox.images).toEqual(items)
    expect(mediaLightbox.index).toBe(1)
  })

  it('navigiert vor und zurück innerhalb der geöffneten Lightbox', () => {
    const { result } = renderHook(useHookWithState, { wrapper })
    const items = [
      { src: 'image-1.jpg' },
      { src: 'image-2.jpg' },
      { src: 'image-3.jpg' }
    ]

    act(() => {
      result.current.lightbox.openMediaPreview(items, 0)
    })

    act(() => {
      result.current.lightbox.navigateMediaPreview('next')
    })
    expect(result.current.state.mediaLightbox.index).toBe(1)

    act(() => {
      result.current.lightbox.navigateMediaPreview('next')
    })
    expect(result.current.state.mediaLightbox.index).toBe(2)

    act(() => {
      result.current.lightbox.navigateMediaPreview('next')
    })
    expect(result.current.state.mediaLightbox.index).toBe(0)

    act(() => {
      result.current.lightbox.navigateMediaPreview('prev')
    })
    expect(result.current.state.mediaLightbox.index).toBe(2)
  })
})
