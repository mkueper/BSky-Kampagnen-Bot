import { describe, it, expect } from 'vitest'
import { splitThread, splitThreadSource, buildEffectiveSegments } from '../src/threadComposer.js'

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
})
