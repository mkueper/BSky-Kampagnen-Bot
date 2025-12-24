import { fetchTimeline } from '../modules/shared/api/bsky'

const defaultFetcher = async (...args) => {
  const response = await globalThis.fetch(...args)
  const body = await response.json()

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.')
    error.info = body
    error.status = response.status
    throw error
  }

  return body
}

export const fetcher = (url, ...args) => {
  if (Array.isArray(url)) {
    const [key, params] = url
    if (key === '/api/bsky/timeline') {
      return fetchTimeline(params)
    }
  }
  return defaultFetcher(url, ...args)
}
