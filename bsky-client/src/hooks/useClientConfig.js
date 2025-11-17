import useSWR from 'swr'
import { fetcher } from '../lib/fetcher'

export function useClientConfig () {
  const { data: clientConfig } = useSWR('/api/client-config', fetcher)

  return { clientConfig }
}
