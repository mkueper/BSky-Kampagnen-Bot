import { describe, it, expect } from 'vitest'
import { splitThread, splitThreadSource } from '../src/threadComposer.js'

describe('splitThread / sentence splitting', () => {
  it('splits on hard break markers', () => {
    const src = 'First\n---\nSecond'
    const parts = splitThreadSource(src)
    expect(parts).toEqual(['First', 'Second'])
  })

  it('does not split sentences unnecessarily when under limit', () => {
    const text = 'Hello world. This is a short paragraph.'
    const result = splitThread({ text, limit: 200 })
    expect(result.totalSegments).toBe(1)
    expect(result.previewSegments[0].raw).toContain('Hello world')
    expect(result.previewSegments[0].raw).toContain('This is a short')
  })

  it('breaks long paragraphs at sentence boundaries when possible', () => {
    const sentence = 'This is a sentence that can stand on its own.'
    const text = `${sentence} ${sentence} ${sentence}`
    const result = splitThread({ text, limit: sentence.length + 5 })
    // should produce multiple segments, each respecting sentence boundaries
    expect(result.totalSegments).toBeGreaterThan(1)
    result.previewSegments.forEach((s) => {
      expect(s.formatted.length).toBeLessThanOrEqual(200)
    })
  })

  it('falls back to word-boundary splitting for very long sentences', () => {
    const long = 'word '.repeat(200).trim()
    const result = splitThread({ text: long, limit: 280 })
    expect(result.totalSegments).toBeGreaterThan(1)
    // ensure none of the segments exceed limit minus numbering reservation
    result.previewSegments.forEach((s) => {
      expect(s.characterCount).toBeLessThanOrEqual(300)
    })
  })

  it('prefers punctuation only within the split window', () => {
    const limit = 60
    const nearLimit = 'A'.repeat(limit - 10) + '.'
    const farPunctuation = 'B'.repeat(limit - 40) + '.' + 'C'.repeat(50)
    const withNearPunct = splitThread({ text: nearLimit, limit })
    const withFarPunct = splitThread({ text: farPunctuation, limit })

    expect(withNearPunct.previewSegments[0].raw.endsWith('.')).toBe(true)
    expect(withNearPunct.previewSegments[0].characterCount).toBeLessThanOrEqual(limit)
    expect(withFarPunct.previewSegments[0].raw.endsWith('.')).toBe(false)
    expect(withFarPunct.previewSegments[0].characterCount).toBeLessThanOrEqual(limit)
  })

  it('splits hard when no whitespace exists at all', () => {
    const limit = 50
    const text = 'A'.repeat(140)
    const result = splitThread({ text, limit })
    expect(result.totalSegments).toBeGreaterThan(1)
    result.previewSegments.forEach((segment) => {
      expect(segment.characterCount).toBeLessThanOrEqual(limit)
    })
  })

  it('splits long url-like tokens without exceeding limits', () => {
    const limit = 60
    const token = 'https://example.com/' + 'a'.repeat(120)
    const result = splitThread({ text: token, limit })
    expect(result.totalSegments).toBeGreaterThan(1)
    result.previewSegments.forEach((segment) => {
      expect(segment.characterCount).toBeLessThanOrEqual(limit)
    })
  })

  it('counts shortened link lengths when evaluating segment limits', () => {
    const url = 'https://example.com/this/is/a/very/long/path/that/exceeds/the/default/limit'
    const text = `Intro ${url}`
    const result = splitThread({ text, limit: 300, appendNumbering: false })
    expect(result.previewSegments).toHaveLength(1)
    const [segment] = result.previewSegments
    expect(segment.formatted).toContain(url)
    expect(segment.characterCount).toBeLessThan(segment.formatted.length)
  })
})
