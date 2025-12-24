import { describe, it, expect, vi, afterEach } from 'vitest'
import { defaultFetcher, fetcher } from '../../src/lib/fetcher.js'
import { fetchTimeline } from '../../src/modules/shared/api/bsky.js'

vi.mock('../../src/modules/shared/api/bsky.js', () => ({
  fetchTimeline: vi.fn()
}))

describe('fetcher', () => {
  afterEach(() => {
    vi.resetAllMocks()
    delete globalThis.fetch
  })

  it('resolves with parsed body when response ok', async () => {
    const body = { ok: true }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body)
    })

    const data = await defaultFetcher('/api/data')

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/data')
    expect(data).toEqual(body)
  })

  it('throws error with info when response not ok', async () => {
    const body = { error: 'bad' }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve(body)
    })

    await expect(defaultFetcher('/api/fail')).rejects.toMatchObject({
      info: body,
      status: 422
    })
  })

  it('delegates timeline arrays to fetchTimeline', async () => {
    fetchTimeline.mockResolvedValue({ items: [] })

    const result = await fetcher(['/api/bsky/timeline', { foo: 'bar' }])

    expect(fetchTimeline).toHaveBeenCalledWith({ foo: 'bar' })
    expect(result).toEqual({ items: [] })
  })

  it('falls back to defaultFetcher when url is string', async () => {
    const body = { ok: true }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body)
    })

    const result = await fetcher('/other')

    expect(result).toEqual(body)
    expect(globalThis.fetch).toHaveBeenCalledWith('/other')
  })
})
