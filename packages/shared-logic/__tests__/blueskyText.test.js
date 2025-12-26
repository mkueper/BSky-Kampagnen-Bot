import { describe, it, expect } from 'vitest'
import {
  shortenLinksForCounting,
  calculateBlueskyPostLength
} from '../src/blueskyText.js'

describe('shortenLinksForCounting', () => {
  it('shortens long https links to host-based variants', () => {
    const input = 'Visit https://example.com/really/long/path/that/keeps/going?foo=bar#hash now.'
    const shortened = shortenLinksForCounting(input)
    expect(shortened).toContain('example.com/')
    expect(shortened.includes('https://')).toBe(false)
    expect(shortened.length).toBeLessThan(input.length)
  })
})

describe('calculateBlueskyPostLength', () => {
  it('counts shortened links instead of the raw URL length', () => {
    const text = 'Check https://example.com/this/is/a/very/long/link/with/query?foo=bar#test'
    const shortenedLength = shortenLinksForCounting(text).length
    expect(calculateBlueskyPostLength(text)).toBe(shortenedLength)
    expect(shortenedLength).toBeLessThan(text.length)
  })
})
