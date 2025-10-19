import { describe, it, expect } from 'vitest'
import { BLUESKY_LIMIT, buildSegments, hardSplit, splitIntoSentences, splitRawSegments } from './segment.js'

describe('splitRawSegments', () => {
  it('splits on --- lines and preserves content', () => {
    const source = 'Intro\n---\nTeil 2\nZeile 2\n---\n'
    expect(splitRawSegments(source)).toEqual(['Intro', 'Teil 2\nZeile 2', ''])
  })

  it('normalizes CRLF line endings', () => {
    const source = 'A\r\n---\r\nB'
    expect(splitRawSegments(source)).toEqual(['A', 'B'])
  })
})

describe('splitIntoSentences', () => {
  it('breaks text on punctuation boundaries', () => {
    const text = 'Hallo Welt! Das ist ein Test. Läuft?'
    expect(splitIntoSentences(text)).toEqual(['Hallo Welt! ', 'Das ist ein Test. ', 'Läuft?'])
  })

  it('falls back to original text when no punctuation', () => {
    const text = 'Ein ziemlich langer Abschnitt ohne Punkte'
    expect(splitIntoSentences(text)).toEqual([text])
  })
})

describe('hardSplit', () => {
  it('splits long strings into equal sized chunks', () => {
    const result = hardSplit('abcdef', 2)
    expect(result).toEqual(['ab', 'cd', 'ef'])
  })

  it('returns single empty chunk for empty input', () => {
    expect(hardSplit('', 10)).toEqual([''])
  })
})

describe('buildSegments', () => {
  it('returns empty segment when source is blank', () => {
    expect(buildSegments('', { appendNumbering: false })).toEqual([''])
  })

  it('appends numbering by default', () => {
    const segments = buildSegments('Teil 1\n---\nTeil 2')
    expect(segments).toEqual(['Teil 1\n\n1/2', 'Teil 2\n\n2/2'])
  })

  it('does not append numbering to empty segments', () => {
    const segments = buildSegments('', { appendNumbering: true })
    expect(segments).toEqual([''])
  })

  it('respects appendNumbering=false', () => {
    const segments = buildSegments('Teil 1\n---\nTeil 2', { appendNumbering: false })
    expect(segments).toEqual(['Teil 1', 'Teil 2'])
  })

  it('splits long segments into multiple posts respecting limit and numbering', () => {
    const longSentence = 'Lorem ipsum dolor sit amet consectetur adipiscing elit.'
    const source = `${longSentence} ${longSentence} ${longSentence}`
    const segments = buildSegments(source, { limit: 60 })
    expect(segments.length).toBeGreaterThan(1)
    segments.forEach((segment, index) => {
      expect(segment).toMatch(new RegExp(`\\n\\n${index + 1}/${segments.length}$`))
      const text = segment.replace(/\n\n\d+\/\d+$/, '')
      expect(text.length).toBeLessThanOrEqual(60)
    })
  })

  it('uses fallback hard split when sentences exceed limit', () => {
    const longWord = 'a'.repeat(BLUESKY_LIMIT * 2)
    const segments = buildSegments(longWord, { appendNumbering: false, limit: 50 })
    expect(segments).toHaveLength(Math.ceil(longWord.length / 50))
    segments.forEach((segment) => {
      expect(segment.length).toBeLessThanOrEqual(50)
    })
  })
})
