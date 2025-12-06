import { useClientConfig as useSharedClientConfig } from '@bsky-kampagnen-bot/shared-logic'

export function useClientConfig () {
  return useSharedClientConfig()
}
