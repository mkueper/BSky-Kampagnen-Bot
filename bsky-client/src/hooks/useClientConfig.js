import { useClientConfig as useSharedClientConfig } from '@bsky-kampagnen-bot/shared-logic'

export function useClientConfig () {
  const { config, loading, error } = useSharedClientConfig()

  return { clientConfig: config, loading, error }
}
