import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseTargetPlatforms,
  parsePlatformResults,
  extractRetryAfterMs
} from '../useSkeets.js'

describe('parseTargetPlatforms', () => {
  let warnSpy

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })
  it('returns arrays as-is', () => {
    expect(parseTargetPlatforms(['bluesky', 'mastodon'])).toEqual([
      'bluesky',
      'mastodon'
    ])
  })

  it('parses JSON strings', () => {
    expect(parseTargetPlatforms('["bluesky"]')).toEqual(['bluesky'])
  })

  it('handles invalid content gracefully', () => {
    expect(parseTargetPlatforms('not json')).toEqual([])
    expect(parseTargetPlatforms(null)).toEqual([])
  })
})

describe('parsePlatformResults', () => {
  let warnSpy

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })
  const sample = { bluesky: { status: 'sent' } }

  it('returns plain objects unchanged', () => {
    expect(parsePlatformResults(sample)).toEqual(sample)
  })

  it('parses JSON strings into objects', () => {
    expect(parsePlatformResults(JSON.stringify(sample))).toEqual(sample)
  })

  it('ignores unexpected types', () => {
    expect(parsePlatformResults(['oops'])).toEqual({})
  })
})

describe('extractRetryAfterMs', () => {
  it('reads numeric retry-after headers', () => {
    const res = {
      headers: new Headers([['retry-after', '5']])
    }
    expect(extractRetryAfterMs(res)).toBe(5000)
  })

  it('converts retry-after dates to ms', () => {
    const future = new Date(Date.now() + 2000).toUTCString()
    const res = { headers: new Headers([['retry-after', future]]) }
    const delta = extractRetryAfterMs(res)
    expect(delta).toBeGreaterThan(0)
    expect(delta).toBeLessThanOrEqual(2000)
  })

  it('falls back to rate-limit reset header', () => {
    const resetSeconds = Math.floor(Date.now() / 1000) + 3
    const res = { headers: new Headers([['x-ratelimit-reset', `${resetSeconds}`]]) }
    const delta = extractRetryAfterMs(res)
    expect(delta).toBeGreaterThan(0)
  })

  it('returns null when headers are missing', () => {
    const res = { headers: new Headers() }
    expect(extractRetryAfterMs(res)).toBeNull()
  })
})
