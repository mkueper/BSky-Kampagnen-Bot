import { fetchTimeline } from '../modules/shared/api/bsky'

const defaultFetcher = (...args) => globalThis.fetch(...args).then(res => {
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    error.info = res.json()
    error.status = res.status
    throw error
  }
  return res.json()
})

export const fetcher = (url, ...args) => {
  if (Array.isArray(url)) {
    const [key, params] = url
    if (key === '/api/bsky/timeline') {
      return fetchTimeline(params)
    }
  }
  return defaultFetcher(url, ...args)
}
