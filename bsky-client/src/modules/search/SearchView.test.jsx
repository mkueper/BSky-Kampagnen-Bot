import { describe, it, expect } from 'vitest'
import { detectAdvancedPrefix } from './SearchView.jsx'

describe('detectAdvancedPrefix', () => {
  it('erkennt Prefixe am Start', () => {
    expect(detectAdvancedPrefix('from:alice', ['from:', 'mention:'])).toBe(true)
  })

  it('erkennt Prefixe innerhalb des Textes', () => {
    expect(detectAdvancedPrefix('zeige bitte mention:bob sofort', ['mention:'])).toBe(true)
  })

  it('behandelt Gross/Kleinschreibung robust', () => {
    expect(detectAdvancedPrefix('Domain:news.sky', ['domain:'])).toBe(true)
  })

  it('ignoriert unbekannte Prefixe', () => {
    expect(detectAdvancedPrefix('nur ein normaler Text', ['from:', 'mention:'])).toBe(false)
  })

  it('geht tolerant mit leerer Prefixliste um', () => {
    expect(detectAdvancedPrefix('from:alice', [])).toBe(false)
  })
})
